'use client';

import { useEffect, useState } from 'react';
import Peephole, { type PagePhoto } from './Peephole';

export default function CopyButton({ value, targetId, photo, label = 'Copy news desk email address' }: { value: string; targetId: string; photo: PagePhoto; label?: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'selected' | 'error'>('idle');

  useEffect(() => {
    if (status !== 'copied') return;
    const timer = window.setTimeout(() => setStatus('idle'), 1600);
    return () => window.clearTimeout(timer);
  }, [status]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setStatus('copied');
    } catch {
      const target = document.getElementById(targetId);
      const selection = window.getSelection();
      if (target && selection) {
        const range = document.createRange();
        range.selectNodeContents(target);
        selection.removeAllRanges();
        selection.addRange(range);
        setStatus('selected');
      } else {
        setStatus('error');
      }
    }
  };

  return (
    <>
      {/* An opening onto the page photo. The white edge keeps it distinct
          inside the news tip box, which is an opening onto the same photo. */}
      <button type="button" onClick={copy} aria-label={label} className="group relative min-h-11 min-w-[84px] cursor-pointer border border-white/70 px-3 font-meta text-[12px] font-bold uppercase tracking-[0.08em] text-white focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2">
        <Peephole photo={photo} scrim="bg-black/35 group-hover:bg-white" />
        <span className="relative z-10 transition-colors group-hover:text-black">{status === 'copied' ? 'Copied' : 'Copy'}</span>
      </button>
      <span role="status" className="sr-only">
        {status === 'copied' ? 'Email address copied.' : status === 'selected' ? 'Email address selected. Use your copy command to copy it.' : status === 'error' ? 'Could not copy automatically. Select the email address to copy it.' : ''}
      </span>
    </>
  );
}
