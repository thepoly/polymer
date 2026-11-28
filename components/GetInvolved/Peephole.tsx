import PhotoWindow, { type PhotoSource } from '@/components/PhotoWindow';

/*
 * The Get involved page shows one pinned photo through several openings: the
 * heading card, the meeting box and the buttons (the news tip box was one
 * until 2026-11-28; it's plain now, only its Copy button a window). Every
 * opening must use the same photo and the same position, or the photo won't
 * line up between them.
 *
 * The photo and its per-screen position come from the Get Involved Page global
 * (lib/getInvolvedPage.ts). The position reaches every opening as CSS
 * variables set once on the page (photoPositionVars), so client components
 * like CopyButton don't need it passed down.
 */
export type PagePhoto = PhotoSource & { alt: string; credit: string | null; maxZoom: number };

/** Focus point and zoom per screen size, read from the page's CSS variables. Phones, then md (tablets), then lg (desktop). */
export const PHOTO_POSITION_CLASSES =
  '[object-position:var(--photo-pos-m)] [transform-origin:var(--photo-pos-m)] [scale:var(--photo-zoom-m)] ' +
  'md:[object-position:var(--photo-pos-t)] md:[transform-origin:var(--photo-pos-t)] md:[scale:var(--photo-zoom-t)] ' +
  'lg:[object-position:var(--photo-pos-d)] lg:[transform-origin:var(--photo-pos-d)] lg:[scale:var(--photo-zoom-d)]';

/**
 * Turns the enclosing box into an opening onto the page photo. The box needs
 * `relative` (and no `@container`, transform or filter; see PhotoWindow), and
 * its own content needs `relative z-10`.
 *
 * `scrim` darkens the photo so white text stays readable. The default is kept
 * light on purpose, so more of the photo shows. Over a bright patch of photo
 * (white sky, snow), white text at black/35 drops below the 4.5:1 contrast
 * target, so check this against the real photo; black/55 is the lightest that
 * passes over pure white.
 */
export default function Peephole({ photo, scrim = 'bg-black/35' }: { photo: PagePhoto; scrim?: string }) {
  return (
    <PhotoWindow fill src={photo} alt="" maxZoom={photo.maxZoom} imageClassName={PHOTO_POSITION_CLASSES}>
      <div aria-hidden="true" className={`absolute inset-0 z-10 transition-colors ${scrim}`} />
    </PhotoWindow>
  );
}
