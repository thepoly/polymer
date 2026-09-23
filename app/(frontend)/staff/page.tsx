import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getSeo } from '@/lib/getSeo'
import type { User } from '@/payload-types'

export const revalidate = 60

type StaffUserSource = Pick<
  User,
  'id' | 'firstName' | 'lastName' | 'slug' | 'retired' | 'major' | 'headshot' | 'positions'
>

type StaffUser = {
  id: number
  firstName: string
  lastName: string
  slug?: string | null
  retired?: boolean | null
  major?: string | null
  headshot?: {
    url?: string | null
    title?: string | null
  } | null
  positions?:
    | {
        startDate: string
        endDate?: string | null
        jobTitle?: {
          title?: string | null
        } | null
      }[]
    | null
}

// Senior board, filled automatically from each active staffer's current title.
// Top row: senior managing editor, editor in chief, business manager; below:
// managing editors on the left, contributing editors on the right.
const BOARD_ROWS: string[][] = [
  ['senior managing editor', 'editor in chief', 'business manager'],
  ['managing editor', 'contributing editor'],
]

// Board portraits take the width of one column in the staff grid below (2/3/4/6
// columns with a 1rem gap), measured against the board's container, so they
// match everyone else's while the cards keep their own spacing.
const BOARD_PORTRAIT_WIDTH =
  'w-[calc((100cqw-1rem)/2)] sm:w-[calc((100cqw-2rem)/3)] md:w-[calc((100cqw-3rem)/4)] lg:w-[calc((100cqw-5rem)/6)]'


const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const getTimestamp = (value?: string | null): number => {
  if (!value) return Number.NEGATIVE_INFINITY

  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp
}

const getHeadshotUrl = (headshot: StaffUserSource['headshot']): string | null => {
  if (!isRecord(headshot) || typeof headshot.url !== 'string' || headshot.url.trim() === '') {
    return null
  }

  return headshot.url
}

const getJobTitle = (
  jobTitle: NonNullable<NonNullable<StaffUserSource['positions']>[number]>['jobTitle'],
): string | null => {
  if (!isRecord(jobTitle) || typeof jobTitle.title !== 'string' || jobTitle.title.trim() === '') {
    return null
  }

  return jobTitle.title
}

const toStaffUser = (user: StaffUserSource): StaffUser => {
  const headshotUrl = getHeadshotUrl(user.headshot)
  const headshotTitle = isRecord(user.headshot) && typeof user.headshot.title === 'string' ? user.headshot.title : null

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    slug: user.slug,
    retired: user.retired,
    major: user.major,
    headshot: headshotUrl ? { url: headshotUrl, title: headshotTitle } : null,
    positions: user.positions?.map((position) => {
      const jobTitle = getJobTitle(position.jobTitle)

      return {
        startDate: position.startDate,
        endDate: position.endDate,
        jobTitle: jobTitle ? { title: jobTitle } : null,
      }
    }) || null,
  }
}

const getCurrentOrLatestPosition = (user: StaffUser) => {
  if (!user.positions || user.positions.length === 0) {
    return null
  }

  const openPositions = user.positions
    .filter((position) => !position.endDate)
    .sort((a, b) => getTimestamp(b.startDate) - getTimestamp(a.startDate))

  if (openPositions.length > 0) {
    return openPositions[0]
  }

  return [...user.positions].sort((a, b) => {
    const endDiff = getTimestamp(b.endDate) - getTimestamp(a.endDate)
    if (endDiff !== 0) return endDiff
    return getTimestamp(b.startDate) - getTimestamp(a.startDate)
  })[0] || null
}

const getCurrentPositionTitle = (user: StaffUser): string => {
  const position = getCurrentOrLatestPosition(user)
  const title = position?.jobTitle?.title?.trim()
  return title || ''
}

// Title of a position still held (no end date), or '' if none. The board only
// counts current roles, unlike the card subtitle, which falls back to the latest.
const getOpenPositionTitle = (user: StaffUser): string => {
  const open = (user.positions ?? [])
    .filter((position) => !position.endDate)
    .sort((a, b) => getTimestamp(b.startDate) - getTimestamp(a.startDate))[0]
  return open?.jobTitle?.title?.trim() ?? ''
}

const getProfileHref = (user: StaffUser): string => `/staff/${user.slug || user.id}`

const sortAlphabetically = (a: StaffUser, b: StaffUser): number => {
  const lastNameCompare = a.lastName.localeCompare(b.lastName)
  if (lastNameCompare !== 0) return lastNameCompare
  return a.firstName.localeCompare(b.firstName)
}

function StaffPortrait({
  user,
  className = '',
}: {
  user: StaffUser
  className?: string
}) {
  // Hide the portrait container entirely if there's no photo. Better than a
  // silhouette placeholder that reads as "missing data" — the user's name
  // and role still render in the surrounding card.
  if (!user.headshot?.url) return null
  return (
    <div className={`relative bg-gray-100 dark:bg-zinc-800 overflow-hidden transition-colors ${className}`}>
      <Image
        src={user.headshot.url}
        alt={user.headshot.title || `${user.firstName} ${user.lastName}`}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
      />
    </div>
  )
}

function FeaturedStaffCard({ user }: { user: StaffUser }) {
  const title = getCurrentPositionTitle(user)

  return (
    <Link href={getProfileHref(user)} className="group flex flex-col items-center text-center">
      <StaffPortrait user={user} className={`${BOARD_PORTRAIT_WIDTH} aspect-square shrink-0 rounded-full mb-4`} />
      {title ? (
        <p className="font-meta font-bold uppercase tracking-[0.06em] leading-tight text-accent transition-colors text-[11px] sm:text-[13px] md:text-[15px] mb-1.5">
          {title}
        </p>
      ) : null}
      <h2 className="font-meta font-bold leading-tight text-text-main transition-colors group-hover:text-accent text-lg sm:text-xl md:text-2xl">
        {user.firstName} {user.lastName}
      </h2>
      {user.major ? (
        <p className="font-meta text-text-muted transition-colors mt-1 text-sm sm:text-base">
          {user.major}
        </p>
      ) : null}
    </Link>
  )
}

function StaffGridCard({ user }: { user: StaffUser }) {
  const title = getCurrentPositionTitle(user)

  return (
    <Link
      href={getProfileHref(user)}
      className="group flex flex-col items-start text-left"
    >
      <StaffPortrait user={user} className="w-full aspect-square rounded-full mb-3" />
      <h3 className="font-meta text-[15px] md:text-[16px] leading-tight font-semibold text-text-main mb-1 group-hover:text-accent transition-colors">
        {user.firstName} {user.lastName}
      </h3>
      {title ? (
        <p className="font-meta text-[11px] leading-snug text-accent font-semibold uppercase tracking-[0.06em] transition-colors">
          {title}
        </p>
      ) : null}
      {user.major ? (
        <p className="font-meta text-[11px] leading-snug text-text-muted transition-colors mt-0.5">
          {user.major}
        </p>
      ) : null}
    </Link>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeo()

  return {
    title: seo.pages.staffTitle,
    description: seo.pages.staffDescription,
    alternates: { canonical: '/staff' },
    openGraph: {
      title: `${seo.pages.staffTitle} — ${seo.siteIdentity.siteName}`,
      description: seo.pages.staffDescription,
      type: 'website',
      url: '/staff',
    },
  }
}

const getEmeritusYear = (user: StaffUser): string => {
  const latestEndedPosition = user.positions
    ?.filter((position) => Boolean(position.endDate))
    .sort((a, b) => getTimestamp(b.endDate) - getTimestamp(a.endDate))[0]
    ?.endDate

  const year = latestEndedPosition
    ? new Date(latestEndedPosition).getFullYear()
    : new Date().getFullYear()

  return year.toString().slice(-2)
}

export default async function StaffPage() {
  const payload = await getPayload({ config })

  const allUsersResponse = await payload.find({
    collection: 'users',
    depth: 1,
    limit: 0,
    sort: 'lastName',
    select: {
      firstName: true,
      lastName: true,
      slug: true,
      retired: true,
      major: true,
      headshot: true,
      positions: true,
    },
  })

  const users = allUsersResponse.docs.map((user) => toStaffUser(user))
  const activeUsers = users.filter((user) => !user.retired)
  const retiredUsers = users.filter((user) => user.retired)

  const boardRows = BOARD_ROWS.map((titles) =>
    titles.flatMap((title) =>
      activeUsers
        .filter((user) => getOpenPositionTitle(user).toLowerCase() === title)
        .sort(sortAlphabetically),
    ),
  ).filter((row) => row.length > 0)
  const boardUserIds = new Set(boardRows.flat().map((user) => user.id))
  const hasFeaturedUsers = boardRows.length > 0

  const everyoneElse = activeUsers
    .filter((user) => !boardUserIds.has(user.id))
    .sort(sortAlphabetically)

  return (
    <>
      <div className="mb-8 -mt-2 flex justify-center overflow-hidden px-4 sm:px-8">
        <h1 className="max-w-full text-center font-meta font-bold uppercase tracking-[0.02em] leading-[0.82] text-[#D6001C] dark:text-white whitespace-nowrap text-[36px] sm:text-[48px] md:text-[56px] lg:text-[65px] transition-colors">
          Staff
        </h1>
      </div>

      <div className="w-full">
        {hasFeaturedUsers ? (
          <>
            <div className="@container mb-10 flex flex-col gap-10 md:gap-14">
              {boardRows.map((row) => (
                <div key={row[0].id} className="flex flex-wrap justify-center gap-x-6 gap-y-10 md:gap-x-10">
                  {row.map((user) => (
                    <div key={user.id} className="w-[calc(50%-0.75rem)] sm:w-48 md:w-56">
                      <FeaturedStaffCard user={user} />
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="my-10 border-t border-rule" />
          </>
        ) : null}

        <section>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-8">
            {everyoneElse.map((user) => (
              <StaffGridCard key={user.id} user={user} />
            ))}
          </div>
        </section>

        {retiredUsers.length > 0 && (
          <section className="mt-20">
            <div className="mb-12 flex justify-center overflow-hidden">
              <h2 className="max-w-full text-center font-meta font-bold uppercase tracking-[0.02em] leading-[0.82] text-[#D6001C] dark:text-white whitespace-nowrap text-[36px] sm:text-[48px] md:text-[56px] lg:text-[65px] transition-colors">
                Retired
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {retiredUsers.map((user) => (
                <Link
                  href={getProfileHref(user)}
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
          </section>
        )}
      </div>
    </>
  )
}
