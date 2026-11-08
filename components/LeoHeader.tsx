import { getTheme } from '@/lib/getTheme'
import { getCurrentEdition } from '@/lib/getCurrentEdition'
import { getWeather } from '@/lib/getWeather'
import LeoHeaderClient from './LeoHeaderClient'
import type { HeaderLogoSrcs } from './HeaderClient'
import type { LiveArticleStripEntry } from './LiveStrip'
import type { BandColors } from '@/lib/imageBandColor'

export type { HeaderLogoSrcs }

/** Leo homepage header: a fork of Header so Leo can diverge without touching other pages. */
export default async function LeoHeader({
  compact,
  mobileTight,
  liveEntries,
  band,
}: {
  compact?: boolean
  mobileTight?: boolean
  liveEntries?: LiveArticleStripEntry[]
  /** The lead photo's band colours; the header's own bands match them. */
  band?: BandColors | null
}) {
  const [theme, edition, weather] = await Promise.all([
    getTheme(),
    getCurrentEdition(),
    getWeather(),
  ])

  return (
    <LeoHeaderClient
      compact={compact}
      mobileTight={mobileTight}
      logoSrcs={theme.logoSrcs}
      headerAnimation={theme.headerAnimation}
      volume={edition.volume}
      edition={edition.issue}
      liveEntries={liveEntries}
      weather={weather}
      band={band}
    />
  )
}
