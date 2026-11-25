import React from 'react';
import Image from 'next/image';
import { getPayload, type Where } from 'payload';
import config from '@/payload.config';
import { ChevronRight } from 'lucide-react';
import TransitionLink from '@/components/TransitionLink';
import PhotoWindow from '@/components/PhotoWindow';
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
  SECTION_WINDOW_DAYS,
  isWithin,
  pickCover,
  planFeaturesFront,
  type FrontPins,
  type FrontStory,
  type SectionKey,
  type SectionLayout,
} from '@/lib/featuresFront';

/*
 * /features, top to bottom (rendered by app/(frontend)/[section]/page.tsx,
 * which supplies the header and footer):
 *
 *   1. Cover story: its photo pinned behind a large white headline.
 *   2. Latest (no visible heading): the newest stories after the cover, from
 *      any section (so the page opens with the five newest). The lead's
 *      photo on the right beside its headline; the next three in a row
 *      underneath, each with its photo above its title.
 *   3. Three sections, one under another, each under its name, a link to the
 *      archive filtered to it:
 *      - Campus Life and Arts & Culture: a row of story cards (a list with
 *        thumbnails on phones);
 *      - People: the lead's photo on the left beside its headline, its other
 *        stories in a row underneath.
 *   4. Photo Short Stories: a film reel of a photo story's photos, the next
 *      two listed under it; its title links to every photo story.
 *   5. "Looking for an article?": search, the archive and contact, as on News.
 *
 * Which stories go where (and when the editor's pins give way) is decided by
 * planFeaturesFront in lib/featuresFront.ts; this file loads the stories and
 * renders the plan. Only the cover's photo is pinned to the screen; every
 * other photo scrolls with the page. See docs/features-section.md.
 */

const FEATURES_MAILTO =
  'mailto:features@poly.rpi.edu,eic@poly.rpi.edu?subject=Features%20Request%2FComment%20or%20Story%20Tip';
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

type Section = { key: SectionKey | 'latest'; name: string; layout: SectionLayout; stories: Story[] };

/** Where a section's title goes: the archive, filtered to the section (Latest: all of it) */
const archiveHref = (key: Section['key']) => (key === 'latest' ? '/features/archive' : `/features/archive?section=${key}`);

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

/**
 * A section's heading: its title (a link to all its stories) over a rule.
 * Latest has no visible heading, only one for screen readers.
 */
function SectionHead({ sec }: { sec: Section }) {
  if (sec.key === 'latest') {
    return (
      <h2 id="fp-latest" className="sr-only">
        {sec.name}
      </h2>
    );
  }
  return (
    <div className="border-b-2 border-rule-strong pb-1.5">
      <SectionTitle id={`fp-${sec.key}`} name={sec.name} href={archiveHref(sec.key)} />
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
 * way. Row 2: the section's other stories in a row, headline and byline only,
 * or (`rowImages`) each with its photo above its title (a thumbnail on the
 * right on phones). On phones the section shows three stories in all; the
 * title links to the rest.
 */
const ROW_ITEM = {
  text: 'border-b border-rule py-3.5 last:border-b-0 md:border-b-0 md:border-t md:border-rule-strong md:pb-0 md:pt-3',
  images: 'border-b border-rule py-3.5 last:border-b-0 md:border-b-0 md:py-0',
} as const;

function LeadSection({ sec, flip, rowImages = false }: { sec: Section; flip: boolean; rowImages?: boolean }) {
  const [lead, ...rest] = sec.stories;
  const kicker = sectionKicker(lead, sec);
  const cols = rest.length >= 3 ? 'md:grid-cols-3' : rest.length === 2 ? 'md:grid-cols-2' : '';
  return (
    <section aria-labelledby={`fp-${sec.key}`} className={sectionGap}>
      <SectionHead sec={sec} />
      <div className={`grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-8 lg:gap-10 ${sec.key === 'latest' ? '' : 'mt-4 md:mt-5'}`}>
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
          {lead.excerpt && <p className="mt-2 max-w-[52ch] font-copy text-[17px] leading-[1.45] text-text-muted md:text-[18px]">{lead.excerpt}</p>}
          <Byline authors={lead.authorLinks} date={dateOf(lead)} size="md" margin="mt-3" />
        </TransitionLink>
      </div>

      {rest.length > 0 && (
        <ul className={`mt-5 grid grid-cols-1 border-t border-rule-strong md:gap-x-8 ${rowImages ? 'md:mt-7 md:gap-y-8' : ''} md:border-t-0 ${cols} max-md:[&>li:nth-child(n+3)]:hidden`}>
          {rest.map((s) => (
            <li key={s.id} className={rowImages ? ROW_ITEM.images : ROW_ITEM.text}>
              <TransitionLink href={getArticleUrl(s)} className={`group ${rowImages ? 'flex flex-row-reverse items-start gap-4 md:block' : 'block'} ${focus}`}>
                {rowImages && s.photo && (
                  <div className="relative aspect-[3/2] w-[112px] shrink-0 overflow-hidden bg-rule md:mb-3 md:w-auto">
                    <Image src={s.photo.src} alt={s.imageTitle || ''} fill sizes="(max-width: 767px) 112px, 400px" className="object-cover" style={s.imageFocus ? { objectPosition: s.imageFocus } : undefined} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  {sectionKicker(s, sec) && <Kicker>{sectionKicker(s, sec)}</Kicker>}
                  <h3 className="font-copy text-[20px] font-normal leading-[1.15] transition-colors group-hover:text-accent lg:text-[22px]">
                    {s.richTitle || s.title}
                  </h3>
                  <Byline authors={s.authorLinks} date={dateOf(s)} size="sm" margin="mt-1.5" />
                </div>
              </TransitionLink>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** A row of story cards: phones get a list with thumbnails on the right */
function CardsSection({ sec }: { sec: Section }) {
  const cols = sec.stories.length >= 4 ? 'lg:grid-cols-4' : sec.stories.length === 3 ? 'md:grid-cols-3' : '';
  return (
    <section aria-labelledby={`fp-${sec.key}`} className={sectionGap}>
      <SectionHead sec={sec} />
      <ul className={`grid grid-cols-1 gap-x-6 sm:grid-cols-2 sm:gap-y-8 ${sec.key === 'latest' ? '' : 'mt-4 sm:mt-5'} ${cols} max-md:[&>li:nth-child(n+4)]:hidden`}>
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

/** A media item's photographer, as a staff member or a write-in */
const photographerOf = (m: MediaLike): string | null => {
  const p = m.photographer;
  if (p && typeof p === 'object' && 'firstName' in p) {
    const { firstName, lastName } = p as { firstName?: string; lastName?: string };
    const name = [firstName, lastName].filter(Boolean).join(' ');
    if (name) return name;
  }
  return m.writeInPhotographer?.trim() || null;
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

/** The next photo stories as short rows: a thumbnail, the headline, the date and photo count */
function EarlierPhotoStories({ stories }: { stories: PhotoStory[] }) {
  if (!stories.length) return null;
  return (
    <ul className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
      {stories.map((s) => (
        <li key={s.id} className="border-t border-rule py-3">
          <TransitionLink href={getArticleUrl(s)} className={`group flex items-center gap-4 ${focus}`}>
            {s.photo && (
              <div className="relative aspect-[3/2] w-[96px] shrink-0 overflow-hidden bg-rule">
                <Image src={s.photo.src} alt="" fill sizes="96px" className="object-cover" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="font-copy text-[19px] leading-[1.15] transition-colors group-hover:text-accent md:text-[20px]">{s.richTitle || s.title}</h3>
              <p className="mt-1 font-meta text-[12px] text-text-muted">
                {dateOf(s)} · {photoCount(s)}
              </p>
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
      {hero.excerpt && <p className="mt-3 font-copy text-[16px] leading-[1.4] text-text-muted md:text-[17px]">{hero.excerpt}</p>}
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

export default async function FeaturesFront({ pins }: { pins: FrontPins }) {
  const payload = await getPayload({ config });
  const published: Where[] = [{ section: { equals: 'features' } }, { _status: { equals: 'published' } }];

  // 1. The newest Features story: every window is measured from it
  const newest = await payload.find({
    collection: 'articles',
    where: { and: published },
    sort: '-publishedDate',
    limit: 1,
    depth: 0,
    select: { publishedDate: true },
  });
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

  // 4. The plan: cover, reel, then the three sections, each story once
  const plan = planFeaturesFront(
    stories.map((s) => {
      const id = Number(s.id);
      return toFront(s, framesById.has(id) ? photosOf(photoStoryOf(id)!).length : undefined);
    }),
    pins,
  );
  const cover = plan.cover != null ? byId.get(plan.cover) ?? null : null;
  const latest: Section | null = plan.latest
    ? {
        key: 'latest',
        name: 'Latest',
        layout: plan.latest.lead != null ? 'photo-right' : 'cards',
        stories: plan.latest.ids.map((id) => byId.get(id)!).filter(Boolean),
      }
    : null;
  const sections: Section[] = plan.sections.map((sec) => ({
    key: sec.key,
    name: deptName(sec.key)!,
    layout: sec.layout,
    stories: sec.ids.map((id) => byId.get(id)!).filter(Boolean),
  }));
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

        {/* ── 1. Cover story: the photo stays still while the headline scrolls over it ── */}
        {cover && cover.photo && (
          <TransitionLink href={getArticleUrl(cover)} className={`group block ${focus}`}>
            <PhotoWindow
              src={cover.photo}
              alt={cover.imageTitle || ''}
              focus={cover.imageFocus || undefined}
              priority
              // 80vh asks a 3x phone for a 2048px file (110vh would be 3840)
              maxSizesVh={80}
              // A minimum, not a fixed height: on a short window (or zoomed in) the
              // box grows to fit its text instead of the text running off the top.
              // The text is centred, the same space above it as below. On desktop
              // the cover runs to the bottom of the window on load (it starts
              // 166px down, under the header; 180px leaves the 22px section gap
              // just off screen), so the next story doesn't peek in under it.
              className="flex min-h-[clamp(380px,64vh,660px)] flex-col justify-center lg:min-h-[calc(100svh_-_180px)]"
            >
              <div aria-hidden="true" className="absolute inset-0 z-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-colors group-hover:from-black/90" />
              {cover.imagePhotographer && (
                <span className="absolute right-2 top-2 z-10 bg-black/55 px-2 py-1 font-meta text-[11px] leading-none tracking-[0.02em] text-white md:right-3 md:top-3">
                  {credit(cover.imagePhotographer)}
                </span>
              )}
              <div className="relative z-10 px-5 py-8 text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.45)] md:px-8 md:py-10 lg:px-10 lg:py-12">
                <Kicker light>Cover story{labelOf(cover) ? ` · ${labelOf(cover)}` : ''}</Kicker>
                <h2 className="mt-3 max-w-[18ch] text-balance font-copy text-[clamp(34px,8vw,44px)] font-normal leading-[0.98] tracking-[-0.02em] md:text-[clamp(44px,7vh,60px)] lg:text-[clamp(52px,8.5vh,76px)]">
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

        {/* ── 2. Latest: the newest stories from every section ── */}
        {latest &&
          (latest.layout === 'cards' ? <CardsSection sec={latest} /> : <LeadSection sec={latest} flip rowImages />)}

        {/* ── 3. The sections: Campus Life and Arts & Culture (cards), People (photo left) ── */}
        {sections.map((sec) =>
          sec.layout === 'cards' ? (
            <CardsSection key={sec.key} sec={sec} />
          ) : (
            <LeadSection key={sec.key} sec={sec} flip={sec.layout === 'photo-right'} />
          ),
        )}

        {/* ── 4. Photo Short Stories: the film reel ── */}
        {pss && (
          <div className={sectionGap}>
            <ReelPhotoStories pss={pss} />
          </div>
        )}

        {/* ── 5. Search, the archive and contact, as on News, and a pitch ── */}
        <SectionSearchPrompt section="features" name="Features" question="Looking for an article" archiveHref="/features/archive" contactHref={FEATURES_MAILTO} archiveLabel="Browse all Features" spacing="mt-5 md:mt-6" />
        <p className="mt-1 text-center font-meta text-[15px] text-text-muted">
          Have a story Features should tell?{' '}
          <a href={FEATURES_MAILTO} className="inline-flex min-h-11 items-center font-medium text-accent underline-offset-4 hover:underline">
            Pitch it to us →
          </a>
        </p>
      </div>
    </div>
  );
}
