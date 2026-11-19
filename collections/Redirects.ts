import type { CollectionConfig, Access } from 'payload'
import {
  normalizeRedirectPath,
  redirectDestinationError,
  redirectPathError,
} from '../lib/redirects'

type UserWithRoles = { id: string | number; roles?: string[] }

const isStaffEditor: Access = ({ req: { user } }) => {
  const u = user as unknown as UserWithRoles
  return Boolean(u?.roles?.some((role) => ['admin', 'eic', 'editor'].includes(role)))
}

// Short links at poly.rpi.edu/<path>. middleware.ts answers them with a 302
// and records a `redirect_followed` PostHog event for each hit.
export const Redirects: CollectionConfig = {
  slug: 'redirects',
  labels: {
    singular: 'Redirect',
    plural: 'Redirects',
  },
  admin: {
    useAsTitle: 'path',
    defaultColumns: ['path', 'destination', 'updatedAt'],
  },
  access: {
    read: isStaffEditor,
    create: isStaffEditor,
    update: isStaffEditor,
    delete: isStaffEditor,
  },
  fields: [
    {
      name: 'path',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      hooks: {
        beforeValidate: [
          ({ value }) => (typeof value === 'string' ? normalizeRedirectPath(value) : value),
        ],
      },
      validate: (value: unknown) => {
        if (typeof value !== 'string' || !value) return 'Path is required.'
        return redirectPathError(normalizeRedirectPath(value)) ?? true
      },
    },
    {
      name: 'destination',
      type: 'text',
      required: true,
      hooks: {
        beforeValidate: [({ value }) => (typeof value === 'string' ? value.trim() : value)],
      },
      validate: (value: unknown) => {
        if (typeof value !== 'string' || !value.trim()) return 'Destination is required.'
        return redirectDestinationError(value.trim()) ?? true
      },
    },
  ],
  timestamps: true,
}

export default Redirects
