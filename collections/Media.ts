import type { CollectionConfig, Access } from 'payload'
import { User } from '@/payload-types'

const isAdmin: Access = ({ req: { user } }) => {
  if (!user) return false
  const roles = (user as User)?.roles || []
  return roles.includes('admin')
}

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
    },
  ],
  upload: true,
}

export default Media;
