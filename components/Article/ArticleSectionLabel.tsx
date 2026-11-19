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
        <span className="font-meta text-accent font-bold uppercase text-[16px] tracking-widest">
          {sectionLabel}
        </span>
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
