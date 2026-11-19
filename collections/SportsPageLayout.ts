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
      // "Schools" button beside "Create New" (Schools is hidden from the sidebar)
      beforeListTable: ['@/components/Dashboard/SportsLayoutEditor/SchoolsButton#SchoolsListButton'],
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
      defaultValue: 'Sports Layout',
    },
    // The whole layout as one JSON blob. Its shape is the SportsLayout type in
    // lib/sportsLayout.ts, which the editor and the /sports pages both read
    // it through.
    {
      name: 'layout',
      type: 'json',
      required: false,
    },
  ],
}

export default SportsPageLayout
