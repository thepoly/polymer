import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { readSettings } from '@/lib/graph/store'
import SettingsEditor from './SettingsEditor'

export const dynamic = 'force-dynamic'

/** Graph settings, for anyone with a newsroom login (the same people as the editor). */
export default async function GraphSettingsPage() {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) redirect('/newsroom/login?redirect=%2Fgraph%2Fsettings')
  return <SettingsEditor initial={readSettings().colors ?? []} />
}
