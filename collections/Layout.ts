import type { CollectionConfig } from 'payload'

const Layout: CollectionConfig = {
  slug: 'layout',
  admin: {
    useAsTitle: 'name',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      defaultValue: 'Main Front Page Layout',
    },
    {
      name: 'mainArticle',
      type: 'relationship',
      relationTo: 'articles',
      required: true,
    },
    {
      name: 'top1',
      type: 'relationship',
      relationTo: 'articles',
    },
    {
      name: 'top2',
      type: 'relationship',
      relationTo: 'articles',
    },
    {
      name: 'top3',
      type: 'relationship',
      relationTo: 'articles',
    },
    {
      name: 'op1',
      type: 'relationship',
      relationTo: 'articles',
    },
    {
      name: 'op2',
      type: 'relationship',
      relationTo: 'articles',
    },
    {
      name: 'op3',
      type: 'relationship',
      relationTo: 'articles',
    },
    {
      name: 'op4',
      type: 'relationship',
      relationTo: 'articles',
    },
    {
      name: 'special',
      type: 'relationship',
      relationTo: 'articles',
    },
  ],
}

export default Layout
