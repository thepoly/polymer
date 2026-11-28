import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Article, Media, User } from '@/payload-types';
import { joinNames } from '@/utils/joinNames';
import { getArticleAuthors, isStaffEditorial, staffHref, staffName } from '@/utils/articleAuthors';
import { longDate } from '@/utils/articleDates';
import { BYLINE_META_CLASS } from '@/components/FrontPage/Byline';

type Props = {
  article: Article;
  maxWidthClassName?: string;
  showDate?: boolean;
};

type Person = {
  key: string;
  name: string;
  href: string | null;
  title: string | null;
  photo: string | null;
};

/** The user's current job title: an open position first, else the first one */
const currentTitle = (user: User): string | null => {
  const pos = user.positions?.find((p) => !p.endDate) ?? user.positions?.[0];
  const jobTitle = pos?.jobTitle;
  return typeof jobTitle === 'object' && jobTitle ? jobTitle.title ?? null : null;
};

const mediaUrl = (media: unknown): string | null =>
  media && typeof media === 'object' ? (media as Media).url ?? null : null;

const staffPerson = (user: User): Person => ({
  key: `staff-${user.id}`,
  name: staffName(user),
  href: staffHref(user),
  title: currentTitle(user),
  photo: mediaUrl(user.headshot),
});

/**
 * The featured image's photographer, unless they're already an author: a
 * writer who shot their own photos appears once.
 */
const getPhotographer = (article: Article, authors: Person[]): Person | null => {
  const media = article.featuredImage;
  if (!media || typeof media === 'number') return null;
  let person: Person | null = null;
  if (media.photographer && typeof media.photographer === 'object') {
    person = staffPerson(media.photographer);
  } else if (media.writeInPhotographer?.trim()) {
    const name = media.writeInPhotographer.trim();
    person = { key: 'photo-write-in', name, href: null, title: null, photo: null };
  }
  if (!person) return null;
  const sameName = (a: Person) => a.name.toLowerCase() === person!.name.toLowerCase();
  if (authors.some((a) => a.key === person!.key || sameName(a))) return null;
  return person;
};

// Muted "By", ink names at 600, no accent: red on the page belongs to the kicker
const lineStyle = `font-meta text-[15px] md:text-[16px] font-normal leading-[1.4] tracking-[0.01em] ${BYLINE_META_CLASS} transition-colors`;
const nameStyle = 'font-semibold text-text-main';
const linkStyle = `${nameStyle} underline decoration-rule decoration-1 underline-offset-[3px] transition-colors hover:text-accent hover:decoration-current`;
const titleStyle = `font-meta text-[13px] font-normal leading-[1.3] ${BYLINE_META_CLASS} mt-0.5 transition-colors`;

const Name = ({ person }: { person: Person }) =>
  person.href ? (
    <Link href={person.href} className={linkStyle}>
      {person.name}
    </Link>
  ) : (
    <span className={nameStyle}>{person.name}</span>
  );

/** "By A, B and C" */
const NamesSentence = ({ prefix, people }: { prefix: string; people: Person[] }) => (
  <div className={lineStyle}>
    {prefix}{' '}
    {joinNames(people).map(({ item, sep }) => (
      <React.Fragment key={item.key}>
        {sep}
        <Name person={item} />
      </React.Fragment>
    ))}
  </div>
);

/** One person with their role and job title below */
const PersonBlock = ({ prefix, person }: { prefix: string | null; person: Person }) => (
  <div>
    <div className={lineStyle}>
      {prefix && <>{prefix} </>}
      <Name person={person} />
    </div>
    {person.title && <p className={titleStyle}>{person.title}</p>}
  </div>
);

export const ArticleByline: React.FC<Props> = ({
  article,
  maxWidthClassName = 'max-w-[680px]',
  showDate = true
}) => {
  const authors: Person[] = getArticleAuthors<User>(article).map((a) =>
    a.user ? staffPerson(a.user) : { key: a.key, name: a.name, href: null, title: null, photo: mediaUrl(a.writeInPhoto) },
  );
  const photographer = getPhotographer(article, authors);

  // Up to three people with job titles each get a block (name over title);
  // otherwise one sentence, on mobile and desktop alike
  const useBlocks = authors.length > 0 && authors.length <= 3 && authors.some((a) => a.title);

  // The headshots repeat the names beside them, so they're decorative: no alt
  // text, and a profile link that screen readers and the Tab key skip (the
  // name is the link they use)
  const withPhotos = [...authors, ...(photographer ? [photographer] : [])].filter((p) => p.photo);
  const headshotsEl = withPhotos.length > 0 ? (
    <div className="flex -space-x-2 shrink-0">
      {withPhotos.map((person) => {
        const className = 'relative w-10 h-10 rounded-full overflow-hidden bg-gray-100 dark:bg-zinc-800 border-2 border-bg-main transition-colors z-10';
        const image = <Image src={person.photo!} alt="" fill className="object-cover" />;
        return person.href ? (
          <Link href={person.href} key={person.key} aria-hidden="true" tabIndex={-1} className={`${className} hover:border-accent hover:z-20`}>
            {image}
          </Link>
        ) : (
          <div key={person.key} className={className}>
            {image}
          </div>
        );
      })}
    </div>
  ) : null;

  let namesEl: React.ReactNode;

  if (authors.length === 0) {
    // Only a staff editorial speaks for the Editorial Board
    namesEl = (
      <div className="flex flex-col gap-1">
        <div className={lineStyle}>
          By{' '}
          <span className={nameStyle}>
            <em>The Polytechnic</em>
            {isStaffEditorial(article) && ' Editorial Board'}
          </span>
        </div>
        {photographer && <NamesSentence prefix="Photos by" people={[photographer]} />}
      </div>
    );
  } else if (useBlocks) {
    // Only the first line says "By"; the gap separates the rest. The
    // photographer's "Photos by" spells out who shot rather than wrote.
    namesEl = (
      <div className="flex flex-wrap gap-x-7 gap-y-2">
        {authors.map((person, i) => (
          <PersonBlock key={person.key} prefix={i === 0 ? 'By' : null} person={person} />
        ))}
        {photographer && <PersonBlock prefix="Photos by" person={photographer} />}
      </div>
    );
  } else {
    namesEl = (
      <div className="flex flex-col gap-1">
        <NamesSentence prefix="By" people={authors} />
        {photographer && <NamesSentence prefix="Photos by" people={[photographer]} />}
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-3 py-4 border-b border-rule-strong ${maxWidthClassName} w-full mx-auto transition-colors`}>
      <div className="flex flex-row flex-wrap items-center gap-3">
        {headshotsEl}
        {namesEl}
      </div>
      {showDate && (
        <div className={`font-meta text-[13px] font-medium tracking-[0.02em] ${BYLINE_META_CLASS}`}>
          {longDate(article.publishedDate) ?? ''}
        </div>
      )}
    </div>
  );
};
