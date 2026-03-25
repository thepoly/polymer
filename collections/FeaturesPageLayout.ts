import type { CollectionConfig } from 'payload'

const FeaturesPageLayout: CollectionConfig = {
  slug: 'features-page-layout',
  labels: {
    singular: 'Features Layout',
    plural: 'Features Layout',
  },
  admin: {
    useAsTitle: 'name',
    components: {
      views: {
        edit: {
          default: {
            Component: '@/components/Dashboard/FeaturesLayoutEditor#FeaturesLayoutEditor',
          },
        },
      },
    },
  },
  access: {
    read: () => true,
    update: ({ req: { user } }) => {
      if (!user) return false
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const perms = (user as any).mergedPermissions || {}
      return Boolean(perms.admin || perms.manageLayout)
    },
    create: ({ req: { user } }) => {
      if (!user) return false
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const perms = (user as any).mergedPermissions || {}
      return Boolean(perms.admin || perms.manageLayout)
    },
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      defaultValue: 'Features Layout',
    },
    // JSON blob storing the full layout:
    // Shape: {
    //   onCampus: (number | null)[],     // 4 article slots (indices 0,1 can have images)
    //   featured: (number | null)[],      // 3 slots: 1 large hero + 2 with images
    //   rightArticles: (number | null)[], // 3 slots: 1 with image + 2 text-only
    //   events: Array<{ title, date, time, location? }>
    // }
    {
      name: 'layout',
      type: 'json',
      required: false,
    },
  ],
}

export default FeaturesPageLayout
