"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useSelectedLayoutSegment } from "next/navigation";
import SearchOverlay from "@/components/SearchOverlay";

const OPEN_EVENT = "polymer:open-search-overlay";

export function openSearchOverlay(options: { forceDark?: boolean } = {}) {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: options }));
}

// The one search overlay for the public site. It opens from the header buttons or
// Ctrl/Cmd+Space, stays up when it pushes /search?q= over the current page, and
// reappears over that page when back/forward lands on that /search entry.
export default function SearchOverlayHost() {
  const pathname = usePathname();
  const segment = useSelectedLayoutSegment();
  const [open, setOpen] = useState<{ on: string; forceDark: boolean } | null>(null);
  // /search?q= showing another page underneath (not the /search route itself).
  const overSearchUrl = pathname === "/search" && segment !== "search";

  // Close once the route moves anywhere other than the page it opened on or /search.
  if (open && pathname !== open.on && pathname !== "/search") setOpen(null);

  const close = useCallback(() => setOpen(null), []);

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const { forceDark = false } = (e as CustomEvent<{ forceDark?: boolean }>).detail ?? {};
      setOpen({ on: window.location.pathname, forceDark });
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || !(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
      e.preventDefault();
      const input = document.querySelector<HTMLInputElement>("[data-search-overlay] input");
      if (input) input.focus();
      else setOpen({ on: window.location.pathname, forceDark: false });
    };
    window.addEventListener(OPEN_EVENT, handleOpen);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener(OPEN_EVENT, handleOpen);
      window.removeEventListener("keydown", handleKey);
    };
  }, []);

  if (!open && !overSearchUrl) return null;
  return <SearchOverlay forceDark={open?.forceDark} onClose={close} />;
}
