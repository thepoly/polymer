import type { CollectionConfig } from 'payload'

const OpinionPageLayout: CollectionConfig = {
  slug: 'opinion-page-layout',
  labels: {
    singular: 'Opinion Layout',
    plural: 'Opinion Layout',
  },
  admin: {
    useAsTitle: 'name',
    components: {
      views: {
        edit: {
          default: {
            Component: '@/components/Dashboard/OpinionLayoutEditor#OpinionLayoutEditor',
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
      defaultValue: 'Opinion Layout',
    },
    // JSON blob storing the full 3-column layout + editors choice
    // Shape: { column1: number[], column2: number[], column3: number[],
    //          editorsChoice: number[], editorsChoiceLabel: string }
    {
      name: 'layout',
      type: 'json',
      required: false,
    },
    // Legacy fields kept for backward compat during migration
    {
      name: 'editorsChoiceLabel',
      type: 'text',
      defaultValue: "Opinion's Choice",
      admin: { hidden: true },
    },
    {
      name: 'editorsChoice1',
      type: 'relationship',
      relationTo: 'articles',
      admin: { hidden: true },
    },
    {
      name: 'editorsChoice2',
      type: 'relationship',
      relationTo: 'articles',
      admin: { hidden: true },
    },
    {
      name: 'editorsChoice3',
      type: 'relationship',
      relationTo: 'articles',
      admin: { hidden: true },
    },
    {
      name: 'quotes',
      type: 'array',
      maxRows: 3,
      admin: { hidden: true },
      fields: [
        {
          name: 'text',
          type: 'textarea',
          required: true,
        },
        {
          name: 'article',
          type: 'relationship',
          relationTo: 'articles',
          required: true,
        },
      ],
    },
  ],
}

export default OpinionPageLayout
