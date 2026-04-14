import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getSeo } from '@/lib/getSeo'
import type { StaffPageLayout, User } from '@/payload-types'

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

type LayoutSlots = Pick<
  StaffPageLayout,
  'heroLeft' | 'heroRight' | 'columnLeftLead' | 'columnLeftSupport' | 'columnRightLead' | 'columnRightSupport'
>

type SlotKey = keyof LayoutSlots

const FEATURED_SLOT_ORDER: { key: SlotKey; reverse: boolean; compact: boolean }[] = [
  { key: 'heroLeft', reverse: false, compact: false },
  { key: 'heroRight', reverse: true, compact: false },
  { key: 'columnLeftLead', reverse: false, compact: false },
  { key: 'columnLeftSupport', reverse: false, compact: true },
  { key: 'columnRightLead', reverse: true, compact: false },
  { key: 'columnRightSupport', reverse: true, compact: true },
]

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
  return (
    <div className={`relative bg-gray-100 dark:bg-zinc-800 overflow-hidden transition-colors ${className}`}>
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
  )
}

function FeaturedStaffCard({
  user,
  reverse,
  compact,
}: {
  user: StaffUser
  reverse: boolean
  compact: boolean
}) {
  const title = getCurrentPositionTitle(user)
  const gapClass = compact ? 'gap-4 sm:gap-5 md:gap-6' : 'gap-5 sm:gap-6 md:gap-8'
  const portraitClass = compact 
    ? 'w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 shrink-0 rounded-full z-10' 
    : 'w-24 h-24 sm:w-28 sm:h-28 md:w-36 md:h-36 shrink-0 rounded-full z-10'
    
  const tailClass = compact
    ? (reverse ? 'right-full lg:right-auto lg:left-full w-[3rem] sm:w-[3.75rem] md:w-[4.5rem]' : 'right-full w-[3rem] sm:w-[3.75rem] md:w-[4.5rem]')
    : (reverse ? 'right-full lg:right-auto lg:left-full w-[4.25rem] sm:w-[5rem] md:w-[6.5rem]' : 'right-full w-[4.25rem] sm:w-[5rem] md:w-[6.5rem]')

  return (
    <Link
      href={getProfileHref(user)}
      className={`group flex items-center ${gapClass} ${reverse ? 'flex-row text-left lg:flex-row-reverse lg:text-right' : 'flex-row text-left'}`}
    >
      <StaffPortrait user={user} className={portraitClass} />
      <div className={`min-w-0 flex flex-1 flex-col`}>
        {title ? (
          <p className={`font-meta font-semibold uppercase tracking-[0.06em] text-accent transition-colors ${compact ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-sm mb-1'}`}>
            {title}
          </p>
        ) : null}
        <h2 className={`font-meta font-bold text-text-main transition-colors group-hover:text-accent ${compact ? 'text-base sm:text-lg md:text-xl lg:text-2xl' : 'text-lg sm:text-xl md:text-2xl lg:text-3xl'}`}>
          {user.firstName} {user.lastName}
        </h2>
        
        <div className={`relative w-full h-[3px] bg-black dark:bg-white transition-colors my-1.5 sm:my-2 z-0`}>
          <div className={`absolute top-0 bottom-0 bg-black dark:bg-white transition-colors ${tailClass}`} />
        </div>

        {user.major ? (
          <p className={`font-meta text-text-muted transition-colors ${compact ? 'text-sm sm:text-base' : 'text-base sm:text-lg md:text-xl'}`}>
            {user.major}
          </p>
        ) : null}
      </div>
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

  const layoutResponse = await payload.find({
    collection: 'staff-page-layout',
    depth: 0,
    limit: 1,
    sort: '-updatedAt',
  })

  const layoutDoc = layoutResponse.docs[0] as StaffPageLayout | undefined
  const layoutSlots: LayoutSlots = {
    heroLeft: layoutDoc?.heroLeft ?? null,
    heroRight: layoutDoc?.heroRight ?? null,
    columnLeftLead: layoutDoc?.columnLeftLead ?? null,
    columnLeftSupport: layoutDoc?.columnLeftSupport ?? null,
    columnRightLead: layoutDoc?.columnRightLead ?? null,
    columnRightSupport: layoutDoc?.columnRightSupport ?? null,
  }

  const selectedIds = [...new Set(
    FEATURED_SLOT_ORDER
      .map(({ key }) => layoutSlots[key])
      .filter((value): value is number => typeof value === 'number'),
  )]

  const selectedUsersResponse = selectedIds.length > 0
    ? await payload.find({
        collection: 'users',
        depth: 1,
        limit: selectedIds.length,
        where: {
          id: {
            in: selectedIds,
          },
        },
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
    : { docs: [] }

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

  const selectedUsersById = new Map(
    selectedUsersResponse.docs.map((user) => {
      const staffUser = toStaffUser(user)
      return [staffUser.id, staffUser]
    }),
  )

  const featuredUsers = FEATURED_SLOT_ORDER.map(({ key, reverse, compact }) => {
    const selectedId = layoutSlots[key]
    if (typeof selectedId !== 'number') {
      return { key, reverse, compact, user: null }
    }

    return {
      key,
      reverse,
      compact,
      user: selectedUsersById.get(selectedId) || null,
    }
  })

  const featuredUserIds = new Set(
    featuredUsers
      .map((entry) => entry.user?.id)
      .filter((value): value is number => typeof value === 'number'),
  )

  const users = allUsersResponse.docs.map((user) => toStaffUser(user))
  const activeUsers = users.filter((user) => !user.retired)
  const retiredUsers = users.filter((user) => user.retired)

  const everyoneElse = activeUsers
    .filter((user) => !featuredUserIds.has(user.id))
    .sort(sortAlphabetically)

  const topRow = featuredUsers.slice(0, 2)
  const lowerLeft = featuredUsers.slice(2, 4)
  const lowerRight = featuredUsers.slice(4, 6)
  const hasFeaturedUsers = featuredUsers.some((entry) => entry.user)

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
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-12 mb-10 items-start">
              {topRow.map(({ key, reverse, compact, user }, index) => (
                <div key={key} className={`min-h-[10rem] ${index === 1 ? 'lg:mt-16' : ''}`}>
                  {user ? <FeaturedStaffCard user={user} reverse={reverse} compact={compact} /> : null}
                </div>
              ))}
            </div>

            <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 mb-10">
              <div className="space-y-10 sm:space-y-14">
                {lowerLeft.map(({ key, reverse, compact, user }) => (
                  <div key={key} className={compact ? 'pl-0 sm:pl-12' : ''}>
                    {user ? <FeaturedStaffCard user={user} reverse={reverse} compact={compact} /> : null}
                  </div>
                ))}
              </div>

              <div className="space-y-10 sm:space-y-14">
                {lowerRight.map(({ key, reverse, compact, user }) => (
                  <div key={key} className={compact ? 'pr-0 sm:pr-12' : ''}>
                    {user ? <FeaturedStaffCard user={user} reverse={reverse} compact={compact} /> : null}
                  </div>
                ))}
              </div>
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
