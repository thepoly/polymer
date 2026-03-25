import type { CollectionConfig } from 'payload'

const Submissions: CollectionConfig = {
  slug: 'submissions',
  labels: {
    singular: 'Submission',
    plural: 'Submissions',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'opinionType', 'authorName', 'status', 'createdAt'],
    group: 'Content',
  },
  access: {
    read: ({ req: { user } }) => !!user,
    create: () => true,
    update: ({ req: { user } }) => {
      if (!user) return false
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const perms = (user as any).mergedPermissions || {}
      return Boolean(perms.admin || perms.manageSubmissions)
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const perms = (user as any).mergedPermissions || {}
      return Boolean(perms.admin)
    },
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Article Title',
    },
    {
      name: 'opinionType',
      type: 'select',
      required: true,
      label: 'Type',
      options: [
        { label: 'Opinion', value: 'opinion' },
        { label: 'Column', value: 'column' },
        { label: 'Staff Editorial', value: 'staff-editorial' },
        { label: 'Editorial Notebook', value: 'editorial-notebook' },
        { label: 'Endorsement', value: 'endorsement' },
        { label: 'Top Hat', value: 'top-hat' },
        { label: 'Candidate Profile', value: 'candidate-profile' },
        { label: 'Letter to the Editor', value: 'letter-to-the-editor' },
        { label: "The Poly's Recommendations", value: 'polys-recommendations' },
        { label: "Editor's Notebook", value: 'editors-notebook' },
        { label: 'Derby', value: 'derby' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'authorName',
      type: 'text',
      required: true,
      label: 'Author Name',
    },
    {
      name: 'contact',
      type: 'text',
      required: true,
      label: 'Preferred Contact',
      admin: {
        description: 'Email, phone, or other preferred method of contact',
      },
    },
    {
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media',
      label: 'Featured Image',
    },
    {
      name: 'featuredImageCaption',
      type: 'text',
      label: 'Image Caption',
    },
    {
      name: 'content',
      type: 'textarea',
      required: true,
      label: 'Content',
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      options: [
        { label: 'New', value: 'new' },
        { label: 'Reviewed', value: 'reviewed' },
        { label: 'Published', value: 'published' },
        { label: 'Rejected', value: 'rejected' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
  ],
}

export default Submissions
