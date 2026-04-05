import { getPayload } from 'payload'
import configPromise from '@/payload.config'
import { getTheme } from '@/lib/getTheme'
import HeaderClient from './HeaderClient'
import type { HeaderLogoSrcs } from './HeaderClient'

export type { HeaderLogoSrcs }

export default async function Header({ compact, mobileTight }: { compact?: boolean; mobileTight?: boolean }) {
  const [theme, layoutResponse] = await Promise.all([
    getTheme(),
    getPayload({ config: configPromise }).then(payload =>
      payload.find({ collection: 'layout', limit: 1, depth: 0 })
    ),
  ])
  const layout = layoutResponse.docs[0]

  return (
    <HeaderClient
      compact={compact}
      mobileTight={mobileTight}
      logoSrcs={theme.logoSrcs}
      volume={layout?.volume}
      edition={layout?.edition}
    />
  )
}
