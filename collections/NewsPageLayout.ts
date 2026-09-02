import type { CollectionConfig } from 'payload'

const NewsPageLayout: CollectionConfig = {
  slug: 'news-page-layout',
  labels: {
    singular: 'News Layout',
    plural: 'News Layout',
  },
  admin: {
    useAsTitle: 'name',
    components: {
      views: {
        edit: {
          default: {
            Component: '@/components/Dashboard/NewsLayoutEditor#NewsLayoutEditor',
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
      defaultValue: 'News Layout',
    },
    // JSON blob storing the full layout:
    // Shape: {
    //   topStory: (number | null)[],        // 1 slot — pinned lead, top left
    //   studentGovLabel: string,            // renamable heading for the top row
    //   studentGov: (number | null)[],      // 3 slots — row to the right of the top story
    //   studentGovImages: boolean[],
    //   columns: Array<{                    // 3 renamable columns below the top row
    //     label: string,
    //     articles: (number | null)[],      // 4 slots
    //     images: boolean[],
    //   }>,
    //   bottomLabel: string,                // renamable heading for the bottom strip
    //   bottom: (number | null)[],          // 5 slots — free drag area
    // }
    // Every slot is optional: the page auto-fills empty slots from recent news.
    {
      name: 'layout',
      type: 'json',
      required: false,
    },
  ],
}

export default NewsPageLayout
