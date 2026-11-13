import type { CollectionConfig } from 'payload'

const NewsPageLayout: CollectionConfig = {
  slug: 'news-page-layout',
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
    update: ({ req: { user } }) => {
      if (!user) return false
      const roles = (user as unknown as { roles?: string[] }).roles || []
      return roles.some((role: string) => ['admin', 'eic', 'editor'].includes(role))
    },
    create: ({ req: { user } }) => {
      if (!user) return false
      const roles = (user as unknown as { roles?: string[] }).roles || []
      return roles.some((role: string) => ['admin', 'eic', 'editor'].includes(role))
    },
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
    //   leadTextPosition: 'north' | 'south' | 'east' | 'west',
    //                                        // where the lead's text sits
    //                                        // relative to its photo
    {
      name: 'layout',
      type: 'json',
      required: false,
    },
  ],
}

export default NewsPageLayout
