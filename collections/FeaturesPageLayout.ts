import type { CollectionConfig } from 'payload'

const FeaturesPageLayout: CollectionConfig = {
  slug: 'features-page-layout',
  labels: {
    singular: 'Features Layout',
    plural: 'Features Layout',
  },
  admin: {
    useAsTitle: 'name',
    components: {
      views: {
        edit: {
          default: {
            Component: '@/components/Dashboard/FeaturesLayoutEditor#FeaturesLayoutEditor',
          },
        },
      },
    },
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
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      defaultValue: 'Features Layout',
    },
    // JSON blob storing the editor's pins: { version: 3, cover, leads:
    // { campus, arts, people }, reel } (FeaturesLayoutV3 in
    // lib/featuresFront.ts). Older saves (onCampus, featured, rightArticles,
    // photoBand, theArts, photoSpotlight, events, collarCity…) are read
    // through normalizeFeaturesLayout, which keeps only featured[0] as the
    // cover; the editor's next save rewrites them. No schema change: the
    // field is JSON either way.
    {
      name: 'layout',
      type: 'json',
      required: false,
    },
  ],
}

export default FeaturesPageLayout
