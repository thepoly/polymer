"use client";

/**
 * "Skip to content": the first thing a keyboard user tabs to. It jumps past
 * the site header to the marker HeaderClient leaves after it, or, on pages
 * drawn without that header (articles), to the page's <main>.
 */
export default function SkipLink() {
  return (
    <a
      href="#main-content"
      onClick={(e) => {
        const target = document.getElementById("main-content") ?? document.querySelector<HTMLElement>("main");
        if (!target) return;
        e.preventDefault();
        if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
        target.focus();
      }}
      className="sr-only font-meta focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded focus:border focus:border-rule-strong focus:bg-bg-main focus:px-4 focus:py-2 focus:text-[13px] focus:font-semibold focus:uppercase focus:tracking-[0.08em] focus:text-text-main focus:shadow-lg"
    >
      Skip to content
    </a>
  );
}
