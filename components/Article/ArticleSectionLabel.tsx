import Link from 'next/link';
import type { Article } from '@/payload-types';

type Props = {
  section: Article['section'];
  kicker?: string | null;
  inverse?: boolean;
};

export function ArticleSectionLabel({ section, kicker, inverse = false }: Props) {
  const sectionLabel = section.charAt(0).toUpperCase() + section.slice(1);
  const trimmedKicker = kicker?.trim();
  const showKicker = trimmedKicker && trimmedKicker.toLowerCase() !== section.toLowerCase();

  return (
    <div data-article-section-label className="flex flex-col items-center gap-4 mb-1 text-center">
      <div className="flex flex-col items-center gap-1 mb-1">
        <Link
          href={`/${section}`}
          className="pointer-events-auto font-meta text-accent font-bold uppercase text-[16px] tracking-widest underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          {sectionLabel}
        </Link>
        {showKicker && (
          <span data-ie-field="kicker" className={`font-meta font-bold uppercase text-[16px] tracking-wide ${inverse ? 'text-white' : 'text-text-main'}`}>
            {trimmedKicker}
          </span>
        )}
      </div>
      <div aria-hidden="true" className={`w-8 border-t ${inverse ? 'border-white/70' : 'border-rule-strong'}`} />
    </div>
  );
}
