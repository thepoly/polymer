import Link from 'next/link';

type Props = {
  caption?: string | null;
  photographer?: string | null;
  photographerId?: string | number | null;
  photographerSlug?: string | null;
  className?: string;
};

export function ImageCaption({
  caption,
  photographer,
  photographerId,
  photographerSlug,
  className = 'mt-2',
}: Props) {
  if (!caption && !photographer) {
    return null;
  }

  return (
    <figcaption className={`image-caption-container font-meta text-[12px] italic text-text-muted transition-colors ${className}`}>
      {caption ? <span className="image-caption-text">{caption}</span> : null}
      {photographer && (
        <span className="image-caption-photographer opacity-60">
          {caption ? <span className="image-caption-space"> </span> : ''}
          {photographerId || photographerSlug ? (
            <Link href={`/staff/${photographerSlug || photographerId}`} className="hover:opacity-80 transition-opacity">
              {photographer}/The Polytechnic
            </Link>
          ) : (
            photographer
          )}
        </span>
      )}
    </figcaption>
  );
}
