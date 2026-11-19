import { getCurrentEdition } from '@/lib/getCurrentEdition'
import { getTheme } from '@/lib/getTheme'
import FooterClient from './FooterClient'

/** `flush`: no space above the footer's rule (content runs right down to it) */
export default async function Footer({ flush = false }: { flush?: boolean } = {}) {
  const [edition, theme] = await Promise.all([getCurrentEdition(), getTheme()])
  return (
    <FooterClient
      volume={edition.volume}
      edition={edition.issue}
      flush={flush}
      // Same weight as the header's rule (Theme → header animation → line weight)
      lineWeight={theme.headerAnimation.lineWeight}
    />
  )
}
