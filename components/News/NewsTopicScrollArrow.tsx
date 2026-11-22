"use client";

import { useCallback, useLayoutEffect, useRef } from "react";

/** One interactive arrow; an inert copy carries its outgoing animation. */
export default function NewsTopicScrollArrow({ back, onClick }: { back: boolean; onClick: () => void }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const previous = useRef<{ back: boolean; template: HTMLButtonElement } | null>(null);
  const entry = useRef<Animation | null>(null);
  const exit = useRef<Animation | null>(null);
  const ghost = useRef<HTMLButtonElement | null>(null);

  const stopAnimations = useCallback(() => {
    entry.current?.cancel();
    exit.current?.cancel();
    entry.current = null;
    exit.current = null;
    ghost.current?.remove();
    ghost.current = null;
  }, []);

  useLayoutEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const settle = () => { if (motion.matches) stopAnimations(); };
    motion.addEventListener("change", settle);
    return () => {
      motion.removeEventListener("change", settle);
      stopAnimations();
      previous.current = null;
    };
  }, [stopAnimations]);

  useLayoutEffect(() => {
    const button = buttonRef.current;
    if (!button) return;
    // Capture a partly completed entrance before cancelling it, so a quick
    // reversal can leave from the arrow's current opacity and position.
    const current = getComputedStyle(button);
    const from = { opacity: current.opacity, transform: current.transform };
    const returning = ghost.current;
    const returningStyle = returning ? getComputedStyle(returning) : null;
    const resume = returningStyle && returning?.classList.contains(back ? "left-0" : "right-0")
      ? { opacity: returningStyle.opacity, transform: returningStyle.transform }
      : null;
    const old = previous.current;
    stopAnimations();
    previous.current = { back, template: button.cloneNode(true) as HTMLButtonElement };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !button.animate) return;

    if (old && old.back !== back) {
      const copy = old.template;
      copy.disabled = true;
      copy.inert = true;
      copy.tabIndex = -1;
      copy.removeAttribute("aria-label");
      copy.removeAttribute("aria-controls");
      copy.setAttribute("aria-hidden", "true");
      copy.setAttribute("data-topic-arrow-ghost", "");
      copy.style.pointerEvents = "none";
      button.parentElement?.append(copy);
      ghost.current = copy;
      const outgoing = copy.animate([
        from,
        { opacity: 0, transform: `translateX(${old.back ? -12 : 12}px)` },
      ], { duration: 120, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "both" });
      outgoing.id = "news-topic-arrow-exit";
      exit.current = outgoing;
      void outgoing.finished.then(() => {
        copy.remove();
        if (ghost.current === copy) ghost.current = null;
        if (exit.current === outgoing) exit.current = null;
      }).catch(() => {});
    }

    const incoming = button.animate([
      resume ?? { opacity: 0, transform: `translateX(${back ? -12 : 12}px)` },
      { opacity: 1, transform: "translateX(0)" },
    ], { duration: 200, delay: old && !resume ? 40 : 0, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "both" });
    incoming.id = "news-topic-arrow-enter";
    entry.current = incoming;
    void incoming.finished.then(() => {
      incoming.cancel();
      if (entry.current === incoming) entry.current = null;
    }).catch(() => {});
  }, [back, stopAnimations]);

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label={`Scroll News topics ${back ? "left" : "right"}`}
      aria-controls="news-topic-tabs"
      onClick={onClick}
      className={`absolute -top-3 flex h-11 w-14 items-center justify-center text-text-muted transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:hidden ${back ? "left-0 pr-3" : "right-0 pl-3"}`}
      style={{ background: `linear-gradient(to ${back ? "left" : "right"}, transparent, var(--background) 12px)` }}
    >
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={back ? "rotate-180" : undefined}>
        <path d="M4 12h16m-6-6 6 6-6 6" />
      </svg>
    </button>
  );
}
