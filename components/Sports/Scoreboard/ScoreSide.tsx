import Image from 'next/image'
import type { ScoreSideData } from './results'

type Size = 'singleLead' | 'singleArticle' | 'seriesLead' | 'seriesArticle'
const sizes = {
  singleLead: { gap: 'gap-2.5 sm:gap-5 lg:gap-6', name: 'text-[17px] sm:text-[24px] lg:text-[30px]', logo: 'size-11 sm:size-16 lg:size-[76px]', score: 'text-[46px] sm:text-[64px] lg:text-[84px]' },
  singleArticle: { gap: 'gap-3 sm:gap-5', name: 'text-[15px]', logo: 'size-7 sm:size-[34px]', score: 'text-[36px] sm:text-[44px]' },
  seriesLead: { gap: 'gap-2 sm:gap-4', name: 'text-xs', logo: 'size-7 sm:size-10', score: 'text-[40px] sm:text-[48px] lg:text-[56px]' },
  seriesArticle: { gap: 'gap-2 sm:gap-3.5', name: 'text-[15px]', logo: 'size-7 sm:size-[34px]', score: 'text-[36px] sm:text-[44px]' },
}

export function ScoreSide({ side, left, size, digits, hideName = false }: {
  side: ScoreSideData
  left: boolean
  size: Size
  digits: number
  hideName?: boolean
}) {
  const { team, score, result } = side
  const style = sizes[size]
  const series = size === 'seriesLead' || size === 'seriesArticle'
  const showName = !team.logo || !series
  const visibility = team.logo ? (hideName ? 'invisible absolute' : 'max-sm:invisible max-sm:absolute') : ''
  const nameStyle = `${visibility} ${style.name} min-w-0 truncate font-meta ${result > 0 ? 'font-semibold' : 'font-medium'}`
  // The lead column gets narrower when standings move beside it.
  const narrowLead = size === 'seriesLead' ? 'sm:@max-[250px]:gap-2.5' : ''
  const leadLogoSize = size === 'seriesLead' ? 'sm:@max-[250px]:size-8' : ''
  const leadScoreSize = size === 'seriesLead'
    ? digits >= 3 ? 'sm:@max-[285px]:text-[34px]' : 'sm:@max-[250px]:text-[40px]'
    : ''
  const tightSeries = series && digits >= 2
  const tightGap = tightSeries
    ? digits >= 3 ? 'max-sm:@max-[160px]:gap-1' : 'max-sm:@max-[160px]:gap-1.5'
    : ''
  const tightLogo = tightSeries ? 'max-sm:@max-[160px]:size-6' : ''
  const tightScore = tightSeries
    ? digits >= 3
      ? 'max-sm:@max-[210px]:text-[clamp(24px,15cqw,34px)]'
      : 'max-sm:@max-[160px]:text-[32px]'
    : ''
  const teamLabel = `${team.name} athletics`
  const teamClassName = `relative flex min-w-0 items-center [column-gap:inherit] ${left ? '' : 'flex-row-reverse'}`
  const teamIdentity = (
    <>
      {showName && <span data-team-name className={nameStyle}>{team.shortName}</span>}
      {team.logo && (
        <span data-team-logo className={`relative shrink-0 ${style.logo} ${leadLogoSize} ${tightLogo}`}>
          <Image src={team.logo} alt="" fill sizes="76px" unoptimized className="object-contain" />
        </span>
      )}
    </>
  )
  return (
    <div data-score-side className={`relative flex min-w-0 items-center justify-end ${style.gap} ${narrowLead} ${tightGap} ${left ? '' : 'flex-row-reverse'} ${result < 0 ? 'text-text-muted' : 'text-text-main'}`}>
      {team.url ? (
        <a
          href={team.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={teamLabel}
          title={teamLabel}
          className={`${teamClassName} transition-colors hover:text-accent hover:underline hover:[&_img]:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
        >
          {teamIdentity}
        </a>
      ) : <span className={teamClassName} aria-hidden="true">{teamIdentity}</span>}
      <span aria-hidden="true" style={{ minWidth: `${digits}ch` }} className={`shrink-0 text-center font-display-news leading-none tabular-nums ${style.score} ${leadScoreSize} ${tightScore} ${result < 0 ? 'font-normal' : 'font-bold'}`}>
        {score ?? '–'}
      </span>
    </div>
  )
}
