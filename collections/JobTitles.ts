import type { CollectionConfig, Access } from 'payload'
import { User } from '@/payload-types'

const isAdminOrEIC: Access = ({ req: { user } }) => {
  if (!user) return false
  const roles = (user as User)?.roles || []
  return roles.some((role: string) => ['admin', 'eic'].includes(role))
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
