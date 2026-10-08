import { NextResponse } from 'next/server'
import { graphUser, unauthorized, jsonBody, failure } from '@/lib/graph/auth'
import { readGraph } from '@/lib/graph/store'
import { buildGraph, renderGraphHtml, PX_PER_IN } from '@/lib/graph/graph.js'
import { plotBox } from '@/lib/graph/scatter.js'

export const dynamic = 'force-dynamic'

// White space around the web PNG, in CSS pixels. The print PDF is cropped tight for layout.
const PNG_PAD = 20

/**
 * Renders whatever the editor currently holds, saved or not. The editor's preview, its
 * PDF and its PNG all come from here, so what's on screen is what gets exported.
 */
export async function POST(req: Request) {
  if (!(await graphUser(req))) return unauthorized()
  let body
  try {
    body = await jsonBody(req)
  } catch (err) {
    return failure(err)
  }
  const plotH = Number(body.plotH)
  const pad = body.pad === 0 ? 0 : PNG_PAD
  try {
    // Only scatters carry a frame; the other kinds' models don't mention one.
    const model = buildGraph(body.graph ?? {}, readGraph) as unknown as {
      widthIn: number
      frame?: number | null
      plotH?: number | null
    }
    // A framed graph's plot height depends on the rendered text, which only the browser
    // knows: the editor measures the first draw and asks again with the height that fits.
    let frame = null
    if (model.frame) {
      if (plotH > 0) model.plotH = plotH
      frame = { ratio: model.frame, pad: PNG_PAD, plotH: plotBox(model, model.widthIn * PX_PER_IN).plotH }
    }
    return NextResponse.json(
      { html: renderGraphHtml(model, { pad }), widthIn: model.widthIn, pad, frame },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message })
  }
}
