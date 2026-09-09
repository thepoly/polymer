import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { lexicalEditor, BoldFeature, ItalicFeature } from '@payloadcms/richtext-lexical'
import { getPostHogClient } from '../lib/posthog-server'
import { getPlainText } from '../utils/getPlainText'
import { getContentPlainText } from '../utils/getContentPlainText'

const Articles: CollectionConfig = {
  slug: 'articles',
  admin: {
    useAsTitle: 'plainTitle',
    defaultColumns: ['plainTitle', 'updatedAt', 'lastModifiedBy'],
  },
  access: {
    update: ({ req: { user } }) => {
      if (!user) return false
      const u = user as unknown as { roles?: string[]; section?: string }
      const roles = u.roles || []
      if (roles.some((role: string) => ['admin', 'eic'].includes(role))) return true
      if (roles.includes('editor') && u.section) return { section: { equals: u.section } }
      return false
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
      return roles.some((role: string) => ['admin', 'eic', 'editor'].includes(role))
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
        // Bulk legacy import sets req.context.legacyImport=true so the 10K
        // historical inserts don't trigger PostHog events or breaking-news pushes.
        if ((req?.context as { legacyImport?: boolean } | undefined)?.legacyImport) return

        const isNowPublished = doc._status === 'published'
        const wasPublished = previousDoc?._status === 'published'

        if (isNowPublished && !wasPublished) {
          const posthog = getPostHogClient()

          const plainTitle = getPlainText(doc.title);

          posthog?.capture({
            distinctId: String(req.user?.id || 'unknown'),
            event: 'article_published',
            properties: {
              article_id: doc.id,
              article_title: plainTitle,
              article_section: doc.section,
              article_slug: doc.slug,
            },
          })

          // Fire a breaking-news push notification when flagged.
          // Delegated to the internal /api/push/send endpoint so the
          // heavy FCM work doesn't block the article save.
          if (doc.breakingNews === true) {
            try {
              const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://127.0.0.1:3000'
              const secret = process.env.INTERNAL_PUSH_SECRET || ''
              void fetch(`${baseUrl}/api/push/send`, {
                method: 'POST',
                headers: {
                  'content-type': 'application/json',
                  'x-internal-secret': secret,
                },
                body: JSON.stringify({ articleId: doc.id }),
              }).catch((err) => {
                console.error('[breaking-news] push dispatch failed', err)
              })
            } catch (err) {
              console.error('[breaking-news] push dispatch threw', err)
            }
          }
        }
      },
    ],
    beforeChange: [
      /**
       * Photo features only: refuse to publish until the lead image has a
       * focal point.
       *
       * The photofeature hero fills the reader's viewport with `object-cover`,
       * so it always throws away part of the photo. `utils/focalPoint.ts` uses
       * media.focalX / focalY to decide which part survives; with no focal
       * point the crop falls back to dead centre and takes faces first.
       *
       * Payload writes 50/50 for any upload whose point has never been moved,
       * so "untouched" and "deliberately centred" look identical in the data.
       * That is what `focalPointAcknowledged` is for — an editor who genuinely
       * wants centre framing says so once, rather than being unable to publish.
       *
       * Nothing here applies to a normal article: every path returns early
       * unless isPhotofeature is set.
       */
      async ({ data, originalDoc, req }) => {
        const isLegacyImport = (req?.context as { legacyImport?: boolean } | undefined)?.legacyImport === true
        if (isLegacyImport) return data
        if (data._status !== 'published') return data

        const isPhotofeature = data.isPhotofeature ?? originalDoc?.isPhotofeature
        if (!isPhotofeature) return data
        if (data.focalPointAcknowledged === true) return data

        const relationId = (value: unknown): number | null => {
          if (typeof value === 'number') return value
          if (value && typeof value === 'object' && 'id' in value && typeof value.id === 'number') return value.id
          return null
        }

        const mediaId = relationId(data.featuredImage) ?? relationId(originalDoc?.featuredImage)
        // No lead image is a separate problem; there is nothing to frame.
        if (mediaId === null) return data

        const media = await req.payload.findByID({ collection: 'media', id: mediaId, depth: 0 })
        const focalX = media?.focalX
        const focalY = media?.focalY
        const untouched =
          (focalX == null && focalY == null) || (Number(focalX) === 50 && Number(focalY) === 50)

        if (!untouched) return data

        const imageName = media?.title || media?.filename || `Media #${mediaId}`
        throw new APIError(
          `This photo feature can't be published yet: its lead image has no focal point.\n\n` +
            `The photo feature hero crops to fill the whole screen. Without a focal point it crops from the middle, which is what cuts people's heads off on tall and narrow screens.\n\n` +
            `To fix it: open Media, find "${imageName}", drag the focal-point marker onto the subject's face, and save. Then publish this article again.\n\n` +
            `If centre framing really is right for this photo, tick "Centre framing is intentional" in the sidebar and publish again.`,
          400,
        )
      },
      ({ data, originalDoc, req }) => {
        const isLegacyImport = (req?.context as { legacyImport?: boolean } | undefined)?.legacyImport === true

        // LOGIC: If transitioning to 'published' via Payload's internal _status, set the publishedDate.
        // Skipped for legacy imports — the script supplies the historical date directly.
        const isNowPublished = data._status === 'published'
        const wasPublished = originalDoc?._status === 'published'

        if (isNowPublished && !wasPublished && !isLegacyImport) {
          data.publishedDate = new Date().toISOString()
        }

        // Track who last modified this article. Written on every change so each
        // version document captures the editor making that change.
        if (req?.user?.id) {
          data.lastModifiedBy = req.user.id
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

        // Auto-generate slug from title if not set, or sanitize existing slug
        const plainTitle = getPlainText(data.title);
        data.plainTitle = plainTitle;

        // Derive plain searchable body from the Lexical content. Used by the
        // search adapter to ILIKE-match body text. Caller can pass a
        // pre-computed `plainContent` (e.g. legacy-import path) — we only
        // overwrite when we actually have content to derive from.
        if (data.content !== undefined) {
          const plainContent = getContentPlainText(data.content)
          if (plainContent) data.plainContent = plainContent
        }

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
      name: 'title',
      type: 'richText',
      required: true,
      editor: lexicalEditor({
        features: ({ defaultFeatures }) => [
          BoldFeature(),
          ItalicFeature(),
        ],
      }),
    },
    {
      name: 'plainTitle',
      type: 'text',
      admin: {
        hidden: true,
      },
    },
    {
      name: 'plainContent',
      type: 'textarea',
      admin: {
        hidden: true,
        description: 'Auto-derived plain-text body for search. Do not edit by hand.',
      },
    },
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
      required: false,
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
      name: 'writeInAuthors',
      type: 'array',
      label: 'Write-in Authors',
      admin: {
        position: 'sidebar',
        description: 'External contributors who are not staff users',
      },
      fields: [
        { name: 'name', type: 'text', required: true },
        {
          name: 'photo',
          type: 'upload',
          relationTo: 'media',
          required: false,
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
    {
      name: 'lastModifiedBy',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      label: 'Last Modified By',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Automatically set to the user who most recently saved this article. Each version in the history tab records the editor who made that change.',
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
      admin: {
        condition: (data: Record<string, unknown>) => !data?.isPhotofeature,
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
        components: {
          Field: '/components/admin/SlugField#SlugField',
        },
      },
    },
    {
      name: 'seoTitle',
      type: 'text',
      label: 'SEO Title',
      admin: {
        position: 'sidebar',
        description: 'Overrides the article title in search results. Leave blank to use the article title.',
      },
    },
    {
      name: 'searchDescription',
      type: 'textarea',
      label: 'Search Description',
      admin: {
        position: 'sidebar',
        description: 'Summary shown in search engine results (150–160 characters recommended).',
      },
    },
    {
      name: 'breakingNews',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Fires a push notification to mobile app users when this article is published.',
        position: 'sidebar',
      },
    },
    {
      name: 'isFollytechnic',
      type: 'checkbox',
      label: 'The Follytechnic',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Render this article in Comic Sans everywhere it appears.',
      },
    },
    {
      name: 'isPhotofeature',
      type: 'checkbox',
      label: 'Photo Feature',
      defaultValue: false,
      validate: (value: boolean | null | undefined, { data }: { data: Record<string, unknown> }) => {
        const authors = data?.authors as unknown[];
        if (value && Array.isArray(authors) && authors.length > 1) {
          return 'Photo Feature layout only supports a single author.';
        }
        return true;
      },
      admin: {
        position: 'sidebar',
        description: 'Use the full-screen photo feature layout. Only available for single-author articles.',
      },
    },
    {
      name: 'focalPointAcknowledged',
      type: 'checkbox',
      label: 'Centre framing is intentional',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description:
          "Photo feature heroes crop to fill the screen, so the lead image needs a focal point or faces get cut off. Set one in Media. Tick this only if centre framing really is correct for this photo.",
        condition: (data: Record<string, unknown>) => Boolean(data?.isPhotofeature),
      },
    },
    {
      name: 'gradientOpacity',
      type: 'number',
      label: 'Image Fade Darkness',
      min: 0,
      max: 200,
      admin: {
        position: 'sidebar',
        description: 'Darkness of the bottom image fade (0–100). Default is 90.',
        condition: (data: Record<string, unknown>) => Boolean(data?.isPhotofeature),
      },
    },
    {
      name: 'legacyHtmlUrl',
      type: 'text',
      label: 'Legacy Archive URL',
      admin: {
        position: 'sidebar',
        description: 'Full URL or path to the original archived HTML for this article. Populated by the legacy import scripts; when set, the article page shows a "View on poly.rpi.edu" button.',
      },
    },
    {
      name: 'legacySource',
      type: 'text',
      label: 'Legacy Source',
      admin: {
        position: 'sidebar',
        description: "Origin of the legacy HTML. One of: 'polytechnic-online', 'wordpress', 'pipeline'.",
      },
      validate: (value: string | null | undefined) => {
        if (value == null || value === '') return true
        const allowed = ['polytechnic-online', 'wordpress', 'pipeline']
        return allowed.includes(value) || `legacySource must be one of: ${allowed.join(', ')}`
      },
    },
    {
      name: 'legacyArticleId',
      type: 'text',
      label: 'Legacy Article ID',
      admin: {
        position: 'sidebar',
        description: 'Stable identifier from the source system. Combined with legacySource, forms the upsert key for legacy imports.',
      },
      index: true,
    },
    {
      name: 'legacyCategory',
      type: 'text',
      label: 'Legacy Category',
      admin: {
        position: 'sidebar',
        description: 'Original category/section name from the source system. Preserved for display and search; does not affect routing.',
      },
    },
    {
      name: 'previousSlug',
      type: 'text',
      label: 'Previous Slug',
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Old slug retained for 301 redirects after a rename. The middleware redirects requests for this slug to the current one.',
      },
    },
  ],
}

export default Articles
