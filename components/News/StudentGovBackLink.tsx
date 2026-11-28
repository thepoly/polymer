import React from "react";
import TransitionLink from "@/components/TransitionLink";

/**
 * "Back to the term in session", at the top of a past term's stream: a plain
 * red link, "‹ TO 57TH SENATE", set like the Terms list's "Show N earlier
 * terms" button, with the Terms list's chevron turned to point back. The name
 * is the term in session, worked out on each request, so it moves on by itself
 * when a new term starts. On hover the text underlines and the chevron nudges
 * left. Still for reduced motion.
 */
export default function StudentGovBackLink({ href, name }: { href: string; name: string }) {
  return (
    <TransitionLink
      href={href}
      aria-label={`Back to the ${name}`}
      className="group inline-flex min-h-11 items-center gap-1.5 font-meta text-[12px] leading-none font-bold tracking-[0.12em] whitespace-nowrap text-accent uppercase outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="h-3.5 w-3.5 shrink-0 fill-none stroke-current stroke-[1.75] transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none"
      >
        <path d="M10 3.5 5.5 8 10 12.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="underline-offset-4 group-hover:underline">To {name}</span>
    </TransitionLink>
  );
}
