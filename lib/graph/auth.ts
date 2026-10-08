import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

/** The signed-in staff member, or null. The graph editor is for anyone with a newsroom login. */
export async function graphUser(req: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: req.headers })
  return user ?? null
}

export const unauthorized = () => NextResponse.json({ error: 'Sign in to the newsroom first.' }, { status: 401 })

const MAX_BODY = 1_000_000 // a graph is a few KB; this is headroom, not a target
const tooBig = () => Object.assign(new Error("That's too much data for one graph (1 MB limit)."), { status: 413 })

/** Parses a JSON body, refusing anything bigger than a graph could reasonably be. */
export async function jsonBody(req: Request): Promise<Record<string, unknown>> {
  // Refuse on the declared size before buffering, then on the real size after.
  if (Number(req.headers.get('content-length')) > MAX_BODY) throw tooBig()
  const text = await req.text()
  if (text.length > MAX_BODY) throw tooBig()
  try {
    return text ? JSON.parse(text) : {}
  } catch {
    throw Object.assign(new Error("The request wasn't valid JSON."), { status: 400 })
  }
}

export function failure(err: unknown) {
  const e = err as { message?: string; status?: number }
  return NextResponse.json({ error: e.message ?? 'Something went wrong.' }, { status: e.status ?? 500 })
}
