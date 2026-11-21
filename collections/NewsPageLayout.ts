import type { CollectionConfig } from 'payload'
import { canEditNews } from '../lib/canEditNews'
import { activateNewsLayout } from '../lib/activateNewsLayout'

const NewsPageLayout: CollectionConfig = {
  slug: 'news-page-layout',
  endpoints: [{ path: '/:id/activate', method: 'patch', handler: activateNewsLayout }],
  labels: {
    singular: 'News Layout',
    plural: 'News Layout',
  },
  admin: {
    useAsTitle: 'name',
    components: {
      views: {
        edit: {
          default: {
            Component: '@/components/Dashboard/NewsLayoutEditor#NewsLayoutEditor',
          },
        },
      },
    },
  },
  access: {
    read: () => true,
    update: ({ req: { user } }) => canEditNews(user),
    create: ({ req: { user } }) => canEditNews(user),
    delete: ({ req: { user } }) => {
      if (!user) return false
      const roles = (user as unknown as { roles?: string[] }).roles || []
      return roles.includes('admin')
    },
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      defaultValue: 'News Layout',
    },
    // JSON blob storing the full layout, so new page components can add keys
    // without a migration. Shape: `NewsLayout` in components/News/newsLayout.ts
    //   lead: number | null,                 // top-left story, two thirds wide
    //   leadTextPosition: 'north' | 'south' | 'east' | 'west' | 'overlay',
    //                                        // where the lead's text sits
    //                                        // relative to its photo (or on it)
    //   secondary: (number | null)[],       // stories pinned under the lead
    //   secondaryPhotos: boolean,            // their photos on the right (missing = on)
    //   featured: (number | null)[],        // legacy row pins, preserved but ignored
    //   topicCards: { overlay, subdeck },    // topic row card style
    //   topicPicks: { [topic]: { manual, articles: (number | null)[] } },
    //                                        // newest or chosen; fourth slot is tablet-only
    //   bulletsHeadlinesOnly: boolean,       // Senate / E-Board bullets without summaries
    //   leadFrame: { article, desktop, mobile } | null,
    //                                        // crop of that story's lead photo
    {
      name: 'layout',
      type: 'json',
      required: false,
    },
  ],
}

export default NewsPageLayout
