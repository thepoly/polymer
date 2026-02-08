import type { CollectionConfig } from 'payload'

// 1. Define a temporary type so TypeScript knows 'roles' exists
// This bypasses the "Property does not exist" and "Unexpected any" errors
type UserWithRoles = {
  id: string
  roles?: ('admin' | 'editor')[]
}

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'email',
  },
  access: {
    // 2. READ: Users can see themselves; Admins can see everyone
    read: ({ req: { user } }) => {
      if ((user as unknown as UserWithRoles)?.roles?.includes('admin')) return true
      return { id: { equals: user?.id } }
    },
    // 3. CREATE: Only Admins can create new users (Prevents public registration)
    create: ({ req: { user } }) => 
      Boolean((user as unknown as UserWithRoles)?.roles?.includes('admin')),
    
    // 4. UPDATE: Admins can update everyone; Users can update themselves
    update: ({ req: { user } }) => {
      if ((user as unknown as UserWithRoles)?.roles?.includes('admin')) return true
      return { id: { equals: user?.id } }
    },
    // 5. DELETE: Only Admins can delete users
    delete: ({ req: { user } }) => 
      Boolean((user as unknown as UserWithRoles)?.roles?.includes('admin')),
  },
  fields: [
    // Email and Password are added by default by 'auth: true'
    
    // We add a Roles field to distinguish Admins from Editors
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      defaultValue: ['editor'],
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
      ],
      access: {
        // Critical: Only Admins can give someone the 'admin' role
        update: ({ req: { user } }) => 
          Boolean((user as unknown as UserWithRoles)?.roles?.includes('admin')),
        // Everyone can read their own roles
        read: () => true,
      },
    },
  ],
}

export default Users