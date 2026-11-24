import Image, { type StaticImageData } from 'next/image';
import type { ReactNode } from 'react';

/*
 * A photo window: the photo is pinned to the viewport and this box is a hole
 * the page scrolls past, so the photo stays still while everything around it
 * moves.
 *
 * Built as a `position: fixed` image clipped by the wrapper's `clip-path`,
 * not `background-attachment: fixed`, which iOS Safari and the iOS app's
 * WKWebView ignore. Two things break it:
 * - an ancestor with `transform`, `filter`, `perspective`, `contain`,
 *   `container-type` (Tailwind's `@container`) or `will-change` makes "fixed"
 *   relative to that ancestor instead of the viewport, so the photo slides
 *   with the box. Put any `@container` on a sibling wrapper instead;
 * - an ancestor that only clips with `overflow: hidden` doesn't clip a fixed
 *   child. When the window sits in something that animates its height (an
 *   accordion row, say), that container needs a `clip-path` too.
 *
 * With reduced motion the photo is an ordinary still that scrolls with the page.
 *
 * Give the box its size with `className`; put overlay content in `children`.
 */
/** A static import, or a media-library photo with its pixel size. */
export type PhotoSource = Pick<StaticImageData, 'src' | 'width' | 'height' | 'blurDataURL'>;

type Props = {
  src: PhotoSource;
  alt: string;
  /** CSS object-position, e.g. "50% 40%". Aims the crop, since only a slice of the photo shows. */
  focus?: string;
  /** Extra classes for the photo itself, e.g. responsive object-position or zoom. */
  imageClassName?: string;
  /** The most the photo is ever zoomed (CSS scale), so it downloads a big enough file. */
  maxZoom?: number;
  className?: string;
  children?: ReactNode;
  /**
   * Fill the nearest positioned ancestor instead of taking up space, to turn
   * an existing box into a window. Give that box `relative`, and put its own
   * content at `relative z-10` so it sits above the photo.
   */
  fill?: boolean;
};

export default function PhotoWindow({ src, alt, focus, imageClassName = '', maxZoom = 1, className = '', children, fill = false }: Props) {
  // The photo covers the whole viewport, so on a tall phone screen it's as wide
  // as the screen's height times the photo's aspect ratio, not 100vw; zooming
  // in needs more again. Without this, phones download a screen-width file and
  // stretch it.
  //
  // This is max(vw, coverWidth vh) written as a media condition: Safari before
  // WebKit bug 304915 ignores min()/max() in `sizes` and falls back to 100vw,
  // which would hand iPhones (and the iOS app) a file a fraction of the size
  // shown. The cover is height-bound when the screen is narrower than the photo.
  const zoom = Math.max(1, maxZoom);
  const coverWidth = Math.ceil((src.width / src.height) * 100 * zoom);
  const vw = Math.ceil(100 * zoom);
  const sizes = `(max-aspect-ratio: ${Math.round(src.width)}/${Math.round(src.height)}) ${coverWidth}vh, ${vw}vw`;
  return (
    <div className={`${fill ? 'absolute inset-0' : 'relative'} overflow-hidden bg-black [clip-path:inset(0)] ${className}`}>
      <Image
        src={src.src}
        width={src.width}
        height={src.height}
        alt={alt}
        sizes={sizes}
        placeholder={src.blurDataURL ? 'blur' : 'empty'}
        blurDataURL={src.blurDataURL}
        className={`pointer-events-none fixed inset-x-0 top-0 h-lvh w-full object-cover motion-reduce:absolute motion-reduce:inset-0 motion-reduce:h-full ${imageClassName}`}
        style={focus ? { objectPosition: focus } : undefined}
      />
      {children}
    </div>
  );
}
