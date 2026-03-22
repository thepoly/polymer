import type { CollectionConfig } from 'payload'
import { getPostHogClient } from '../lib/posthog-server'

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
    // Anonymous readers can only see published articles. Authenticated staff keep full access
    // so the admin UI and editorial workflows can still inspect drafts.
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
    afterChange: [
      ({ doc, previousDoc, req }) => {
        const isNowPublished = doc._status === 'published'
        const wasPublished = previousDoc?._status === 'published'

        if (isNowPublished && !wasPublished) {
          const posthog = getPostHogClient()
          posthog?.capture({
            distinctId: String(req.user?.id || 'unknown'),
            event: 'article_published',
            properties: {
              article_id: doc.id,
              article_title: doc.title,
              article_section: doc.section,
              article_slug: doc.slug,
            },
          })
        }
      },
    ],
    beforeChange: [
      ({ data, originalDoc }) => {
        // LOGIC: If transitioning to 'published' via Payload's internal _status, set the publishedDate
        const isNowPublished = data._status === 'published'
        const wasPublished = originalDoc?._status === 'published'

        if (isNowPublished && !wasPublished) {
          data.publishedDate = new Date().toISOString()
        }

        // Auto-derive opinionType from kicker for opinion articles
        if (data.section === 'opinion' && data.kicker) {
          const kickerLower = data.kicker.toLowerCase().trim()
          const typeMap: Record<string, string> = {
            'opinion': 'opinion',
            'column': 'column',
            'staff editorial': 'staff-editorial',
            'editorial notebook': 'editorial-notebook',
            'endorsement': 'endorsement',
            'top hat': 'top-hat',
            'candidate profile': 'candidate-profile',
            'letter to the editor': 'letter-to-the-editor',
            "the poly's recommendations": 'polys-recommendations',
            "editor's notebook": 'editors-notebook',
            'derby': 'derby',
            'other': 'other',
          }
          const matched = typeMap[kickerLower]
          data.opinionType = matched || 'more'
        }

        return data
      },
    ],
  },
  fields: [
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
    { name: 'title', type: 'text', required: true },
    {
      name: 'kicker',
      type: 'text',
      admin: {
        components: {
          Field: '@/components/admin/KickerField#KickerField',
        },
      },
    },
    {
      name: 'subdeck',
      type: 'textarea',
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
        { label: 'More', value: 'more' },
      ],
      admin: {
        hidden: true,
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
      label: 'Featured Image Caption',
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
