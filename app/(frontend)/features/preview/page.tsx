import React from 'react';
import Image from 'next/image';
import { getPayload } from 'payload';
import config from '@/payload.config';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import TransitionLink from '@/components/TransitionLink';
import PhotoWindow from '@/components/PhotoWindow';
import SectionSearchPrompt from '@/components/SectionSearchPrompt';
import { Byline } from '@/components/FrontPage/Byline';
import type { Article as ComponentArticle } from '@/components/FrontPage/types';
import { formatArticle } from '@/utils/formatArticle';
import { getArticleUrl } from '@/utils/getArticleUrl';
import { shortDate } from '@/utils/articleDates';
import { FEATURES_DEPARTMENTS, departmentOf, normalizeKicker, type FeaturesDepartmentKey } from '@/lib/featuresDepartments';

/*
 * DESIGN PREVIEW (not linked from the site, not indexed): a proposed Features page.
 *
 *   1. Cover story: its photo pinned behind a large white headline.
 *   2. Three sections, one under another, each a section or a running column:
 *      - first: a pinned photo with the section's name over it on the left,
 *        the section's stories on the right;
 *      - second: a regular section, a heading and a row of story cards;
 *      - third: like the first, with the photo on the right.
 *   3. "Looking for an article?": search, the archive and contact, as on News.
 * Every story appears once.
 */

export const revalidate = 60;
export const metadata: Metadata = { title: 'Features (design preview)', robots: { index: false } };

const FEATURES_MAILTO = 'mailto:features@poly.rpi.edu?subject=Story%20idea%20for%20Features';
const focus = 'focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2';

type Photo = { src: string; width: number; height: number };
type Story = ComponentArticle & { photo: Photo | null; dept: FeaturesDepartmentKey | null };

const deptName = (key: FeaturesDepartmentKey | null) => FEATURES_DEPARTMENTS.find((d) => d.key === key)?.name ?? null;
const dateOf = (a: ComponentArticle) => shortDate(a.publishedDate || a.isoDate);
/** A running column: a kicker that names one ("Collar City Column") */
const isColumn = (kicker: string | null) => normalizeKicker(kicker).endsWith('column');
const labelOf = (s: Story) => (isColumn(s.kicker) ? s.kicker : deptName(s.dept)) || s.kicker;

/** Section label, red small caps, as on the cards */
function Kicker({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p className={`font-meta text-[12px] font-semibold uppercase tracking-[0.12em] ${light ? 'text-white' : 'text-accent'}`}>{children}</p>
  );
}

type Section = {
  key: string;
  name: string;
  summary: string;
  total: number;
  layout: 'photo-left' | 'photo-right' | 'regular';
  stories: Story[];
};

/**
 * A story's label inside its section, left out when it adds nothing: when it
 * repeats the section's name, or every story in the section has the same one
 * ("The Arts" on every Arts & Troy card)
 */
const sectionKicker = (s: Story, sec: Section) => {
  if (!s.kicker || normalizeKicker(s.kicker) === normalizeKicker(sec.name)) return null;
  const labels = new Set(sec.stories.map((x) => normalizeKicker(x.kicker)));
  return labels.size > 1 ? s.kicker : null;
};

/** "All N … stories", only when the section has more than the page shows */
function AllLink({ sec }: { sec: Section }) {
  if (sec.total <= sec.stories.length) return null;
  return (
    <TransitionLink href="/features/archive" className={`inline-flex min-h-11 items-center self-start font-meta text-[13px] font-semibold text-accent ${focus}`}>
      <span className="border-b border-accent">All {sec.total} {sec.name} stories</span>
    </TransitionLink>
  );
}

/**
 * Half the width: the lead story's photo, pinned, with the section's name
 * over it. The other half: the section's stories. `flip` puts the photo on
 * the right. On phones the photo comes first either way.
 */
function PhotoSection({ sec, flip }: { sec: Section; flip: boolean }) {
  const [lead, ...rest] = sec.stories;
  return (
    <section aria-labelledby={`fp-${sec.key}`} className="mt-16 grid grid-cols-1 items-stretch gap-6 md:mt-20 md:grid-cols-2 md:gap-10 lg:gap-14">
      <TransitionLink href={getArticleUrl(lead)} tabIndex={-1} aria-hidden="true" className={`group block ${flip ? 'md:order-2' : ''}`}>
        <PhotoWindow
          src={lead.photo!}
          alt=""
          focus={lead.imageFocus || undefined}
          className="h-[clamp(300px,56vh,460px)] md:h-full md:min-h-[clamp(480px,72vh,660px)]"
        >
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/75 via-black/15 to-transparent transition-colors group-hover:from-black/85" />
          <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-6 text-white md:px-8 md:pb-9">
            <p className="text-balance font-copy text-[44px] font-normal leading-[0.95] tracking-[-0.02em] md:text-[52px] lg:text-[68px]">{sec.name}</p>
            <p className="mt-2 font-copy text-[17px] italic text-white/85 md:text-[20px]">{sec.summary}</p>
          </div>
        </PhotoWindow>
      </TransitionLink>

      <div className={`flex min-w-0 flex-col md:py-4 ${flip ? 'md:order-1' : ''}`}>
        <h2 id={`fp-${sec.key}`} className="sr-only">{sec.name}</h2>
        <TransitionLink href={getArticleUrl(lead)} className={`group block ${focus}`}>
          {sectionKicker(lead, sec) && <Kicker>{sectionKicker(lead, sec)}</Kicker>}
          <h3 className="mt-2 text-balance font-copy text-[30px] font-normal leading-[1.05] tracking-[-0.015em] transition-colors group-hover:text-accent md:text-[34px] lg:text-[40px]">
            {lead.richTitle || lead.title}
          </h3>
          {lead.excerpt && <p className="mt-3 max-w-[48ch] font-copy text-[17px] leading-[1.45] text-text-muted md:text-[18px]">{lead.excerpt}</p>}
          <Byline authors={lead.authorLinks} date={dateOf(lead)} size="md" margin="mt-3" />
        </TransitionLink>
        {rest.length > 0 && (
          <ul className="mt-6 border-t border-rule-strong">
            {rest.map((s) => (
              <li key={s.id} className="border-b border-rule py-4">
                <TransitionLink href={getArticleUrl(s)} className={`group block ${focus}`}>
                  <h3 className="font-copy text-[20px] font-normal leading-[1.15] transition-colors group-hover:text-accent lg:text-[22px]">
                    {s.richTitle || s.title}
                  </h3>
                  <Byline authors={s.authorLinks} date={dateOf(s)} size="sm" margin="mt-1.5" />
                </TransitionLink>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4">
          <AllLink sec={sec} />
        </div>
      </div>
    </section>
  );
}

export default async function FeaturesPreviewPage() {
  const payload = await getPayload({ config });
  const response = await payload.find({
    collection: 'articles',
    where: { and: [{ section: { equals: 'features' } }, { _status: { equals: 'published' } }] },
    sort: '-publishedDate',
    limit: 200,
    depth: 2,
    select: {
      title: true, slug: true, subdeck: true, featuredImage: true, section: true, kicker: true,
      publishedDate: true, createdAt: true, authors: true, writeInAuthors: true, isFollytechnic: true,
    },
  });

  const stories: Story[] = response.docs.flatMap((doc) => {
    const a = formatArticle(doc);
    if (!a) return [];
    const media = typeof doc.featuredImage === 'object' && doc.featuredImage ? doc.featuredImage : null;
    const photo = media?.url && media.width && media.height ? { src: media.url, width: media.width, height: media.height } : null;
    return [{ ...a, photo, dept: departmentOf(a.kicker) }];
  });

  // Each story once: the cover first, then the sections
  const shown = new Set<string | number>();
  const take = (list: Story[], n: number) => {
    const picked = list.filter((s) => !shown.has(s.id)).slice(0, n);
    picked.forEach((s) => shown.add(s.id));
    return picked;
  };
  const withPhoto = stories.filter((s) => s.photo);
  const [cover] = take(withPhoto, 1);

  // Three sections, one under another: Around Campus and Arts & Troy, then
  // the newest running column (or People when there's none). A group needs
  // at least MIN stories left after the cover; one that's
  // short gives its place to the next.
  const MIN = 3;
  const fresh = (list: Story[]) => list.filter((s) => !shown.has(s.id));
  const columnNames = [...new Set(stories.filter((s) => isColumn(s.kicker)).map((s) => s.kicker as string))];
  const dept = (key: FeaturesDepartmentKey) => FEATURES_DEPARTMENTS.find((d) => d.key === key)!;
  const candidates = [
    { key: 'campus', name: dept('campus').name, summary: dept('campus').summary, all: stories.filter((s) => s.dept === 'campus' && !isColumn(s.kicker)) },
    { key: 'arts', name: dept('arts').name, summary: dept('arts').summary, all: stories.filter((s) => s.dept === 'arts' && !isColumn(s.kicker)) },
    ...columnNames.map((name) => ({ key: `column-${normalizeKicker(name)}`, name, summary: 'A running column', all: stories.filter((s) => s.kicker === name) })),
    { key: 'people', name: dept('people').name, summary: dept('people').summary, all: stories.filter((s) => s.dept === 'people' && !isColumn(s.kicker)) },
  ].map((c) => ({ ...c, pool: fresh(c.all) }));
  const chosen = candidates.filter((c) => c.pool.length >= MIN).slice(0, 3);
  // The first and third sections lead with a pinned photo (photo left, then
  // photo right) and list up to five stories; the middle one is a regular
  // row of up to four cards. A photo section with no photo falls back to a
  // regular row. total: the whole section, including any story shown higher up.
  const sections: Section[] = chosen.map((c, i) => {
    const total = c.all.length;
    const lead = i !== 1 ? c.pool.find((s) => s.photo) : undefined;
    if (lead) {
      const picked = [lead, ...c.pool.filter((s) => s !== lead)].slice(0, 5);
      picked.forEach((s) => shown.add(s.id));
      return { ...c, total, layout: i === 0 ? 'photo-left' : 'photo-right', stories: picked };
    }
    return { ...c, total, layout: 'regular', stories: take(c.pool, 4) };
  });

  return (
    <div className="min-h-screen bg-bg-main text-text-main">
      <Header />
      <main className="mx-auto w-full max-w-[1280px] px-4 pb-6 pt-6 md:px-6 lg:pt-10 xl:px-[30px]">
        <h1 className="sr-only">Features</h1>

        {/* ── 1. Cover story: the photo stays still while the headline scrolls over it ── */}
        {cover && cover.photo && (
          <TransitionLink href={getArticleUrl(cover)} className={`group block ${focus}`}>
            <PhotoWindow src={cover.photo} alt={cover.imageTitle || ''} focus={cover.imageFocus || undefined} className="h-[clamp(380px,64vh,660px)]">
              <div aria-hidden="true" className="absolute inset-0 z-10 bg-gradient-to-t from-black/80 via-black/25 to-transparent transition-colors group-hover:from-black/90" />
              {cover.imagePhotographer && (
                <span className="absolute right-2 top-2 z-10 bg-black/55 px-2 py-1 font-meta text-[11px] leading-none tracking-[0.02em] text-white md:right-3 md:top-3">
                  {cover.imagePhotographer}/The Polytechnic
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-6 text-white md:px-8 md:pb-8 lg:px-10 lg:pb-10">
                <Kicker light>Cover story{labelOf(cover) ? ` · ${labelOf(cover)}` : ''}</Kicker>
                <h2 className="mt-3 max-w-[18ch] text-balance font-copy text-[clamp(34px,8vw,44px)] font-normal leading-[0.98] tracking-[-0.02em] md:text-[60px] lg:text-[76px]">
                  {cover.richTitle || cover.title}
                </h2>
                {cover.excerpt && (
                  <p className="mt-4 max-w-[56ch] font-copy text-[17px] leading-[1.4] text-white/90 md:text-[20px]">{cover.excerpt}</p>
                )}
                <Byline authors={cover.authorLinks} date={dateOf(cover)} size="lg" margin="mt-4" className="[&_span]:text-white/90" />
              </div>
            </PhotoWindow>
          </TransitionLink>
        )}

        {/* ── 2. The sections, one under another: photo / regular / photo, flipped ── */}
        {sections.map((sec) =>
          sec.layout === 'regular' ? (
            <section key={sec.key} aria-labelledby={`fp-${sec.key}`} className="mt-16 md:mt-20">
              <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b-2 border-rule-strong pb-3">
                <div className="min-w-0">
                  <h2 id={`fp-${sec.key}`} className="font-meta text-[24px] uppercase tracking-[0.04em] text-text-main md:text-[28px]" style={{ fontWeight: 500 }}>
                    {sec.name}
                  </h2>
                  <p className="mt-1 font-copy text-[16px] italic text-text-muted md:text-[17px]">{sec.summary}</p>
                </div>
                <AllLink sec={sec} />
              </div>
              <ul className={`mt-6 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 ${sec.stories.length >= 4 ? 'lg:grid-cols-4' : 'md:grid-cols-3'}`}>
                {sec.stories.map((s) => (
                  <li key={s.id}>
                    <TransitionLink href={getArticleUrl(s)} className={`group block ${focus}`}>
                      {s.photo && (
                        <div className="relative mb-3 aspect-[3/2] overflow-hidden bg-rule">
                          <Image src={s.photo.src} alt={s.imageTitle || ''} fill sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 400px" className="object-cover" style={s.imageFocus ? { objectPosition: s.imageFocus } : undefined} />
                        </div>
                      )}
                      {sectionKicker(s, sec) && <Kicker>{sectionKicker(s, sec)}</Kicker>}
                      <h3 className="mt-1.5 font-copy text-[22px] font-normal leading-[1.14] transition-colors group-hover:text-accent lg:text-[24px]">
                        {s.richTitle || s.title}
                      </h3>
                      <Byline authors={s.authorLinks} date={dateOf(s)} size="sm" margin="mt-2" />
                    </TransitionLink>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <PhotoSection key={sec.key} sec={sec} flip={sec.layout === 'photo-right'} />
          ),
        )}

        {/* ── 3. Search, the archive and contact, as on News, under a Features heading ── */}
        <SectionSearchPrompt section="features" name="Features" question="Looking for an article" archiveHref="/features/archive" contactHref={FEATURES_MAILTO} />
      </main>
      <Footer />
    </div>
  );
}
