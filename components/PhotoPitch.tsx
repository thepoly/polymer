import React from 'react';
import PhotoWindow from '@/components/PhotoWindow';
import TransitionLink from '@/components/TransitionLink';
import { PITCH_POSITION_CLASSES, type PitchPhoto } from '@/lib/pitchPhoto';

const focus = 'focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2';

/**
 * Type sizes. `regular` is the Features pitch, whose invitation is long
 * ("Tell Features about it"); `large` is for a short pair that has the room
 * (Opinion's "Have an opinion? Submit an op-ed").
 */
const SIZES = {
  regular: { label: 'text-[12px]', action: 'text-[22px]', plainAction: 'text-[19px]' },
  large: { label: 'text-[14px]', action: 'text-[28px]', plainAction: 'text-[24px]' },
} as const;

function Label({ children, light = false, size }: { children: React.ReactNode; light?: boolean; size: string }) {
  return (
    <p className={`font-meta ${size} font-semibold uppercase tracking-[0.12em] ${light ? 'text-white' : 'text-accent'}`}>{children}</p>
  );
}

/**
 * A pitch box: a short question and an invitation, as a link. Used by the
 * Features pitch ("Have a suggestion? Tell Features about it") and the
 * Opinion guest-writer box.
 *
 * With a photo, it's a window onto that photo, pinned to the screen in the
 * Get involved page's style: the photo stays put while the page scrolls past,
 * so a different part of it shows as you read down. The two lines are centred
 * on an even tint. The label is white, not red: red small type doesn't read
 * on a dark photo. Without a photo, the two lines sit on their own. Where the
 * photo sits on phones, tablets and computers is set in the section's layout
 * editor; `data-pitch` is how its previews find the box.
 *
 * `className` sizes the box with a photo (Features: `min-h-[124px] flex-1`);
 * `plainClassName` sizes and frames it without one. Site paths go through
 * TransitionLink; anything else (a mailto) is a plain link.
 */
export default function PhotoPitch({
  href,
  question,
  action,
  photo,
  className = 'min-h-[124px] flex-1',
  plainClassName = 'flex-1 py-2',
  size = 'regular',
}: {
  href: string;
  question: string;
  action: string;
  photo: PitchPhoto | null;
  className?: string;
  plainClassName?: string;
  size?: keyof typeof SIZES;
}) {
  const type = SIZES[size];
  const arrow = (
    <span aria-hidden="true" className="inline-block transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0">
      →
    </span>
  );
  if (!photo) {
    return (
      <PitchLink href={href} className={`group flex flex-col items-center justify-center gap-1.5 text-center ${plainClassName} ${focus}`}>
        <Label size={type.label}>{question}</Label>
        <span className={`font-copy ${type.plainAction} leading-[1.2] text-text-main`}>
          {action} <span className="text-accent">{arrow}</span>
        </span>
      </PitchLink>
    );
  }
  return (
    <PitchLink
      href={href}
      style={photo.vars as React.CSSProperties}
      className={`group relative flex flex-col items-center justify-center overflow-hidden text-center text-white ${className} ${focus}`}
    >
      <PhotoWindow fill src={photo} alt="" maxZoom={photo.maxZoom} imageClassName={PITCH_POSITION_CLASSES} />
      <div aria-hidden="true" className="absolute inset-0 bg-black/50 transition-colors duration-300 group-hover:bg-black/60" />
      {photo.credit && (
        <span className="absolute right-1.5 top-1.5 z-10 bg-black/55 px-1.5 py-0.5 font-meta text-[10px] leading-none tracking-[0.02em] text-white/90">{photo.credit}</span>
      )}
      <div className="relative z-10 px-4 py-5 [text-shadow:0_1px_2px_rgb(0_0_0/0.45)]">
        <Label light size={type.label}>{question}</Label>
        <span className={`mt-1.5 block font-copy ${type.action} leading-[1.15]`}>
          {action} {arrow}
        </span>
      </div>
    </PitchLink>
  );
}

function PitchLink({ href, className, style, children }: { href: string; className: string; style?: React.CSSProperties; children: React.ReactNode }) {
  return href.startsWith('/') ? (
    <TransitionLink href={href} data-pitch="" style={style} className={className}>
      {children}
    </TransitionLink>
  ) : (
    <a href={href} data-pitch="" style={style} className={className}>
      {children}
    </a>
  );
}
