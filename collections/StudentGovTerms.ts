import type { Access, CollectionConfig } from 'payload'
import type { User } from '@/payload-types'
import { termName, termSlug, termStartYear } from '../components/News/studentGovTerms'

// Same people who run the timelines (see StudentGovUpdates)
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
 * One Student Senate or Executive Board term: GM Week to GM Week. A term runs
 * from its first meeting (`startsOn`) to the day before the next term's first
 * meeting; the newest started term is the one in session. Timeline entries
 * are put in a term by date, and each covered term is one row in the Terms
 * list at the bottom of its timeline page.
 */
const StudentGovTerms: CollectionConfig = {
  slug: 'student-gov-terms',
  labels: {
    singular: 'Student Gov Term',
    plural: 'Student Gov Terms',
  },
  admin: {
    // Out of the sidebar like the updates; linked from the Senate / Executive
    // Board page editors
    group: false,
    useAsTitle: 'name',
    defaultColumns: ['name', 'body', 'startsOn', 'hasCoverage'],
    description:
      'Senate and Executive Board terms, GM Week to GM Week. Timeline entries are sorted into terms by date; each listed term has its own page and a row in the Terms list at the foot of the timeline.',
  },
  defaultSort: '-startsOn',
  access: {
    read: () => true,
    create: canWrite,
    update: canWrite,
    delete: isAdminOrEIC,
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data?.body || !data.startsOn) return data
        const body = data.body as 'senate' | 'eboard'
        const startYear = termStartYear(data.startsOn as string)
        const number = typeof data.number === 'number' ? data.number : null
        data.slug = termSlug(body, number, startYear)
        data.name = termName(body, number, startYear, 'full')
        return data
      },
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      admin: { readOnly: true, description: 'Filled in from the body, number and first meeting.' },
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'The term’s URL: /senate/57 or /e-board/2026-27.',
      },
    },
    {
      name: 'body',
      type: 'select',
      required: true,
      options: [
        { label: 'Student Senate', value: 'senate' },
        { label: 'Executive Board', value: 'eboard' },
      ],
    },
    {
      name: 'number',
      label: 'Senate number',
      type: 'number',
      min: 1,
      admin: {
        condition: (data) => data?.body === 'senate',
        description: '57 for the 57th Senate.',
      },
      validate: (value: number | null | undefined, { siblingData }: { siblingData: { body?: string } }) =>
        siblingData?.body === 'senate' && (value === null || value === undefined)
          ? 'Senate terms need a number.'
          : true,
    },
    {
      name: 'startsOn',
      label: 'First meeting',
      type: 'date',
      required: true,
      index: true,
      admin: {
        description:
          'The new body’s first meeting after GM Week. The term runs until the next term’s first meeting; entries from GM Week up to then still belong to the outgoing term.',
        date: { pickerAppearance: 'dayOnly' },
      },
    },
    {
      name: 'gmWeekOn',
      label: 'GM Week result',
      type: 'date',
      admin: {
        description: 'When the election that produced this term was decided (the runoff, if there was one).',
        date: { pickerAppearance: 'dayOnly' },
      },
    },
    {
      name: 'gmWeekStory',
      label: 'Election results story',
      type: 'relationship',
      relationTo: 'articles',
      admin: { description: 'Linked from the GM Week marker at the top of the previous term.' },
    },
    {
      name: 'hasCoverage',
      label: 'Listed',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description:
          'Untick for terms before the digital archive’s coverage starts: the term leaves the Terms list and its page 404s.',
      },
    },
    {
      name: 'leaders',
      label: 'Chaired by',
      type: 'array',
      admin: {
        description:
          'The Grand Marshal (Senate) or President of the Union (E-Board). Add a second row when the leader changed mid-term. Leave empty if unknown.',
      },
      fields: [
        { name: 'name', type: 'text', required: true },
        {
          name: 'ordinal',
          type: 'number',
          min: 1,
          admin: { description: '160 for the 160th Grand Marshal.' },
        },
        {
          name: 'how',
          type: 'select',
          defaultValue: 'elected',
          options: [
            { label: 'Elected', value: 'elected' },
            { label: 'Elected in a runoff', value: 'runoff' },
            { label: 'Appointed', value: 'appointed' },
          ],
        },
        {
          name: 'startedOn',
          label: 'From',
          type: 'date',
          admin: {
            description: 'Only needed for a mid-term change: adds a divider to the stream on this date.',
            date: { pickerAppearance: 'dayOnly' },
          },
        },
      ],
    },
  ],
}

export default StudentGovTerms
