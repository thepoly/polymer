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
        description: 'Senior board, top row, center (Editor in Chief).',
      },
    },
    {
      name: 'heroRight',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Senior board, top row, left (Senior Managing Editor).',
      },
    },
    {
      name: 'columnLeftLead',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Senior board, second row, first (Managing Editor).',
      },
    },
    {
      name: 'columnLeftSupport',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Senior board, second row, second (Managing Editor).',
      },
    },
    {
      name: 'columnRightLead',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Senior board, second row, third (Contributing Editor).',
      },
    },
    {
      name: 'columnRightSupport',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Senior board, second row, fourth (Contributing Editor).',
      },
    },
    {
      name: 'businessManager',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Senior board, top row, right (Business Manager).',
      },
    },
  ],
}

export default StaffPageLayout
