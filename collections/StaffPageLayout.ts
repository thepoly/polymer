import type { CollectionConfig } from 'payload'

const StaffPageLayout: CollectionConfig = {
  slug: 'staff-page-layout',
  labels: {
    singular: 'Staff Page Layout',
    plural: 'Staff Page Layout',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'updatedAt'],
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
      return roles.some((role: string) => ['admin', 'eic'].includes(role))
    },
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      defaultValue: 'Staff Page Layout',
      admin: {
        description: 'Only the most recently updated document is used on /staff.',
      },
    },
    {
      name: 'heroLeft',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Large featured slot in the top-left corner.',
      },
    },
    {
      name: 'heroRight',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Large featured slot in the top-right corner.',
      },
    },
    {
      name: 'columnLeftLead',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Lead slot in the lower-left column.',
      },
    },
    {
      name: 'columnLeftSupport',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Support slot below the lower-left lead.',
      },
    },
    {
      name: 'columnRightLead',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Lead slot in the lower-right column.',
      },
    },
    {
      name: 'columnRightSupport',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Support slot below the lower-right lead.',
      },
    },
  ],
}

export default StaffPageLayout
