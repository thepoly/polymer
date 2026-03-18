"use client";

import { useLayoutEffect, useRef, useState, useCallback, useEffect } from "react";
import TransitionLink from "@/components/TransitionLink";

const MIN_SIZE = 28;
const HARD_MIN_SIZE = 20;
const MAX_SIZE = 90;
const OVERLAP_MARGIN = 4;
const FLOAT_BREAKPOINT = 768;
const SECTION_BODY_SELECTOR = "[data-section-body]";
const TOP_BLOCK_SELECTOR = "[data-frontpage-top]";
const PRIMARY_SCOPE_SELECTOR = "[data-header-scope='primary']";
const ANCHOR_SELECTOR = "[data-header-anchor]";
const TEXT_TOP_GAP = 16;
const TEXT_BOTTOM_GAP = 12;
const IMAGE_TOP_INSET = 18; // extra clearance above header when prev content is an image
const IMAGE_BOT_INSET = -5; // let the header tuck a bit closer to the image below
const HEADER_X_OFFSET = -1;
const HEADER_Y_OFFSET_RATIO = 0.06;
const HEADER_LINE_HEIGHT = 0.82;
const LANE_TOLERANCE = 48;
const WIDTH_PADDING = 12;

interface AnchorEdge {
  position: number;
  isImage: boolean;
  element: Element | null;
}

function getAnchorKind(anchor: Element): "image" | "text" {
  return anchor.getAttribute("data-header-anchor") === "image" ? "image" : "text";
}

function getAllAnchors(scope: Element): Element[] {
  return Array.from(scope.querySelectorAll(ANCHOR_SELECTOR)).filter((anchor) => {
    const rect = anchor.getBoundingClientRect();
    return rect.height > 0 && rect.width > 0;
  });
}

function getLaneAnchors(scope: Element): Element[] {
  const anchors = getAllAnchors(scope);
  if (anchors.length === 0) return anchors;

  let minLeft = Infinity;
  for (const anchor of anchors) {
    const rect = anchor.getBoundingClientRect();
    minLeft = Math.min(minLeft, rect.left);
  }

  return anchors.filter((anchor) => {
    const rect = anchor.getBoundingClientRect();
    return rect.left <= minLeft + LANE_TOLERANCE;
  });
}

function getEdge(scope: Element, edge: "top" | "bottom"): AnchorEdge {
  const anchors = getLaneAnchors(scope);
  if (anchors.length === 0) {
    const rect = scope.getBoundingClientRect();
    return {
      position: edge === "top" ? rect.top : rect.bottom,
      isImage: false,
      element: null,
    };
  }

  let selected: Element | null = null;
  let selectedPosition = edge === "top" ? Infinity : -Infinity;

  for (const anchor of anchors) {
    const rect = anchor.getBoundingClientRect();
    if (rect.height <= 0) continue;

    const candidate = edge === "top" ? rect.top : rect.bottom;
    const isBetter = edge === "top"
      ? candidate < selectedPosition
      : candidate > selectedPosition;

    if (isBetter) {
      selected = anchor;
      selectedPosition = candidate;
    }
  }

  if (!selected) {
    const rect = scope.getBoundingClientRect();
    return {
      position: edge === "top" ? rect.top : rect.bottom,
      isImage: false,
      element: null,
    };
  }

  return {
    position: selectedPosition,
    isImage: getAnchorKind(selected) === "image",
    element: selected,
  };
}

function resolveMeasurementRoot(source: Element | null, selector: string): HTMLElement | null {
  if (!source) return null;
  if (source instanceof HTMLElement && source.matches(selector)) return source;
  return source.querySelector<HTMLElement>(selector);
}

function resolveMeasurementScope(source: Element | null, rootSelector: string): HTMLElement | null {
  const root = resolveMeasurementRoot(source, rootSelector);
  if (!root) return null;
  return root.querySelector<HTMLElement>(PRIMARY_SCOPE_SELECTOR) ?? root;
}

function getMaxWidth(
  scope: Element,
  containerLeft: number,
  headerTop: number,
  headerBottom: number,
): number {
  const items = getAllAnchors(scope);
  let leftmostX = Infinity;

  for (const el of items) {
    const rect = el.getBoundingClientRect();
    if (rect.height <= 0) continue;
    if (rect.bottom > headerTop && rect.top < headerBottom) {
      if (rect.left > containerLeft) {
        leftmostX = Math.min(leftmostX, rect.left);
      }
    }
  }

  if (leftmostX === Infinity) return Infinity;
  return leftmostX - containerLeft - 16;
}

function getCanvasContext(): CanvasRenderingContext2D | null {
  const canvas = document.createElement("canvas");
  return canvas.getContext("2d");
}

function measureTextWidth(text: string, fontSize: number): number {
  const ctx = getCanvasContext();
  if (!ctx) return fontSize * text.length * 0.7;
  ctx.font = `bold ${fontSize}px Raleway, sans-serif`;
  return ctx.measureText(text.toUpperCase()).width;
}

function measureFontMetrics(text: string, fontSize: number): {
  topInsetRatio: number;
  bottomExtentRatio: number;
  visualHeightRatio: number;
} {
  const ctx = getCanvasContext();
  if (!ctx) {
    return { topInsetRatio: 0.16, bottomExtentRatio: 1.16, visualHeightRatio: 1 };
  }
  ctx.font = `bold ${fontSize}px Raleway, sans-serif`;
  const metrics = ctx.measureText(text.toUpperCase());
  const ascent = metrics.actualBoundingBoxAscent ?? fontSize * 0.84;
  const descent = metrics.actualBoundingBoxDescent ?? fontSize * 0.16;
  const topInsetRatio = (fontSize - ascent) / fontSize;
  const bottomExtentRatio = (fontSize + descent) / fontSize;
  const visualHeightRatio = (ascent + descent) / fontSize;

  return {
    topInsetRatio: topInsetRatio || 0.16,
    bottomExtentRatio: bottomExtentRatio || 1.16,
    visualHeightRatio: visualHeightRatio || 1,
  };
}

export function DynamicSectionHeader({
  title,
  href,
  mobileOffsetY = 0,
  offsetX = 0,
  offsetY = 0,
}: {
  title: string;
  href: string;
  mobileOffsetY?: number;
  offsetX?: number;
  offsetY?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(MIN_SIZE);
  const [mobileFontSize, setMobileFontSize] = useState(64);
  const [ty, setTy] = useState(0);
  const [isFloating, setIsFloating] = useState(false);

  useEffect(() => {
    const check = () => setIsFloating(window.innerWidth >= FLOAT_BREAKPOINT);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Size mobile header to fill viewport width
  useEffect(() => {
    if (isFloating) return;
    const fit = () => {
      const availableWidth = window.innerWidth;
      const testSize = 100;
      const testWidth = measureTextWidth(title, testSize);
      if (testWidth > 0) {
        const size = (availableWidth / testWidth) * testSize;
        // Add back the bearing offset we subtract in rendering
        const adjusted = (availableWidth + size * 0.06) / testWidth * testSize;
        setMobileFontSize(Math.floor(adjusted));
      }
    };
    fit();
    window.addEventListener("resize", fit);
    document.fonts?.ready.then(fit);
    return () => window.removeEventListener("resize", fit);
  }, [isFloating, title]);

  const calculate = useCallback(() => {
    if (!isFloating) return;

    const el = containerRef.current;
    if (!el) return;

    const wrapper = el.parentElement;
    if (!wrapper) return;

    const prevSource = wrapper.previousElementSibling
      ? resolveMeasurementScope(wrapper.previousElementSibling, SECTION_BODY_SELECTOR)
      : resolveMeasurementScope(wrapper.parentElement?.previousElementSibling ?? null, TOP_BLOCK_SELECTOR);
    const nextSource = resolveMeasurementScope(wrapper, SECTION_BODY_SELECTOR);

    if (!prevSource || !nextSource) {
      setFontSize(MIN_SIZE);
      setTy(0);
      return;
    }

    const aboveEdge = getEdge(prevSource, "bottom");
    const belowEdge = getEdge(nextSource, "top");
    const above = aboveEdge.position;
    const below = belowEdge.position;
    const topPadding = aboveEdge.isImage ? 0 : TEXT_TOP_GAP;
    const bottomPadding = belowEdge.isImage ? 0 : TEXT_BOTTOM_GAP;
    const availableHeight = below - above - topPadding - bottomPadding;

    if (availableHeight <= 0) {
      // No room to float — fall back to a small in-flow header
      setFontSize(HARD_MIN_SIZE);
      setTy(0);
      return;
    }

    const metrics = measureFontMetrics(title, 100);
    const visualHeightRatio = metrics.visualHeightRatio;
    const topInset = aboveEdge.isImage ? IMAGE_TOP_INSET : OVERLAP_MARGIN;
    const botInset = belowEdge.isImage ? IMAGE_BOT_INSET : OVERLAP_MARGIN;
    const paddedAvailableHeight = availableHeight - topInset - botInset;
    let newSize = Math.max(
      MIN_SIZE,
      Math.min(MAX_SIZE, paddedAvailableHeight / Math.max(visualHeightRatio, 0.01)),
    );
    const containerRect = el.getBoundingClientRect();
    const belowRect = belowEdge.element?.getBoundingClientRect();
    const estimatedHeight = newSize * HEADER_LINE_HEIGHT;
    const minTop = above + topPadding + topInset;
    const maxTop = below - bottomPadding - estimatedHeight - botInset;

    // Perch: if below is image, sit right above it. Otherwise sit right after the content above.
    const estimatedTargetTop = belowEdge.isImage
      ? below - estimatedHeight
      : above;
    const estimatedFinalTop = Math.min(
      maxTop,
      Math.max(minTop, estimatedTargetTop + newSize * HEADER_Y_OFFSET_RATIO),
    );

    // Check width against both previous and next section content
    let availableWidth = getMaxWidth(
      prevSource, containerRect.left, estimatedFinalTop, estimatedFinalTop + estimatedHeight,
    );
    availableWidth = Math.min(
      availableWidth,
      getMaxWidth(nextSource, containerRect.left, estimatedFinalTop, estimatedFinalTop + estimatedHeight),
    );

    if (belowRect) {
      const laneWidthLimit = Math.max(0, belowRect.right - containerRect.left - WIDTH_PADDING);
      if (laneWidthLimit > 0) {
        availableWidth = Math.min(availableWidth, laneWidthLimit);
      }
    }

    if (availableWidth < Infinity) {
      const estimatedWidth = measureTextWidth(title, newSize);
      if (estimatedWidth > availableWidth) {
        newSize = Math.max(HARD_MIN_SIZE, newSize * (availableWidth / estimatedWidth));
      }
    }

    setFontSize(newSize);

    // Second pass: measure actual rendered heading to get precise positioning
    requestAnimationFrame(() => {
      const heading = headingRef.current;
      const wrapperEl = containerRef.current;
      if (!heading || !wrapperEl) return;

      const headingRect = heading.getBoundingClientRect();
      const wrapperRect = wrapperEl.getBoundingClientRect();
      const renderedTopInset = aboveEdge.isImage ? IMAGE_TOP_INSET : OVERLAP_MARGIN;
      const renderedBotInset = belowEdge.isImage ? IMAGE_BOT_INSET : OVERLAP_MARGIN;
      const renderedMinTop = above + topPadding + renderedTopInset;
      const renderedMaxTop = below - bottomPadding - headingRect.height - renderedBotInset;
      const visualBias = newSize * HEADER_Y_OFFSET_RATIO;

      // Perch: if below is image, sit right above it. Otherwise sit right after the content above.
      const targetTop = belowEdge.isImage
        ? below - headingRect.height
        : above;
      // Clamp to prevent overlap with content above and below
      const finalTop = Math.min(renderedMaxTop, Math.max(renderedMinTop, targetTop + visualBias));
      setTy(finalTop - wrapperRect.top + offsetY);
    });
  }, [title, isFloating, offsetY]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    requestAnimationFrame(calculate);
    const fontReady = typeof document !== "undefined" && "fonts" in document
      ? document.fonts.ready.then(() => requestAnimationFrame(calculate))
      : null;

    const observer = new ResizeObserver(() => requestAnimationFrame(calculate));
    const wrapper = el.parentElement;
    const prev = wrapper?.previousElementSibling
      ? resolveMeasurementScope(wrapper.previousElementSibling, SECTION_BODY_SELECTOR)
      : resolveMeasurementScope(wrapper?.parentElement?.previousElementSibling ?? null, TOP_BLOCK_SELECTOR);
    const next = resolveMeasurementScope(wrapper, SECTION_BODY_SELECTOR);
    if (prev) observer.observe(prev);
    if (next) observer.observe(next);

    window.addEventListener("resize", calculate);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", calculate);
      void fontReady;
    };
  }, [calculate]);

  if (!isFloating) {
    return (
      <div
        ref={mobileRef}
        className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen overflow-hidden"
        style={{ marginBottom: `-${mobileFontSize * 0.095}px`, marginTop: mobileOffsetY || offsetY ? `${mobileOffsetY + offsetY}px` : undefined }}
      >
        <TransitionLink href={href} className="group block">
          <h2
            className="font-meta font-bold uppercase tracking-[0.02em] leading-[0.82] text-[#D6001C] dark:text-white group-hover:text-[#D6001C] dark:group-hover:text-white whitespace-nowrap"
            style={{ fontSize: `${mobileFontSize}px`, marginLeft: `${-mobileFontSize * 0.06 + offsetX}px` }}
          >
            {title}
          </h2>
        </TransitionLink>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ height: 0, overflow: "visible", position: "relative" }}
    >
      <div style={{ transform: `translate(${HEADER_X_OFFSET + offsetX}px, ${ty}px)`, marginLeft: `-${fontSize * 0.06}px` }}>
        <TransitionLink href={href} className="group inline-block">
          <h2
            ref={headingRef}
            className="font-meta font-bold uppercase tracking-[0.02em] leading-[0.82] text-[#D6001C] dark:text-white group-hover:text-[#D6001C] dark:group-hover:text-white"
            style={{ fontSize: `${fontSize}px` }}
          >
            {title}
          </h2>
        </TransitionLink>
      </div>
    </div>
  );
}
