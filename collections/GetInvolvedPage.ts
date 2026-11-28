import type { Access, Field, GlobalConfig } from 'payload'
import { revalidatePath } from 'next/cache'
import {
  DEFAULT_PHOTO_POSITIONS,
  MAX_PHOTO_ZOOM,
  MIN_PHOTO_ZOOM,
  type PhotoScreen,
} from '../components/GetInvolved/photoPositions'

type UserWithRoles = { id: string | number; roles?: string[] }

const isEditorOrAbove: Access = ({ req: { user } }) => {
  const u = user as unknown as UserWithRoles
  return Boolean(u?.roles?.some((role) => ['admin', 'eic', 'editor'].includes(role)))
}

/*
 * Focus point and zoom for one screen size. Hidden: editors set these by
 * dragging and zooming the live previews in the Photo position field
 * (components/admin/GetInvolvedPhotoField.tsx), which writes to them.
 */
const position = (name: PhotoScreen): Field => ({
  name,
  type: 'group',
  admin: { hidden: true },
  fields: [
    { name: 'focusX', type: 'number', min: 0, max: 100, defaultValue: DEFAULT_PHOTO_POSITIONS[name].x },
    { name: 'focusY', type: 'number', min: 0, max: 100, defaultValue: DEFAULT_PHOTO_POSITIONS[name].y },
    {
      name: 'zoom',
      type: 'number',
      min: MIN_PHOTO_ZOOM,
      max: MAX_PHOTO_ZOOM,
      defaultValue: DEFAULT_PHOTO_POSITIONS[name].zoom,
    },
  ],
})

export const GetInvolvedPage: GlobalConfig = {
  slug: 'get-involved-page',
  label: 'Get Involved Page',
  admin: {
    group: 'Pages',
    description:
      'The photo behind the Get involved page. It stays still while the page scrolls, and shows through the heading, the meeting box, the buttons and the news tip box.',
  },
  hooks: {
    afterChange: [
      () => {
        revalidatePath('/get-involved')
      },
    ],
  },
  access: {
    read: isEditorOrAbove,
    update: isEditorOrAbove,
  },
  fields: [
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'media',
      label: 'Photo',
      admin: {
        description:
          'A wide (landscape) photo works best. Its alt text and photographer come from the media record. Leave empty to use the built-in placeholder.',
      },
    },
    {
      name: 'photoPosition',
      type: 'ui',
      label: 'Photo position',
      admin: {
        components: {
          Field: '@/components/admin/GetInvolvedPhotoField#GetInvolvedPhotoField',
        },
      },
    },
    position('mobile'),
    position('tablet'),
    position('desktop'),
  ],
}

export default GetInvolvedPage
