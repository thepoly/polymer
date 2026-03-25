import type { CollectionConfig } from 'payload'

type EditorUser = { roles?: string[]; section?: string }

const Layout: CollectionConfig = {
  slug: 'layout',
  labels: {
    singular: 'Skeletons & Layouts',
    plural: 'Skeletons & Layouts',
  },
  admin: {
    useAsTitle: 'name',
    components: {
      views: {
        edit: {
          default: {
            Component: '@/components/Dashboard/LayoutEditor#LayoutEditor',
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
  hooks: {
    beforeChange: [
      ({ data, originalDoc, req }) => {
        const u = req.user as unknown as EditorUser
        if (!u) return data
        if (u.roles?.some((r: string) => ['admin', 'eic'].includes(r))) return data
        if (u.roles?.includes('editor') && u.section) {
          // Editor may only modify their own section within sectionLayouts
          return {
            ...originalDoc,
            sectionLayouts: {
              ...(originalDoc?.sectionLayouts ?? {}),
              [u.section]: data?.sectionLayouts?.[u.section],
            },
          }
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      defaultValue: 'Skeletons & Layouts',
    },
    {
      name: 'skeleton',
      type: 'select',
      defaultValue: 'custom',
      options: [
        { label: 'Custom Grid', value: 'custom' },
        { label: 'Aries', value: 'aries' },
        { label: 'Taurus', value: 'taurus' },
      ],
      admin: { hidden: true },
    },
    {
      name: 'grid',
      type: 'json',
      required: false,
    },
    {
      name: 'volume',
      type: 'number',
      admin: { hidden: true },
    },
    {
      name: 'edition',
      type: 'number',
      admin: { hidden: true },
    },
    {
      name: 'sectionLayouts',
      type: 'json',
      required: false,
      admin: {
        description: 'Per-section layout configuration (skeleton + pinned articles)',
      },
    },
    // Legacy slot fields — kept for backward compatibility during migration
    {
      name: 'mainArticle',
      type: 'relationship',
      relationTo: 'articles',
      admin: { hidden: true },
    },
    {
      name: 'top1',
      type: 'relationship',
      relationTo: 'articles',
      admin: { hidden: true },
    },
    {
      name: 'top2',
      type: 'relationship',
      relationTo: 'articles',
      admin: { hidden: true },
    },
    {
      name: 'top3',
      type: 'relationship',
      relationTo: 'articles',
      admin: { hidden: true },
    },
    {
      name: 'top4',
      type: 'relationship',
      relationTo: 'articles',
      admin: { hidden: true },
    },
    {
      name: 'op1',
      type: 'relationship',
      relationTo: 'articles',
      admin: { hidden: true },
    },
    {
      name: 'op2',
      type: 'relationship',
      relationTo: 'articles',
      admin: { hidden: true },
    },
    {
      name: 'op3',
      type: 'relationship',
      relationTo: 'articles',
      admin: { hidden: true },
    },
    {
      name: 'op4',
      type: 'relationship',
      relationTo: 'articles',
      admin: { hidden: true },
    },
    {
      name: 'special',
      type: 'relationship',
      relationTo: 'articles',
      admin: { hidden: true },
    },
  ],
}

export default Layout
