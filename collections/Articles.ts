import type { CollectionConfig } from 'payload'

const Articles: CollectionConfig = {
  slug: 'articles',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'updatedAt'],
    components: {
      edit: {
        // [Save Version] [Progression Action] [Publish]
        SaveDraftButton: '@/components/Dashboard/SaveVersionButton#SaveVersionButton',
        PublishButton: '@/components/Dashboard/HeaderActions#HeaderActions',
        SaveButton: '@/components/Dashboard/HiddenButton#HiddenButton',
      },
    },
  },
  access: {
    // CONSTRAINT: Only Admin, EIC, Copy Editor, or Section Editor can modify articles
    update: ({ req: { user } }) => {
      if (!user) return false
      const roles = (user)?.roles || []
      return roles.some((role: string) => ['admin', 'eic', 'copy-editor', 'editor'].includes(role))
    },
    // Everyone can read (or you can restrict this if needed)
    read: () => true,
    create: ({ req: { user } }) => {
      if (!user) return false
      const roles = (user)?.roles || []
      return roles.some((role: string) => ['admin', 'eic', 'copy-editor', 'editor', 'writer'].includes(role))
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
    
    // --- STATUS FIELD ---
    {
      name: 'status',
      type: 'select',
      enumName: 'article_status_enum', // Avoid collision with internal _status
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Needs Copy', value: 'needs-copy' },
        { label: 'Needs 1st Copy', value: 'needs-1st' },
        { label: 'Needs 2nd Copy', value: 'needs-2nd' },
        { label: 'Needs 3rd Copy', value: 'needs-3rd' },
        { label: 'Ready to Publish', value: 'ready' },
      ],
      access: {
        update: ({ req: { user } }) => {
          const roles = (user)?.roles || []
          return roles.some((role: string) => ['admin', 'eic', 'copy-editor', 'editor'].includes(role))
        },
      },
      admin: {
        position: 'sidebar',
        components: {
          // Use Colored Badges in List View
          Cell: '@/components/Dashboard/StatusBadge#StatusBadge',
        },
      },
      hooks: {
        beforeChange: [
          ({ data, originalDoc, req }) => {
            const newStatus = data?.status || originalDoc?.status
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const userRoles = (req.user as any)?.roles || []

            // CONSTRAINT 1: "Needs 1st" is now the strict one.
            // We REMOVED 'needs-copy' from this check so you can move to triage without editors.
            if (['needs-1st', 'needs-2nd', 'needs-3rd'].includes(newStatus)) {
              const c1 = data?.copyEditor1 || originalDoc?.copyEditor1
              const c2 = data?.copyEditor2 || originalDoc?.copyEditor2
              const c3 = data?.copyEditor3 || originalDoc?.copyEditor3
              
              if (!c1 || !c2 || !c3) {
                throw new Error('You cannot start the Copy Process (Needs 1st) until all 3 Copy Editors are assigned.')
              }
            }

            return data?.status // Return the value
          },
        ],
      },
    },

    // --- COPY DESK FIELDS ---
    {
      type: 'group',
      label: 'Copy Desk Assignments',
      admin: {
        position: 'sidebar',
      },
      fields: [
        {
          name: 'copyEditor1',
          type: 'relationship',
          relationTo: 'users',
          label: '1st Copy Editor',
        },
        {
          name: 'copyEditor2',
          type: 'relationship',
          relationTo: 'users',
          label: '2nd Copy Editor',
        },
        {
          name: 'copyEditor3',
          type: 'relationship',
          relationTo: 'users',
          label: '3rd Copy Editor',
        },
      ],
    },
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