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
  flushMobileBottom,
  liveEntries,
}: {
  compact?: boolean
  mobileTight?: boolean
  /**
   * Join following content directly to the mobile date/volume rule: on phones
   * and tablets (true), or on phones only ("phone"), so the page sets its own
   * space under the rule there.
   */
  flushMobileBottom?: boolean | "phone"
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
      flushMobileBottom={flushMobileBottom}
      logoSrcs={theme.logoSrcs}
      headerAnimation={theme.headerAnimation}
      volume={edition.volume}
      edition={edition.issue}
      liveEntries={liveEntries}
      weather={weather}
    />
  )
}
