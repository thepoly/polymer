import { postgresAdapter } from '@payloadcms/db-postgres'
import { BlocksFeature, lexicalEditor, UploadFeature } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import type { Block } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

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

import { Users } from './collections/Users.ts'
import { Media } from './collections/Media.ts'
import Articles from './collections/Articles.ts'
import JobTitles from './collections/JobTitles.ts'
import Layout from './collections/Layout.ts'
import OpinionPageLayout from './collections/OpinionPageLayout.ts'
import FeaturesPageLayout from './collections/FeaturesPageLayout.ts'
import Submissions from './collections/Submissions.ts'
import EventSubmissions from './collections/EventSubmissions.ts'
import Roles from './collections/Roles.ts'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    suppressHydrationWarning: true,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: '- Polytechnic',
      icons: [
        {
          rel: 'icon',
          url: '/dynamicPfavicon.svg',
        },
      ],
    },
    components: {
      graphics: {
        Logo: '@/components/Dashboard/Login/Logo#Logo',
        Icon: '@/components/Dashboard/Icon#Icon',
      },
      views: {
        dashboard: {
          Component: '@/components/Dashboard#default',
        },
      },
    },
  },
  collections: [Users, Media, Articles, JobTitles, Layout, OpinionPageLayout, FeaturesPageLayout, Submissions, EventSubmissions, Roles],
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
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    push: process.env.NODE_ENV !== 'production',
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  graphQL: {
    disablePlaygroundInProduction: true,
    disableIntrospectionInProduction: true,
  },
  sharp,
  plugins: [],
})
