'use client';
import { renderLexicalHeadline } from '@/utils/formatArticle';

import React, { Fragment, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, Search } from 'lucide-react';
import { Article, Media, User } from '@/payload-types';
import { MobileMenuDrawer } from '@/components/MobileMenuDrawer';
import { openSearchOverlay } from '@/components/SearchOverlayHost';
import { useTheme } from '@/components/ThemeProvider';
import { focalObjectPosition } from '@/utils/focalPoint';
import { joinNames } from '@/utils/joinNames';
import { getArticleAuthors, isStaffEditorial } from '@/utils/articleAuthors';
import { longDate } from '@/utils/articleDates';
import { resolveCredit } from '@/components/Article/PhotoCaption';
import { ArticleSectionLabel } from '@/components/Article/ArticleSectionLabel';

type Props = {
  article: Article;
};

export const ArticleHeader: React.FC<Props> = ({ article }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuButtonRef = React.useRef<HTMLButtonElement>(null);
  const { isDarkMode, toggleDarkMode, logoSrcs } = useTheme();
  const featuredImage = article.featuredImage as Media | null;
  // Same precedence galleries use: explicit credit, then the media record's
  // photographer, then its write-in name.
  const { staff: creditStaff, writeIn: writeInPhotographer } = featuredImage
    ? resolveCredit({ image: featuredImage })
    : { staff: [] as User[], writeIn: null };
  const gradientOpacity = (article as unknown as Record<string, unknown>).gradientOpacity as number | null | undefined;
  const gradientStyle = gradientOpacity != null
    ? {
        background: gradientOpacity <= 100
          ? `linear-gradient(to bottom, rgba(0,0,0,0.2), transparent 50%, rgba(0,0,0,${gradientOpacity / 100}))`
          : `linear-gradient(to bottom, rgba(0,0,0,0.2), transparent ${(200 - gradientOpacity) / 2}%, rgba(0,0,0,1))`,
      }
    : undefined;

  React.useEffect(() => {
    document.documentElement.style.backgroundColor = '#000';
    
    return () => {
      document.documentElement.style.backgroundColor = '';
    };
  }, []);

  return (
    <>
      <div className="relative w-full h-screen mb-10 bg-black text-white">
        {/* Background Image Layer (z-0) */}
        {featuredImage?.url && (
          <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
            <Image
              src={featuredImage.url}
              alt={featuredImage.title || ""}
              fill
              className="object-cover opacity-90"
              // h-screen crops this photo hard on tall viewports; the focal
              // point decides which part survives instead of cropping evenly
              // from both edges and taking the subject's head first.
              style={{ objectPosition: focalObjectPosition(featuredImage) }}
              sizes="100vw"
              priority
            />
            {/* Gradient Overlay */}
            <div
              className={gradientStyle ? 'absolute inset-0' : 'absolute inset-0 bg-gradient-to-b from-black/20 via-transparent via-50% to-black/90'}
              style={gradientStyle}
            />
          </div>
        )}

        {/* Top Navigation Bar (z-50) */}
        <div className="absolute top-0 left-0 right-0 z-50 grid grid-cols-3 items-center px-3 py-1.5 md:px-5 lg:py-4">

          {/* Left: Menu */}
          <div className="col-start-1 hidden items-center justify-start lg:flex">
            <button
              ref={menuButtonRef}
              onClick={() => setIsMenuOpen(true)}
              className="flex h-11 w-11 items-center justify-center text-white hover:opacity-80 transition-opacity focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMenuOpen}
              aria-controls="photofeature-menu"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Center: Logo */}
          <div className="col-start-2 flex justify-center">
            <Link href="/" aria-label="The Polytechnic, home page" className="relative w-[6.5rem] md:w-[9.5rem] h-7 hover:opacity-90 transition-opacity">
              <Image
                src={logoSrcs.mobileDark}
                alt="The Polytechnic"
                fill
                className="object-contain"
              />
            </Link>
          </div>

          {/* Right: Search */}
          <div className="col-start-3 flex items-center justify-end">
            <button
              onClick={() => openSearchOverlay({ forceDark: true })}
              className="flex h-11 w-11 items-center justify-center text-white hover:opacity-80 transition-opacity focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Bottom Content Area (z-10) */}
        <div className="absolute bottom-0 left-0 right-0 z-10 flex flex-col items-center text-center px-4 pb-8 sm:pb-10 md:pb-12 pointer-events-none">
          <div className="max-w-[90vw] w-full space-y-1">
            <div className="pb-4 drop-shadow-lg">
              <ArticleSectionLabel section={article.section} kicker={article.kicker} inverse />
            </div>

            <h1 data-ie-field="title" className="font-copy font-normal [&_strong]:font-normal [&_b]:font-normal text-[43px] md:text-[38px] lg:text-[47px] text-white leading-[1.05] tracking-[-0.02em] drop-shadow-lg pointer-events-auto">
              {renderLexicalHeadline(article.title)}
            </h1>

            {/* Author and Date */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-0 text-white drop-shadow-md">
              <div className="flex items-center gap-2.5">
                {/* Author Headshots: decorative, since the names beside them
                    say who they are and carry the profile links */}
                <div className="flex -space-x-2">
                  {article.authors?.map((author) => {
                    const user = author as User;
                    const headshot = user.headshot as Media | null;
                    if (!headshot?.url) return null;
                    return (
                      <Link href={`/staff/${user.slug || user.id}`} key={user.id} aria-hidden="true" tabIndex={-1} className="relative w-7 h-7 rounded-full overflow-hidden bg-gray-800 border-2 border-white pointer-events-auto hover:border-red-500 transition-colors z-10 hover:z-20">
                        <Image
                          src={headshot.url}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="28px"
                          style={{ objectPosition: focalObjectPosition(headshot) }}
                        />
                      </Link>
                    );
                  })}
                  {((article as unknown as Record<string, unknown>).writeInAuthors as Array<{ name: string; photo?: Media | number | null }> || []).map((writeIn, i) => {
                    const photo = writeIn.photo && typeof writeIn.photo !== 'number' ? writeIn.photo as Media : null;
                    if (!photo?.url) return null;
                    return (
                      <div key={`write-in-${i}`} className="relative w-7 h-7 rounded-full overflow-hidden bg-gray-800 border-2 border-white z-10">
                        <Image
                          src={photo.url}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="28px"
                          style={{ objectPosition: focalObjectPosition(photo) }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Author Names */}
                <div className="font-meta text-[15px] font-normal tracking-[0.01em] pointer-events-auto sm:text-[16px]">
                  {(() => {
                    const allNames = getArticleAuthors<User>(article);
                    // Only a staff editorial speaks for the Editorial Board
                    if (allNames.length === 0) {
                      return <>By <span className="font-semibold"><em>The Polytechnic</em>{isStaffEditorial(article) && ' Editorial Board'}</span></>;
                    }
                    return (
                      <>
                        By {joinNames(allNames).map(({ item: author, sep }) => (
                          <React.Fragment key={author.key}>
                            {sep}
                            {author.href ? (
                              <Link href={author.href} className="font-semibold text-white transition-colors hover:text-accent">
                                {author.name}
                              </Link>
                            ) : <span className="font-semibold">{author.name}</span>}
                          </React.Fragment>
                        ))}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Date Separator & Date */}
              {article.publishedDate && (
                <>
                  <span className="hidden sm:inline text-white/80">•</span>
                  <div className="font-serif text-white/90 text-[17px]">
                    {longDate(article.publishedDate)}
                  </div>
                </>
              )}
            </div>

            {article.subdeck && (
              <div className="flex flex-col items-center">
                <h2 data-ie-field="subdeck" className="font-meta text-xl md:text-2xl font-normal text-white/90 leading-snug max-w-3xl drop-shadow-md pointer-events-auto">
                  {article.subdeck}
                </h2>
              </div>
            )}
          </div>
        </div>

        {/* Photo Credit (z-20, bottom-right) */}
        {(creditStaff.length > 0 || writeInPhotographer) && (
          <div className="absolute bottom-3 right-4 z-20">
            {/* Matches the gallery credit treatment, but fixed white: the hero
                always carries a dark bottom gradient, so there is nothing to
                sample and nothing that would ever call for black. */}
            <p className="font-meta text-[11px] tracking-[0.02em] text-white [text-shadow:0_1px_3px_rgb(0_0_0/0.55)]">
              {creditStaff.map((user, i) => (
                <Fragment key={user.id}>
                  {i > 0 ? ', ' : ''}
                  <Link
                    href={`/staff/${user.slug || user.id}`}
                    className="pointer-events-auto hover:opacity-80 transition-opacity"
                  >
                    {user.firstName} {user.lastName}
                  </Link>
                </Fragment>
              ))}
              {creditStaff.length > 0 ? '/The Polytechnic' : writeInPhotographer}
            </p>
          </div>
        )}


      </div>

      <MobileMenuDrawer
        id="photofeature-menu"
        returnFocusRef={menuButtonRef}
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onOpen={() => setIsMenuOpen(true)}
        handleLinkClick={(e) => {
          if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) return;
          setIsMenuOpen(false);
        }}
        isDarkMode={isDarkMode}
        onThemeToggle={toggleDarkMode}
        onSearchOpen={() => { setIsMenuOpen(false); openSearchOverlay({ forceDark: true }); }}
        className="hidden lg:block"
      />
    </>
  );
};
