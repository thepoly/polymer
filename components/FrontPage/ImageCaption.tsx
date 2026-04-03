import Link from 'next/link';

type Props = {
  caption?: string | null;
  photographer?: string | null;
  photographerId?: string | number | null;
  className?: string;
};

export function ImageCaption({
  caption,
  photographer,
  photographerId,
  className = 'mt-2',
}: Props) {
  if (!caption && !photographer) {
    return null;
  }

  return (
    <figcaption className={`font-meta text-[12px] italic text-text-muted transition-colors ${className}`}>
      {caption}
      {photographer && (
        <span className="opacity-60">
          {caption ? ' ' : ''}
          {photographerId ? (
            <Link href={`/staff/${photographerId}`} className="hover:opacity-80 transition-opacity">
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
