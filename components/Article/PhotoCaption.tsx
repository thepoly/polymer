import { Fragment } from 'react';
import Link from 'next/link';
import { Media, User } from '@/payload-types';
import type { CaptionCorner, CaptionTone } from '@/lib/imageLuminance';

/**
 * One entry in a photo gallery / carousel. `credit` is the block-level
 * override; when it is empty the photographer stored on the media record is
 * used instead, mirroring how the inline `upload` node resolves credit in
 * RichTextParser.
 */
export type CreditedImage = {
  image: Media | number;
  caption?: string | null;
  credit?: (User | number)[] | User | number | null;
};

export type PopulatedCreditedImage = Omit<CreditedImage, 'image'> & { image: Media };

const toArray = <T,>(value: T | T[] | null | undefined): T[] => {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
};

/**
 * Resolve who shot one photo. Precedence matches the inline upload node: an
 * explicit block-level `credit` wins, otherwise the media record's
 * `photographer`, otherwise its `writeInPhotographer` free-text.
 */
export function resolveCredit(entry: PopulatedCreditedImage): {
  staff: User[];
  writeIn: string | null;
} {
  const explicit = toArray(entry.credit).filter(
    (c): c is User => typeof c === 'object' && c !== null,
  );
  if (explicit.length) return { staff: explicit, writeIn: null };

  const { photographer } = entry.image;
  if (photographer && typeof photographer === 'object') {
    return { staff: [photographer as User], writeIn: null };
  }

  const writeIn = (entry.image as unknown as Record<string, unknown>)
    .writeInPhotographer as string | null | undefined;
  return { staff: [], writeIn: writeIn || null };
}

/**
 * The rendered caption line as plain text. Used to work out how much of a
 * photo the overlaid caption covers before sampling that area's brightness,
 * so it has to match what PhotoCaption actually renders.
 */
export function captionPlainText(entry: PopulatedCreditedImage): string {
  const { staff, writeIn } = resolveCredit(entry);
  const credit = staff.length
    ? `${staff.map((u) => `${u.firstName} ${u.lastName}`).join(', ')}/The Polytechnic`
    : (writeIn ?? '');
  return [entry.caption, credit].filter(Boolean).join(' ');
}

type Props = {
  entry: PopulatedCreditedImage;
  className?: string;
  /**
   * Set when the caption is laid over the photo instead of sitting beneath it.
   * The value is the brightness of the pixels it covers, which picks white or
   * black text.
   */
  tone?: CaptionTone;
  /** Which bottom corner an overlaid caption sits in. Ignored without `tone`. */
  corner?: CaptionCorner;
};

/**
 * The caption + credit line that sits under a single gallery or carousel
 * photo. Several photographers on one photo share a single "/The Polytechnic"
 * suffix, so a co-shot frame reads "A, B, C/The Polytechnic".
 */
export function PhotoCaption({ entry, className = '', tone, corner = 'left' }: Props) {
  const { caption } = entry;
  const { staff, writeIn } = resolveCredit(entry);
  if (!caption && !staff.length && !writeIn) return null;

  // Below the photo the caption follows the page's muted body colour. Over the
  // photo it has to carry itself, so it goes flat white or flat black with a
  // matching shadow to hold an edge against busy detail.
  const toneClasses = tone
    ? tone === 'light'
      ? 'text-white [text-shadow:0_1px_3px_rgb(0_0_0/0.55)]'
      : 'text-black [text-shadow:0_1px_3px_rgb(255_255_255/0.55)]'
    : 'text-text-muted';

  const alignClass = tone && corner === 'right' ? 'text-right' : '';

  return (
    <figcaption
      className={`font-meta text-[12px] italic transition-colors ${toneClasses} ${alignClass} ${className}`}
    >
      {caption}
      {(staff.length > 0 || writeIn) && (
        <span className={tone ? 'opacity-80' : 'opacity-60'}>
          {caption ? ' ' : ''}
          {staff.map((user, i) => (
            <Fragment key={user.id}>
              {i > 0 ? ', ' : ''}
              <Link
                href={`/staff/${user.slug || user.id}`}
                className="hover:opacity-80 transition-opacity"
              >
                {user.firstName} {user.lastName}
              </Link>
            </Fragment>
          ))}
          {staff.length > 0 ? '/The Polytechnic' : writeIn}
        </span>
      )}
    </figcaption>
  );
}
