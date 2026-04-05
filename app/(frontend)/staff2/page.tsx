import React from 'react';
import type { Metadata } from 'next';
import { getPayload } from 'payload';
import config from '@/payload.config';
import Image from 'next/image';
import Link from 'next/link';
import { User } from '@/payload-types';
import { getSeo } from '@/lib/getSeo';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeo()

  return {
    title: `${seo.pages.staffTitle} Beta`,
    description: seo.pages.staffDescription,
    alternates: { canonical: '/staff2' },
    robots: {
      index: false,
      follow: false,
    },
    openGraph: {
      title: `${seo.pages.staffTitle} Beta — ${seo.siteIdentity.siteName}`,
      description: seo.pages.staffDescription,
      type: 'website',
      url: '/staff2',
    },
  }
}

type PublicStaffCard = {
  id: number;
  firstName: string;
  lastName: string;
  slug?: string | null;
  retired?: boolean | null;
  roles?: User['roles'];
  headshot?: {
    url?: string | null;
    title?: string | null;
  } | null;
  positions?:
    | {
        jobTitle?: {
          title?: string | null;
        } | null;
        startDate: string;
        endDate?: string | null;
      }[]
    | null;
};

type PublicStaffCardSource = Pick<
  User,
  'id' | 'firstName' | 'lastName' | 'slug' | 'retired' | 'roles' | 'headshot' | 'positions'
>;

const toPublicStaffCard = (user: PublicStaffCardSource): PublicStaffCard => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  slug: user.slug,
  retired: user.retired,
  roles: user.roles,
  headshot: typeof user.headshot === 'object' && user.headshot 
    ? { url: user.headshot.url, title: user.headshot.title } 
    : null,
  positions: user.positions?.map((position) => ({
    startDate: position.startDate,
    endDate: position.endDate,
    jobTitle: typeof position.jobTitle === 'object' && position.jobTitle ? { title: position.jobTitle.title } : null,
  })) || null,
});

const getEmeritusYear = (user: PublicStaffCard): string => {
  const latestEndedPosition = user.positions
    ?.filter((position) => Boolean(position.endDate))
    .sort((a, b) => new Date(b.endDate as string).getTime() - new Date(a.endDate as string).getTime())[0]
    ?.endDate;

  const year = latestEndedPosition
    ? new Date(latestEndedPosition).getFullYear()
    : new Date().getFullYear();

  return year.toString().slice(-2);
};

const rolePriority = ['eic', 'editor', 'writer', 'admin'] as const;

const getStaffSortRank = (user: PublicStaffCard): number => {
  if (!user.roles || user.roles.length === 0) {
    return rolePriority.indexOf('writer');
  }

  const matchedRanks = user.roles
    .map((role) => rolePriority.indexOf(role as (typeof rolePriority)[number]))
    .filter((rank) => rank !== -1);

  return matchedRanks.length > 0
    ? Math.min(...matchedRanks)
    : rolePriority.indexOf('writer');
};

const sortStaffByRank = (a: PublicStaffCard, b: PublicStaffCard): number => {
  const rankDifference = getStaffSortRank(a) - getStaffSortRank(b);

  if (rankDifference !== 0) {
    return rankDifference;
  }

  const lastNameCompare = a.lastName.localeCompare(b.lastName);
  if (lastNameCompare !== 0) {
    return lastNameCompare;
  }

  return a.firstName.localeCompare(b.firstName);
};

export default async function Staff2Page() {
  const payload = await getPayload({ config });

  const usersResponse = await payload.find({
    collection: 'users',
    limit: 0,
    sort: 'lastName',
    depth: 1,
    select: {
      firstName: true,
      lastName: true,
      slug: true,
      retired: true,
      roles: true,
      headshot: true,
      positions: true,
    },
  });

  const users = usersResponse.docs.map((user) => toPublicStaffCard(user));
  const activeUsers = users.filter((user) => !user.retired).sort(sortStaffByRank);
  const retiredUsers = users.filter((user) => user.retired);

  return (
    <>
      {/* Staff Title */}
      <div className="mb-8 -mt-2 flex justify-center overflow-hidden px-4 sm:px-8">
        <h1 className="max-w-full text-center font-meta font-bold uppercase tracking-[0.02em] leading-[0.82] text-[#D6001C] dark:text-white whitespace-nowrap text-[36px] sm:text-[48px] md:text-[56px] lg:text-[65px] transition-colors">
          Staff
        </h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-8">
        {activeUsers.map((user) => {
          const currentPosition = user.positions?.find(p => !p.endDate) || user.positions?.[0];
          const jobTitle = currentPosition?.jobTitle;
          let titleString = typeof jobTitle === 'object' && jobTitle ? jobTitle.title : '';

          if (!titleString && user.roles && user.roles.length > 0) {
            const roleMap: Record<string, string> = {
              admin: 'Admin',
              eic: 'Editor in Chief',
              editor: 'Section Editor',
              writer: 'Writer',
              'copy-editor': 'Copy Editor',
            };
            const sortedRoles = [...user.roles].sort((a, b) => {
              const priority = ['eic', 'editor', 'writer', 'copy-editor', 'admin'];
              return priority.indexOf(a) - priority.indexOf(b);
            });
            
            titleString = sortedRoles.map(r => roleMap[r] || r.charAt(0).toUpperCase() + r.slice(1)).join(', ');
          }

          return (
            <Link 
              href={`/staff/${user.slug || user.id}`} 
              key={user.id}
              className="group flex flex-col items-start text-left"
            >
              <div className="relative w-full aspect-[3/4] mb-3 bg-gray-100 dark:bg-zinc-800 overflow-hidden transition-colors">
                {user.headshot?.url ? (
                  <Image
                    src={user.headshot.url}
                    alt={user.headshot.title || `${user.firstName} ${user.lastName}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-zinc-800 text-text-muted transition-colors">
                    <svg className="w-12 h-12 opacity-50" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>
                )}
              </div>
              
              <h3 className="font-meta text-[15px] md:text-[16px] leading-tight font-semibold text-text-main mb-1 group-hover:text-accent transition-colors">
                {user.firstName} {user.lastName}
              </h3>

              {titleString && (
                <p className="font-meta text-[11px] leading-snug text-accent font-semibold uppercase tracking-[0.06em] transition-colors">
                  {titleString}
                </p>
              )}
            </Link>
          );
        })}
      </div>

      {retiredUsers.length > 0 && (
        <>
          <div className="mb-8 mt-16 -mt-2 flex justify-center overflow-hidden px-4 sm:px-8">
            <h2 className="max-w-full text-center font-meta font-bold uppercase tracking-[0.02em] leading-[0.82] text-[#D6001C] dark:text-white whitespace-nowrap text-[36px] sm:text-[48px] md:text-[56px] lg:text-[65px] transition-colors">
              Retired
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {retiredUsers.map((user) => (
              <Link
                href={`/staff/${user.slug || user.id}`}
                key={user.id}
                className="group flex flex-col items-start text-left"
              >
                <h3 className="font-meta text-[15px] md:text-[16px] leading-tight font-semibold text-text-main mb-1 group-hover:text-accent transition-colors">
                  {user.firstName} {user.lastName}
                </h3>
                <p className="font-meta text-[11px] leading-snug text-accent font-semibold transition-colors">
                  Poly Emeritus &apos;{getEmeritusYear(user)}
                </p>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );
}
