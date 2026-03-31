import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Article, Media, User } from '@/payload-types';

type WriteInAuthor = {
  name: string;
  photo?: Media | number | null;
};

type Props = {
  article: Article;
  maxWidthClassName?: string;
  showDate?: boolean;
};

export const ArticleByline: React.FC<Props> = ({
  article,
  maxWidthClassName = 'max-w-[680px]',
  showDate = true
}) => {
  const staffAuthors = (article.authors || []).filter((a): a is User => typeof a !== 'number');
  const writeInAuthors = ((article as unknown as Record<string, unknown>).writeInAuthors || []) as WriteInAuthor[];
  const totalAuthors = staffAuthors.length + writeInAuthors.length;
  const hasAnyAuthor = totalAuthors > 0;

  // Desktop sentence format for 4+ authors
  const useDesktopSentence = totalAuthors >= 4;
  // Mobile stack (beneath photo block, no dividers) for 2+ authors
  const useMobileStack = totalAuthors >= 2;

  const staffPhotos = staffAuthors.filter((user) => {
    const headshot = user.headshot as Media | null;
    return headshot?.url;
  });
  const writeInPhotos = writeInAuthors.filter((writeIn) => {
    const photo = writeIn.photo && typeof writeIn.photo !== 'number' ? writeIn.photo as Media : null;
    return photo?.url;
  });
  const hasPhotos = staffPhotos.length > 0 || writeInPhotos.length > 0;

  const headshotsEl = hasPhotos ? (
    <div className="flex -space-x-2 shrink-0">
      {staffPhotos.map((user) => {
        const headshot = user.headshot as Media;
        return (
          <Link
            href={`/staff/${user.slug || user.id}`}
            key={user.id}
            className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-100 dark:bg-zinc-800 border-2 border-bg-main transition-colors hover:border-accent z-10 hover:z-20"
          >
            <Image
              src={headshot.url!}
              alt={`${user.firstName} ${user.lastName}`}
              fill
              className="object-cover"
            />
          </Link>
        );
      })}
      {writeInPhotos.map((writeIn, i) => {
        const photo = writeIn.photo as Media;
        return (
          <div
            key={`write-in-${i}`}
            className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-100 dark:bg-zinc-800 border-2 border-bg-main transition-colors z-10"
          >
            <Image
              src={photo.url!}
              alt={writeIn.name}
              fill
              className="object-cover"
            />
          </div>
        );
      })}
    </div>
  ) : null;

  const enrichedStaff = staffAuthors.map((user) => {
    const pos = user.positions?.find((p) => !(p as Record<string, unknown>).endDate) ?? user.positions?.[0];
    const jobTitle = (pos as Record<string, unknown> | undefined)?.jobTitle;
    const title = typeof jobTitle === 'object' && jobTitle
      ? ((jobTitle as Record<string, unknown>).title as string | undefined) ?? null
      : null;
    return { user, title };
  });

  const nameStyle = "font-meta text-[14px] md:text-[15px] font-[440] tracking-[0.08em] text-accent dark:text-white transition-colors";
  const titleStyle = "font-meta text-[11px] md:text-[12px] font-normal italic text-text-main mt-0.5 transition-colors";

  let namesEl: React.ReactNode;

  if (!hasAnyAuthor) {
    namesEl = (
      <div className={nameStyle}>
        By <em>The Polytechnic</em> Editorial Board
      </div>
    );
  } else if (useDesktopSentence) {
    // Desktop 4+: sentence inline — "By Name, Name, and Name"
    // Mobile 4+ (also >= 2): stacked list
    const allAuthors: React.ReactNode[] = [
      ...enrichedStaff.map(({ user }) => (
        <Link key={user.id} href={`/staff/${user.slug || user.id}`} className="hover:text-accent/70 dark:hover:text-white/75 transition-colors">
          {user.firstName} {user.lastName}
        </Link>
      )),
      ...writeInAuthors.map((writeIn, i) => (
        <span key={`wi-${i}`}>{writeIn.name}</span>
      )),
    ];

    // Mobile: stacked (no dividers, with titles)
    const mobileStack = (
      <div className="flex flex-col gap-1.5">
        {enrichedStaff.map(({ user, title }) => (
          <div key={user.id}>
            <div className={nameStyle}>
              <Link href={`/staff/${user.slug || user.id}`} className="hover:text-accent/70 dark:hover:text-white/75 transition-colors">
                {user.firstName} {user.lastName}
              </Link>
            </div>
            {title && <p className={titleStyle}>{title}</p>}
          </div>
        ))}
        {writeInAuthors.map((writeIn, i) => (
          <div key={`wi-${i}`}>
            <div className={nameStyle}>{writeIn.name}</div>
          </div>
        ))}
      </div>
    );

    // Desktop: sentence
    const desktopSentence = (
      <div className={nameStyle}>
        By{' '}
        {allAuthors.map((node, i) => (
          <React.Fragment key={i}>
            {i > 0 && i === allAuthors.length - 1 ? ', and ' : i > 0 ? ', ' : ''}
            {node}
          </React.Fragment>
        ))}
      </div>
    );

    namesEl = (
      <>
        <div className="md:hidden">{mobileStack}</div>
        <div className="hidden md:block">{desktopSentence}</div>
      </>
    );
  } else {
    // 1–3 authors: use divider layout on desktop, stack on mobile if 2–3
    const hasTitles = enrichedStaff.some((a) => a.title);

    if (hasTitles) {
      // Desktop: divider row; Mobile 2–3: stacked no dividers; Mobile 1: same as desktop
      const dividerRow = (
        <div className="flex flex-row flex-wrap items-stretch gap-y-1">
          {enrichedStaff.map(({ user, title }, index) => (
            <React.Fragment key={user.id}>
              {index > 0 && (
                <div className="w-px bg-rule-strong mx-4 self-stretch" />
              )}
              <div>
                <div className={nameStyle}>
                  <Link href={`/staff/${user.slug || user.id}`} className="hover:text-accent/70 dark:hover:text-white/75 transition-colors">
                    {user.firstName} {user.lastName}
                  </Link>
                </div>
                {title && <p className={titleStyle}>{title}</p>}
              </div>
            </React.Fragment>
          ))}
          {writeInAuthors.map((writeIn, i) => (
            <React.Fragment key={`write-in-${i}`}>
              <div className="w-px bg-rule-strong mx-4 self-stretch" />
              <div>
                <div className={nameStyle}>{writeIn.name}</div>
              </div>
            </React.Fragment>
          ))}
        </div>
      );

      if (useMobileStack) {
        const mobileStack = (
          <div className="flex flex-col gap-1.5">
            {enrichedStaff.map(({ user, title }) => (
              <div key={user.id}>
                <div className={nameStyle}>
                  <Link href={`/staff/${user.slug || user.id}`} className="hover:text-accent/70 dark:hover:text-white/75 transition-colors">
                    {user.firstName} {user.lastName}
                  </Link>
                </div>
                {title && <p className={titleStyle}>{title}</p>}
              </div>
            ))}
            {writeInAuthors.map((writeIn, i) => (
              <div key={`wi-${i}`}>
                <div className={nameStyle}>{writeIn.name}</div>
              </div>
            ))}
          </div>
        );
        namesEl = (
          <>
            <div className="md:hidden">{mobileStack}</div>
            <div className="hidden md:block">{dividerRow}</div>
          </>
        );
      } else {
        namesEl = dividerRow;
      }
    } else {
      // No titles: comma-separated inline names (both mobile and desktop)
      const allNames: React.ReactNode[] = [];
      enrichedStaff.forEach(({ user }) => {
        allNames.push(
          <React.Fragment key={user.id}>
            <Link href={`/staff/${user.slug || user.id}`} className="hover:text-accent/70 transition-colors">
              {user.firstName} {user.lastName}
            </Link>
          </React.Fragment>
        );
      });
      writeInAuthors.forEach((writeIn, i) => {
        allNames.push(
          <React.Fragment key={`write-in-${i}`}>
            <span>{writeIn.name}</span>
          </React.Fragment>
        );
      });

      namesEl = (
        <div className={nameStyle}>
          {allNames.map((node, index) => (
            <React.Fragment key={index}>
              {index > 0 && index === allNames.length - 1 ? ' & ' : index > 0 ? ', ' : ''}
              {node}
            </React.Fragment>
          ))}
        </div>
      );
    }
  }

  return (
    <div className={`flex flex-col gap-3 py-4 border-b border-rule-strong ${maxWidthClassName} w-full mx-auto transition-colors`}>
      <div className={`${useMobileStack ? 'flex flex-col gap-3 md:flex-row md:items-center md:gap-3' : 'flex items-center gap-3'}`}>
        {headshotsEl}
        {namesEl}
      </div>
      {showDate && (
        <div className="font-meta text-[11px] font-medium tracking-[0.06em] text-text-muted">
          {article.publishedDate ? new Date(article.publishedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
        </div>
      )}
    </div>
  );
};
