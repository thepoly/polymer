import type { Block, CollectionConfig } from 'payload'
import {
  BlocksFeature,
  BoldFeature,
  ItalicFeature,
  UploadFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import { getPlainText } from '../utils/getPlainText'

// Mirror the PhotoGallery / Carousel blocks declared in payload.config.ts so
// the live-article update body supports the same embedded richText features
// that Articles use for their body content.
const PhotoGalleryBlock: Block = {
  slug: 'photo_gallery',
  labels: { singular: 'Photo Gallery', plural: 'Photo Galleries' },
  fields: [
    {
      name: 'images',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        { name: 'image', type: 'upload', relationTo: 'media', required: true },
        { name: 'caption', type: 'text' },
      ],
    },
  ],
}

const CarouselBlock: Block = {
  slug: 'carousel',
  labels: { singular: 'Carousel', plural: 'Carousels' },
  fields: [
    {
      name: 'images',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        { name: 'image', type: 'upload', relationTo: 'media', required: true },
        { name: 'caption', type: 'text' },
      ],
    },
  ],
}

const LiveArticles: CollectionConfig = {
  slug: 'live-articles',
  labels: {
    singular: 'Live Article',
    plural: 'Live Articles',
  },
  admin: {
    useAsTitle: 'plainTitle',
    defaultColumns: ['plainTitle', 'section', 'updatedAt'],
  },
  access: {
    // MIRROR Articles.ts — admin/eic/editor may update; editors are
    // restricted to their section. Live articles don't yet participate in
    // per-section editor assignment, so editors get full update access.
    update: ({ req: { user } }) => {
      if (!user) return false
      const u = user as unknown as { roles?: string[]; section?: string }
      const roles = u.roles || []
      return roles.some((role: string) => ['admin', 'eic', 'editor'].includes(role))
    },
    // Anonymous readers can only see published live articles. Authenticated
    // staff keep full access so the admin UI and editorial workflows can
    // still inspect drafts.
    read: ({ req: { user } }) => {
      if (user) return true
      return {
        _status: {
          equals: 'published',
        },
      }
    },
    create: ({ req: { user } }) => {
      if (!user) return false
      const roles = (user as unknown as { roles?: string[] })?.roles || []
      return roles.some((role: string) => ['admin', 'eic', 'editor', 'writer'].includes(role))
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      const roles = (user as unknown as { roles?: string[] })?.roles || []
      return roles.includes('admin')
    },
  },
  versions: {
    drafts: true,
  },
  hooks: {
    beforeChange: [
      ({ data, originalDoc, req }) => {
        // LOGIC: If transitioning to 'published' via Payload's internal _status, set the publishedDate
        const isNowPublished = data._status === 'published'
        const wasPublished = originalDoc?._status === 'published'

        if (isNowPublished && !wasPublished) {
          data.publishedDate = new Date().toISOString()
        }

        // Track who last modified this live article. Written on every save.
        if (req?.user?.id) {
          data.lastModifiedBy = req.user.id
        }

        // Derive plainTitle from rich title and normalize slug.
        const plainTitle = getPlainText(data.title)
        data.plainTitle = plainTitle

        const rawSlug = data.slug || plainTitle || ''
        if (rawSlug) {
          data.slug = rawSlug
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/(^-|-$)/g, '')
        }

        return data
      },
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'richText',
      required: true,
      editor: lexicalEditor({
        features: () => [BoldFeature(), ItalicFeature()],
      }),
    },
    {
      name: 'lastModifiedBy',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      label: 'Last Modified By',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Automatically set to the user who most recently saved this live article. Each version captures the editor.',
      },
    },
    {
      name: 'plainTitle',
      type: 'text',
      required: true,
      admin: {
        hidden: true,
      },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        position: 'sidebar',
        components: {
          Field: '/components/admin/SlugField#SlugField',
        },
      },
    },
    {
      name: 'section',
      type: 'text',
      required: true,
      maxLength: 60,
      admin: {
        description: 'Short topic label shown on the homepage strip (e.g. "Labor Department", "Election Night").',
      },
    },
    {
      name: 'hero',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'summary',
      type: 'array',
      required: false,
      labels: {
        singular: 'Summary Item',
        plural: 'Summary Items',
      },
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
        },
        {
          name: 'body',
          type: 'richText',
          required: true,
        },
      ],
    },
    {
      name: 'updates',
      type: 'array',
      required: true,
      minRows: 1,
      labels: {
        singular: 'Update',
        plural: 'Updates',
      },
      fields: [
        {
          name: 'timestamp',
          type: 'date',
          required: true,
          defaultValue: () => new Date(),
          admin: {
            date: {
              pickerAppearance: 'dayAndTime',
            },
          },
        },
        {
          name: 'heading',
          type: 'text',
          required: false,
        },
        {
          name: 'author',
          type: 'relationship',
          relationTo: 'users',
          required: true,
        },
        {
          name: 'body',
          type: 'richText',
          required: true,
          editor: lexicalEditor({
            features: ({ defaultFeatures }) => [
              ...defaultFeatures,
              BlocksFeature({ blocks: [PhotoGalleryBlock, CarouselBlock] }),
              UploadFeature({
                collections: {
                  media: {
                    fields: [
                      {
                        name: 'caption',
                        type: 'text',
                        label: 'Caption',
                      },
                      {
                        name: 'credit',
                        type: 'relationship',
                        relationTo: 'users',
                        label: 'Photo Credit',
                        admin: {
                          description: 'Overrides the photographer set on the media record',
                        },
                      },
                    ],
                  },
                },
              }),
            ],
          }),
        },
      ],
    },
    {
      name: 'publishedDate',
      type: 'date',
      admin: {
        hidden: true,
      },
    },
  ],
}

export default LiveArticles
