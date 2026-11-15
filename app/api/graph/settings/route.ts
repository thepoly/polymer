import { NextResponse } from 'next/server'
import { graphUser, unauthorized, jsonBody, failure } from '@/lib/graph/auth'
import { readSettings, writeSettings } from '@/lib/graph/store'
import { resolveColors } from '@/lib/graph/palette.js'

export const dynamic = 'force-dynamic'

// The graph settings every graph shares. `settings` is what's stored (each brand color's
// name and base); `colors` is the same list with every shade worked out, for the editor.
const payload = (settings: ReturnType<typeof readSettings>) =>
  NextResponse.json({ settings, colors: resolveColors(settings) }, { headers: { 'Cache-Control': 'no-store' } })

export async function GET(req: Request) {
  if (!(await graphUser(req))) return unauthorized()
  try {
    return payload(readSettings())
  } catch (err) {
    return failure(err)
  }
}

export async function PUT(req: Request) {
  if (!(await graphUser(req))) return unauthorized()
  try {
    const body = await jsonBody(req)
    try {
      return payload(writeSettings(body.settings))
    } catch (err) {
      // A name or color that doesn't pass: say which, rather than a bare failure.
      return NextResponse.json({ error: (err as Error).message }, { status: 400 })
    }
  } catch (err) {
    return failure(err)
  }
}
