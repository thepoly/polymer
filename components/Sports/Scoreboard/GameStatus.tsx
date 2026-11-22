import type { GameResult } from '@/components/FrontPage/types'

export function GameStatus({ game, className }: { game: GameResult; className: string }) {
  if (!game.link) return <span aria-hidden="true" className={className}>{game.status}</span>

  return (
    <a
      href={game.link}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`RPI vs. ${game.opponent.shortName} game recap or box score (${game.status})`}
      title="Recap and box score on RPI Athletics"
      className={`${className} underline decoration-dotted underline-offset-4 transition-colors hover:text-accent focus-visible:text-accent focus-visible:outline-2 focus-visible:outline-accent`}
    >
      {game.status}
    </a>
  )
}
