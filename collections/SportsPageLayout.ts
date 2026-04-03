import type { CollectionConfig } from 'payload'

const SportsPageLayout: CollectionConfig = {
  slug: 'sports-page-layout',
  labels: {
    singular: 'Sports Layout',
    plural: 'Sports Layout',
  },
  admin: {
    useAsTitle: 'name',
    components: {
      views: {
        edit: {
          default: {
            Component: '@/components/Dashboard/SportsLayoutEditor#SportsLayoutEditor',
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
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      defaultValue: 'Sports Layout',
    },
    // JSON blob storing the layout:
    // Shape: {
    //   heroArticles: (number | null)[3]  // hero (large, spans 2 cols), bottom-left, bottom-middle
    //   rightColumn:  (number | null)[4]  // 4 stacked articles in the right column
    // }
    {
      name: 'layout',
      type: 'json',
      required: false,
    },
  ],
}

export default SportsPageLayout
