import type { Access, CollectionConfig } from 'payload'
import type { User } from '@/payload-types'

// Admins, EICs and news-section editors run the Student Government timelines
const canWrite: Access = ({ req: { user } }) => {
  if (!user) return false
  const u = user as User
  const roles = u.roles || []
  if (roles.some((role: string) => ['admin', 'eic'].includes(role))) return true
  return roles.includes('editor') && u.section === 'news'
}

const isAdminOrEIC: Access = ({ req: { user } }) => {
  if (!user) return false
  const roles = (user as User).roles || []
  return roles.some((role: string) => ['admin', 'eic'].includes(role))
}

/**
 * Short Student Senate / Executive Board updates that aren't full articles.
 * They appear only on the timeline pages (/news/student-government/senate,
 * /news/student-government/e-board) and as bullet points in the Student Government box
 * on /news, mixed in date order with articles carrying the matching kicker.
 */
const StudentGovUpdates: CollectionConfig = {
  slug: 'student-gov-updates',
  labels: {
    singular: 'Student Gov Update',
    plural: 'Student Gov Updates',
  },
  admin: {
    // Out of the sidebar: updates are added and edited from the Senate /
    // Executive Board page editors (News Layout ▸ arrow). Admin pages still work.
    group: false,
    useAsTitle: 'title',
    defaultColumns: ['title', 'body', 'date'],
    description:
      'Short Senate and Executive Board updates. They show on the timeline pages and in the Student Government box on the News page.',
  },
  defaultSort: '-date',
  access: {
    read: () => true,
    create: canWrite,
    update: canWrite,
    delete: isAdminOrEIC,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'body',
      label: 'Timeline',
      type: 'select',
      required: true,
      options: [
        { label: 'Student Senate', value: 'senate' },
        { label: 'Executive Board', value: 'eboard' },
      ],
      admin: {
        description: 'Which timeline this update belongs to.',
      },
    },
    {
      name: 'blurb',
      type: 'textarea',
      required: true,
      admin: {
        description: 'A few sentences. Plain text.',
      },
    },
    {
      name: 'date',
      type: 'date',
      required: true,
      index: true,
      defaultValue: () => new Date().toISOString(),
      admin: {
        description: 'Where the update sits on the timeline. Defaults to now; change it to backfill older items.',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
  ],
}

export default StudentGovUpdates
