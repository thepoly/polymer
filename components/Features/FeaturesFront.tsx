import { SUMMARY_CLASS } from "@/components/summaryClass";
import React from 'react';
import Image from 'next/image';
import { getPayload, type Where } from 'payload';
import config from '@/payload.config';
import { ChevronRight } from 'lucide-react';
import TransitionLink from '@/components/TransitionLink';
import PhotoPitch from '@/components/PhotoPitch';
import SectionSearchPrompt from '@/components/SectionSearchPrompt';
import PhotoReel, { type ReelFrame } from '@/components/Features/PhotoReel';
import { Byline } from '@/components/FrontPage/Byline';
import type { Article as ComponentArticle } from '@/components/FrontPage/types';
import { formatArticle } from '@/utils/formatArticle';
import { getArticleUrl } from '@/utils/getArticleUrl';
import { shortDate } from '@/utils/articleDates';
import { FEATURES_DEPARTMENTS, departmentOf, normalizeKicker, type FeaturesDepartmentKey } from '@/lib/featuresDepartments';
import {
  REEL_MIN_PHOTOS,
  REEL_REST,
  TOP_RIGHT_TABLET,
  SECTION_WINDOW_DAYS,
  isWithin,
  pickCover,
  planFeaturesFront,
  pitchPositionVars,
  NO_PITCH_POSITIONS,
  type PitchPositions,
  type FrontPins,
  type FrontPlan,
  type FrontStory,
  type SectionKey,
  type SectionLayout,
} from '@/lib/featuresFront';
import { photographerOf, pitchPhotoOf, type PitchPhoto } from '@/lib/pitchPhoto';

/*
 * /features, top to bottom (rendered by app/(frontend)/[section]/page.tsx,
 * which supplies the header and footer):
 *
 *   1. The top, in three columns with thin rules between them: the cover in
 *      the middle (its photo, section, headline, summary and byline, centred);
 *      the two newest stories with photos on the left; the next three listed
 *      on the right with thumbnails, with the pitch among them: "Have a
 *      suggestion? Tell Features about it" on a pinned photo the editor picks
 *      (the Get involved page's style). Phones: the cover first,
 *      then the rest.
 *   2. Three sections, one under another, each under its name, a link to the
 *      archive filtered to it:
 *      - Campus Life: a row of story cards (a list with thumbnails on phones);
 *      - Arts & Culture: the lead's photo on the right beside its headline,
 *        its other three stories underneath as photo cards;
 *      - People: a row of story cards.
 *   3. Photo Short Stories: a film reel of a photo story's photos, the next
 *      two listed under it; its title links to every photo story.
 *   4. "Looking for an article?": search, the archive and contact, as on News.
 *
 * Which stories go where (and when the editor's pins give way) is decided by
 * planFeaturesFront in lib/featuresFront.ts; this file loads the stories and
 * renders the plan. See docs/features-section.md.
 */

const FEATURES_MAILTO =
  'mailto:features@poly.rpi.edu,eic@poly.rpi.edu?subject=Features%20Request%2FComment%20or%20Story%20Tip';
const PITCH_MAILTO = 'mailto:features@poly.rpi.edu?subject=Suggestion%20for%20Features';
const focus = 'focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2';
const DAY_MS = 24 * 60 * 60 * 1000;
/** Stories loaded for the page: the year's window, which runs to about 16 */
const WINDOW_LIMIT = 80;

type Photo = { src: string; width: number; height: number };
type Story = ComponentArticle & { photo: Photo | null; dept: FeaturesDepartmentKey | null };

const deptName = (key: FeaturesDepartmentKey | null) => FEATURES_DEPARTMENTS.find((d) => d.key === key)?.name ?? null;
const dateOf = (a: ComponentArticle) => shortDate(a.publishedDate || a.isoDate);
/** The cover's label after "Cover story": its section, or a kicker that isn't just "Features" */
const labelOf = (s: Story) => {
  const label = deptName(s.dept) || s.kicker;
  return label && !['features', 'feature'].includes(normalizeKicker(label)) ? label : null;
};
const credit = (name: string | null | undefined) => (name ? `${name}/The Polytechnic` : null);

/** Section label, red small caps, as on the cards; white on the cover */
function Kicker({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p className={`font-meta text-[12px] font-semibold uppercase tracking-[0.12em] ${light ? 'text-white' : 'text-accent'}`}>{children}</p>
  );
}

/** `headingId`: unique even when the phone and wider versions of a section are both on the page */
type Section = { key: SectionKey; name: string; layout: SectionLayout; stories: Story[]; headingId: string };

/** Where a section's title goes: the archive, filtered to the section */
const archiveHref = (key: SectionKey) => `/features/archive?section=${key}`;

/**
 * A story's label inside its section, left out when it adds nothing: when it
 * repeats the section's name, or every story in the section has the same one
 * ("EMPAC Event" on every Arts & Culture card)
 */
const sectionKicker = (s: Story, sec: Section) => {
  if (!s.kicker || normalizeKicker(s.kicker) === normalizeKicker(sec.name)) return null;
  const labels = new Set(sec.stories.map((x) => normalizeKicker(x.kicker)));
  return labels.size > 1 ? s.kicker : null;
};

/**
 * A section's title, which is also the way to every story in it: a link to
 * the Features archive with that section's filter on. The chevron says so.
 */
function SectionTitle({ id, name, href }: { id: string; name: string; href: string }) {
  return (
    <h2 className="min-w-0 font-meta text-[22px] uppercase tracking-[0.04em] text-text-main md:text-[26px]" style={{ fontWeight: 500 }}>
      <TransitionLink href={href} className={`group inline-flex items-center gap-1.5 transition-colors hover:text-accent ${focus}`}>
        <span id={id}>{name}</span>
        <ChevronRight aria-hidden="true" strokeWidth={1.75} className="h-5 w-5 text-text-muted transition-[color,transform] duration-200 group-hover:translate-x-0.5 group-hover:text-accent md:h-6 md:w-6" />
      </TransitionLink>
    </h2>
  );
}

/** Space above each section, the same everywhere */
const sectionGap = 'mt-[18px] md:mt-[22px]';

/** A section's heading: its title (a link to all its stories) over a rule */
function SectionHead({ sec }: { sec: Section }) {
  return (
    <div className="border-b-2 border-rule-strong pb-1.5">
      <SectionTitle id={sec.headingId} name={sec.name} href={archiveHref(sec.key)} />
    </div>
  );
}

/** A photo's credit line, as on the cover: "Name/The Polytechnic" */
function Credit({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 h-5 truncate font-meta text-[12px] text-text-muted">{children}</p>;
}

/**
 * Row 1: the lead's photo, at 3:2, beside the lead's headline (centred on the
 * photo). `flip` puts the photo on the right; on phones it comes first either
 * way. Row 2: the section's other stories in a row, each with its photo above
 * its headline, like the cards in the other sections (a thumbnail on the right
 * on phones). On phones the section shows three stories in all; the title
 * links to the rest.
 */
function LeadSection({ sec, flip }: { sec: Section; flip: boolean }) {
  const [lead, ...rest] = sec.stories;
  const kicker = sectionKicker(lead, sec);
  const cols = rest.length >= 3 ? 'md:grid-cols-3' : rest.length === 2 ? 'md:grid-cols-2' : '';
  return (
    <section aria-labelledby={sec.headingId} className={sectionGap}>
      <SectionHead sec={sec} />
      <div className="mt-4 grid grid-cols-1 gap-4 md:mt-5 md:grid-cols-2 md:gap-8 lg:gap-10">
        <div className={`self-start ${flip ? 'md:order-2' : ''}`}>
          <TransitionLink href={getArticleUrl(lead)} tabIndex={-1} aria-hidden="true" className="block">
            <div className="relative aspect-[3/2] overflow-hidden bg-rule">
              <Image
                src={lead.photo!.src}
                alt=""
                fill
                sizes="(max-width: 767px) 100vw, 620px"
                className="object-cover"
                style={lead.imageFocus ? { objectPosition: lead.imageFocus } : undefined}
              />
            </div>
          </TransitionLink>
          {lead.imagePhotographer && <Credit>{credit(lead.imagePhotographer)}</Credit>}
        </div>

        <TransitionLink href={getArticleUrl(lead)} className={`group block min-w-0 self-center ${flip ? 'md:order-1' : ''} ${focus}`}>
          {kicker && <Kicker>{kicker}</Kicker>}
          <h3 className={`text-balance font-copy text-[28px] font-normal leading-[1.08] tracking-[-0.015em] transition-colors group-hover:text-accent md:text-[32px] lg:text-[36px] ${kicker ? 'mt-1.5' : ''}`}>
            {lead.richTitle || lead.title}
          </h3>
          {lead.excerpt && <p className={`mt-2 max-w-[52ch] ${SUMMARY_CLASS} text-[15px] leading-[1.5] md:text-[16px]`}>{lead.excerpt}</p>}
          <Byline authors={lead.authorLinks} date={dateOf(lead)} size="md" margin="mt-3" />
        </TransitionLink>
      </div>

      {rest.length > 0 && (
        <ul className={`mt-5 grid grid-cols-1 gap-x-6 sm:grid-cols-2 sm:gap-y-8 md:mt-7 ${cols} max-md:[&>li:nth-child(n+3)]:hidden max-sm:[&>li:last-child]:border-b-0 max-sm:[&>li:nth-child(2)]:border-b-0`}>
          {rest.map((s) => (
            <li key={s.id} className="border-b border-rule py-4 first:pt-0 sm:border-0 sm:py-0">
              <TransitionLink href={getArticleUrl(s)} className={`group flex flex-row-reverse items-start gap-4 sm:block ${focus}`}>
                {s.photo && (
                  <div className="relative aspect-[3/2] w-[112px] shrink-0 overflow-hidden bg-rule sm:mb-3 sm:w-auto">
                    <Image src={s.photo.src} alt={s.imageTitle || ''} fill sizes="(max-width: 639px) 112px, (max-width: 1023px) 50vw, 400px" className="object-cover" style={s.imageFocus ? { objectPosition: s.imageFocus } : undefined} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  {sectionKicker(s, sec) && <Kicker>{sectionKicker(s, sec)}</Kicker>}
                  <h3 className="line-clamp-3 font-copy text-[20px] font-normal leading-[1.15] transition-colors group-hover:text-accent sm:mt-1.5 sm:text-[22px] sm:leading-[1.14] lg:text-[24px]">
                    {s.richTitle || s.title}
                  </h3>
                  <Byline authors={s.authorLinks} date={dateOf(s)} size="sm" margin="mt-1.5 sm:mt-2" />
                </div>
              </TransitionLink>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * The pitch, two lines in the top's right column: "Have a suggestion?" and
 * "Tell Features about it →", opening an email to the Features desk. It asks
 * for tips (an event, a place, something worth checking out), not finished
 * stories, so it doesn't say "story" or "pitch". On a pinned photo (the
 * editor's pick, else the newest photo story's): see components/PhotoPitch.
 * It grows to fill its column (at least 124px tall with a photo).
 */
function Pitch({ photo }: { photo: PitchPhoto | null }) {
  return <PhotoPitch href={PITCH_MAILTO} question="Have a suggestion?" action="Tell Features about it" photo={photo} />;
}

/**
 * The top of the page, in three columns with thin rules between them: the
 * cover in the middle, at its largest; on the left, the two newest stories
 * with photos; on the right, the next four, listed with thumbnails, with
 * the pitch between the third and fourth, grown so the column ends level
 * with the others. Tablets: the cover across the page, the left two side by
 * side with their photos, the pitch as a bar across the page, then the
 * right column's first two side by side with their photos (its others go
 * to their sections on tablets). Phones: the cover, the left two as a list
 * with thumbnails, then the pitch; the right column's stories go to their
 * sections (see the per-width plans in FeaturesFront).
 */
function TopStories({ cover, left, right, pitch }: { cover: Story; left: Story[]; right: Story[]; pitch: PitchPhoto | null }) {
  const label = labelOf(cover);
  return (
    <section aria-labelledby="fp-top" className="grid grid-cols-1 gap-y-6 md:grid-cols-2 md:gap-x-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] lg:gap-x-0">
      <h2 id="fp-top" className="sr-only">
        Top stories
      </h2>

      {/* The cover, in the middle */}
      <article className="md:col-span-2 lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:border-x lg:border-rule lg:px-6">
        <TransitionLink href={getArticleUrl(cover)} tabIndex={-1} aria-hidden="true" className="block">
          <div className="relative aspect-[3/2] overflow-hidden bg-rule">
            <Image
              src={cover.photo!.src}
              alt=""
              fill
              preload
              fetchPriority="high"
              sizes="(max-width: 1023px) 100vw, 640px"
              className="object-cover"
              style={cover.imageFocus ? { objectPosition: cover.imageFocus } : undefined}
            />
          </div>
        </TransitionLink>
        {cover.imagePhotographer && <Credit>{credit(cover.imagePhotographer)}</Credit>}
        <TransitionLink href={getArticleUrl(cover)} className={`group mt-2 block text-center ${focus}`}>
          {label && <Kicker>{label}</Kicker>}
          <h3 className="mx-auto mt-2 max-w-[24ch] text-balance font-copy text-[30px] font-normal leading-[1.1] tracking-[-0.015em] transition-colors group-hover:text-accent md:text-[36px] lg:text-[38px]">
            {cover.richTitle || cover.title}
          </h3>
          {cover.excerpt && <p className={`mx-auto mt-3 max-w-[56ch] ${SUMMARY_CLASS} text-[15px] leading-[1.5] md:text-[16px]`}>{cover.excerpt}</p>}
          <Byline authors={cover.authorLinks} date={dateOf(cover)} size="md" margin="mt-3" className="text-center" />
        </TransitionLink>
      </article>

      {/* Left: the two newest with photos, each photo above its headline */}
      {left.length > 0 && (
        <ul className="md:col-span-2 md:grid md:grid-cols-2 md:gap-x-8 lg:col-span-1 lg:col-start-1 lg:row-start-1 lg:block lg:pr-6">
          {left.map((s) => (
            <li key={s.id} className="border-b border-rule py-4 first:pt-0 md:border-b-0 md:py-0 lg:[&+li]:mt-6">
              <TransitionLink href={getArticleUrl(s)} className={`group flex flex-row-reverse items-start gap-4 md:block ${focus}`}>
                <div className="relative aspect-[3/2] w-[112px] shrink-0 overflow-hidden bg-rule md:w-auto">
                  <Image src={s.photo!.src} alt={s.imageTitle || ''} fill sizes="(max-width: 767px) 112px, (max-width: 1023px) 50vw, 320px" className="object-cover" style={s.imageFocus ? { objectPosition: s.imageFocus } : undefined} />
                </div>
                <div className="min-w-0 flex-1 md:mt-3">
                  <h3 className="font-copy text-[20px] font-normal leading-[1.15] transition-colors group-hover:text-accent md:text-[22px]">{s.richTitle || s.title}</h3>
                  <Byline authors={s.authorLinks} date={dateOf(s)} size="sm" margin="mt-1.5" />
                </div>
              </TransitionLink>
            </li>
          ))}
        </ul>
      )}

      {/* Right: the next four, listed, each with a small square photo, the pitch
          between the third and fourth. The list is as tall as the row and the
          pitch takes up the slack, so the column ends level with the others.
          No dates, so bylines stay on one line. Phones show only the pitch;
          tablets show the block after this one instead. */}
      <ul className="flex flex-col md:max-lg:hidden lg:col-start-3 lg:row-start-1 lg:pl-6">
          {right.map((s, i) => (
            <React.Fragment key={s.id}>
            {i === 3 && (
              <li className="flex flex-1 flex-col border-b border-rule py-4 md:py-3">
                <Pitch photo={pitch} />
              </li>
            )}
            <li className={`border-b border-rule py-4 first:pt-0 last:border-b-0 md:py-3 md:last:pb-0 max-md:hidden`}>
              <TransitionLink href={getArticleUrl(s)} className={`group flex items-start gap-3 ${focus}`}>
                <div className="min-w-0 flex-1">
                  <h3 className="font-copy text-[19px] font-normal leading-[1.2] transition-colors group-hover:text-accent md:text-[18px]">{s.richTitle || s.title}</h3>
                  <Byline authors={s.authorLinks} size="sm" margin="mt-1" />
                </div>
                {s.photo && (
                  <div className="relative aspect-square w-[60px] shrink-0 overflow-hidden bg-rule">
                    <Image src={s.photo.src} alt="" fill sizes="60px" className="object-cover" style={s.imageFocus ? { objectPosition: s.imageFocus } : undefined} />
                  </div>
                )}
              </TransitionLink>
            </li>
            </React.Fragment>
          ))}
          {/* Fewer than four stories: the pitch goes at the end */}
          {right.length < 4 && (
            <li className="flex flex-1 flex-col py-4 md:py-3">
              <Pitch photo={pitch} />
            </li>
          )}
      </ul>

      {/* Tablets only: the pitch as a bar across the whole screen, edge to
          edge past the page's margins, then the right column's first two side
          by side, each photo above its headline */}
      <div className="hidden md:col-span-2 md:max-lg:block">
        <div className="mx-[calc(50%_-_50vw)] flex h-[150px] flex-col">
          <Pitch photo={pitch} />
        </div>
        {right.length > 0 && (
          <ul className="mt-6 grid grid-cols-2 gap-x-8">
            {right.slice(0, TOP_RIGHT_TABLET).map((s) => (
              <li key={s.id}>
                <TransitionLink href={getArticleUrl(s)} className={`group block ${focus}`}>
                  {s.photo && (
                    <div className="relative mb-3 aspect-[3/2] overflow-hidden bg-rule">
                      <Image src={s.photo.src} alt={s.imageTitle || ''} fill sizes="50vw" className="object-cover" style={s.imageFocus ? { objectPosition: s.imageFocus } : undefined} />
                    </div>
                  )}
                  <h3 className="font-copy text-[22px] font-normal leading-[1.15] transition-colors group-hover:text-accent">{s.richTitle || s.title}</h3>
                  <Byline authors={s.authorLinks} date={dateOf(s)} size="sm" margin="mt-1.5" />
                </TransitionLink>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/** A row of story cards: phones get a list with thumbnails on the right */
function CardsSection({ sec }: { sec: Section }) {
  const cols = sec.stories.length >= 4 ? 'lg:grid-cols-4' : sec.stories.length === 3 ? 'md:grid-cols-3' : '';
  return (
    <section aria-labelledby={sec.headingId} className={sectionGap}>
      <SectionHead sec={sec} />
      <ul className={`mt-4 grid grid-cols-1 gap-x-6 sm:mt-5 sm:grid-cols-2 sm:gap-y-8 ${cols} max-md:[&>li:nth-child(n+4)]:hidden max-sm:[&>li:last-child]:border-b-0 max-sm:[&>li:nth-child(3)]:border-b-0`}>
        {sec.stories.map((s) => (
          <li key={s.id} className="border-b border-rule py-4 first:pt-0 sm:border-0 sm:py-0">
            <TransitionLink href={getArticleUrl(s)} className={`group flex flex-row-reverse items-start gap-4 sm:block ${focus}`}>
              {s.photo && (
                <div className="relative aspect-[3/2] w-[112px] shrink-0 overflow-hidden bg-rule sm:mb-3 sm:w-auto">
                  <Image src={s.photo.src} alt={s.imageTitle || ''} fill sizes="(max-width: 639px) 112px, (max-width: 1023px) 50vw, 400px" className="object-cover" style={s.imageFocus ? { objectPosition: s.imageFocus } : undefined} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                {sectionKicker(s, sec) && <Kicker>{sectionKicker(s, sec)}</Kicker>}
                <h3 className="line-clamp-3 font-copy text-[20px] font-normal leading-[1.15] transition-colors group-hover:text-accent sm:mt-1.5 sm:text-[22px] sm:leading-[1.14] lg:text-[24px]">
                  {s.richTitle || s.title}
                </h3>
                <Byline authors={s.authorLinks} date={dateOf(s)} size="sm" margin="mt-1.5 sm:mt-2" className="lg:truncate" />
              </div>
            </TransitionLink>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ─────────────────────────── Photo Short Stories ───────────────────────────
 * A film reel, in the page's own colours (white, or dark in dark mode). A
 * photo story's photos (from its photo_gallery and carousel blocks, each with
 * its photographer's credit; a photo story on the site runs ten to fifteen)
 * run in one sideways rail, its title card first. The next two stories are
 * listed under it. The section title links to every photo story.
 */

const PSS_ARCHIVE = '/features/archive?section=photo';

type Frame = ReelFrame;
type PhotoStory = Story & { frames: Frame[] };
type PhotoStories = { hero: PhotoStory; rest: PhotoStory[] };

type LexicalNode = {
  type?: string;
  children?: LexicalNode[];
  value?: unknown;
  fields?: { blockType?: string; images?: { image?: unknown }[] };
};

type MediaLike = {
  url?: string | null;
  width?: number | null;
  height?: number | null;
  alt?: string | null;
  photographer?: unknown;
  writeInPhotographer?: string | null;
};

/** Every photo in a story's body, in order, each once */
function framesOf(content: unknown): Frame[] {
  const frames: Frame[] = [];
  const seen = new Set<string>();
  const add = (media: unknown) => {
    if (!media || typeof media !== 'object') return;
    const m = media as MediaLike;
    if (!m.url || !m.width || !m.height || seen.has(m.url)) return;
    seen.add(m.url);
    frames.push({ src: m.url, width: m.width, height: m.height, alt: m.alt || '', credit: credit(photographerOf(m)) });
  };
  const walk = (node: LexicalNode | undefined) => {
    if (!node) return;
    const block = node.fields?.blockType;
    if (node.type === 'block' && (block === 'photo_gallery' || block === 'carousel')) {
      for (const img of node.fields?.images ?? []) add(img.image);
    } else if (node.type === 'upload') {
      add(node.value);
    }
    node.children?.forEach(walk);
  };
  walk((content as { root?: LexicalNode } | null)?.root);
  return frames;
}

/** A story's photos, falling back to its featured image */
const photosOf = (s: PhotoStory): Frame[] =>
  s.frames.length ? s.frames : s.photo ? [{ ...s.photo, alt: s.imageTitle || '', credit: credit(s.imagePhotographer) }] : [];

const photoCount = (s: PhotoStory) => {
  const n = photosOf(s).length;
  return `${n} photo${n === 1 ? '' : 's'}`;
};

/** The section's title, a link to every photo story */
function PhotoStoriesHead() {
  return (
    <div className="border-b-2 border-rule-strong pb-1.5">
      <SectionTitle id="fp-photo" name={deptName('photo')!} href={PSS_ARCHIVE} />
    </div>
  );
}

/**
 * The next photo stories, as cards in proportion to the reel above: the
 * photo on the left (300px wide on desktop), then the photo count and date,
 * the headline and the byline. Side by side from tablet width; stacked on phones.
 * On tablets each card puts its photo on top at the column's full width, so
 * the two cards match whatever their headlines' lengths.
 */
function EarlierPhotoStories({ stories }: { stories: PhotoStory[] }) {
  if (!stories.length) return null;
  return (
    <ul className="grid grid-cols-1 gap-x-8 gap-y-5 border-t border-rule pt-5 md:grid-cols-2 md:pt-6">
      {stories.map((s) => (
        <li key={s.id}>
          <TransitionLink href={getArticleUrl(s)} className={`group flex items-center gap-4 md:flex-col md:items-stretch md:gap-3 lg:flex-row lg:items-center lg:gap-5 ${focus}`}>
            {s.photo && (
              <div className="relative aspect-[3/2] w-[140px] shrink-0 overflow-hidden bg-rule md:w-full lg:w-[300px]">
                <Image src={s.photo.src} alt="" fill sizes="(max-width: 767px) 140px, (max-width: 1023px) 50vw, 300px" className="object-cover" style={s.imageFocus ? { objectPosition: s.imageFocus } : undefined} />
              </div>
            )}
            <div className="min-w-0">
              <Kicker>
                {photoCount(s)} · {dateOf(s)}
              </Kicker>
              <h3 className="mt-1.5 text-balance font-copy text-[20px] font-normal leading-[1.12] transition-colors group-hover:text-accent md:text-[24px] lg:text-[28px]">
                {s.richTitle || s.title}
              </h3>
              <Byline authors={s.authorLinks} size="sm" margin="mt-2" />
            </div>
          </TransitionLink>
        </li>
      ))}
    </ul>
  );
}

function ReelPhotoStories({ pss }: { pss: PhotoStories }) {
  const { hero } = pss;
  const href = getArticleUrl(hero);
  const card = (
    // Centred top to bottom, so the middle of the text lines up with the middle of the photos
    <TransitionLink href={href} className={`group flex w-full flex-col justify-center pr-4 text-text-main md:pr-6 ${focus}`}>
      <Kicker>
        {photoCount(hero)} · {dateOf(hero)}
      </Kicker>
      <h3 className="mt-2 text-balance font-copy text-[30px] font-normal leading-[1.04] tracking-[-0.015em] transition-colors group-hover:text-accent md:text-[38px]">{hero.richTitle || hero.title}</h3>
      {hero.excerpt && <p className={`mt-3 ${SUMMARY_CLASS} text-[15px] leading-[1.5] md:text-[16px]`}>{hero.excerpt}</p>}
      <Byline authors={hero.authorLinks} size="sm" margin="mt-3" />
    </TransitionLink>
  );
  return (
    <section aria-labelledby="fp-photo" className="mx-[calc(50%_-_50vw)]">
      <div className="mx-auto max-w-[1280px] px-4 md:px-6 xl:px-[30px]">
        <PhotoStoriesHead />
      </div>
      <div className="mt-5 md:mt-6">
        <PhotoReel card={card} frames={photosOf(hero)} href={href} title={hero.title} />
      </div>
      {pss.rest.length > 0 && (
        <div className="mx-auto mt-4 max-w-[1280px] px-4 md:mt-6 md:px-6 xl:px-[30px]">
          <EarlierPhotoStories stories={pss.rest} />
        </div>
      )}
    </section>
  );
}

/* ─────────────────────────────── Loading ─────────────────────────────── */

const STORY_SELECT = {
  title: true, slug: true, subdeck: true, featuredImage: true, section: true, kicker: true,
  publishedDate: true, createdAt: true, authors: true, writeInAuthors: true, isFollytechnic: true,
} as const;
/** Only what bylines and photo credits read from populated authors and photos */
const POPULATE = {
  users: { firstName: true, lastName: true, slug: true },
  // filename: Payload builds an upload's url from it
  media: { filename: true, url: true, alt: true, width: true, height: true, focalX: true, focalY: true, title: true, photographer: true, writeInPhotographer: true },
} as const;

const toFront = (s: Story, photoCount?: number): FrontStory => ({
  id: Number(s.id),
  publishedAt: s.publishedDate || s.isoDate || null,
  hasPhoto: Boolean(s.photo),
  dept: s.dept,
  photoCount,
});

export default async function FeaturesFront({
  pins,
  pitchPhotoId = null,
  pitchPositions = NO_PITCH_POSITIONS,
}: {
  pins: FrontPins;
  pitchPhotoId?: number | null;
  /** Where the picked pitch photo sits on each screen; not used for the fallback photo */
  pitchPositions?: PitchPositions;
}) {
  const payload = await getPayload({ config });
  const published: Where[] = [{ section: { equals: 'features' } }, { _status: { equals: 'published' } }];

  // 1. The newest Features story (every window is measured from it), and the
  // photo the editor picked for the pitch, if any (it may since have been deleted)
  const [newest, pickedPhoto] = await Promise.all([
    payload.find({
      collection: 'articles',
      where: { and: published },
      sort: '-publishedDate',
      limit: 1,
      depth: 0,
      select: { publishedDate: true },
    }),
    pitchPhotoId != null ? payload.findByID({ collection: 'media', id: pitchPhotoId, depth: 1 }).catch(() => null) : Promise.resolve(null),
  ]);
  const anchorIso = newest.docs[0]?.publishedDate;
  if (!anchorIso) {
    return (
      <div className="mx-auto w-full max-w-[1280px] px-4 py-16 md:px-[30px]">
        <h1 className="sr-only">Features</h1>
        <p className="border-y border-rule py-16 text-center font-copy text-[22px] leading-[1.3] text-text-main">No articles found in this section yet.</p>
      </div>
    );
  }

  // 2. The year's stories, plus any pinned story older than that, so a stale
  // pin is found (and set aside) rather than silently missing
  const floor = new Date(Date.parse(anchorIso) - SECTION_WINDOW_DAYS * DAY_MS).toISOString();
  const pinIds = [pins.cover, pins.reel, ...Object.values(pins.leads)].filter((id): id is number => typeof id === 'number');
  const response = await payload.find({
    collection: 'articles',
    where: {
      and: [
        ...published,
        { or: [{ publishedDate: { greater_than_equal: floor } }, ...(pinIds.length ? [{ id: { in: pinIds } }] : [])] },
      ],
    },
    sort: '-publishedDate',
    limit: WINDOW_LIMIT,
    depth: 2,
    select: STORY_SELECT,
    populate: POPULATE,
  });

  const stories: Story[] = response.docs.flatMap((doc) => {
    const a = formatArticle(doc);
    if (!a) return [];
    const media = typeof doc.featuredImage === 'object' && doc.featuredImage ? doc.featuredImage : null;
    const photo = media?.url && media.width && media.height ? { src: media.url, width: media.width, height: media.height } : null;
    return [{ ...a, photo, dept: departmentOf(a.kicker) }];
  });
  const byId = new Map(stories.map((s) => [Number(s.id), s]));
  const front = stories.map((s) => toFront(s));

  // 3. The photo stories the reel might use: the pinned one and the newest few
  // (not the cover). Their bodies hold the photos, and the photo count decides
  // which one leads.
  const anchor = Date.parse(anchorIso);
  const coverId = pickCover(front, pins);
  const candidates = front
    .filter((s) => s.dept === 'photo' && s.hasPhoto && s.id !== coverId && isWithin(s.publishedAt, anchor, SECTION_WINDOW_DAYS))
    .slice(0, REEL_REST + 1)
    .map((s) => s.id);
  if (pins.reel != null && byId.get(pins.reel)?.dept === 'photo' && pins.reel !== coverId && !candidates.includes(pins.reel)) {
    candidates.unshift(pins.reel);
  }
  const bodies = candidates.length
    ? await payload.find({
        collection: 'articles',
        where: { id: { in: candidates } },
        limit: candidates.length,
        depth: 2,
        select: { content: true },
        populate: POPULATE,
      })
    : { docs: [] };
  const framesById = new Map(bodies.docs.map((d) => [Number(d.id), framesOf(d.content)]));
  const photoStoryOf = (id: number): PhotoStory | null => {
    const s = byId.get(id);
    return s ? { ...s, frames: framesById.get(id) ?? [] } : null;
  };

  // 4. The plan: cover, reel, then the three sections, each story once. The
  // top's right column lists four on desktop, two on tablets and none on
  // phones, so each width gets its own plan, in which the stories it leaves
  // out go to their sections.
  const planned = stories.map((s) => {
    const id = Number(s.id);
    return toFront(s, framesById.has(id) ? photosOf(photoStoryOf(id)!).length : undefined);
  });
  const plan = planFeaturesFront(planned, pins);
  const tabletPlan = planFeaturesFront(planned, pins, { topRight: TOP_RIGHT_TABLET });
  const phonePlan = planFeaturesFront(planned, pins, { topRight: 0 });
  const cover = plan.cover != null ? byId.get(plan.cover) ?? null : null;
  const top = {
    left: plan.top.left.map((id) => byId.get(id)!).filter(Boolean),
    right: plan.top.right.map((id) => byId.get(id)!).filter(Boolean),
  };
  const sectionsOf = (from: FrontPlan['sections'], idSuffix = ''): Section[] =>
    from.map((sec) => ({
      key: sec.key,
      name: deptName(sec.key)!,
      layout: sec.layout,
      stories: sec.ids.map((id) => byId.get(id)!).filter(Boolean),
      headingId: `fp-${sec.key}${idSuffix}`,
    }));
  const renderSections = (list: Section[]) =>
    list.map((sec) =>
      sec.layout === 'cards' ? <CardsSection key={sec.key} sec={sec} /> : <LeadSection key={sec.key} sec={sec} flip={sec.layout === 'photo-right'} />,
    );
  // The sections once per distinct plan: widths whose sections match share one
  // copy, and CSS shows each copy only at its widths
  const same = (a: FrontPlan, b: FrontPlan) => JSON.stringify(a.sections) === JSON.stringify(b.sections);
  const phoneIsTablet = same(phonePlan, tabletPlan);
  const tabletIsDesktop = same(tabletPlan, plan);
  const sectionCopies: { key: string; className: string; sections: Section[] }[] = [];
  if (!phoneIsTablet) sectionCopies.push({ key: 'phone', className: 'md:hidden', sections: sectionsOf(phonePlan.sections, '-phone') });
  if (!tabletIsDesktop)
    sectionCopies.push({
      key: 'tablet',
      className: phoneIsTablet ? 'lg:hidden' : 'max-md:hidden lg:hidden',
      sections: sectionsOf(tabletPlan.sections, '-tablet'),
    });
  sectionCopies.push({
    key: 'desktop',
    className: tabletIsDesktop ? (phoneIsTablet ? '' : 'max-md:hidden') : 'max-lg:hidden',
    sections: sectionsOf(plan.sections),
  });
  // The pitch's photo: the editor's pick, placed per screen in the editor, else
  // the newest photo story's at its focal point
  const newestPhotoStory = stories.find((s) => s.dept === 'photo' && s.photo);
  const pitch: PitchPhoto | null =
    pitchPhotoOf(pickedPhoto, pitchPositions) ??
    (newestPhotoStory?.photo
        ? {
            ...newestPhotoStory.photo,
            credit: credit(newestPhotoStory.imagePhotographer),
            vars: pitchPositionVars(NO_PITCH_POSITIONS, newestPhotoStory.imageFocus || undefined),
            maxZoom: 1,
          }
        : null);

  const hero = plan.reel.hero != null ? photoStoryOf(plan.reel.hero) : null;
  const pss: PhotoStories | null =
    hero && photosOf(hero).length >= REEL_MIN_PHOTOS
      ? { hero, rest: plan.reel.rest.map(photoStoryOf).filter((s): s is PhotoStory => s !== null) }
      : null;

  return (
    // overflow-x-clip: the reel's rail runs to the screen's edge, and 100vw is a
    // few pixels wider than the page on a desktop with a scrollbar
    <div className="overflow-x-clip text-text-main">
      <div className="mx-auto w-full max-w-[1280px] px-4 pb-6 pt-4 md:px-6 md:pt-6 xl:px-[30px]">
        <h1 className="sr-only">Features</h1>

        {/* ── 1. The top: the cover in the middle, the newest stories either side ── */}
        {cover && cover.photo && <TopStories cover={cover} left={top.left} right={top.right} pitch={pitch} />}

        {/* ── 2. The sections: Campus Life (cards), Arts & Culture (photo right), People (cards).
            Phones and tablets get their own copies when they differ, holding the stories the top's right column leaves out ── */}
        {sectionCopies.map((copy) =>
          copy.className ? (
            <div key={copy.key} className={copy.className}>
              {renderSections(copy.sections)}
            </div>
          ) : (
            <React.Fragment key={copy.key}>{renderSections(copy.sections)}</React.Fragment>
          ),
        )}

        {/* ── 3. Photo Short Stories: the film reel ── */}
        {pss && (
          <div className={sectionGap}>
            <ReelPhotoStories pss={pss} />
          </div>
        )}

        {/* ── 4. Search, the archive and contact, as on News ── */}
        <SectionSearchPrompt section="features" name="Features" question="Looking for an article" archiveHref="/features/archive" contactHref={FEATURES_MAILTO} archiveLabel="Browse all Features" spacing="mt-12 md:mt-14 lg:mt-16" headingSize="text-[26px] md:text-[34px] lg:text-[clamp(26px,2.6vw,32px)]" />
      </div>
    </div>
  );
}
