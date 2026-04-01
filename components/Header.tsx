import { getTheme } from '@/lib/getTheme'
import HeaderClient from './HeaderClient'
import type { HeaderLogoSrcs } from './HeaderClient'

export type { HeaderLogoSrcs }

export default async function Header({ compact, mobileTight }: { compact?: boolean; mobileTight?: boolean }) {
  const theme = await getTheme()
  return <HeaderClient compact={compact} mobileTight={mobileTight} logoSrcs={theme.logoSrcs} />
}
