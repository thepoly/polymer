import { getPayload } from 'payload';
import config from '@/payload.config';
import { formatArticle } from '@/utils/formatArticle';
import type { Article as ComponentArticle } from '@/components/FrontPage/types';
import type { Article as PayloadArticle } from '@/payload-types';

const ARCHIVE_PAGE_LIMIT = 500;

type ArchiveArticleSource = Pick<
  PayloadArticle,
  | 'id'
  | 'title'
  | 'slug'
  | 'subdeck'
  | 'featuredImage'
  | 'section'
  | 'kicker'
  | 'publishedDate'
  | 'createdAt'
  | 'authors'
  | 'writeInAuthors'
>;

const pad = (value: number) => String(value).padStart(2, '0');

export const formatArchiveDateKey = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const toArchiveDateKey = (value: string | Date): string => {
  const date = value instanceof Date ? value : new Date(value);
  return formatArchiveDateKey(date);
};

export const parseArchiveDateKey = (dateKey: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;

  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
};

const parseArchiveDateKeyAtStartOfDay = (dateKey: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;

  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
};

export const getTodayArchiveDateKey = (): string => formatArchiveDateKey(new Date());

const getArchiveDayRange = (dateKey: string) => {
  const start = parseArchiveDateKeyAtStartOfDay(dateKey);
  if (!start) return null;

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
};

const articleSelect = {
  title: true,
  slug: true,
  subdeck: true,
  featuredImage: true,
  section: true,
  kicker: true,
  publishedDate: true,
  createdAt: true,
  authors: true,
  writeInAuthors: true,
} as const;

const normalizeArchiveArticle = (article: ArchiveArticleSource): ComponentArticle | null =>
  formatArticle(article, { absoluteDate: true });

export async function getArchivePublicationDates(): Promise<string[]> {
  const payload = await getPayload({ config });
  const dates = new Set<string>();
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const response = await payload.find({
      collection: 'articles',
      where: {
        _status: {
          equals: 'published',
        },
      },
      sort: '-publishedDate',
      limit: ARCHIVE_PAGE_LIMIT,
      page,
      depth: 0,
      pagination: true,
      select: {
        publishedDate: true,
        createdAt: true,
      },
    });

    for (const article of response.docs) {
      const dateValue = article.publishedDate || article.createdAt;
      if (dateValue) {
        dates.add(toArchiveDateKey(dateValue));
      }
    }

    hasNextPage = response.hasNextPage;
    page += 1;
  }

  return Array.from(dates).sort();
}

export async function getArchiveArticlesForDate(dateKey: string): Promise<ComponentArticle[]> {
  const range = getArchiveDayRange(dateKey);
  if (!range) return [];

  const payload = await getPayload({ config });
  const response = await payload.find({
    collection: 'articles',
    where: {
      and: [
        {
          _status: {
            equals: 'published',
          },
        },
        {
          or: [
            {
              publishedDate: {
                greater_than_equal: range.startIso,
                less_than: range.endIso,
              },
            },
            {
              and: [
                {
                  publishedDate: {
                    exists: false,
                  },
                },
                {
                  createdAt: {
                    greater_than_equal: range.startIso,
                    less_than: range.endIso,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    sort: '-publishedDate',
    limit: 100,
    depth: 1,
    select: articleSelect,
  });

  return response.docs
    .map((article) => normalizeArchiveArticle(article as ArchiveArticleSource))
    .filter((article): article is ComponentArticle => article !== null);
}

export async function getArchivePublicationCounts(): Promise<Record<string, number>> {
  const payload = await getPayload({ config });
  const counts = new Map<string, number>();
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const response = await payload.find({
      collection: 'articles',
      where: {
        _status: {
          equals: 'published',
        },
      },
      sort: '-publishedDate',
      limit: ARCHIVE_PAGE_LIMIT,
      page,
      depth: 0,
      pagination: true,
      select: {
        publishedDate: true,
        createdAt: true,
      },
    });

    for (const article of response.docs) {
      const dateValue = article.publishedDate || article.createdAt;
      if (!dateValue) continue;

      const dateKey = toArchiveDateKey(dateValue);
      counts.set(dateKey, (counts.get(dateKey) ?? 0) + 1);
    }

    hasNextPage = response.hasNextPage;
    page += 1;
  }

  return Object.fromEntries(counts);
}
