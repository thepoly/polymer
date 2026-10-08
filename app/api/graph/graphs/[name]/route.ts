import { NextResponse } from 'next/server'
import { graphUser, unauthorized, jsonBody, failure } from '@/lib/graph/auth'
import { readGraph, writeGraph, deleteGraph, graphExists, validName } from '@/lib/graph/store'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ name: string }> }

const badName = () =>
  NextResponse.json({ error: 'Graph names use lowercase letters, numbers and dashes.' }, { status: 400 })
const missing = (name: string) => NextResponse.json({ error: `No graph called "${name}".` }, { status: 404 })

export async function GET(req: Request, ctx: Ctx) {
  if (!(await graphUser(req))) return unauthorized()
  const { name } = await ctx.params
  if (!validName(name)) return badName()
  try {
    if (!graphExists(name)) return missing(name)
    return NextResponse.json(readGraph(name), { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    return failure(err)
  }
}

export async function PUT(req: Request, ctx: Ctx) {
  if (!(await graphUser(req))) return unauthorized()
  const { name } = await ctx.params
  if (!validName(name)) return badName()
  try {
    const { graph } = await jsonBody(req)
    if (!graph || typeof graph !== 'object' || Array.isArray(graph)) {
      return NextResponse.json({ error: 'Nothing to save.' }, { status: 400 })
    }
    writeGraph(name, graph)
    return NextResponse.json({ ok: true, name })
  } catch (err) {
    return failure(err)
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  if (!(await graphUser(req))) return unauthorized()
  const { name } = await ctx.params
  if (!validName(name)) return badName()
  try {
    if (!graphExists(name)) return missing(name)
    deleteGraph(name)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return failure(err)
  }
}
