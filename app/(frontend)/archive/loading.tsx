import Header from '@/components/Header'
import Footer from '@/components/Footer'

/**
 * Loading state for /archive while the server gathers the publication-date
 * index, per-day counts, and initial day's article list (12K+ rows total —
 * a few seconds on a cold cache). Mirrors the live archive page's masthead
 * + timeline + article-list silhouette so the swap-in is seamless.
 *
 * Animation styles live in `globals.css` (`.archive-loading-wave`,
 * `.archive-loading-row`, and the related `@keyframes`). Inlining them
 * here as `<style>{`…`}</style>` triggered an RSC streaming error in
 * production (`Uncaught TypeError: Error in input stream`) so the safe
 * pattern is to keep CSS in the global stylesheet.
 */
export default function ArchiveLoading() {
  return (
    <main className="min-h-screen bg-bg-main transition-colors duration-300">
      <Header />
      <section className="mx-auto max-w-[1280px] px-4 pb-16 pt-6 md:px-6 xl:px-[30px]">
        <div className="hidden md:block mb-10 pb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="font-meta font-bold uppercase tracking-[0.02em] leading-[0.82] text-[36px] sm:text-[48px] md:text-[56px] lg:text-[65px] transition-colors">
                <span className="text-[#D6001C] dark:text-[#ff5f74]">Archives</span>{' '}
                <span className="text-[#b7d7f5] dark:text-[#b7d7f5]">[Beta]</span>{' '}
                <span className="text-[#b7bcc6] dark:text-[#b7bcc6]">2001&ndash;2026</span>
              </h1>
              <p className="mt-3 font-copy text-[16px] sm:text-[17px] leading-[1.4] text-text-muted">
                Browse the entire online history of <em>The Poly</em>
              </p>
            </div>

            {/* Rainbow wave under the masthead — replaces the timeline silhouette
                while the day-bucketed publication index is being fetched. */}
            <div className="relative h-[180px] overflow-hidden rounded-[24px] border border-black/10 dark:border-white/10 bg-bg-soft/40 transition-colors">
              <svg
                aria-hidden="true"
                className="archive-loading-wave absolute inset-x-0 bottom-[80px] h-[24px]"
                width="6000"
                height="24"
                viewBox="0 0 6000 24"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="archive-loading-rainbow" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#ff4040" stopOpacity="0.92" />
                    <stop offset="16%" stopColor="#ff9900" stopOpacity="0.92" />
                    <stop offset="33%" stopColor="#ffee00" stopOpacity="0.92" />
                    <stop offset="50%" stopColor="#44dd44" stopOpacity="0.92" />
                    <stop offset="66%" stopColor="#4488ff" stopOpacity="0.92" />
                    <stop offset="83%" stopColor="#cc44ff" stopOpacity="0.92" />
                    <stop offset="100%" stopColor="#ff4040" stopOpacity="0.92" />
                  </linearGradient>
                </defs>
                <path
                  d={WAVE_PATH}
                  stroke="url(#archive-loading-rainbow)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>

              <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-bg-main to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-bg-main to-transparent" />
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-5">
          {SKELETON_ROWS.map((width, i) => (
            <div
              key={i}
              className="archive-loading-row group grid gap-4 py-5 md:items-start md:gap-6 md:grid-cols-[minmax(0,1fr)_220px] border-b border-black/5 dark:border-white/5"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex flex-col gap-3">
                <div className="h-3 w-24 rounded-full bg-text-muted/15" />
                <div className="h-5 rounded-full bg-text-main/10" style={{ width: `${width}%` }} />
                <div className="h-3 w-32 rounded-full bg-text-muted/10" />
              </div>
              <div className="hidden md:block aspect-[3/2] rounded-[18px] bg-text-muted/10" />
            </div>
          ))}
        </div>
      </section>
      <Footer />
    </main>
  )
}

const WAVE_LAMBDA = 600
const WAVE_PATH = (() => {
  const cy = 12
  const A = 6
  const half = WAVE_LAMBDA / 2
  const cp = Math.round(0.3642 * half)
  let d = `M 0,${cy}`
  // 10 wavelengths × 600 = 6000px wide. Animation translates by one
  // wavelength and loops, so 10 is plenty for any viewport.
  for (let n = 0; n < 10; n++) {
    const x = n * WAVE_LAMBDA
    d += ` C ${x + cp},${cy - A} ${x + half - cp},${cy - A} ${x + half},${cy}`
    d += ` C ${x + half + cp},${cy + A} ${x + WAVE_LAMBDA - cp},${cy + A} ${x + WAVE_LAMBDA},${cy}`
  }
  return d
})()

const SKELETON_ROWS = [88, 72, 94, 80, 66, 90, 78, 84]
