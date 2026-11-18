import type { CollectionConfig } from 'payload'

const EventSubmissions: CollectionConfig = {
  slug: 'event-submissions',
  labels: {
    singular: 'Event Submission',
    plural: 'Event Submissions',
  },
  admin: {
    useAsTitle: 'eventName',
    defaultColumns: ['eventName', 'date', 'contactName', 'status', 'createdAt'],
    group: 'Content',
    description:
      'Archive only. The public event form and the Features page events box were removed, so nothing new arrives here.',
  },
  // Kept so past submissions stay readable and no schema change is needed;
  // drop the collection (and its table) with a proper migration later.
  access: {
    read: ({ req: { user } }) => !!user,
    // The form's API route is gone; closing create also shuts Payload's own
    // REST endpoint, which would otherwise accept anonymous posts
    create: () => false,
    update: ({ req: { user } }) => {
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
      name: 'eventName',
      type: 'text',
      required: true,
      label: 'Event Name',
    },
    {
      name: 'date',
      type: 'date',
      required: true,
      label: 'Event Date',
    },
    {
      name: 'time',
      type: 'text',
      required: true,
      label: 'Event Time',
    },
    {
      name: 'description',
      type: 'textarea',
      required: true,
      label: 'Why The Poly Should Check It Out',
    },
    {
      name: 'contactName',
      type: 'text',
      label: 'Contact Name',
    },
    {
      name: 'contactInfo',
      type: 'text',
      label: 'Contact Info (Email, Phone, etc.)',
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      options: [
        { label: 'New', value: 'new' },
        { label: 'Reviewed', value: 'reviewed' },
        { label: 'Accepted', value: 'accepted' },
        { label: 'Rejected', value: 'rejected' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
  ],
}

export default EventSubmissions
