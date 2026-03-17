import type { CollectionConfig } from 'payload'
import { deriveSlug } from '../utils/deriveSlug'

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
        // Auto-generate slug from title if not provided
        if (!data.slug && data.title) {
          data.slug = deriveSlug(data.title)
        }

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
        { label: 'Opinion', value: 'opinion' },
      ],
      required: true,
    },
    {
      name: 'opinionType',
      type: 'select',
      options: [
        { label: 'Opinion', value: 'opinion' },
        { label: 'Column', value: 'column' },
        { label: 'Staff Editorial', value: 'staff-editorial' },
        { label: 'Editorial Notebook', value: 'editorial-notebook' },
        { label: 'Endorsement', value: 'endorsement' },
        { label: 'Top Hat', value: 'top-hat' },
        { label: 'Candidate Profile', value: 'candidate-profile' },
        { label: 'Letter to the Editor', value: 'letter-to-the-editor' },
        { label: "The Poly's Recommendations", value: 'polys-recommendations' },
        { label: "Editor's Notebook", value: 'editors-notebook' },
        { label: 'Derby', value: 'derby' },
        { label: 'Other', value: 'other' },
      ],
      admin: {
        condition: (data) => data?.section === 'opinion' || data?.section === 'editorial',
        description: 'Categorizes opinion articles. Only visible when section is Opinion.',
      },
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
      name: 'imageCaption',
      type: 'text',
      admin: {
        description: 'Caption for the featured image (e.g. "Illustration by The Polytechnic")',
      },
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
