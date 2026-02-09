import type { CollectionConfig } from 'payload'

export const JobTitles: CollectionConfig = {
  slug: 'job-titles',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title'],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      unique: true,
    },
  ],
}

export default JobTitles
