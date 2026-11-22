import Image from 'next/image'
import type { ScoreSideData } from './results'

type Size = 'singleLead' | 'singleArticle' | 'seriesLead' | 'seriesArticle'
const sizes = {
  singleLead: { gap: 'gap-2.5 sm:gap-5 lg:gap-6', name: 'text-[17px] sm:text-[24px] lg:text-[30px]', logo: 'size-11 sm:size-16 lg:size-[76px]', score: 'text-[46px] sm:text-[64px] lg:text-[84px]' },
  singleArticle: { gap: 'gap-2 min-[360px]:gap-2.5 sm:gap-4', name: 'text-[15px]', logo: 'size-7 sm:size-[34px]', score: 'text-[36px] sm:text-[44px]' },
  seriesLead: { gap: 'gap-1 min-[360px]:gap-1.5 sm:gap-3.5', name: 'text-xs', logo: 'size-7 sm:size-10', score: 'text-[40px] sm:text-[48px] lg:text-[56px]' },
  seriesArticle: { gap: 'gap-1 min-[360px]:gap-1.5 sm:gap-3', name: 'text-[15px]', logo: 'size-7 sm:size-[34px]', score: 'text-[36px] sm:text-[44px]' },
}

export function ScoreSide({ side, left, size, hideName = false, compactScores = false }: {
  side: ScoreSideData
  left: boolean
  size: Size
  hideName?: boolean
  compactScores?: boolean
}) {
  const { team, score, result } = side
  const style = sizes[size]
  const series = size === 'seriesLead' || size === 'seriesArticle'
  const showName = !team.logo || !(size === 'seriesLead' || (size === 'seriesArticle' && side.rpi))
  const visibility = team.logo ? (hideName ? 'invisible absolute' : 'max-sm:invisible max-sm:absolute') : ''
  const nameStyle = `${visibility} ${style.name} min-w-0 truncate font-meta ${result > 0 ? 'font-semibold' : 'font-medium'}`
  const link = size === 'singleLead' && team.url
  // The lead column gets narrower when standings move beside it.
  const narrowLead = size === 'seriesLead' ? 'sm:@max-[250px]:gap-2' : ''
  const leadLogoSize = size === 'seriesLead' ? 'sm:@max-[250px]:size-8' : ''
  const leadScoreSize = size === 'seriesLead'
    ? compactScores ? 'sm:@max-[285px]:text-[34px]' : 'sm:@max-[250px]:text-[40px]'
    : ''
  return (
    <div data-score-side className={`relative flex min-w-0 items-center ${style.gap} ${narrowLead} ${showName ? '' : 'shrink-0'} ${left ? 'justify-end' : 'flex-row-reverse justify-end'} ${result < 0 ? 'text-text-muted' : 'text-text-main'}`}>
      {showName && (link ? (
        <a data-team-name href={link} target="_blank" rel="noopener noreferrer" aria-label={team.name + ' athletics'}
          className={`${nameStyle} hover:text-accent focus-visible:text-accent`}>{team.shortName}</a>
      ) : <span data-team-name aria-hidden="true" className={nameStyle}>{team.shortName}</span>)}
      {team.logo && (
        <span data-team-logo className={`relative shrink-0 ${style.logo} ${leadLogoSize} ${series && side.rpi ? (size === 'seriesLead' ? 'sm:w-12 sm:@max-[250px]:w-9' : 'sm:w-10') : ''}`}>
          <Image src={team.logo} alt="" fill sizes="76px" unoptimized className="object-contain" />
        </span>
      )}
      <span aria-hidden="true" className={`shrink-0 font-display-news leading-none tabular-nums ${style.score} ${leadScoreSize} ${compactScores ? 'max-[420px]:text-[clamp(24px,8vw,34px)]' : ''} ${result < 0 ? 'font-normal' : 'font-bold'}`}>
        {score ?? '–'}
      </span>
    </div>
  )
}
