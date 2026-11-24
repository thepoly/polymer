import React from "react";
import type { Article as ComponentArticle } from "@/components/FrontPage/types";
import { joinNames } from "@/utils/joinNames";

/**
 * "By A, B and C" on a Sports card. Names are plain text, as on every card:
 * the card links to the story, and profiles are linked from the article
 * header. "By" and the separators take the surrounding (muted) colour.
 */
export default function SportsByline({
  article,
  nameClassName,
}: {
  article: ComponentArticle;
  nameClassName: string;
}) {
  const authors = article.authorLinks?.length
    ? article.authorLinks
    : [{ name: article.author || "The Polytechnic" }];
  return (
    <>
      {"By "}
      {joinNames(authors).map(({ item: a, sep }, i) => (
        <React.Fragment key={i}>
          {sep}
          <span className={nameClassName}>{a.name}</span>
        </React.Fragment>
      ))}
    </>
  );
}
