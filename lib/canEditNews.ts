/** Shared permission for the News layout and its timeline editors. */
export function canEditNews(user: { roles?: string[] | null; section?: string | null } | null | undefined): boolean {
  const roles = user?.roles ?? []
  return roles.includes('admin') || roles.includes('eic') || (roles.includes('editor') && user?.section === 'news')
}
