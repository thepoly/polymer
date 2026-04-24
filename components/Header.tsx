import { getTheme } from '@/lib/getTheme'
import { getCurrentEdition } from '@/lib/getCurrentEdition'
import { getWeather } from '@/lib/getWeather'
import HeaderClient from './HeaderClient'
import type { HeaderLogoSrcs } from './HeaderClient'
import type { LiveArticleStripEntry } from './LiveStrip'

export type { HeaderLogoSrcs }

export default async function Header({
  compact,
  mobileTight,
  liveEntries,
}: {
  compact?: boolean
  mobileTight?: boolean
  liveEntries?: LiveArticleStripEntry[]
}) {
  const [theme, edition, weather] = await Promise.all([
    getTheme(),
    getCurrentEdition(),
    getWeather(),
  ])

  return (
    <HeaderClient
      compact={compact}
      mobileTight={mobileTight}
      logoSrcs={theme.logoSrcs}
      headerAnimation={theme.headerAnimation}
      volume={edition.volume}
      edition={edition.issue}
      liveEntries={liveEntries}
      weather={weather}
    />
  )
}
