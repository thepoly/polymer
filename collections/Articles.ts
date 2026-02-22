import type { CollectionConfig } from 'payload'

const Articles: CollectionConfig = {
  slug: 'articles',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'updatedAt'],
  },
  access: {
    // CONSTRAINT: Only Admin, EIC, Copy Editor, or Section Editor can modify articles
    update: ({ req: { user } }) => {
      if (!user) return false
      const roles = (user)?.roles || []
      return roles.some((role: string) => ['admin', 'eic', 'editor'].includes(role))
    },
    // Everyone can read (or you can restrict this if needed)
    read: () => true,
    create: ({ req: { user } }) => {
      if (!user) return false
      const roles = (user)?.roles || []
      return roles.some((role: string) => ['admin', 'eic', 'editor', 'writer'].includes(role))
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      const roles = (user)?.roles || []
      return roles.includes('admin')
    },
  },
  versions: {
    drafts: true,
  },
  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => {
        // LOGIC: If transitioning to 'published' via Payload's internal _status, set the publishedDate
        const isNowPublished = data._status === 'published'
        const wasPublished = originalDoc?._status === 'published'

        if (isNowPublished && !wasPublished) {
          data.publishedDate = new Date().toISOString()
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', required: true },


    {
      name: 'kicker', // e.g. "News", "The Poly"
      type: 'text',
    },
    {
      name: 'subdeck', // The summary/subtitle
      type: 'textarea',
    },
    {
      name: 'section', 
      type: 'select',
      options: [
        { label: 'News', value: 'news' },
        { label: 'Sports', value: 'sports' },
        { label: 'Features', value: 'features' },
        { label: 'Editorial', value: 'editorial' },
        { label: 'Opinion', value: 'opinion' },
      ],
      required: true,
    },
    {
      name: 'authors',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      required: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      defaultValue: ({ req }: { req: any }) => {
        if (req.user) return [req.user.id]
        return []
      },
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'publishedDate',
      type: 'date',
      admin: {
        hidden: true,
      },
    },
    {
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'content',
      type: 'richText',
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      admin: {
        position: 'sidebar',
      },
    },
  ],
}

export default Articles