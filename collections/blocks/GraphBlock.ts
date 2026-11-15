import type { Block } from 'payload'

/**
 * A graph from the graph editor (/graph), placed in an article's body. The block holds
 * only the graph's file name; the article draws whatever that graph is when the page is
 * rendered, so a graph fixed in the editor is fixed in every article that uses it.
 */
export const GraphBlock: Block = {
  slug: 'graph',
  labels: { singular: 'Graph', plural: 'Graphs' },
  fields: [
    {
      name: 'graph',
      type: 'text',
      required: true,
      label: 'Graph',
      admin: {
        components: {
          Field: '@/components/admin/GraphPicker#GraphPicker',
        },
      },
    },
  ],
}
