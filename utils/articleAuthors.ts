/**
 * The one place an article's author list is built: staff authors in byline
 * order, then write-ins. Every byline (cards via formatArticle, the article
 * header, the photofeature hero, recommendations) reads from this, so they
 * agree on names, order, trimming and profile links.
 */

type StaffLike = {
  id?: number | string;
  firstName?: string | null;
  lastName?: string | null;
  slug?: string | null;
};

type WriteInLike = {
  name?: string | null;
  photo?: unknown;
};

export type AuthorEntry<U extends StaffLike = StaffLike> = {
  key: string;
  name: string;
  /** Staff profile; null for write-ins */
  href: string | null;
  /** The staff user, when this is a staff author */
  user: U | null;
  /** The write-in's own photo field, when this is a write-in */
  writeInPhoto: unknown;
};

export const staffName = (user: StaffLike): string =>
  [user.firstName, user.lastName].map((part) => part?.trim()).filter(Boolean).join(' ');

export const staffHref = (user: StaffLike): string | null =>
  user.slug || user.id != null ? `/staff/${user.slug || user.id}` : null;

export function getArticleAuthors<U extends StaffLike>(article: {
  authors?: ReadonlyArray<number | U> | null;
  writeInAuthors?: ReadonlyArray<WriteInLike> | null;
}): AuthorEntry<U>[] {
  const staff = (article.authors || [])
    .filter((a): a is U => typeof a === 'object' && a !== null)
    .map((user, i): AuthorEntry<U> => ({
      key: `staff-${user.id ?? i}`,
      name: staffName(user),
      href: staffHref(user),
      user,
      writeInPhoto: null,
    }));
  const writeIns = (article.writeInAuthors || []).map(
    (w, i): AuthorEntry<U> => ({
      key: `write-in-${i}`,
      name: w.name?.trim() || '',
      href: null,
      user: null,
      writeInPhoto: w.photo ?? null,
    }),
  );
  return [...staff, ...writeIns].filter((a) => a.name);
}

/**
 * Who an article with no authors is credited to. Only a staff editorial
 * speaks for the Editorial Board; anything else unsigned is the paper's.
 */
export const isStaffEditorial = (article: { opinionType?: string | null }): boolean =>
  article.opinionType === 'staff-editorial';
