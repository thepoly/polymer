import type { CollectionConfig } from 'payload'

type UserWithRoles = {
  roles?: string[]
}

const DeviceTokens: CollectionConfig = {
  slug: 'device-tokens',
  admin: {
    useAsTitle: 'token',
    defaultColumns: ['token', 'platform', 'lastSeenAt', 'createdAt'],
  },
  access: {
    read: ({ req: { user } }) => {
      const u = user as unknown as UserWithRoles
      return Boolean(u?.roles?.includes('admin'))
    },
    create: () => true,
    update: () => false,
    delete: ({ req: { user } }) => {
      const u = user as unknown as UserWithRoles
      return Boolean(u?.roles?.includes('admin'))
    },
  },
  fields: [
    {
      name: 'token',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'platform',
      type: 'select',
      options: [
        { label: 'Android', value: 'android' },
        { label: 'iOS', value: 'ios' },
      ],
      required: true,
      defaultValue: 'android',
    },
    {
      name: 'lastSeenAt',
      type: 'date',
    },
  ],
  timestamps: true,
}

export default DeviceTokens
