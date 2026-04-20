import Link from "next/link";

export type LiveArticleStripEntry = {
  id: string;
  slug: string;
  section: string;
};

interface LiveStripProps {
  entries: LiveArticleStripEntry[];
}

/**
 * LiveStrip
 *
 * A horizontal strip rendered between the site header's bottom rule and the
 * homepage grid. Each entry pairs a small red sans-serif "LIVE" pill (with a
 * gently pulsing dot) with a serif section label — matching the paper's
 * editorial aesthetic (Minion Pro headlines, Raleway meta).
 *
 * On narrow viewports the strip becomes horizontally scrollable rather than
 * wrapping, so the editorial rhythm stays intact.
 */
export default function LiveStrip({ entries }: LiveStripProps) {
  if (!entries || entries.length === 0) return null;

  return (
    <section
      aria-label="Live coverage"
      className="w-full border-b border-rule bg-bg-main"
    >
      <div className="mx-auto max-w-[1280px] px-4 md:px-6 xl:px-[30px]">
        <div className="scrollbar-hide -mx-1 flex flex-nowrap items-center gap-0 overflow-x-auto py-2 sm:py-2.5">
          {entries.map((entry, i) => (
            <div
              key={entry.id}
              className="flex shrink-0 items-center whitespace-nowrap"
            >
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className="mx-3 h-4 w-px shrink-0 bg-rule sm:mx-4"
                />
              )}
              <Link
                href={`/live/${entry.slug}`}
                className="group flex items-center gap-2 px-1 py-0.5 transition-opacity hover:opacity-80 focus-visible:opacity-80 focus-visible:outline-none"
              >
                <span className="font-meta inline-flex items-center gap-1.5 rounded-sm bg-[#D6001C] px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none tracking-[0.14em] text-white">
                  <span
                    aria-hidden="true"
                    className="live-strip-dot inline-block h-1.5 w-1.5 rounded-full bg-white"
                  />
                  Live
                </span>
                <span className="font-copy text-[15px] font-semibold leading-tight text-text-main group-hover:text-accent sm:text-[16px]">
                  {entry.section}
                </span>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
