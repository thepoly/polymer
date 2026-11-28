import React, { useSyncExternalStore } from "react";
import Image from "next/image";

/** The public projection of an author the spotlight shows (built on the server: lib/opinionArticles.ts) */
export interface SpotlightAuthor {
  id: number;
  name: string;
  headshot: string | null;
  /** The headshot's crop (`object-position`, from utils/focalPoint headshotObjectPosition) */
  headshotFocus: string | null;
  /** Short public detail under the name: the author's major ("ECSE '28") */
  detail: string | null;
  latestArticle: { title: string; richTitle?: React.ReactNode; url: string };
}

/**
 * The spotlight's height inside its rules, fixed: BalanceColumns squares off
 * the columns around it and can't follow a height change after the first
 * paint.
 */
export const SPOTLIGHT_HEIGHT = 240;

/** Apple's ease-out for things settling into place */
export const SPOTLIGHT_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

const subscribeReducedMotion = (notify: () => void) => {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};
const reducedMotionSnapshot = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** True on the server and until the browser says otherwise, so nothing moves before it has checked */
export function useReducedMotion() {
  return useSyncExternalStore(subscribeReducedMotion, reducedMotionSnapshot, () => true);
}

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const first = words[0].charAt(0);
  const last = words.length > 1 ? words[words.length - 1].charAt(0) : "";
  return (first + last).toUpperCase();
}

/** Headshot, or the author's initials on a neutral gradient (as Contacts does) */
export function SpotlightAvatar({ name, headshot, focus, size }: { name: string; headshot: string | null; focus?: string | null; size: number }) {
  return (
    <span
      className="relative block shrink-0 overflow-hidden rounded-full"
      style={{ width: size, height: size }}
    >
      {headshot ? (
        <Image src={headshot} alt="" fill className="object-cover" style={{ objectPosition: focus || "50% 30%" }} sizes={`${size}px`} />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-full w-full select-none items-center justify-center bg-gradient-to-b from-[#a8aeb9] to-[#868c98] font-meta font-semibold tracking-[0.02em] text-white"
          style={{ fontSize: Math.round(size * 0.36) }}
        >
          {initials(name)}
        </span>
      )}
      {/* Hairline so a pale photo still reads as a circle on a white page */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-black/10 dark:ring-white/10" />
    </span>
  );
}
