import { randomBytes } from 'crypto'
import type { CollectionConfig, FieldAccess, Access } from 'payload'
import { getPostHogClient } from '../lib/posthog-server'

type UserWithRoles = {
  id: string | number
  roles?: string[]
}

const isAdminOrEIC: Access = ({ req: { user } }) => {
  const u = user as unknown as UserWithRoles
  return Boolean(u?.roles?.some((role) => ['admin', 'eic'].includes(role)))
}

const isAdminOrEICField: FieldAccess = ({ req: { user } }) => {
  const u = user as unknown as UserWithRoles
  return Boolean(u?.roles?.some((role) => ['admin', 'eic'].includes(role)))
}

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    maxLoginAttempts: 5,
    lockTime: 600000, // 10 minutes
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['firstName', 'lastName', 'roles'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      const u = user as unknown as UserWithRoles
      if (u.roles?.some((role) => ['admin', 'eic'].includes(role))) return true
      return {
        id: {
          equals: user.id,
        },
      }
    },
    create: isAdminOrEIC,
    update: ({ req: { user } }) => {
      if (!user) return false
      const u = user as unknown as UserWithRoles
      if (u.roles?.some((role) => ['admin', 'eic'].includes(role))) return true
      return {
        id: {
          equals: user.id,
        },
      }
    },
    delete: isAdminOrEIC,
  },
  hooks: {
    beforeChange: [
      async ({ data, operation, originalDoc }) => {
        if (operation !== 'update') {
          return data
        }

        if (data?.retired === true && originalDoc?.retired !== true) {
          return {
            ...data,
            password: randomBytes(48).toString('base64'),
          }
        }

        return data
      },
    ],
    afterChange: [
      async ({ doc }) => {
        const posthog = getPostHogClient()
        if (posthog) {
          posthog.identify({
            distinctId: String(doc.id),
            properties: {
              email: doc.email,
              firstName: doc.firstName,
              lastName: doc.lastName,
              name: `${doc.firstName || ''} ${doc.lastName || ''}`.trim() || undefined,
              slug: doc.slug,
              roles: doc.roles,
              blackTheme: doc.blackTheme,
              has_bio: !!doc.bio,
              position_count: doc.positions?.length || 0,
              updatedAt: doc.updatedAt,
              createdAt: doc.createdAt,
            },
          })
          await posthog.flush()
        }
      },
    ],
    afterLogin: [
      async ({ user }) => {
        const posthog = getPostHogClient()
        const doc = user as import('../payload-types').User;
        if (posthog && doc && doc.id) {
          posthog.capture({
            distinctId: String(doc.id),
            event: 'user_logged_in',
          })
          await posthog.flush()
        }
      },
    ],
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'firstName', type: 'text', required: true },
        { name: 'lastName', type: 'text', required: true },
      ],
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        position: 'sidebar',
      },
      hooks: {
        beforeValidate: [
          ({ data, value }) => {
            if (value) return value
            if (data?.firstName && data?.lastName) {
              return `${data.firstName}-${data.lastName}`
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)+/g, '')
            }
            return value
          },
        ],
      },
    },
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      defaultValue: ['writer'],
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor in Chief', value: 'eic' },
        { label: 'Section Editor', value: 'editor' },
        { label: 'Writer', value: 'writer' },
      ],
      access: {
        update: isAdminOrEICField,
      },
    },
    {
      name: 'section',
      type: 'select',
      label: 'Assigned Section',
      admin: {
        description: 'Which section this editor manages (only applies to Section Editor role)',
        condition: (data) => data?.roles?.includes('editor'),
      },
      options: [
        { label: 'News', value: 'news' },
        { label: 'Features', value: 'features' },
        { label: 'Opinion', value: 'opinion' },
        { label: 'Sports', value: 'sports' },
      ],
      access: {
        update: isAdminOrEICField,
      },
    },
    // --- 3. PUBLIC PROFILE ---
    {
      name: 'headshot',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'bio',
      type: 'richText', 
    },
    {
      name: 'positions',
      type: 'array',
      label: 'Positions Held',
      admin: {
        initCollapsed: false,
        components: {
          RowLabel: '@/components/Dashboard/PositionRowLabel#PositionRowLabel',
        },
      },
      fields: [
        {
          name: 'jobTitle',
          type: 'relationship',
          relationTo: 'job-titles',
          required: false,
          label: 'Title',
        },
        {
          type: 'row',
          fields: [
            {
              name: 'startDate',
              type: 'date',
              required: true,
              admin: {
                date: {
                  pickerAppearance: 'dayOnly',
                  displayFormat: 'MMM yyyy',
                },
              },
            },
            {
              name: 'endDate',
              type: 'date',
              label: 'End Date',
              admin: {
                placeholder: 'Current',
                date: {
                  pickerAppearance: 'dayOnly',
                  displayFormat: 'MMM yyyy',
                },
              },
            },
          ],
        },
      ],
    },
    // --- 5. PREFERENCES ---
    {
      name: 'blackTheme',
      type: 'checkbox',
      label: 'Use Black Theme (OLED)',
      defaultValue: false,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'retired',
      type: 'checkbox',
      label: 'Retired',
      defaultValue: false,
      admin: {
        className: 'user-retired-field',
        description:
          'Marks this staffer as retired. Retired staff are shown in the RETIRED section on the staff page as "Poly Emeritus" from the end of their last role through the present, and their password is replaced with a long scrambled value without notifying them.',
      },
      access: {
        update: isAdminOrEICField,
      },
    },
  ],
}

export default Users
