import React from "react";
import TransitionLink from "@/components/TransitionLink";
import type { Article as ComponentArticle } from "@/components/FrontPage/types";

/**
 * A story's authors joined with "&". Staff names link to their profiles;
 * write-ins stay plain text.
 */
export default function SportsByline({
  article,
  linkClassName,
  nameClassName,
}: {
  article: ComponentArticle;
  linkClassName: string;
  /** For names without a profile; left unwrapped when not given */
  nameClassName?: string;
}) {
  const authors = article.authorLinks?.length
    ? article.authorLinks
    : article.author
      ? [{ name: article.author, href: null }]
      : [];
  return (
    <>
      {authors.map((a, i) => (
        <React.Fragment key={i}>
          {i > 0 && " & "}
          {a.href ? (
            // z-10 lifts the link above the card's stretched title link
            <TransitionLink href={a.href} className={`relative z-10 ${linkClassName}`}>
              {a.name}
            </TransitionLink>
          ) : nameClassName ? (
            <span className={nameClassName}>{a.name}</span>
          ) : (
            a.name
          )}
        </React.Fragment>
      ))}
    </>
  );
}
