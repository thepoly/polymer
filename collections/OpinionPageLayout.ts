import type { CollectionConfig } from 'payload'

const OpinionPageLayout: CollectionConfig = {
  slug: 'opinion-page-layout',
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
      defaultValue: 'Opinion Page',
    },
    // ── Opinion's Choice: 3 handpicked articles ──
    {
      name: 'editorsChoiceLabel',
      type: 'text',
      defaultValue: "Opinion's Choice",
      admin: {
        description: 'Heading displayed above the curated picks (e.g. "Opinion\'s Choice")',
      },
    },
    {
      name: 'editorsChoice1',
      type: 'relationship',
      relationTo: 'articles',
      admin: {
        description: 'First handpicked opinion article',
      },
    },
    {
      name: 'editorsChoice2',
      type: 'relationship',
      relationTo: 'articles',
      admin: {
        description: 'Second handpicked opinion article',
      },
    },
    {
      name: 'editorsChoice3',
      type: 'relationship',
      relationTo: 'articles',
      admin: {
        description: 'Third handpicked opinion article',
      },
    },
    // ── Pull Quotes: 3 curated inline quotes ──
    {
      name: 'quotes',
      type: 'array',
      maxRows: 3,
      admin: {
        description: 'Up to 3 pull quotes shown inline on the opinion page',
      },
      fields: [
        {
          name: 'text',
          type: 'textarea',
          required: true,
          admin: {
            description: 'The quote text',
          },
        },
        {
          name: 'article',
          type: 'relationship',
          relationTo: 'articles',
          required: true,
          admin: {
            description: 'The article this quote belongs to',
          },
        },
      ],
    },
  ],
}

export default OpinionPageLayout
