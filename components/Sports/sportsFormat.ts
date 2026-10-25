import type { Article as ComponentArticle } from "@/components/FrontPage/types";
import { sportLabel } from "@/lib/sports";

// Fixed to Troy's time zone so the server render and the browser agree
export const shortDate = (article: ComponentArticle, withYear = false) => {
  const iso = article.publishedDate || article.createdAt;
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    ...(withYear && { year: "numeric" }),
  });
};

/** The story's sport ("Men's Hockey"); kicker for stories not labelled yet */
export const sportName = (article: ComponentArticle) => sportLabel(article.sport) ?? article.kicker;

/**
 * Editors' framing of each featured card's photo, by article id, as
 * object-position percentages. Set by dragging the photo in the sports layout
 * editor; a card without one uses the photo's focal point.
 */
export type FeaturedFocus = Record<string, { x: number; y: number }>;

export const FEATURED_COUNT = 7;

/** Where a card's photo is framed: the editor's choice, else its focal point */
export const cardPosition = (article: ComponentArticle, focus: FeaturedFocus) => {
  const custom = focus[String(article.id)];
  return custom ? `${custom.x}% ${custom.y}%` : article.imageFocus || "50% 50%";
};
