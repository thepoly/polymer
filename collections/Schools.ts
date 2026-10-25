import type { CollectionConfig, Access } from 'payload'

type UserWithRoles = { id: string | number; roles?: string[] }

const isStaffEditor: Access = ({ req: { user } }) => {
  const u = user as unknown as UserWithRoles
  return Boolean(u?.roles?.some((role) => ['admin', 'eic', 'editor'].includes(role)))
}

const isAdmin: Access = ({ req: { user } }) => {
  const u = user as unknown as UserWithRoles
  return Boolean(u?.roles?.includes('admin'))
}

const mediaDir = process.env.MEDIA_DIR || '/var/www/polymer-media'

// The name RPI's own record is stored under; the sports scoreboard uses it for
// the RPI side of a game.
export const RPI_SCHOOL_NAME = 'Rensselaer Polytechnic Institute'

// Schools RPI teams play, each with its logo. Sports articles pick their
// opponent from here. Seeded from RPI Athletics schedules by
// scripts/seed-schools.ts; editors can add schools or swap logos.
export const Schools: CollectionConfig = {
  slug: 'schools',
  labels: {
    singular: 'School',
    plural: 'Schools',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'shortName', 'conference'],
    // Out of the sidebar since it rarely changes; reached from the "Schools"
    // button on the Sports Layout page. Its admin pages still work.
    group: false,
  },
  access: {
    read: () => true,
    create: isStaffEditor,
    update: isStaffEditor,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Full name, e.g. "Union College"',
      },
    },
    {
      name: 'shortName',
      type: 'text',
      admin: {
        description: 'Shown on scoreboards, e.g. "Union". Falls back to the full name.',
      },
    },
    {
      name: 'conference',
      type: 'text',
      admin: {
        description: 'Optional, e.g. "Liberty League, ECAC Hockey"',
      },
    },
    {
      name: 'athleticsUrl',
      type: 'text',
      label: 'Athletics Website',
      admin: {
        description: 'The school’s athletics site, e.g. "https://unionathletics.com". The team name on scoreboards links here.',
      },
      validate: (value: string | null | undefined) =>
        !value || /^https?:\/\/\S+$/.test(value) || 'Enter a full URL starting with http:// or https://',
    },
  ],
  upload: {
    staticDir: mediaDir,
    mimeTypes: ['image/*'],
    // A few opponents have no logo yet; they can still be picked
    filesRequiredOnCreate: false,
  },
}

export default Schools
