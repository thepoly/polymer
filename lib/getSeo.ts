import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'
import configPromise from '@/payload.config'
import type { Seo as PayloadSeo } from '@/payload-types'

const SITE_IDENTITY_FALLBACKS = {
  siteName: 'The Polytechnic',
  siteShortName: 'The Poly',
  defaultTitle: 'The Polytechnic',
  titleSuffix: 'The Polytechnic',
  defaultDescription: "The Polytechnic is Rensselaer Polytechnic Institute's student run newspaper, serving the RPI community since 1885.",
  appleWebAppTitle: 'The Poly',
  manifestDescription: 'Serving the Rensselaer Community Since 1885',
  organizationDescription: "Rensselaer Polytechnic Institute's student run newspaper, serving the RPI community since 1885.",
}

const PAGE_FALLBACKS = {
  archiveTitle: 'Archive',
  archiveDescription: 'Browse The Polytechnic by publication date with the archive time machine.',
  searchTitle: 'Search',
  searchDescription: "Search articles from The Polytechnic, RPI's student newspaper.",
  submitTitle: 'Submit',
  submitDescription: 'Submit an article, letter to the editor, or opinion piece to The Polytechnic.',
  staffTitle: 'Staff',
  staffDescription: "Meet the editorial staff of The Polytechnic, RPI's student run newspaper.",
  featuresArchiveTitle: 'More in Features',
  featuresArchiveDescription: 'All features articles from The Polytechnic.',
  featuresSubmitEventTitle: 'Submit an Event',
  featuresSubmitEventDescription: 'Submit an event to be featured by The Polytechnic.',
  opinionOtherTitle: 'Other',
  opinionOtherDescription: 'Columns, reviews, and other opinion formats from The Polytechnic.',
  opinionEditorialsTitle: 'Editorials',
  opinionEditorialsDescription: 'Staff editorials, editorial notebooks, and endorsements from The Polytechnic.',
  opinionMoreTitle: 'More in Opinion',
  opinionMoreDescription: 'General opinion pieces and letters to the editor from The Polytechnic.',
}

const SECTION_FALLBACKS = {
  newsDescription: 'The latest news from Rensselaer Polytechnic Institute and the Troy community.',
  sportsDescription: 'Coverage of RPI varsity athletics, club sports, and intramurals.',
  featuresDescription: 'In-depth features, profiles, and longform journalism from the RPI community.',
  opinionDescription: 'Editorials, columns, and letters to the editor from The Polytechnic.',
}

const TEMPLATE_FALLBACKS = {
  sectionFallbackDescription: '{sectionTitle} articles from {siteName}.',
  articleFallbackDescription: 'Read "{title}" in {siteName}\'s {section} section.',
  staffProfileDescription: '{name} — staff member at {siteName}, RPI\'s student newspaper.',
}

export type SeoSiteIdentity = typeof SITE_IDENTITY_FALLBACKS
export type SeoPages = typeof PAGE_FALLBACKS
export type SeoSections = typeof SECTION_FALLBACKS
export type SeoTemplates = typeof TEMPLATE_FALLBACKS

export type ResolvedSeo = {
  siteIdentity: SeoSiteIdentity
  pages: SeoPages
  sections: SeoSections
  templates: SeoTemplates
}

function resolveGroup<T extends Record<string, string>>(
  group: Record<string, string | null | undefined> | null | undefined,
  fallbacks: T,
): T {
  const result = { ...fallbacks } as T
  if (!group) return result

  for (const key of Object.keys(fallbacks) as (keyof T)[]) {
    const value = group[key as string]
    if (typeof value === 'string' && value.trim() !== '') {
      result[key] = value as T[keyof T]
    }
  }

  return result
}

const FALLBACK: ResolvedSeo = {
  siteIdentity: { ...SITE_IDENTITY_FALLBACKS },
  pages: { ...PAGE_FALLBACKS },
  sections: { ...SECTION_FALLBACKS },
  templates: { ...TEMPLATE_FALLBACKS },
}

const fetchSeo = unstable_cache(
  async (): Promise<ResolvedSeo> => {
    try {
      const payload = await getPayload({ config: configPromise })
      const seo = await payload.findGlobal({ slug: 'seo' as never, depth: 0 }) as PayloadSeo

      return {
        siteIdentity: resolveGroup(
          seo?.siteIdentity as Record<string, string | null | undefined>,
          SITE_IDENTITY_FALLBACKS,
        ),
        pages: resolveGroup(
          seo?.pages as Record<string, string | null | undefined>,
          PAGE_FALLBACKS,
        ),
        sections: resolveGroup(
          seo?.sections as Record<string, string | null | undefined>,
          SECTION_FALLBACKS,
        ),
        templates: resolveGroup(
          seo?.templates as Record<string, string | null | undefined>,
          TEMPLATE_FALLBACKS,
        ),
      }
    } catch {
      return FALLBACK
    }
  },
  ['polymer-seo'],
  { tags: ['polymer-seo'] },
)

export const getSeo = cache(fetchSeo)

export function fillSeoTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '')
}

export function getSectionSeoDescription(seo: ResolvedSeo, section: string): string {
  const keyMap: Record<string, keyof SeoSections> = {
    news: 'newsDescription',
    sports: 'sportsDescription',
    features: 'featuresDescription',
    opinion: 'opinionDescription',
  }

  const key = keyMap[section]
  if (key) {
    return seo.sections[key]
  }

  const sectionTitle = section.charAt(0).toUpperCase() + section.slice(1)
  return fillSeoTemplate(seo.templates.sectionFallbackDescription, {
    section,
    sectionTitle,
    siteName: seo.siteIdentity.siteName,
  })
}
