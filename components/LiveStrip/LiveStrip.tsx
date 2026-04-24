import Link from "next/link";

export type LiveArticleStripEntry = {
  id: string;
  slug: string;
  section: string;
  lastUpdatedLabel?: string;
  imageUrl?: string;
};

interface LiveStripProps {
  entries: LiveArticleStripEntry[];
}

export default function LiveStrip({ entries }: LiveStripProps) {
  if (!entries || entries.length === 0) return null;

  return (
    <section aria-label="Updated stories" className="w-full">
      <div
        className="scrollbar-hide flex flex-nowrap items-baseline justify-center gap-6 overflow-x-auto sm:gap-8"
        style={{ paddingTop: "10px", paddingBottom: "10px" }}
      >
        {entries.map((entry) => (
          <Link
            key={entry.id}
            href={`/live/${entry.slug}`}
            className="inline-flex shrink-0 items-baseline gap-2.5 whitespace-nowrap focus-visible:outline-none"
          >
            <span className="font-copy text-[14px] font-semibold leading-none tracking-[-0.005em] text-text-main sm:text-[15px]">
              {entry.section}
            </span>
            {entry.lastUpdatedLabel && (
              <span className="font-meta text-[12px] font-medium leading-none tracking-[0.02em] text-text-muted">
                {entry.lastUpdatedLabel}
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
