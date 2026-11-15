import React from 'react'
import Graph from '@/components/Interactive/Graph'
import { displayGraph, graphExists, readSettings, validName } from '@/lib/graph/store'

/**
 * A graph block in an article's body: the saved graph of that name, drawn live. It reads
 * the graph file on the server as the page is rendered. A name that no longer has a graph
 * draws nothing, so a deleted graph never breaks the article around it.
 */
export function ArticleGraph({ name }: { name: unknown }) {
  if (!validName(name)) return null
  let spec
  try {
    if (!graphExists(name)) return null
    spec = displayGraph(name)
  } catch {
    return null
  }
  return (
    <div className="article-graph" data-graph={name}>
      <Graph spec={spec} settings={readSettings()} />
    </div>
  )
}
