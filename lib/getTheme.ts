import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'
import configPromise from '@/payload.config'
import type { Logo } from '@/payload-types'

// Fallback values matching current globals.css hardcoded values.
// These only apply if the Theme global has never been saved to the DB.
const LIGHT_FALLBACKS = {
  background: '#ffffff',
  foreground: '#000000',
  foregroundMuted: '#5f5f5f',
  accent: '#D6001C',
  borderColor: '#d8d8d8',
  ruleColor: 'rgba(0, 0, 0, 0.15)',
  ruleStrongColor: 'rgba(0, 0, 0, 0.8)',
  headerTopBg: '#ffffff',
  headerTopText: '#000000',
  headerNavBg: '#ffffff',
  headerNavText: '#000000',
  headerBorder: '#d8d8d8',
}

const DARK_FALLBACKS = {
  background: '#0a0a0a',
  foreground: '#e8e8e8',
  foregroundMuted: '#c8ced6',
  accent: '#d96b76',
  borderColor: '#3a3a3a',
  ruleColor: 'rgba(255, 255, 255, 0.18)',
  ruleStrongColor: 'rgba(255, 255, 255, 0.4)',
  headerTopBg: '#0a0a0a',
  headerTopText: '#e8e8e8',
  headerNavBg: '#0a0a0a',
  headerNavText: '#e8e8e8',
  headerBorder: '#3a3a3a',
}

export type ThemeColors = typeof LIGHT_FALLBACKS

export type ThemeLogoSrcs = {
  desktopLight: string
  desktopDark: string
  mobileLight: string
  mobileDark: string
}

export type ResolvedTheme = {
  lightMode: ThemeColors
  darkMode: ThemeColors
  logoSrcs: ThemeLogoSrcs
}

function resolveLogoUrl(logo: Logo | number | null | undefined, fallback: string): string {
  if (logo && typeof logo === 'object' && logo.url) {
    return logo.url
  }
  return fallback
}

function resolveColors(
  group: Record<string, string | null | undefined> | null | undefined,
  fallbacks: ThemeColors,
): ThemeColors {
  const result = { ...fallbacks }
  if (!group) return result
  for (const key of Object.keys(fallbacks) as (keyof ThemeColors)[]) {
    const val = group[key]
    if (val && typeof val === 'string' && val.trim() !== '') {
      result[key] = val
    }
  }
  return result
}

const FALLBACK: ResolvedTheme = {
  lightMode: { ...LIGHT_FALLBACKS },
  darkMode: { ...DARK_FALLBACKS },
  logoSrcs: {
    desktopLight: '/logo-light.svg',
    desktopDark: '/logo-dark.svg',
    mobileLight: '/logo-light-mobile.svg',
    mobileDark: '/logo-dark-mobile.svg',
  },
}

// unstable_cache persists across requests; invalidated when an admin saves Theme.
// cache() deduplicates within a single render (layout + Header both call getTheme).
const fetchTheme = unstable_cache(
  async (): Promise<ResolvedTheme> => {
    try {
      const payload = await getPayload({ config: configPromise })
      const theme = await payload.findGlobal({ slug: 'theme', depth: 1 })

      const logos = theme?.logos as {
        desktopLight?: Logo | number | null
        desktopDark?: Logo | number | null
        mobileLight?: Logo | number | null
        mobileDark?: Logo | number | null
      } | null | undefined

      return {
        lightMode: resolveColors(theme?.lightMode as Record<string, string | null | undefined>, LIGHT_FALLBACKS),
        darkMode: resolveColors(theme?.darkMode as Record<string, string | null | undefined>, DARK_FALLBACKS),
        logoSrcs: {
          desktopLight: resolveLogoUrl(logos?.desktopLight as Logo | number | null | undefined, '/logo-light.svg'),
          desktopDark: resolveLogoUrl(logos?.desktopDark as Logo | number | null | undefined, '/logo-dark.svg'),
          mobileLight: resolveLogoUrl(logos?.mobileLight as Logo | number | null | undefined, '/logo-light-mobile.svg'),
          mobileDark: resolveLogoUrl(logos?.mobileDark as Logo | number | null | undefined, '/logo-dark-mobile.svg'),
        },
      }
    } catch {
      // Theme table doesn't exist yet (before first migration) or DB unreachable.
      return FALLBACK
    }
  },
  ['polymer-theme'],
  { tags: ['polymer-theme'] },
)

export const getTheme = cache(fetchTheme)
