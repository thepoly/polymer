import type { GlobalConfig, Access } from 'payload'
import { revalidatePath } from 'next/cache'

type UserWithRoles = { id: string | number; roles?: string[] }

const isAdminOrEIC: Access = ({ req: { user } }) => {
  const u = user as unknown as UserWithRoles
  return Boolean(u?.roles?.some((role) => ['admin', 'eic'].includes(role)))
}

const color = (name: string, label: string, description: string) => ({
  name,
  type: 'text' as const,
  label,
  admin: {
    components: {
      Field: '@/components/admin/ThemeColorField#ThemeColorField',
    },
    description,
    width: '33%',
  },
})

const colorRows = (items: Array<{ name: string; label: string; description: string }>) => {
  const rows = []

  for (let index = 0; index < items.length; index += 3) {
    rows.push({
      type: 'row' as const,
      fields: items.slice(index, index + 3).map((item) => color(item.name, item.label, item.description)),
    })
  }

  return rows
}

export const Theme: GlobalConfig = {
  slug: 'theme',
  label: 'Theme',
  admin: {
    group: 'Theme',
  },
  versions: true,
  hooks: {
    afterChange: [
      () => {
        revalidatePath('/', 'layout')
      },
    ],
  },
  access: {
    read: isAdminOrEIC,
    update: isAdminOrEIC,
  },
  fields: [
    {
      name: 'headerAnimation',
      type: 'group',
      label: 'Header Animation',
      admin: {
        description: 'Controls the animated wave effect on the header rule line during page transitions.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            color('waveColor1', 'Wave Color 1', 'First gradient stop for the wave effect.'),
            color('waveColor2', 'Wave Color 2', 'Second gradient stop for the wave effect.'),
            color('waveColor3', 'Wave Color 3', 'Third gradient stop for the wave effect.'),
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'waveCount',
              type: 'number',
              label: 'Number of Waves',
              min: 1,
              max: 8,
              admin: {
                description: 'How many wave lines animate across the header (1-8).',
                width: '33%',
                step: 1,
              },
            },
            {
              name: 'lineWeight',
              type: 'number',
              label: 'Line Weight',
              min: 0.5,
              max: 4,
              admin: {
                description: 'Stroke width of the wave and rule lines (0.5-4).',
                width: '33%',
                step: 0.5,
              },
            },
            {
              name: 'wrapAround',
              type: 'checkbox',
              label: 'Logo Wraparound',
              admin: {
                description: 'When enabled, the animation traces around the logo outline before shooting across.',
                width: '33%',
              },
            },
          ],
        },
      ],
    },
    {
      name: 'logos',
      type: 'group',
      label: 'Logos',
      admin: {
        description: 'Upload or choose replacement logos for each theme and breakpoint combination. Leave blank to fall back to the static public assets.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'desktopLight',
              type: 'relationship',
              relationTo: 'logos',
              label: 'Desktop — Light Mode',
              admin: {
                width: '50%',
                description: 'Primary desktop logo shown in light mode.',
              },
            },
            {
              name: 'desktopDark',
              type: 'relationship',
              relationTo: 'logos',
              label: 'Desktop — Dark Mode',
              admin: {
                width: '50%',
                description: 'Primary desktop logo shown in dark mode.',
              },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'mobileLight',
              type: 'relationship',
              relationTo: 'logos',
              label: 'Mobile — Light Mode',
              admin: {
                width: '50%',
                description: 'Compact logo used in mobile headers and overlays in light mode.',
              },
            },
            {
              name: 'mobileDark',
              type: 'relationship',
              relationTo: 'logos',
              label: 'Mobile — Dark Mode',
              admin: {
                width: '50%',
                description: 'Compact logo used in mobile headers and overlays in dark mode.',
              },
            },
          ],
        },
      ],
    },
    {
      name: 'lightMode',
      type: 'group',
      label: 'Colors — Light Mode',
      admin: {
        description: 'Live light-mode color tokens used across the frontend. Hex values work best with the picker; rgba values can still be typed manually.',
      },
      fields: colorRows([
        { name: 'background', label: 'Background', description: 'Main page background color.' },
        { name: 'foreground', label: 'Foreground (Body Text)', description: 'Primary text color for article and UI copy.' },
        { name: 'foregroundMuted', label: 'Foreground Muted', description: 'Secondary text color for metadata and subdued labels.' },
        { name: 'accent', label: 'Accent (Brand Color)', description: 'Brand accent used for highlights, links, and emphasis.' },
        { name: 'borderColor', label: 'Border Color', description: 'Standard border color for cards, chrome, and form edges.' },
        { name: 'ruleColor', label: 'Rule Color', description: 'Thin divider color. rgba values are supported.' },
        { name: 'ruleStrongColor', label: 'Rule Strong Color', description: 'Heavy divider color. rgba values are supported.' },
        { name: 'headerTopBg', label: 'Header Top Bar Background', description: 'Background for the top metadata/date strip.' },
        { name: 'headerTopText', label: 'Header Top Bar Text', description: 'Text color for the top metadata/date strip.' },
        { name: 'headerNavBg', label: 'Header Nav Background', description: 'Main navigation bar background color.' },
        { name: 'headerNavText', label: 'Header Nav Text', description: 'Main navigation bar text color.' },
        { name: 'headerBorder', label: 'Header Border', description: 'Border and rule color used around the header chrome.' },
      ]),
    },
    {
      name: 'darkMode',
      type: 'group',
      label: 'Colors — Dark Mode',
      admin: {
        description: 'Dark-mode equivalents for the same frontend tokens. These are applied under `html.dark`.',
      },
      fields: colorRows([
        { name: 'background', label: 'Background', description: 'Main page background color in dark mode.' },
        { name: 'foreground', label: 'Foreground (Body Text)', description: 'Primary text color in dark mode.' },
        { name: 'foregroundMuted', label: 'Foreground Muted', description: 'Secondary text color in dark mode.' },
        { name: 'accent', label: 'Accent (Brand Color)', description: 'Brand accent used for highlights, links, and emphasis in dark mode.' },
        { name: 'borderColor', label: 'Border Color', description: 'Standard border color for dark-mode cards and chrome.' },
        { name: 'ruleColor', label: 'Rule Color', description: 'Thin divider color in dark mode. rgba values are supported.' },
        { name: 'ruleStrongColor', label: 'Rule Strong Color', description: 'Heavy divider color in dark mode. rgba values are supported.' },
        { name: 'headerTopBg', label: 'Header Top Bar Background', description: 'Background for the top metadata/date strip in dark mode.' },
        { name: 'headerTopText', label: 'Header Top Bar Text', description: 'Text color for the top metadata/date strip in dark mode.' },
        { name: 'headerNavBg', label: 'Header Nav Background', description: 'Main navigation bar background in dark mode.' },
        { name: 'headerNavText', label: 'Header Nav Text', description: 'Main navigation bar text color in dark mode.' },
        { name: 'headerBorder', label: 'Header Border', description: 'Border and rule color used around dark-mode header chrome.' },
      ]),
    },
  ],
}

export default Theme
