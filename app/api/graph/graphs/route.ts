import { NextResponse } from 'next/server'
import { graphUser, unauthorized, failure } from '@/lib/graph/auth'
import { listGraphs } from '@/lib/graph/store'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (!(await graphUser(req))) return unauthorized()
  try {
    return NextResponse.json(listGraphs(), { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    return failure(err)
  }
}
