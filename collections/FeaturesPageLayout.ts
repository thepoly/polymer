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
    // JSON blob storing the full layout (see FeaturesLayoutEditor for the
    // exact type). Row 1: onCampus, featured, wideArticle, rightArticles (+
    // per-slot image flags). Row 2: theArts, photoSpotlight, spotlightSubs.
    // Older saves may still carry `events` and `collarCity*`; both sections
    // were removed and those keys are ignored.
    {
      name: 'layout',
      type: 'json',
      required: false,
    },
  ],
}

export default FeaturesPageLayout
