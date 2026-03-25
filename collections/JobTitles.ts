import type { CollectionConfig, Access } from 'payload'

const isAdminOrEIC: Access = ({ req: { user } }) => {
  if (!user) return false
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const perms = (user as any).mergedPermissions || {}
  return Boolean(perms.admin || perms.manageUsers)
}

export const JobTitles: CollectionConfig = {
  slug: 'job-titles',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title'],
  },
  access: {
    read: () => true,
    create: isAdminOrEIC,
    update: isAdminOrEIC,
    delete: isAdminOrEIC,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      unique: true,
    },
  ],
}

export default JobTitles
