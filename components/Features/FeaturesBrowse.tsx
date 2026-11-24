"use client";

import { useMemo, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import TransitionLink from "@/components/TransitionLink";
import { Byline } from "@/components/FrontPage/Byline";
import FeaturesPhotoBand, { type FeaturesPhotoBandData } from "@/components/Features/FeaturesPhotoBand";
import { useDetailsAccordion } from "@/components/useDetailsAccordion";
import { FEATURES_DEPARTMENTS, semesterOf, type FeaturesDepartmentKey } from "@/lib/featuresDepartments";
import type { FeaturesIndexStory } from "@/lib/featuresIndex";
import { shortDate } from "@/utils/articleDates";

/*
 * The bottom of /features, after the cover and the photo band, in the
 * Get involved page's style (path labels with a hairline, no boxes, no
 * radius):
 *
 *   Browse by section   one row per section (Get involved's desk list):
 *                       name, summary, count; open shows its five newest
 *                       and a link that filters the index below
 *   (thin photo band)   a second window onto the band's photo
 *   Every Features story  the whole archive, filtered by section and
 *                       semester, grouped by semester, more on request
 *
 * Everything is filtered here in the browser from one list the page sends.
 */

/** Rows the index shows at first, and adds per "Show more" */
const INDEX_PAGE = 10;
/** Stories an open section row shows */
const ROW_STORIES = 5;
const ACCORDION_NAME = "features-sections";

function PathLabel({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="flex items-center gap-3 font-meta text-[12px] font-bold uppercase tracking-[0.14em] text-text-muted">
      <span>{children}</span>
      <span aria-hidden="true" className="h-px flex-1 bg-rule" />
    </h2>
  );
}

function StoryRow({ story, showKicker = false }: { story: FeaturesIndexStory; showKicker?: boolean }) {
  return (
    <li className="border-b border-rule last:border-b-0">
      <TransitionLink
        href={story.href}
        className="group grid grid-cols-1 gap-x-5 gap-y-1 py-3 md:grid-cols-[88px_minmax(0,1fr)_auto] md:items-baseline"
      >
        <span className="hidden font-meta text-[12px] uppercase tracking-[0.06em] text-text-muted tabular-nums md:block">
          {shortDate(story.date)}
        </span>
        <span className="min-w-0">
          {showKicker && story.kicker && (
            <span className="mb-0.5 block font-meta text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted md:hidden">
              {story.kicker}
            </span>
          )}
          <span className="block font-copy text-[19px] leading-snug text-text-main transition-colors group-hover:text-accent md:text-[20px]">
            {story.title}
          </span>
          {/* Phones show the date in the byline, since the date column is hidden */}
          <Byline authors={story.authors} size="sm" margin="mt-0.5" className="md:hidden" date={shortDate(story.date)} />
          <Byline authors={story.authors} size="sm" margin="mt-0.5" className="hidden md:block" />
        </span>
        {showKicker && (
          <span className="hidden whitespace-nowrap font-meta text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted md:block">
            {story.kicker}
          </span>
        )}
      </TransitionLink>
    </li>
  );
}

export default function FeaturesBrowse({
  stories,
  band = null,
  coverIds = [],
}: {
  stories: FeaturesIndexStory[];
  /** The page's photo band; a thin second window onto it sits above the index */
  band?: FeaturesPhotoBandData | null;
  /** Stories already in the cover, which section rows show last */
  coverIds?: (number | string)[];
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef<HTMLElement>(null);
  useDetailsAccordion(listRef, ACCORDION_NAME);

  const [department, setDepartment] = useState<FeaturesDepartmentKey | "all">("all");
  const [semester, setSemester] = useState<string>("all");
  const [shown, setShown] = useState(INDEX_PAGE);

  const sections = useMemo(() => {
    const onCover = new Set(coverIds.map(String));
    return FEATURES_DEPARTMENTS.map((dept) => {
      const all = stories.filter((s) => s.department === dept.key);
      // Prefer stories the reader hasn't just passed in the cover
      const preview = [...all.filter((s) => !onCover.has(String(s.id))), ...all.filter((s) => onCover.has(String(s.id)))]
        .slice(0, ROW_STORIES)
        .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
      return { ...dept, count: all.length, preview };
    }).filter((dept) => dept.count > 0);
  }, [stories, coverIds]);

  const semesters = useMemo(() => {
    const seen = new Map<string, { key: string; label: string; count: number }>();
    for (const story of stories) {
      const sem = semesterOf(story.date);
      if (!sem) continue;
      const entry = seen.get(sem.key) ?? { ...sem, count: 0 };
      entry.count += 1;
      seen.set(sem.key, entry);
    }
    return [...seen.values()].sort((a, b) => b.key.localeCompare(a.key));
  }, [stories]);

  const filtered = useMemo(
    () =>
      stories.filter(
        (s) =>
          (department === "all" || s.department === department) &&
          (semester === "all" || semesterOf(s.date)?.key === semester),
      ),
    [stories, department, semester],
  );

  // Rows with a semester heading wherever the semester changes
  const visible = filtered.slice(0, shown);
  const groups: { key: string; label: string; stories: FeaturesIndexStory[] }[] = [];
  for (const story of visible) {
    const sem = semesterOf(story.date) ?? { key: "undated", label: "Undated" };
    const last = groups.at(-1);
    if (last?.key === sem.key) last.stories.push(story);
    else groups.push({ ...sem, stories: [story] });
  }

  const openIndex = (key: FeaturesDepartmentKey) => {
    setDepartment(key);
    setSemester("all");
    setShown(INDEX_PAGE);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    indexRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };

  if (stories.length === 0) return null;

  const chips: { key: FeaturesDepartmentKey | "all"; label: string }[] = [
    { key: "all", label: "All" },
    ...sections.map((s) => ({ key: s.key, label: s.name })),
  ];

  return (
    <>
      {sections.length > 0 && (
        <section aria-labelledby="features-sections" className="mt-12 lg:mt-14">
          <PathLabel id="features-sections">Browse by section</PathLabel>
          <div ref={listRef} className="mt-5 border-t border-rule-strong">
            {sections.map((dept, i) => (
              <details
                key={dept.key}
                name={ACCORDION_NAME}
                open={i === 0}
                className="group border-b border-rule"
              >
                <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 py-3 text-text-main focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden">
                  <span className="font-copy text-[22px] leading-tight md:text-[24px]">{dept.name}</span>
                  <span className="ml-auto hidden font-meta text-[13px] leading-snug text-text-muted md:block">
                    {dept.summary}
                  </span>
                  <span className="ml-auto font-meta text-[13px] tabular-nums text-text-muted md:ml-4">
                    {dept.count}
                    <span className="sr-only"> stories</span>
                  </span>
                  <span aria-hidden="true" className="shrink-0 text-accent">
                    <Plus className="h-4 w-4 group-open:hidden" />
                    <Minus className="hidden h-4 w-4 group-open:block" />
                  </span>
                </summary>
                <div className="pb-5">
                  <ul>
                    {dept.preview.map((story) => (
                      <StoryRow key={story.id} story={story} />
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => openIndex(dept.key)}
                    className="mt-2 inline-flex min-h-11 items-center border-b border-accent font-meta text-[13px] font-semibold text-accent focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                  >
                    All {dept.count} {dept.name} {dept.count === 1 ? "story" : "stories"} &darr;
                  </button>
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      {band && <FeaturesPhotoBand band={band} thin className="mt-12 lg:mt-14" />}

      <section
        ref={indexRef}
        id="index"
        aria-labelledby="features-index"
        className="mt-12 scroll-mt-24 lg:mt-14"
      >
        <PathLabel id="features-index">Every Features story</PathLabel>

        <div className="mt-5 flex flex-col gap-4 border-b border-rule-strong pb-4 md:flex-row md:items-center md:justify-between">
          <div role="group" aria-label="Section" className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                aria-pressed={department === chip.key}
                onClick={() => {
                  setDepartment(chip.key);
                  setShown(INDEX_PAGE);
                }}
                className={`min-h-9 border px-3 font-meta text-[12px] font-bold uppercase tracking-[0.1em] transition-colors focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${
                  department === chip.key
                    ? "border-text-main bg-text-main text-bg-main"
                    : "border-rule text-text-main hover:border-text-main"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-3 font-meta text-[12px] font-bold uppercase tracking-[0.1em] text-text-muted">
            Semester
            <select
              id="features-index-semester"
              value={semester}
              onChange={(e) => {
                setSemester(e.target.value);
                setShown(INDEX_PAGE);
              }}
              className="min-h-9 border border-rule bg-bg-main px-2 font-meta text-[14px] normal-case tracking-normal text-text-main focus-visible:outline-2 focus-visible:outline-accent"
            >
              <option value="all">All semesters</option>
              {semesters.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label} ({s.count})
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="sr-only" aria-live="polite">
          {filtered.length} {filtered.length === 1 ? "story" : "stories"}
        </p>

        {groups.length === 0 ? (
          <p className="py-6 font-copy text-[18px] text-text-muted">
            No stories in this section that semester. Try All semesters.
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.key}>
              <h3 className="pt-6 pb-1 font-meta text-[12px] font-bold uppercase tracking-[0.14em] text-text-main">
                {group.label}
              </h3>
              <ul className="border-t border-rule">
                {group.stories.map((story) => (
                  <StoryRow key={story.id} story={story} showKicker />
                ))}
              </ul>
            </div>
          ))
        )}

        <div className="mt-6 flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          {filtered.length > shown ? (
            <button
              type="button"
              onClick={() => setShown((n) => n + INDEX_PAGE)}
              className="inline-flex min-h-11 w-full items-center justify-center bg-text-main px-5 font-meta text-[13px] font-bold uppercase tracking-[0.08em] text-bg-main transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 md:w-auto"
            >
              Show {Math.min(INDEX_PAGE, filtered.length - shown)} more
            </button>
          ) : (
            <span />
          )}
          <TransitionLink
            href="/features/archive"
            className="inline-flex min-h-11 items-center border-b border-accent font-meta text-[13px] font-semibold text-accent"
          >
            Search the Features archive
          </TransitionLink>
        </div>
      </section>
    </>
  );
}
