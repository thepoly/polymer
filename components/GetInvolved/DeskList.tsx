'use client';

import { useRef } from 'react';
import { Minus, Plus } from 'lucide-react';
import { useDetailsAccordion } from '@/components/useDetailsAccordion';

const desks = [
  { name: 'News', summary: 'Student government and admin', body: 'Cover Senate and E-Board meetings, interview administrators, and chase breaking news.', email: 'news@poly.rpi.edu' },
  { name: 'Features', summary: 'Arts, events, and Troy', body: 'Write about campus and club events, cover concerts, or find the best coffee in Troy.', email: 'features@poly.rpi.edu' },
  { name: 'Sports', summary: 'Game coverage, athletes', body: 'Recap games, preview matchups and follow the Engineers through the season.', email: 'sports@poly.rpi.edu' },
  { name: 'Opinion', summary: 'Editorials and essays', body: "Take a position on campus issues, review what you're reading or watching, or write for the Editorial Notebook.", email: 'edop@poly.rpi.edu' },
  { name: 'Photo', summary: 'Assignments and galleries', body: 'Games, events and portraits for stories and galleries.', email: 'photo@poly.rpi.edu' },
];

export default function DeskList() {
  const listRef = useRef<HTMLDivElement>(null);

  useDetailsAccordion(listRef, 'get-involved-desks');

  return (
    <div ref={listRef} className="mt-6 border-t border-rule-strong">
      {desks.map(desk => (
        <details key={desk.name} name="get-involved-desks" className="group border-b border-rule">
          <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 py-3 text-text-main focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden">
            <span className="font-copy text-[20px] leading-tight">{desk.name}</span>
            <span className="ml-auto hidden font-meta text-[13px] leading-snug text-text-muted md:block">{desk.summary}</span>
            <span aria-hidden="true" className="ml-auto shrink-0 text-accent md:ml-1">
              <Plus className="h-4 w-4 group-open:hidden" />
              <Minus className="hidden h-4 w-4 group-open:block" />
            </span>
          </summary>
          <div className="pb-4">
            <p className="font-copy text-[18px] leading-[1.55] text-text-main">{desk.body}</p>
            <a href={`mailto:${desk.email}`} className="mt-1 inline-flex min-h-11 max-w-full items-center font-meta text-[13px] font-semibold text-accent underline underline-offset-4 [overflow-wrap:anywhere] focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2">
              {desk.email}
            </a>
          </div>
        </details>
      ))}
    </div>
  );
}
