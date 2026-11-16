import type { Article as ComponentArticle } from "@/components/FrontPage/types";
import { sportKicker, sportLabel } from "@/lib/sports";
import type { FeaturedFocus } from "@/lib/sportsLayout";
import { TROY_TIME_ZONE } from "@/lib/troyTime";

// Fixed to Troy's time zone so the server render and the browser agree
export const shortDate = (article: ComponentArticle, withYear = false) => {
  const iso = article.publishedDate || article.createdAt;
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: TROY_TIME_ZONE,
    month: "short",
    day: "numeric",
    ...(withYear && { year: "numeric" }),
  });
};

/**
 * The story's label on the sports pages: its sport ("Men's Hockey"), else its
 * kicker. The "General" option's own name, which used to be filled in as the
 * kicker, isn't a label.
 */
export const sportName = (article: ComponentArticle) =>
  sportKicker(article.sport) ?? (article.kicker === sportLabel("general") ? null : article.kicker);

/** Where a card's photo is framed: the editor's choice, else its focal point */
export const cardPosition = (article: ComponentArticle, focus: FeaturedFocus) => {
  const custom = focus[String(article.id)];
  return custom ? `${custom.x}% ${custom.y}%` : article.imageFocus || "50% 50%";
};
