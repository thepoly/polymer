import { useEffect, useState, type RefObject } from "react";

/**
 * Where a sideways-scrolling row stands: whether more is cut off at either
 * edge, and the part in view as fractions of its full width.
 */
export function useScrollEdges(ref: RefObject<HTMLElement | null>) {
  const [state, setState] = useState({ left: false, right: false, start: 0, size: 1 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () =>
      setState({
        left: el.scrollLeft > 2,
        right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2,
        start: el.scrollLeft / el.scrollWidth,
        size: el.clientWidth / el.scrollWidth,
      });
    // Fires once on observe, then on every resize
    const observer = new ResizeObserver(update);
    observer.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, [ref]);

  return state;
}
