"use client";

import React from "react";
import TransitionLink from "@/components/TransitionLink";

export interface QuoteData {
  text: string;
  articleTitle: string;
  articleUrl: string;
}

export default function InlineQuote({ quote }: { quote: QuoteData }) {
  return (
    <blockquote className="my-10 py-8 border-y border-rule text-center">
      <p className="font-copy text-[22px] md:text-[26px] italic leading-[1.35] text-text-main max-w-[680px] mx-auto">
        &ldquo;{quote.text}&rdquo;
      </p>
      <cite className="mt-3 block not-italic">
        <TransitionLink
          href={quote.articleUrl}
          className="font-meta text-[12px] font-medium tracking-[0.04em] text-text-muted transition-colors hover:text-accent"
        >
          &mdash; {quote.articleTitle}
        </TransitionLink>
      </cite>
    </blockquote>
  );
}
