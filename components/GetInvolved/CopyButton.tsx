'use client';

import { useEffect, useState } from 'react';

export default function CopyButton({ value, targetId }: { value: string; targetId: string }) {
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
      <button type="button" onClick={copy} aria-label="Copy news desk email address" className="min-h-11 min-w-[84px] cursor-pointer border border-rule bg-bg-main px-3 font-meta text-[12px] font-bold uppercase tracking-[0.08em] text-text-main hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2">
        {status === 'copied' ? 'Copied' : 'Copy'}
      </button>
      <span role="status" className="sr-only">
        {status === 'copied' ? 'Email address copied.' : status === 'selected' ? 'Email address selected. Use your copy command to copy it.' : status === 'error' ? 'Could not copy automatically. Select the email address to copy it.' : ''}
      </span>
    </>
  );
}
