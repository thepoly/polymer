'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  assignFaces,
  creditsFor,
  EASTER_EGG_ODDS,
  type EasterEggFace,
} from '@/lib/staff-easter-egg'

// The senior board, flattened by the server into plain props. Nothing from
// lib/staff-directory is imported here — that module pulls in Payload, which has
// no business in a client bundle.
export type BoardMember = {
  id: number
  name: string
  title: string
  major?: string | null
  href: string
  headshotUrl?: string | null
  headshotAlt?: string | null
}

// Held together, these trigger the swap on demand.
const CHORD = ['q', 'w', 'e', 'r', 't', 'y']

const PORTRAIT_WIDTH =
  'w-[calc((100cqw-1rem)/2)] sm:w-[calc((100cqw-2rem)/3)] md:w-[calc((100cqw-3rem)/4)] lg:w-[calc((100cqw-5rem)/6)]'

function BoardCard({ member, face }: { member: BoardMember; face?: EasterEggFace }) {
  const src = face?.src ?? member.headshotUrl
  // Alt text stays the staffer's name either way: the card is about them, and the
  // swap is a visual gag rather than a claim about who is pictured.
  const alt = face ? member.name : member.headshotAlt || member.name

  return (
    <Link href={member.href} className="group flex flex-col items-center text-center">
      {src ? (
        <div
          className={`${PORTRAIT_WIDTH} relative aspect-square shrink-0 overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-800 mb-4 transition-colors`}
        >
          <Image
            src={src}
            alt={alt}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
            // The swapped files are local and only ever requested on a winning
            // roll, so there is no cost to normal page loads.
            unoptimized={Boolean(face)}
          />
        </div>
      ) : null}
      {member.title ? (
        <p className="font-meta font-bold uppercase tracking-[0.06em] leading-tight text-accent transition-colors text-[11px] sm:text-[13px] md:text-[15px] mb-1.5">
          {member.title}
        </p>
      ) : null}
      <h2 className="font-meta font-bold leading-tight text-text-main transition-colors group-hover:text-accent text-lg sm:text-xl md:text-2xl">
        {member.name}
      </h2>
      {member.major ? (
        <p className="font-meta text-text-muted transition-colors mt-1 text-sm sm:text-base">
          {member.major}
        </p>
      ) : null}
    </Link>
  )
}

function PhotoCredits({ faces }: { faces: EasterEggFace[] }) {
  return (
    <aside
      data-nosnippet
      className="mt-10 border-t border-rule pt-4 text-left font-meta text-[10px] leading-snug text-text-muted transition-colors"
    >
      <p className="mb-1 uppercase tracking-[0.08em] font-semibold">Board portraits, this load</p>
      <p className="mb-2">
        Substitute portraits are freely licensed photographs of the cast of{' '}
        <em>Ted Lasso</em>, used here as a joke. They are not members of this staff.
      </p>
      <ul className="flex flex-col gap-0.5">
        {faces.map((face) => (
          <li key={face.src}>
            <a href={face.source} rel="nofollow noopener noreferrer" target="_blank" className="hover:text-accent">
              {face.source.split('File:')[1]?.replace(/_/g, ' ').replace(/\.jpg$/i, '') ?? face.src}
            </a>
            {' — '}
            {face.credit}
            {', '}
            {face.licenseUrl ? (
              <a href={face.licenseUrl} rel="nofollow noopener noreferrer" target="_blank" className="hover:text-accent">
                {face.license}
              </a>
            ) : (
              face.license
            )}
            {', via Wikimedia Commons'}
          </li>
        ))}
      </ul>
    </aside>
  )
}

export default function StaffBoard({ rows }: { rows: BoardMember[][] }) {
  // Starts empty so the server render and the first client render agree; the
  // roll happens in an effect, which only ever runs in the browser. That keeps
  // the ISR-cached HTML — and therefore anything a crawler sees — on real staff.
  const [faces, setFaces] = useState<Map<number, EasterEggFace> | null>(null)

  useEffect(() => {
    if (Math.floor(Math.random() * EASTER_EGG_ODDS) !== 0) return
    setFaces(assignFaces(rows, (member) => member.title))
    // Rolling once per mount is the whole point; rows changing shouldn't reroll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Deliberate trigger: hold q, w, e, r, t and y down together. Worth knowing
  // that six simultaneous keys exceed the rollover limit on some membrane
  // keyboards, so this won't fire on every machine.
  useEffect(() => {
    const down = new Set<string>()

    const isTyping = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return
      down.add(event.key.toLowerCase())
      if (CHORD.every((key) => down.has(key))) {
        setFaces(assignFaces(rows, (member) => member.title))
      }
    }
    const onKeyUp = (event: KeyboardEvent) => down.delete(event.key.toLowerCase())
    // A window blur mid-chord would otherwise leave keys stuck down.
    const onBlur = () => down.clear()

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [rows])

  const shownFaces = faces
    ? creditsFor(rows.flat().map((member) => faces.get(member.id)).filter((face): face is EasterEggFace => Boolean(face)))
    : []

  return (
    <>
      <div className="@container mb-10 flex flex-col gap-10 md:gap-14">
        {rows.map((row) => (
          <div key={row[0].id} className="flex flex-wrap justify-center gap-x-6 gap-y-10 md:gap-x-10">
            {row.map((member) => (
              <div key={member.id} className="w-[calc(50%-0.75rem)] sm:w-48 md:w-56">
                <BoardCard member={member} face={faces?.get(member.id)} />
              </div>
            ))}
          </div>
        ))}
      </div>

      {shownFaces.length > 0 ? <PhotoCredits faces={shownFaces} /> : null}
    </>
  )
}
