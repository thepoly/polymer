import type { Access, GlobalConfig } from 'payload'
import { revalidatePath, revalidateTag } from 'next/cache'

type UserWithRoles = { id: string | number; roles?: string[] }

const isAdminOrEIC: Access = ({ req: { user } }) => {
  const u = user as unknown as UserWithRoles
  return Boolean(u?.roles?.some((role) => ['admin', 'eic'].includes(role)))
}

const shortText = (name: string, label: string, description: string) => ({
  name,
  type: 'text' as const,
  label,
  admin: {
    description,
  },
})

const longText = (name: string, label: string, description: string) => ({
  name,
  type: 'textarea' as const,
  label,
  admin: {
    description,
  },
})

export const Seo: GlobalConfig = {
  slug: 'seo',
  label: 'SEO',
  admin: {
    group: 'Theme',
  },
  versions: true,
  hooks: {
    afterChange: [
      () => {
        revalidateTag('polymer-seo', 'max')
        revalidatePath('/', 'layout')
        revalidatePath('/manifest.webmanifest', 'page')
      },
    ],
  },
  access: {
    read: isAdminOrEIC,
    update: isAdminOrEIC,
  },
  fields: [
    {
      name: 'siteIdentity',
      type: 'group',
      label: 'Site Identity',
      admin: {
        description: 'Global brand strings used in page titles, browser metadata, install prompts, and homepage structured data.',
      },
      fields: [
        shortText('siteName', 'Site Name', 'Primary publication name used for the site title, Open Graph site name, web manifest name, and homepage structured data.'),
        shortText('siteShortName', 'Site Short Name', 'Compact app-style name used for the web manifest short name and similar install surfaces.'),
        shortText('defaultTitle', 'Default Site Title', 'Fallback page title used when a route does not provide a more specific title.'),
        shortText('titleSuffix', 'Title Suffix', 'Suffix appended in the global title template, for example "%s | Title Suffix".'),
        longText('defaultDescription', 'Default Site Description', 'Used for the root layout metadata description and homepage metadata description.'),
        shortText('appleWebAppTitle', 'Apple Web App Title', 'Shown when the site is saved to an iPhone or iPad home screen.'),
        longText('manifestDescription', 'Manifest Description', 'Used in the PWA/web app manifest when the site is installed.'),
        longText('organizationDescription', 'Organization Description', 'Used in homepage Organization JSON-LD output.'),
      ],
    },
    {
      name: 'pages',
      type: 'group',
      label: 'Static Route Metadata',
      admin: {
        description: 'SEO titles and descriptions for the fixed frontend routes.',
      },
      fields: [
        shortText('archiveTitle', 'Archive Title', 'Used for the /archive and /archives page title.'),
        longText('archiveDescription', 'Archive Description', 'Used for the /archive and /archives description and Open Graph description.'),
        shortText('searchTitle', 'Search Title', 'Used for the /search page title.'),
        longText('searchDescription', 'Search Description', 'Used for the /search page description.'),
        shortText('submitTitle', 'Submit Title', 'Used for the /submit page title.'),
        longText('submitDescription', 'Submit Description', 'Used for the /submit page description.'),
        shortText('staffTitle', 'Staff Title', 'Used for the /staff page title.'),
        longText('staffDescription', 'Staff Description', 'Used for the /staff page description and Open Graph description.'),
        shortText('featuresArchiveTitle', 'Features Archive Title', 'Used for the /features/archive page title.'),
        longText('featuresArchiveDescription', 'Features Archive Description', 'Used for the /features/archive page description.'),
        shortText('featuresSubmitEventTitle', 'Submit Event Title', 'Used for the /features/submit-event page title.'),
        longText('featuresSubmitEventDescription', 'Submit Event Description', 'Used for the /features/submit-event page description.'),
        shortText('opinionOtherTitle', 'Opinion Other Title', 'Used for the /opinion/other page title.'),
        longText('opinionOtherDescription', 'Opinion Other Description', 'Used for the /opinion/other page description.'),
        shortText('opinionEditorialsTitle', 'Opinion Editorials Title', 'Used for the /opinion/editorials page title.'),
        longText('opinionEditorialsDescription', 'Opinion Editorials Description', 'Used for the /opinion/editorials page description.'),
        shortText('opinionMoreTitle', 'More in Opinion Title', 'Used for the /opinion/more-in-opinion page title.'),
        longText('opinionMoreDescription', 'More in Opinion Description', 'Used for the /opinion/more-in-opinion page description.'),
      ],
    },
    {
      name: 'sections',
      type: 'group',
      label: 'Section Page Descriptions',
      admin: {
        description: 'Descriptions used by the top-level section pages like /news, /sports, /features, and /opinion.',
      },
      fields: [
        longText('newsDescription', 'News Description', 'Used for the /news page description and Open Graph description.'),
        longText('sportsDescription', 'Sports Description', 'Used for the /sports page description and Open Graph description.'),
        longText('featuresDescription', 'Features Description', 'Used for the /features page description and Open Graph description.'),
        longText('opinionDescription', 'Opinion Description', 'Used for the /opinion page description and Open Graph description.'),
      ],
    },
    {
      name: 'templates',
      type: 'group',
      label: 'Generated Fallback Templates',
      admin: {
        description: 'Used when SEO text needs to be generated from page data instead of entered directly.',
      },
      fields: [
        shortText('sectionFallbackDescription', 'Section Fallback Template', 'Used if a top-level section is missing its dedicated description. Tokens: {section}, {sectionTitle}, {siteName}.'),
        shortText('articleFallbackDescription', 'Article Fallback Template', 'Used when an article has no subdeck. Tokens: {title}, {section}, {sectionTitle}, {siteName}.'),
        shortText('staffProfileDescription', 'Staff Profile Template', 'Used for /staff/[slug] profile descriptions. Tokens: {name}, {siteName}.'),
      ],
    },
  ],
}

export default Seo
