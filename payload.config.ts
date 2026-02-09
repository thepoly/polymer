import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users.ts'
import { Media } from './collections/Media.ts'
import Articles from './collections/Articles.ts'
import JobTitles from './collections/JobTitles.ts'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    suppressHydrationWarning: true,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    components: {
      views: {
        dashboard: {
          Component: '@/components/Dashboard#default',
        },
      },
    },
  },
  collections: [Users, Media, Articles, JobTitles], 
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
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