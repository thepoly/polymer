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
      label: 'Editor in Chief',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Senior board, top row, center (Editor in Chief).',
      },
    },
    {
      name: 'heroRight',
      label: 'Senior Managing Editor',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Senior board, top row, left (Senior Managing Editor).',
      },
    },
    {
      name: 'columnLeftLead',
      label: 'Managing Editor 1',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Senior board, row of four. Managing editors always show on the left.',
      },
    },
    {
      name: 'columnLeftSupport',
      label: 'Managing Editor 2',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Senior board, row of four. Managing editors always show on the left.',
      },
    },
    {
      name: 'columnRightLead',
      label: 'Contributing Editor 1',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Senior board, row of four. Contributing editors always show on the right.',
      },
    },
    {
      name: 'columnRightSupport',
      label: 'Contributing Editor 2',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Senior board, row of four. Contributing editors always show on the right.',
      },
    },
    {
      name: 'businessManager',
      label: 'Business Manager',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Senior board, top row, right. A business manager always shows in the top row.',
      },
    },
  ],
}

export default StaffPageLayout
