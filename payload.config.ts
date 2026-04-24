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
import LiveArticles from './collections/LiveArticles.ts'
import JobTitles from './collections/JobTitles.ts'
import Layout from './collections/Layout.ts'
import OpinionPageLayout from './collections/OpinionPageLayout.ts'
import FeaturesPageLayout from './collections/FeaturesPageLayout.ts'
import StaffPageLayout from './collections/StaffPageLayout.ts'
import Submissions from './collections/Submissions.ts'
import EventSubmissions from './collections/EventSubmissions.ts'
import Logos from './collections/Logos.ts'
import Seo from './collections/Seo.ts'
import Theme from './collections/Theme.ts'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const csrfOrigins = [
  process.env.NEXT_PUBLIC_SITE_URL,
  process.env.BASE_URL,
  process.env.NODE_ENV !== 'production' ? 'http://localhost:3000' : undefined,
].filter((origin): origin is string => Boolean(origin))

export default buildConfig({
  csrf: csrfOrigins,
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
  collections: [Users, Media, Logos, Articles, LiveArticles, JobTitles, Layout, OpinionPageLayout, FeaturesPageLayout, StaffPageLayout, Submissions, EventSubmissions],
  globals: [Theme, Seo],
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
    push: process.env.NODE_ENV === 'development' && process.env.PAYLOAD_DISABLE_PUSH !== '1',
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
