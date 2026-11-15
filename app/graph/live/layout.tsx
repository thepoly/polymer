import type { Metadata } from 'next'
import '../../(frontend)/globals.css'

export const metadata: Metadata = { title: 'Graph preview', robots: { index: false, follow: false } }

// The graph editor's web preview: a bare page, outside the site's header and footer.
export default function LiveLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: 'var(--background)' }}>{children}</body>
    </html>
  )
}
