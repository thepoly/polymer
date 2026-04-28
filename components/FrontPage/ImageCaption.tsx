type Props = {
  caption?: string | null;
  photographer?: string | null;
  /** Kept for callsite compatibility; ignored — see note below. */
  photographerId?: string | number | null;
  photographerSlug?: string | null;
  className?: string;
};

// All current callers render this caption inside an article-wide
// <TransitionLink>. Wrapping the photographer in a separate <Link> produces a
// nested <a>, which is invalid HTML and triggers a hydration error. The
// photographer is reachable from the article detail page, so on cards we
// render the credit as plain text.
export function ImageCaption({
  caption,
  photographer,
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
          {photographer}/The Polytechnic
        </span>
      )}
    </figcaption>
  );
}
