import type { Metadata } from 'next'
import './settings.css'

export const metadata: Metadata = { title: 'Graph settings — Poly Graphs', robots: { index: false, follow: false } }

// The settings every graph shares. Like the editor at /graph, it sits outside the site's
// own layouts.
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
