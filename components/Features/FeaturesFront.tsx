import React from 'react';
import Image from 'next/image';
import { getPayload } from 'payload';
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

/*
 * /features, top to bottom (rendered by app/(frontend)/[section]/page.tsx,
 * which supplies the header and footer):
 *
 *   1. Cover story: its photo pinned behind a large white headline. The
 *      editor's pinned lead (the Features layout's first featured slot), or
 *      the newest story with a photo.
 *   2. Three sections, one under another (Campus Life, Arts & Culture,
 *      People; see lib/featuresDepartments.ts), all under the same heading:
 *      the section's name, a link to the archive filtered to it:
 *      - first: the lead story and the section's other stories listed on
 *        the left, the lead's photo on the right;
 *      - second: a row of story cards (a list with thumbnails on phones);
 *      - third: like the first, with the photo on the left.
 *   3. Photo Short Stories: a film reel of the newest photo story's photos,
 *      the next two listed under it; its title links to every photo story.
 *   Only the cover's photo is pinned; every other photo scrolls normally.
 *   4. "Looking for an article?": search, the archive and contact, as on News.
 * Every story appears once. Sections come from kickers
 * (lib/featuresDepartments.ts); see docs/features-section.md.
 */

const FEATURES_MAILTO =
  'mailto:features@poly.rpi.edu,eic@poly.rpi.edu?subject=Features%20Request%2FComment%20or%20Story%20Tip';
const focus = 'focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2';

type Photo = { src: string; width: number; height: number };
type Story = ComponentArticle & { photo: Photo | null; dept: FeaturesDepartmentKey | null };

const deptName = (key: FeaturesDepartmentKey | null) => FEATURES_DEPARTMENTS.find((d) => d.key === key)?.name ?? null;
const dateOf = (a: ComponentArticle) => shortDate(a.publishedDate || a.isoDate);
const labelOf = (s: Story) => deptName(s.dept) || s.kicker;

/** Section label, red small caps, as on the cards */
function Kicker({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p className={`font-meta text-[12px] font-semibold uppercase tracking-[0.12em] ${light ? 'text-white' : 'text-accent'}`}>{children}</p>
  );
}

type Section = {
  key: string;
  name: string;
  layout: 'photo-left' | 'photo-right' | 'regular';
  stories: Story[];
};

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
 * the Features archive with that section's filter on. The chevron says so;
 * screen readers hear "Campus Life, all stories".
 */
function SectionTitle({ id, name, href }: { id: string; name: string; href: string }) {
  return (
    <h2 className="min-w-0 font-meta text-[22px] uppercase tracking-[0.04em] text-text-main md:text-[26px]" style={{ fontWeight: 500 }}>
      <TransitionLink href={href} className={`group inline-flex items-center gap-1.5 transition-colors hover:text-accent ${focus}`}>
        <span id={id}>{name}</span>
        <span className="sr-only">, all stories</span>
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
      <SectionTitle id={`fp-${sec.key}`} name={sec.name} href={`/features/archive?section=${sec.key}`} />
    </div>
  );
}

/**
 * One half: the lead story's photo, stretched to the height of the other
 * half, which holds the lead's headline and then the section's other stories.
 * `flip` puts the photo on the right; on phones it comes first either way.
 * An ordinary photo that scrolls with the page: only the cover's is pinned.
 */
function LeadSection({ sec, flip }: { sec: Section; flip: boolean }) {
  const [lead, ...rest] = sec.stories;
  const kicker = sectionKicker(lead, sec);
  return (
    <section aria-labelledby={`fp-${sec.key}`} className={sectionGap}>
      <SectionHead sec={sec} />
      <div className="mt-4 grid grid-cols-1 gap-4 md:mt-5 md:grid-cols-2 md:gap-8 lg:gap-10">
        <TransitionLink href={getArticleUrl(lead)} tabIndex={-1} aria-hidden="true" className={`block ${flip ? 'md:order-2' : ''}`}>
          <div className="relative aspect-[3/2] overflow-hidden bg-rule md:aspect-auto md:h-full md:min-h-[340px]">
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

        <div className={`min-w-0 ${flip ? 'md:order-1' : ''}`}>
          <TransitionLink href={getArticleUrl(lead)} className={`group block ${focus}`}>
            {kicker && <Kicker>{kicker}</Kicker>}
            <h3 className={`text-balance font-copy text-[28px] font-normal leading-[1.08] tracking-[-0.015em] transition-colors group-hover:text-accent md:text-[32px] lg:text-[36px] ${kicker ? 'mt-1.5' : ''}`}>
              {lead.richTitle || lead.title}
            </h3>
            {lead.excerpt && <p className="mt-2 max-w-[52ch] font-copy text-[17px] leading-[1.45] text-text-muted md:text-[18px]">{lead.excerpt}</p>}
            <Byline authors={lead.authorLinks} date={dateOf(lead)} size="md" margin="mt-3" />
          </TransitionLink>
          {rest.length > 0 && (
            <ul className="mt-5 border-t border-rule-strong">
              {rest.map((s) => (
                <li key={s.id} className="border-b border-rule py-3.5 last:border-b-0 last:pb-0">
                  <TransitionLink href={getArticleUrl(s)} className={`group block ${focus}`}>
                    {sectionKicker(s, sec) && <Kicker>{sectionKicker(s, sec)}</Kicker>}
                    <h3 className="font-copy text-[20px] font-normal leading-[1.15] transition-colors group-hover:text-accent lg:text-[22px]">
                      {s.richTitle || s.title}
                    </h3>
                    <Byline authors={s.authorLinks} date={dateOf(s)} size="sm" margin="mt-1.5" />
                  </TransitionLink>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Photo Short Stories ───────────────────────────
 * A film reel, in the page's own colours (white, or dark in dark mode). The
 * newest photo story's photos (from its photo_gallery and carousel blocks; a
 * photo story on the site runs ten to fifteen) run in one sideways rail, its
 * title card first. The next two stories are listed under it. The section
 * title links to every photo story (the archive, filtered to them).
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

/** Every photo in a story's body, in order, each once */
function framesOf(content: unknown): Frame[] {
  const frames: Frame[] = [];
  const seen = new Set<string>();
  const add = (media: unknown) => {
    if (!media || typeof media !== 'object') return;
    const m = media as { url?: string | null; width?: number | null; height?: number | null; alt?: string | null };
    if (!m.url || !m.width || !m.height || seen.has(m.url)) return;
    seen.add(m.url);
    frames.push({ src: m.url, width: m.width, height: m.height, alt: m.alt || '' });
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
  s.frames.length ? s.frames : s.photo ? [{ ...s.photo, alt: s.imageTitle || '' }] : [];

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
        <li key={s.id} className="border-t py-3 border-rule">
          <TransitionLink href={getArticleUrl(s)} className={`group flex items-center gap-4 ${focus}`}>
            {s.photo && (
              <div className="relative aspect-[3/2] w-[96px] shrink-0 overflow-hidden bg-rule">
                <Image src={s.photo.src} alt="" fill sizes="96px" className="object-cover" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="font-copy text-[19px] leading-[1.15] transition-colors md:text-[20px] group-hover:text-accent">{s.richTitle || s.title}</h3>
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
      {hero.excerpt && <p className="mt-3 font-copy text-[16px] leading-[1.4] md:text-[17px] text-text-muted">{hero.excerpt}</p>}
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
        <div className="mx-auto mt-6 max-w-[1280px] px-4 md:mt-8 md:px-6 xl:px-[30px]">
          <EarlierPhotoStories stories={pss.rest} />
        </div>
      )}
    </section>
  );
}

export default async function FeaturesFront({ leadId = null }: { leadId?: number | null }) {
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
  // The cover: the editor's pinned lead when it has a photo, else the newest with one
  const withPhoto = stories.filter((s) => s.photo);
  const pinned = leadId != null ? withPhoto.find((s) => String(s.id) === String(leadId)) : undefined;
  const [cover] = take(pinned ? [pinned] : withPhoto, 1);

  // Three sections, one under another: Campus Life, Arts & Culture, People.
  // A section needs at least MIN stories left after the cover; one that's
  // short is left out until it has enough.
  const MIN = 3;
  const fresh = (list: Story[]) => list.filter((s) => !shown.has(s.id));
  const group = (key: FeaturesDepartmentKey) => {
    const all = stories.filter((s) => s.dept === key);
    return { key, name: deptName(key)!, all, pool: fresh(all) };
  };
  const chosen = (['campus', 'arts', 'people'] as const).map(group).filter((c) => c.pool.length >= MIN);
  // The first and third sections lead with a story and its photo (photo on the
  // right, then the left) and list up to four more; the middle one is a regular
  // row of up to four cards. A photo section with no photo falls back to a
  // regular row.
  const sections: Section[] = chosen.map((c, i) => {
    const lead = i !== 1 ? c.pool.find((s) => s.photo) : undefined;
    if (lead) {
      const picked = [lead, ...c.pool.filter((s) => s !== lead)].slice(0, 5);
      picked.forEach((s) => shown.add(s.id));
      return { ...c, layout: i === 0 ? 'photo-right' : 'photo-left', stories: picked };
    }
    return { ...c, layout: 'regular', stories: take(c.pool, 4) };
  });

  // Photo Short Stories, under the three. The newest few that aren't already
  // higher up (the cover may be one), with the photos from their bodies. The
  // hero is the newest with at least three photos; the next two follow.
  const pssAll = stories.filter((s) => s.dept === 'photo');
  const pssPool = fresh(pssAll).filter((s) => s.photo).slice(0, 6);
  const bodies = pssPool.length
    ? await payload.find({
        collection: 'articles',
        where: { id: { in: pssPool.map((s) => s.id) } },
        limit: pssPool.length,
        depth: 1,
        select: { content: true },
      })
    : { docs: [] };
  const framesById = new Map(bodies.docs.map((d) => [d.id, framesOf(d.content)]));
  const photoStories: PhotoStory[] = pssPool.map((s) => ({ ...s, frames: framesById.get(Number(s.id)) ?? [] }));
  const hero = photoStories.find((s) => photosOf(s).length >= 3) ?? photoStories[0];
  const pss: PhotoStories | null = hero
    ? { hero, rest: photoStories.filter((s) => s !== hero).slice(0, 2) }
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
            <section key={sec.key} aria-labelledby={`fp-${sec.key}`} className={sectionGap}>
              <SectionHead sec={sec} />
              {/* Phones: a list, each story's photo a thumbnail on the right. Wider: a row of cards. */}
              <ul className={`mt-4 grid grid-cols-1 gap-x-6 sm:mt-5 sm:grid-cols-2 sm:gap-y-8 ${sec.stories.length >= 4 ? 'lg:grid-cols-4' : 'md:grid-cols-3'}`}>
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
                        <h3 className="font-copy text-[20px] font-normal leading-[1.15] transition-colors group-hover:text-accent sm:mt-1.5 sm:text-[22px] sm:leading-[1.14] lg:text-[24px]">
                          {s.richTitle || s.title}
                        </h3>
                        <Byline authors={s.authorLinks} date={dateOf(s)} size="sm" margin="mt-1.5 sm:mt-2" />
                      </div>
                    </TransitionLink>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <LeadSection key={sec.key} sec={sec} flip={sec.layout === 'photo-right'} />
          ),
        )}

        {/* ── 3. Photo Short Stories: the film reel ── */}
        {pss && (
          <div className={sectionGap}>
            <ReelPhotoStories pss={pss} />
          </div>
        )}

        {/* ── 4. Search, the archive and contact, as on News, under a Features heading ── */}
        <SectionSearchPrompt section="features" name="Features" question="Looking for an article" archiveHref="/features/archive" contactHref={FEATURES_MAILTO} archiveLabel="Browse all Features" spacing="mt-5 md:mt-6" />
      </div>
    </div>
  );
}
