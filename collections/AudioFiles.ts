import type { CollectionConfig, Access } from 'payload'

type UserWithRoles = { id: string | number; roles?: string[] }

const STAFF_ROLES = ['admin', 'eic', 'editor', 'writer']
const STAFF_VIEW_ROLES = ['admin', 'eic', 'editor']

const isStaff: Access = ({ req: { user } }) => {
  const u = user as unknown as UserWithRoles | undefined
  return Boolean(u?.roles?.some((r) => STAFF_ROLES.includes(r)))
}

const isAdmin: Access = ({ req: { user } }) => {
  const u = user as unknown as UserWithRoles | undefined
  return Boolean(u?.roles?.includes('admin'))
}

export const AudioFiles: CollectionConfig = {
  slug: 'audio-files',
  admin: {
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'durationSeconds', 'uploader', 'createdAt'],
    description: 'Raw audio uploads. Linked to audio-jobs.',
    hidden: ({ user }) => {
      const u = user as unknown as UserWithRoles | undefined
      return !u?.roles?.includes('admin')
    },
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      const u = user as unknown as UserWithRoles
      if (u.roles?.some((r) => STAFF_VIEW_ROLES.includes(r))) return true
      return { uploader: { equals: user.id } }
    },
    create: isStaff,
    update: () => false,
    delete: isAdmin,
  },
  upload: {
    staticDir: process.env.AUDIO_DIR || '/var/www/polymer-media/audio',
  },
  fields: [
    {
      name: 'durationSeconds',
      type: 'number',
      admin: { readOnly: true },
    },
    {
      name: 'uploader',
      type: 'relationship',
      relationTo: 'users',
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
  hooks: {
    beforeChange: [
      ({ req, data, operation }) => {
        if (operation === 'create' && req.user) {
          data.uploader = req.user.id
        }
        return data
      },
    ],
  },
  timestamps: true,
}

export default AudioFiles
