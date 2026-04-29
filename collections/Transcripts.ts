import type { CollectionConfig, Access } from 'payload'

type UserWithRoles = { id: string | number; roles?: string[] }

const isAuthed: Access = ({ req: { user } }) => Boolean(user)

const isAdmin: Access = ({ req: { user } }) => {
  const u = user as unknown as UserWithRoles | undefined
  return Boolean(u?.roles?.includes('admin'))
}

export const Transcripts: CollectionConfig = {
  slug: 'transcripts',
  admin: {
    useAsTitle: 'id',
    description:
      'Transcript JSON blobs linked 1:1 with audio-jobs. Edited via the custom audio-jobs admin view, not directly here.',
    hidden: ({ user }) => {
      const u = user as unknown as UserWithRoles | undefined
      return !u?.roles?.includes('admin')
    },
  },
  access: {
    // Route handlers enforce ownership against the linked audio-job. Payload
    // access here intentionally allows any authenticated user to read; the
    // admin UI never surfaces transcripts directly, only through audio-jobs.
    read: isAuthed,
    create: isAuthed,
    update: isAuthed,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'audioJob',
      type: 'relationship',
      relationTo: 'audio-jobs',
      required: true,
      unique: true,
      admin: { readOnly: true },
    },
    { name: 'data', type: 'json', required: true },
    {
      name: 'searchableText',
      type: 'textarea',
      admin: { hidden: true },
    },
    { name: 'editedAt', type: 'date', admin: { readOnly: true } },
    {
      name: 'editedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: { readOnly: true },
    },
  ],
  timestamps: true,
}

export default Transcripts
