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
  hooks: {
    afterRead: [
      ({ doc }) => {
        if (doc?.sourceURL && typeof doc.sourceURL === 'string') {
          doc.url = doc.sourceURL
          doc.thumbnailURL = null
        }
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
    },
    {
      name: 'photographer',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'sourceURL',
      type: 'text',
      admin: {
        hidden: true,
        readOnly: true,
      },
    },
  ],
  upload: true,
}

export default Media
