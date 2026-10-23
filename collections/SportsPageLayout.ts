import type { CollectionConfig } from 'payload'

const SportsPageLayout: CollectionConfig = {
  slug: 'sports-page-layout',
  labels: {
    singular: 'Sports Layout',
    plural: 'Sports Layout',
  },
  admin: {
    useAsTitle: 'name',
    components: {
      // "Schools" button beside "Create New" (Schools is hidden from the sidebar)
      beforeListTable: ['@/components/Dashboard/SportsLayoutEditor/SchoolsButton#SchoolsListButton'],
      views: {
        edit: {
          default: {
            Component: '@/components/Dashboard/SportsLayoutEditor#SportsLayoutEditor',
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
      defaultValue: 'Sports Layout',
    },
    // JSON blob storing the full layout:
    // Shape: {
    //   lead: number | null,          // headline story (needs an image)
    //   showScoreboard: boolean,      // scoreboard above the lead, built from the
    //                                 // lead story's opponent + scores
    //   belowLead: number | null,     // wide card under the lead
    //   belowLead2: number | null,    // second wide card (text left, photo
    //                                 // right), only when the scoreboard is off
    //   headlines: (number | null)[], // 3 slots in the right column
    //   standingsOverrides: { sport, mode: 'show' | 'hide', until }[],
    //                                 // editor overrides of the automatic
    //                                 // standings pick; each lasts 7 days
    //                                 // (see lib/standingsSchedule.ts)
    // }
    {
      name: 'layout',
      type: 'json',
      required: false,
    },
  ],
}

export default SportsPageLayout
