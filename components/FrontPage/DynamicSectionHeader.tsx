"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";

const MIN_SIZE = 28;
const MAX_SIZE = 96;

// Use leaf content elements, not <a> tags which may be stretched containers (e.g. h-full)
const CONTENT_SELECTOR = "h2, h3, h4, p, img, figcaption, li, span";

function getShortestColumnBottom(container: Element): number {
  const grids = container.querySelectorAll("[class*='grid-cols']");

  for (const grid of grids) {
    const children = Array.from(grid.children) as HTMLElement[];
    if (children.length < 2) continue;

    let minBottom = Infinity;
    for (const child of children) {
      const rect = child.getBoundingClientRect();
      if (rect.height > 0) {
        minBottom = Math.min(minBottom, rect.bottom);
      }
    }
    if (minBottom !== Infinity) return minBottom;
  }

  return container.getBoundingClientRect().bottom;
}

interface ColumnEdge {
  position: number;
  isImage: boolean;
}

function getLeftColumnBottom(container: Element): ColumnEdge {
  const items = container.querySelectorAll(CONTENT_SELECTOR);
  if (items.length === 0) return { position: container.getBoundingClientRect().bottom, isImage: false };

  const containerRect = container.getBoundingClientRect();
  const midpoint = containerRect.left + containerRect.width / 3;

  let lowest = -Infinity;
  let lowestEl: Element | null = null;
  for (const el of items) {
    const rect = el.getBoundingClientRect();
    if (rect.height > 0 && rect.left < midpoint && rect.bottom > lowest) {
      lowest = rect.bottom;
      lowestEl = el;
    }
  }

  if (lowest === -Infinity) return { position: container.getBoundingClientRect().bottom, isImage: false };

  const isImage = lowestEl?.tagName === "IMG" ||
    lowestEl?.closest("figure") !== null ||
    lowestEl?.querySelector("img") !== null;

  return { position: lowest, isImage };
}

function getLeftColumnTop(container: Element): ColumnEdge {
  const items = container.querySelectorAll(CONTENT_SELECTOR);
  if (items.length === 0) return { position: container.getBoundingClientRect().top, isImage: false };

  const containerRect = container.getBoundingClientRect();
  const midpoint = containerRect.left + containerRect.width / 3;

  let highest = Infinity;
  let highestEl: Element | null = null;
  for (const el of items) {
    const rect = el.getBoundingClientRect();
    if (rect.height > 0 && rect.left < midpoint && rect.top < highest) {
      highest = rect.top;
      highestEl = el;
    }
  }

  if (highest === Infinity) return { position: container.getBoundingClientRect().top, isImage: false };

  const isImage = highestEl?.tagName === "IMG" ||
    highestEl?.closest("figure") !== null ||
    highestEl?.querySelector("img") !== null;

  return { position: highest, isImage };
}

/**
 * Find the maximum width the header can be without overlapping content
 * in the previous section at the given vertical range.
 */
function getMaxWidth(
  prev: Element,
  containerLeft: number,
  headerTop: number,
  headerBottom: number,
): number {
  const items = prev.querySelectorAll(CONTENT_SELECTOR);
  let leftmostX = Infinity;

  for (const el of items) {
    const rect = el.getBoundingClientRect();
    if (rect.height <= 0) continue;
    // Check if this element vertically overlaps with the header position
    if (rect.bottom > headerTop && rect.top < headerBottom) {
      // This element is at the same vertical level — check if it's to the right
      if (rect.left > containerLeft) {
        leftmostX = Math.min(leftmostX, rect.left);
      }
    }
  }

  if (leftmostX === Infinity) return Infinity;
  // Leave a small gap so text doesn't butt up against content
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
  ctx.letterSpacing = `${fontSize * 0.02}px`;
  return ctx.measureText(text.toUpperCase()).width;
}

/** Measure the font metrics for uppercase text — returns the ratio of visual cap height to font-size, and the top offset. */
function measureFontMetrics(text: string, fontSize: number): { capRatio: number; topOffset: number } {
  const ctx = getCanvasContext();
  if (!ctx) return { capRatio: 0.72, topOffset: 0.12 };
  ctx.font = `bold ${fontSize}px Raleway, sans-serif`;
  const metrics = ctx.measureText(text.toUpperCase());
  const ascent = metrics.actualBoundingBoxAscent ?? fontSize * 0.84;
  const descent = metrics.actualBoundingBoxDescent ?? fontSize * 0.16;
  const visualHeight = ascent + descent;
  const capRatio = visualHeight / fontSize;
  // topOffset = fraction of fontSize that's empty above the visual top of letters
  const topOffset = (fontSize - ascent) / fontSize;
  return { capRatio: capRatio || 0.72, topOffset: topOffset || 0.12 };
}

export function DynamicSectionHeader({ title, href }: { title: string; href: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(MIN_SIZE);
  const [ty, setTy] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const calculate = () => {
      const wrapper = el.parentElement;
      if (!wrapper) return;

      const prevWrapper = wrapper.previousElementSibling as HTMLElement | null;
      const nextSection = el.nextElementSibling as HTMLElement | null;

      const prev = prevWrapper || wrapper.parentElement?.previousElementSibling as HTMLElement | null;
      if (!prev || !nextSection) {
        setFontSize(MIN_SIZE);
        setTy(0);
        return;
      }

      const aboveEdge = getLeftColumnBottom(prev);
      const belowEdge = getLeftColumnTop(nextSection);
      const above = aboveEdge.position;
      const below = belowEdge.position;
      const gap = below - above;

      if (gap <= 0) {
        setFontSize(MIN_SIZE);
        setTy(0);
        return;
      }

      const betweenImages = aboveEdge.isImage && belowEdge.isImage;

      let newSize: number;
      let finalTargetTop: number;

      if (betweenImages) {
        // Scale font so the visual cap height fills the gap exactly
        const { capRatio, topOffset } = measureFontMetrics(title, 100);
        newSize = gap / (capRatio * 0.85);

        // Check horizontal fit
        const containerLeft = el.getBoundingClientRect().left;
        const estTop = above - newSize * topOffset;
        const availableWidth = getMaxWidth(prev, containerLeft, estTop, estTop + newSize);
        if (availableWidth < Infinity) {
          const textWidth = measureTextWidth(title, newSize);
          if (textWidth > availableWidth) {
            newSize = Math.max(MIN_SIZE, newSize * (availableWidth / textWidth));
          }
        }

        // Offset upward so the visual top of letters touches the image above
        // topOffset is the fraction of empty space above the glyphs in the line box
        finalTargetTop = above - newSize * topOffset * 0.5;
      } else {
        newSize = Math.max(MIN_SIZE, Math.min(MAX_SIZE, gap * 0.95));

        const containerLeft = el.getBoundingClientRect().left;
        const estTop = above + (gap - newSize) * 0.5;
        const availableWidth = getMaxWidth(prev, containerLeft, estTop, estTop + newSize);
        if (availableWidth < Infinity) {
          const textWidth = measureTextWidth(title, newSize);
          if (textWidth > availableWidth) {
            newSize = Math.max(MIN_SIZE, newSize * (availableWidth / textWidth));
          }
        }

        finalTargetTop = above + (gap - newSize) * 0.5;
      }

      const elTop = el.getBoundingClientRect().top;

      setFontSize(newSize);
      setTy(finalTargetTop - elTop);
    };

    requestAnimationFrame(calculate);
    const timer = setTimeout(calculate, 500);

    const observer = new ResizeObserver(() => requestAnimationFrame(calculate));
    const wrapper = el.parentElement;
    const prevWrapper = wrapper?.previousElementSibling;
    const heroCandidate = wrapper?.parentElement?.previousElementSibling;
    const prev = prevWrapper || heroCandidate;
    if (prev) observer.observe(prev);
    if (el.nextElementSibling) observer.observe(el.nextElementSibling);

    window.addEventListener("resize", calculate);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", calculate);
      clearTimeout(timer);
    };
  }, [title]);

  return (
    <div
      ref={containerRef}
      style={{ height: 0, overflow: "visible", position: "relative", zIndex: 10 }}
    >
      <div style={{ transform: `translateY(${ty}px)`, marginLeft: `-${fontSize * 0.06}px` }}>
        <Link href={href} className="group inline-block">
          <h2
            className="font-meta font-bold uppercase tracking-[0.02em] leading-none text-accent group-hover:text-accent/70"
            style={{ fontSize: `${fontSize}px` }}
          >
            {title}
          </h2>
        </Link>
      </div>
    </div>
  );
}
