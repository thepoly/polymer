import type { GlobalConfig, Access } from 'payload'
import { revalidatePath } from 'next/cache'

type UserWithRoles = { id: string | number; roles?: string[] }

const isAdminOrEIC: Access = ({ req: { user } }) => {
  const u = user as unknown as UserWithRoles
  return Boolean(u?.roles?.some((role) => ['admin', 'eic'].includes(role)))
}

const color = (name: string, label: string) => ({
  name,
  type: 'text' as const,
  label,
})

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
      name: 'logos',
      type: 'group',
      label: 'Logos',
      fields: [
        {
          name: 'desktopLight',
          type: 'relationship',
          relationTo: 'logos',
          label: 'Desktop — Light Mode',
        },
        {
          name: 'desktopDark',
          type: 'relationship',
          relationTo: 'logos',
          label: 'Desktop — Dark Mode',
        },
        {
          name: 'mobileLight',
          type: 'relationship',
          relationTo: 'logos',
          label: 'Mobile — Light Mode',
        },
        {
          name: 'mobileDark',
          type: 'relationship',
          relationTo: 'logos',
          label: 'Mobile — Dark Mode',
        },
      ],
    },
    {
      name: 'lightMode',
      type: 'group',
      label: 'Colors — Light Mode',
      fields: [
        color('background', 'Background'),
        color('foreground', 'Foreground (Body Text)'),
        color('foregroundMuted', 'Foreground Muted (Secondary Text)'),
        color('accent', 'Accent (Brand Color)'),
        color('borderColor', 'Border Color'),
        color('ruleColor', 'Rule Color (Thin Dividers)'),
        color('ruleStrongColor', 'Rule Strong Color (Heavy Dividers)'),
        color('headerTopBg', 'Header Top Bar Background'),
        color('headerTopText', 'Header Top Bar Text'),
        color('headerNavBg', 'Header Nav Background'),
        color('headerNavText', 'Header Nav Text'),
        color('headerBorder', 'Header Border'),
      ],
    },
    {
      name: 'darkMode',
      type: 'group',
      label: 'Colors — Dark Mode',
      fields: [
        color('background', 'Background'),
        color('foreground', 'Foreground (Body Text)'),
        color('foregroundMuted', 'Foreground Muted (Secondary Text)'),
        color('accent', 'Accent (Brand Color)'),
        color('borderColor', 'Border Color'),
        color('ruleColor', 'Rule Color (Thin Dividers)'),
        color('ruleStrongColor', 'Rule Strong Color (Heavy Dividers)'),
        color('headerTopBg', 'Header Top Bar Background'),
        color('headerTopText', 'Header Top Bar Text'),
        color('headerNavBg', 'Header Nav Background'),
        color('headerNavText', 'Header Nav Text'),
        color('headerBorder', 'Header Border'),
      ],
    },
  ],
}

export default Theme
