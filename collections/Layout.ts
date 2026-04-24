import type { CollectionConfig } from 'payload'

type EditorUser = { roles?: string[]; section?: string }

/**
 * Homepage layout collection.
 *
 * This is a SINGLE, continuously-edited document — we do not create a new
 * layout per edition. Edition numbers are derived at read time from the
 * articles table (see `lib/getCurrentEdition.ts`), so no volume/edition fields
 * live here.
 *
 * Versions are enabled so editors can time-travel through previous states of
 * the homepage. Payload automatically records the author on each version.
 */
const Layout: CollectionConfig = {
  slug: 'layout',
  labels: {
    singular: 'Homepage Layout',
    plural: 'Homepage Layout',
  },
  admin: {
    useAsTitle: 'name',
    components: {
      views: {
        edit: {
          default: {
            Component: '@/components/Dashboard/LayoutEditor#LayoutEditor',
          },
        },
      },
    },
  },
  versions: {
    // snapshots only (no draft/publish split — the live homepage always reads
    // the current document). Payload still records author + timestamp on each
    // version so editors can see who changed what.
    drafts: false,
    maxPerDoc: 200,
  },
  access: {
    read: () => true,
    update: ({ req: { user } }) => {
      if (!user) return false
      const roles = (user as unknown as { roles?: string[] }).roles || []
      return roles.some((role: string) => ['admin', 'eic', 'editor'].includes(role))
    },
    create: ({ req: { user } }) => {
      if (!user) return false
      const roles = (user as unknown as { roles?: string[] }).roles || []
      return roles.some((role: string) => ['admin', 'eic', 'editor'].includes(role))
    },
  },
  hooks: {
    beforeChange: [
      ({ data, originalDoc, req }) => {
        const u = req.user as unknown as EditorUser
        // Record who last modified this layout. Written on every save so each
        // version row captures the editor.
        if (req?.user?.id && data) {
          data.lastModifiedBy = req.user.id
        }
        if (!u) return data
        if (u.roles?.some((r: string) => ['admin', 'eic'].includes(r))) return data
        if (u.roles?.includes('editor') && u.section) {
          // Editor may only modify their own section within sectionLayouts
          return {
            ...originalDoc,
            sectionLayouts: {
              ...(originalDoc?.sectionLayouts ?? {}),
              [u.section]: data?.sectionLayouts?.[u.section],
              // Preserve the just-set lastModifiedBy through the narrowing above.
              ...(req?.user?.id ? {} : {}),
            },
            lastModifiedBy: req?.user?.id ?? originalDoc?.lastModifiedBy ?? null,
          }
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      defaultValue: 'Homepage Layout',
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
        description: 'Automatically set to the user who most recently saved the homepage layout. Each version in the history tab records the editor who made that change.',
      },
    },
    {
      name: 'liveArticles',
      type: 'relationship',
      relationTo: 'live-articles',
      hasMany: true,
      required: false,
      label: 'Live Articles to Feature',
    },
    {
      name: 'skeleton',
      type: 'select',
      defaultValue: 'custom',
      options: [
        { label: 'Custom Grid', value: 'custom' },
        { label: 'Aries', value: 'aries' },
        { label: 'Taurus', value: 'taurus' },
        { label: 'Gemini', value: 'gemini' },
      ],
      admin: { hidden: true },
    },
    {
      name: 'grid',
      type: 'json',
      required: false,
    },
    {
      name: 'sectionLayouts',
      type: 'json',
      required: false,
      admin: {
        description: 'Per-section layout configuration (skeleton + pinned articles)',
      },
    },
    // Legacy slot fields — kept for backward compatibility during migration
    { name: 'mainArticle', type: 'relationship', relationTo: 'articles', admin: { hidden: true } },
    { name: 'top1', type: 'relationship', relationTo: 'articles', admin: { hidden: true } },
    { name: 'top2', type: 'relationship', relationTo: 'articles', admin: { hidden: true } },
    { name: 'top3', type: 'relationship', relationTo: 'articles', admin: { hidden: true } },
    { name: 'top4', type: 'relationship', relationTo: 'articles', admin: { hidden: true } },
    { name: 'op1', type: 'relationship', relationTo: 'articles', admin: { hidden: true } },
    { name: 'op2', type: 'relationship', relationTo: 'articles', admin: { hidden: true } },
    { name: 'op3', type: 'relationship', relationTo: 'articles', admin: { hidden: true } },
    { name: 'op4', type: 'relationship', relationTo: 'articles', admin: { hidden: true } },
    { name: 'special', type: 'relationship', relationTo: 'articles', admin: { hidden: true } },
  ],
}

export default Layout
