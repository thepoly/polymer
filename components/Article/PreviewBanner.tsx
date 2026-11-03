'use client';

import { useState } from 'react';
import Link from 'next/link';

type Props = {
  articleId: number;
  /** Whether the version being shown is the live one or a draft ahead of it. */
  status: 'draft' | 'published';
  updatedAt: string;
};

/**
 * The strip across the top of a draft preview. It says what is being looked
 * at, links back to the editor, and copies the preview link for passing
 * around — the link works for anyone with a newsroom login.
 */
export function PreviewBanner({ articleId, status, updatedAt }: Props) {
  const [copied, setCopied] = useState(false);

  const saved = new Date(updatedAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access is denied in some embedded browsers; the address bar
      // still has the link.
    }
  };

  return (
    <div
      role="status"
      className="sticky top-0 z-[60] flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-[#1f4d2e] px-4 py-2 font-meta text-[11px] font-semibold uppercase tracking-[0.12em] text-white"
    >
      <span className="rounded-full bg-white/15 px-2 py-0.5">Preview</span>
      <span className="opacity-90">
        {status === 'published' ? 'Latest saved version' : 'Unpublished draft'}
        {' · '}saved {saved}
      </span>
      <span className="opacity-90">Only visible to people signed in to the newsroom</span>
      <span className="flex items-center gap-3">
        <button
          type="button"
          onClick={copyLink}
          className="underline underline-offset-2 hover:opacity-80 transition-opacity"
        >
          {copied ? 'Link copied' : 'Copy link'}
        </button>
        <Link
          href={`/newsroom/collections/articles/${articleId}`}
          className="underline underline-offset-2 hover:opacity-80 transition-opacity"
        >
          Back to editor
        </Link>
      </span>
    </div>
  );
}
