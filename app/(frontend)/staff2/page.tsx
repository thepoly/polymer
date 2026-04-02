import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getSeo } from '@/lib/getSeo'
import type { StaffPageLayout, User } from '@/payload-types'

export const revalidate = 60

type Staff2UserSource = Pick<
  User,
  'id' | 'firstName' | 'lastName' | 'slug' | 'retired' | 'major' | 'headshot' | 'positions'
>

type Staff2User = {
  id: number
  firstName: string
  lastName: string
  slug?: string | null
  retired?: boolean | null
  major?: string | null
  headshot?: {
    url?: string | null
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

const dotGridStyle = {
  backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.18) 1.8px, transparent 0)',
  backgroundSize: '30px 30px',
} as const

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const getTimestamp = (value?: string | null): number => {
  if (!value) return Number.NEGATIVE_INFINITY

  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp
}

const getHeadshotUrl = (headshot: Staff2UserSource['headshot']): string | null => {
  if (!isRecord(headshot) || typeof headshot.url !== 'string' || headshot.url.trim() === '') {
    return null
  }

  return headshot.url
}

const getJobTitle = (
  jobTitle: NonNullable<NonNullable<Staff2UserSource['positions']>[number]>['jobTitle'],
): string | null => {
  if (!isRecord(jobTitle) || typeof jobTitle.title !== 'string' || jobTitle.title.trim() === '') {
    return null
  }

  return jobTitle.title
}

const toStaff2User = (user: Staff2UserSource): Staff2User => {
  const headshotUrl = getHeadshotUrl(user.headshot)

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    slug: user.slug,
    retired: user.retired,
    major: user.major,
    headshot: headshotUrl ? { url: headshotUrl } : null,
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

const getCurrentOrLatestPosition = (user: Staff2User) => {
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

const getCurrentPositionTitle = (user: Staff2User): string => {
  const position = getCurrentOrLatestPosition(user)
  const title = position?.jobTitle?.title?.trim()
  return title || ''
}

const getProfileHref = (user: Staff2User): string => `/staff/${user.slug || user.id}`

const sortAlphabetically = (a: Staff2User, b: Staff2User): number => {
  const lastNameCompare = a.lastName.localeCompare(b.lastName)
  if (lastNameCompare !== 0) return lastNameCompare
  return a.firstName.localeCompare(b.firstName)
}

function StaffPortrait({
  user,
  size,
}: {
  user: Staff2User
  size: 'large' | 'medium' | 'small'
}) {
  const sizeClasses = {
    large: 'h-28 w-28 sm:h-32 sm:w-32 md:h-36 md:w-36',
    medium: 'h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32',
    small: 'h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28',
  }[size]

  return (
    <div className={`relative shrink-0 overflow-hidden rounded-full border-[4px] border-black bg-white ${sizeClasses}`}>
      {user.headshot?.url ? (
        <Image
          src={user.headshot.url}
          alt={`${user.firstName} ${user.lastName}`}
          fill
          className="object-cover"
          sizes={size === 'large' ? '144px' : size === 'medium' ? '128px' : '112px'}
        />
      ) : (
        <div aria-hidden="true" className="h-full w-full bg-white" />
      )}
    </div>
  )
}

function FeaturedStaffCard({
  user,
  reverse,
  compact,
}: {
  user: Staff2User
  reverse: boolean
  compact: boolean
}) {
  const title = getCurrentPositionTitle(user)
  const baseLayout = compact
    ? 'gap-4 sm:gap-5'
    : 'gap-5 sm:gap-6'

  return (
    <Link
      href={getProfileHref(user)}
      className={`group flex items-center ${baseLayout} ${reverse ? 'justify-end text-right' : 'justify-start text-left'}`}
    >
      {!reverse && <StaffPortrait user={user} size={compact ? 'small' : 'large'} />}
      <div className={`min-w-0 ${reverse ? 'items-end' : 'items-start'} flex flex-1 flex-col`}>
        {title ? (
          <p className={`w-full font-meta text-[1.1rem] font-black uppercase leading-[0.9] tracking-[0.03em] text-black sm:text-[1.45rem] ${compact ? 'md:text-[1.6rem]' : 'md:text-[2.1rem]'}`}>
            {title}
          </p>
        ) : null}
        <h2 className={`w-full border-b-[4px] border-black pb-1 font-meta leading-[0.9] text-black transition-colors group-hover:text-[#c5231e] ${compact ? 'text-[2rem] sm:text-[2.35rem] md:text-[2.8rem]' : 'text-[2.45rem] sm:text-[2.9rem] md:text-[3.6rem]'}`}>
          {user.firstName} {user.lastName}
        </h2>
        {user.major ? (
          <p className={`w-full pt-1 font-meta leading-[0.95] text-black ${compact ? 'text-[1.45rem] sm:text-[1.75rem] md:text-[2rem]' : 'text-[1.6rem] sm:text-[1.9rem] md:text-[2.2rem]'}`}>
            {user.major}
          </p>
        ) : null}
      </div>
      {reverse && <StaffPortrait user={user} size={compact ? 'small' : 'large'} />}
    </Link>
  )
}

function StaffGridCard({ user }: { user: Staff2User }) {
  const title = getCurrentPositionTitle(user)

  return (
    <Link
      href={getProfileHref(user)}
      className="group flex h-full flex-col justify-between rounded-[1.6rem] border-[3px] border-black bg-white/75 p-5"
    >
      <div className="mb-5 flex items-start gap-4">
        <StaffPortrait user={user} size="medium" />
        <div className="min-w-0">
          <h3 className="font-meta text-[1.9rem] leading-[0.92] text-black transition-colors group-hover:text-[#c5231e]">
            {user.firstName} {user.lastName}
          </h3>
          {title ? (
            <p className="mt-2 font-meta text-[1rem] font-black uppercase leading-[0.95] tracking-[0.04em] text-black sm:text-[1.1rem]">
              {title}
            </p>
          ) : null}
        </div>
      </div>
      {user.major ? (
        <p className="font-meta text-[1.2rem] leading-none text-black">
          {user.major}
        </p>
      ) : (
        <span aria-hidden="true" className="block h-5" />
      )}
    </Link>
  )
}

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
      title: `${seo.pages.staffTitle} Beta - ${seo.siteIdentity.siteName}`,
      description: seo.pages.staffDescription,
      type: 'website',
      url: '/staff2',
    },
  }
}

export default async function Staff2Page() {
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
    where: {
      retired: {
        equals: false,
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

  const selectedUsersById = new Map(
    selectedUsersResponse.docs.map((user) => {
      const staffUser = toStaff2User(user)
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

  const everyoneElse = allUsersResponse.docs
    .map((user) => toStaff2User(user))
    .filter((user) => !featuredUserIds.has(user.id))
    .sort(sortAlphabetically)

  const topRow = featuredUsers.slice(0, 2)
  const lowerLeft = featuredUsers.slice(2, 4)
  const lowerRight = featuredUsers.slice(4, 6)
  const hasFeaturedUsers = featuredUsers.some((entry) => entry.user)

  return (
    <div className="follytechnic px-1 pb-8 sm:px-3">
      <div
        className="rounded-[2rem] border-[5px] border-black bg-[#f7f4ed] p-5 text-black shadow-[0_14px_40px_rgba(0,0,0,0.08)] sm:p-8 md:p-10"
        style={dotGridStyle}
      >
        {hasFeaturedUsers ? (
          <>
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
              {topRow.map(({ key, reverse, compact, user }) => (
                <div key={key} className="min-h-[10rem]">
                  {user ? <FeaturedStaffCard user={user} reverse={reverse} compact={compact} /> : null}
                </div>
              ))}
            </div>

            <div className="my-8 border-t-[4px] border-black" />

            <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
              <div className="space-y-9">
                {lowerLeft.map(({ key, reverse, compact, user }) => (
                  <div key={key} className={compact ? 'pl-0 sm:pl-12' : ''}>
                    {user ? <FeaturedStaffCard user={user} reverse={reverse} compact={compact} /> : null}
                  </div>
                ))}
              </div>

              <div className="space-y-9">
                {lowerRight.map(({ key, reverse, compact, user }) => (
                  <div key={key} className={compact ? 'pr-0 sm:pr-12' : ''}>
                    {user ? <FeaturedStaffCard user={user} reverse={reverse} compact={compact} /> : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="my-8 border-t-[4px] border-black" />
          </>
        ) : null}

        <section>
          <div className="mb-6 flex items-center justify-between gap-4">
            <h1 className="font-meta text-[2.2rem] leading-none text-black sm:text-[2.8rem]">
              Everyone Else
            </h1>
            <span className="font-meta text-[1.6rem] leading-none text-black">...</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {everyoneElse.map((user) => (
              <StaffGridCard key={user.id} user={user} />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
