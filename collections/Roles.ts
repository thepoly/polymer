import { CollectionConfig } from 'payload'

export const Roles: CollectionConfig = {
  slug: 'roles',
  admin: {
    useAsTitle: 'name',
    group: 'Admin',
    defaultColumns: ['name', 'createdAt'],
  },
  access: {
    read: () => true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create: ({ req: { user } }) => Boolean((user as any)?.mergedPermissions?.admin || (user as any)?.mergedPermissions?.manageUsers),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    update: ({ req: { user } }) => Boolean((user as any)?.mergedPermissions?.admin || (user as any)?.mergedPermissions?.manageUsers),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete: ({ req: { user } }) => Boolean((user as any)?.mergedPermissions?.admin || (user as any)?.mergedPermissions?.manageUsers),
  },
  hooks: {
    afterRead: [
      ({ doc }) => {
        if (!doc.permissions) {
          doc.permissions = {}
        }
        const perms = [
          'admin',
          'manageUsers',
          'manageArticles',
          'publishArticles',
          'manageSectionArticles',
          'manageLayout',
          'manageSubmissions'
        ]
        for (const p of perms) {
          if (doc.permissions[p] === null || doc.permissions[p] === undefined) {
            doc.permissions[p] = false
          }
        }
        return doc
      }
    ],
    afterChange: [
      async ({ doc, req }) => {
        // When a role is changed, we need to trigger an update on all users 
        // that have this role so their mergedPermissions are recalculated.
        const usersWithRole = await req.payload.find({
          collection: 'users',
          where: { roles: { in: [doc.id] } },
          limit: 1000,
          depth: 0,
        })

        for (const u of usersWithRole.docs) {
          await req.payload.update({
            collection: 'users',
            id: u.id,
            data: {
              roles: u.roles, // dummy update to trigger the hook
            },
            req,
          })
        }
      }
    ]
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'color',
      type: 'text',
      admin: {
        description: 'Hex color for the role (e.g., #ff0000)',
      },
    },
    {
      name: 'permissions',
      type: 'group',
      fields: [
        { name: 'admin', type: 'checkbox', label: 'Administrator', defaultValue: false },
        { name: 'manageUsers', type: 'checkbox', label: 'Manage Users & Roles', defaultValue: false },
        { name: 'manageArticles', type: 'checkbox', label: 'Manage All Articles', defaultValue: false },
        { name: 'publishArticles', type: 'checkbox', label: 'Publish Articles', defaultValue: false },
        { name: 'manageSectionArticles', type: 'checkbox', label: 'Manage Section Articles', defaultValue: false },
        { name: 'manageLayout', type: 'checkbox', label: 'Manage Homepage & Layouts', defaultValue: false },
        { name: 'manageSubmissions', type: 'checkbox', label: 'Manage Submissions (Write-ins & Events)', defaultValue: false },
      ],
    },
  ],
}

export default Roles
