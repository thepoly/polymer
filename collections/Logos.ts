import fs from 'node:fs'
import path from 'node:path'
import type { CollectionConfig, Access } from 'payload'

type UserWithRoles = { id: string | number; roles?: string[] }

const isAdminOrEIC: Access = ({ req: { user } }) => {
  const u = user as unknown as UserWithRoles
  return Boolean(u?.roles?.some((role) => ['admin', 'eic'].includes(role)))
}

const isAdmin: Access = ({ req: { user } }) => {
  const u = user as unknown as UserWithRoles
  return Boolean(u?.roles?.includes('admin'))
}

const mediaDir = process.env.MEDIA_DIR || '/var/www/polymer-media'

export const Logos: CollectionConfig = {
  slug: 'logos',
  admin: {
    useAsTitle: 'label',
    group: 'Theme',
  },
  access: {
    read: () => true,
    create: isAdminOrEIC,
    update: isAdminOrEIC,
    delete: isAdmin,
  },
  hooks: {
    afterRead: [
      ({ doc }) => {
        if (doc?.filename && typeof doc.filename === 'string') {
          const localPath = path.join(mediaDir, doc.filename)
          if (fs.existsSync(localPath)) {
            doc.url = `/api/logos/file/${doc.filename}`
            return doc
          }
        }
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'label',
      type: 'text',
      required: true,
      admin: {
        description: 'Human-readable name shown in the logo picker (e.g. "Default", "Halloween 2026")',
      },
    },
  ],
  upload: {
    staticDir: mediaDir,
  },
}

export default Logos
