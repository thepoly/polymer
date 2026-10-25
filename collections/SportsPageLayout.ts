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
    delete: ({ req: { user } }) => {
      if (!user) return false
      const roles = (user as unknown as { roles?: string[] }).roles || []
      return roles.includes('admin')
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
    //   scoreboardDate: { articleId: number, date: 'YYYY-MM-DD' } | null,
    //                                 // day the lead's game was played, shown
    //                                 // under the scoreboard; applies only
    //                                 // while that article is the lead
    //   leadTitleOverlay: boolean,    // lead title box overlaps the photo on
    //                                 // desktop (default on); off puts a plain
    //                                 // title under the photo
    //   showScoreStrip: boolean,      // RPI scores banner at the top (default
    //                                 // on); off brings back the plain
    //                                 // "Sports | Contact" header
    //   belowLead: number | null,     // wide card under the lead
    //   belowLead2: number | null,    // second wide card (text left, photo
    //                                 // right), only when the scoreboard is off
    //   headlines: (number | null)[], // 3 slots in the right column
    //   featured: (number | null)[],  // 7 cards in the featured row
    //   featuredFocus: { [articleId]: { x, y } },
    //                                 // editors' framing of each featured
    //                                 // card's photo (object-position %);
    //                                 // without one, the photo's focal point
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
