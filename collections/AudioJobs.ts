import type { CollectionConfig, Access } from 'payload'

type UserWithRoles = { id: string | number; roles?: string[] }

const STAFF_ROLES = ['admin', 'eic', 'editor', 'writer']
const STAFF_VIEW_ROLES = ['admin', 'eic', 'editor']

const isStaff: Access = ({ req: { user } }) => {
  const u = user as unknown as UserWithRoles | undefined
  return Boolean(u?.roles?.some((r) => STAFF_ROLES.includes(r)))
}

const ownOrStaffView: Access = ({ req: { user } }) => {
  if (!user) return false
  const u = user as unknown as UserWithRoles
  if (u.roles?.some((r) => STAFF_VIEW_ROLES.includes(r))) return true
  return { uploader: { equals: user.id } }
}

const ownOrAdmin: Access = ({ req: { user } }) => {
  if (!user) return false
  const u = user as unknown as UserWithRoles
  if (u.roles?.includes('admin')) return true
  return { uploader: { equals: user.id } }
}

export const AudioJobs: CollectionConfig = {
  slug: 'audio-jobs',
  labels: { singular: 'Transcript', plural: 'Transcripts' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'kind', 'status', 'uploader', 'createdAt'],
    group: 'Newsroom',
    components: {
      views: {
        list: { Component: '@/components/Transcribe/JobsListView#default' },
        edit: {
          default: {
            Component: '@/components/Transcribe/JobEditView#default',
          },
        },
      },
    },
  },
  access: {
    read: ownOrStaffView,
    create: isStaff,
    update: ownOrAdmin,
    delete: ownOrAdmin,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    {
      name: 'kind',
      type: 'select',
      required: true,
      defaultValue: 'interview',
      options: [
        { label: 'Interview', value: 'interview' },
        { label: 'Meeting', value: 'meeting' },
        { label: 'Press Conference', value: 'presser' },
        { label: 'Lecture', value: 'lecture' },
        { label: 'Court / Hearing', value: 'court' },
        { label: 'Other', value: 'other' },
      ],
    },
    { name: 'notes', type: 'textarea' },
    {
      name: 'audioFile',
      type: 'relationship',
      relationTo: 'audio-files',
      required: true,
      admin: { readOnly: true },
    },
    {
      name: 'uploader',
      type: 'relationship',
      relationTo: 'users',
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'queued',
      options: [
        { label: 'Queued', value: 'queued' },
        { label: 'Dispatching', value: 'dispatching' },
        { label: 'Processing', value: 'processing' },
        { label: 'Completed', value: 'completed' },
        { label: 'Failed', value: 'failed' },
      ],
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'externalJobId',
      type: 'text',
      admin: { readOnly: true, hidden: true },
    },
    {
      name: 'callbackSecret',
      type: 'text',
      admin: { readOnly: true, hidden: true },
    },
    { name: 'progress', type: 'number', admin: { readOnly: true, hidden: true } },
    { name: 'dispatchAttempts', type: 'number', defaultValue: 0, admin: { hidden: true } },
    {
      name: 'error',
      type: 'textarea',
      admin: {
        readOnly: true,
        condition: (data) => Boolean(data?.error),
      },
    },
    { name: 'transcribedAt', type: 'date', admin: { readOnly: true, hidden: true } },
  ],
  hooks: {
    beforeChange: [
      ({ req, data, operation }) => {
        if (operation === 'create' && req.user && !data.uploader) {
          data.uploader = req.user.id
        }
        return data
      },
    ],
  },
  timestamps: true,
}

export default AudioJobs
