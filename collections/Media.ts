import fs from 'node:fs'
import path from 'node:path'
import type { CollectionConfig, Access } from 'payload'
import { User } from '@/payload-types'

const isAdmin: Access = ({ req: { user } }) => {
  if (!user) return false
  const roles = (user as User)?.roles || []
  return roles.includes('admin')
}

const mediaDir = process.env.MEDIA_DIR || '/var/www/polymer-media'

const getThumbFilename = (filename: string) =>
  `${path.parse(filename).name}.thumb.webp`

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
    delete: isAdmin,
  },
  hooks: {
    afterRead: [
      ({ doc }) => {
        if (doc?.filename && typeof doc.filename === 'string') {
          const localPath = path.join(mediaDir, doc.filename)
          const thumbFilename = getThumbFilename(doc.filename)
          const thumbPath = path.join(mediaDir, thumbFilename)

          if (fs.existsSync(thumbPath)) {
            doc.thumbnailURL = `/api/media/file/${thumbFilename}`
          }

          if (fs.existsSync(localPath)) {
            doc.url = `/api/media/file/${doc.filename}`
            return doc
          }
        }

        if (doc?.sourceUrl && typeof doc.sourceUrl === 'string') {
          doc.url = doc.sourceUrl
        }

        return doc
      },
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      admin: {
        description: 'The title of the image, used for alt text across the site.',
      },
    },
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
      name: 'writeInPhotographer',
      type: 'text',
      admin: {
        position: 'sidebar',
        condition: (data) => !data?.photographer,
      },
    },
    {
      name: 'sourceUrl',
      type: 'text',
      admin: {
        hidden: true,
        readOnly: true,
      },
    },
  ],
  upload: {
    imageSizes: [
      {
        name: 'gallery',
        width: 1200,
        height: undefined,
        formatOptions: { format: 'webp', options: { quality: 80 } },
      },
      {
        name: 'card',
        width: 640,
        height: undefined,
        formatOptions: { format: 'webp', options: { quality: 75 } },
      },
    ],
    resizeOptions: { withoutEnlargement: true },
  },
}

export default Media
