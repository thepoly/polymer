import type { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Graph from '@/components/Interactive/Graph'
import * as specs from './specs'
import { displayGraph, graphExists, readSettings, writeGraph } from '@/lib/graph/store'
import { SEEDS } from './graphs'

export const metadata: Metadata = { robots: { index: false, follow: false } }

// Read on every request, so an edit saved at /graph shows on the next reload.
export const dynamic = 'force-dynamic'

/** A graph file by name, written from its seed the first time it's asked for. */
function graph(name: keyof typeof SEEDS) {
  if (!graphExists(name)) writeGraph(name, SEEDS[name])
  return displayGraph(name)
}

export default function Page() {
  const settings = readSettings()
  return (
    <main className="min-h-screen bg-bg-main transition-colors duration-300">
      <Header mobileTight />
      <article className="container mx-auto px-4 md:px-6 mt-8 md:mt-12 min-h-[60vh]">
        <Graph spec={graph('executive-pay')} settings={settings} />
        <Graph spec={graph('pay-by-tenure')} settings={settings} />
      </article>
      {/* One of each kind of graph, kept below the article while the format is worked out. */}
      <section className="container mx-auto px-4 md:px-6 mt-24 mb-16 border-t border-rule pt-8">
        <Graph spec={specs.line} />
        <Graph spec={specs.manyLines} />
        <Graph spec={specs.column} />
        <Graph spec={specs.stacked} />
        <Graph spec={specs.bar} />
        <Graph spec={specs.ring} />
        <Graph spec={specs.combined} />
        <Graph spec={specs.pie} />
        <Graph spec={specs.pie3d} />
        <Graph spec={specs.scatter} size="wide" />
        <Graph spec={specs.flow} size="wide" />
      </section>
      <Footer />
    </main>
  )
}
