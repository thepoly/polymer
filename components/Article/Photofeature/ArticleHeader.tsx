'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, Search } from 'lucide-react';
import { Article, Media, User } from '@/payload-types';
import { MobileMenuDrawer } from '@/components/MobileMenuDrawer';
import SearchOverlay from '@/components/SearchOverlay';
import { useTheme } from '@/components/ThemeProvider';

type Props = {
  article: Article;
};

export const ArticleHeader: React.FC<Props> = ({ article }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { isDarkMode, toggleDarkMode } = useTheme();
  const featuredImage = article.featuredImage as Media | null;
  const photographer = featuredImage?.photographer && typeof featuredImage.photographer === 'object' ? featuredImage.photographer as User : null;
  const writeInPhotographer = featuredImage ? ((featuredImage as unknown as Record<string, unknown>).writeInPhotographer as string | null | undefined) : null;
  const gradientOpacity = (article as unknown as Record<string, unknown>).gradientOpacity as number | null | undefined;
  const gradientStyle = gradientOpacity != null
    ? {
        background: gradientOpacity <= 100
          ? `linear-gradient(to bottom, rgba(0,0,0,0.2), transparent 50%, rgba(0,0,0,${gradientOpacity / 100}))`
          : `linear-gradient(to bottom, rgba(0,0,0,0.2), transparent ${(200 - gradientOpacity) / 2}%, rgba(0,0,0,1))`,
      }
    : undefined;

  React.useEffect(() => {
    document.documentElement.style.overscrollBehaviorY = 'none';
    document.body.style.overscrollBehaviorY = 'none';
    document.documentElement.style.backgroundColor = '#000';
    
    return () => {
      document.documentElement.style.overscrollBehaviorY = '';
      document.body.style.overscrollBehaviorY = '';
      document.documentElement.style.backgroundColor = '';
    };
  }, []);

  return (
    <>
      <div className="relative w-full h-screen mb-10 bg-black text-white overflow-hidden">
        {/* Background Image Layer (z-0) */}
        {featuredImage?.url && (
          <div className="absolute inset-0 w-full h-full z-0">
            <Image
              src={(featuredImage as Media & { sizes?: { gallery?: { url?: string } } }).sizes?.gallery?.url || featuredImage.url}
              alt={featuredImage.alt || article.title}
              fill
              className="object-cover opacity-90"
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
        <div className="absolute top-0 left-0 right-0 z-50 px-3 py-3 md:px-5 md:py-4 grid grid-cols-3 items-center">

          {/* Left: Menu */}
          <div className="flex items-center justify-start">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="flex h-9 w-9 items-center justify-center text-white hover:opacity-80 transition-opacity"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          {/* Center: Logo */}
          <div className="flex justify-center">
            <Link href="/" className="relative w-[6.5rem] md:w-[9.5rem] h-7 hover:opacity-90 transition-opacity">
              <Image
                src="/logo.svg"
                alt="The Polytechnic"
                fill
                className="object-contain brightness-0 invert"
              />
            </Link>
          </div>

          {/* Right: Search */}
          <div className="flex items-center justify-end">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex h-9 w-9 items-center justify-center text-white hover:opacity-80 transition-opacity"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Bottom Content Area (z-10) */}
        <div className="absolute bottom-0 left-0 right-0 z-10 flex flex-col items-center text-center px-4 pb-8 sm:pb-10 md:pb-12 pointer-events-none">
          <div className="max-w-[90vw] w-full space-y-1">
            
            <h1 data-ie-field="title" className={`font-copy font-bold text-[43px] md:text-[38px] lg:text-[47px] text-white leading-[1.05] tracking-[-0.02em] drop-shadow-lg ${article.section === "features" ? "font-normal italic" : ""} ${article.section === "sports" ? "italic tracking-[0.015em]" : ""}`}>
              {article.title}
            </h1>

            {/* Author and Date */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-0 text-white drop-shadow-md">
              <div className="flex items-center gap-2.5">
                {/* Author Headshots */}
                <div className="flex -space-x-2">
                  {article.authors?.map((author) => {
                    const user = author as User;
                    const headshot = user.headshot as Media | null;
                    if (!headshot?.url) return null;
                    return (
                      <Link href={`/staff/${user.slug || user.id}`} key={user.id} className="relative w-7 h-7 rounded-full overflow-hidden bg-gray-800 border-2 border-white pointer-events-auto hover:border-red-500 transition-colors z-10 hover:z-20">
                        <Image
                          src={headshot.url}
                          alt={`${user.firstName} ${user.lastName}`}
                          fill
                          className="object-cover"
                        />
                      </Link>
                    );
                  })}
                  {((article as unknown as Record<string, unknown>).writeInAuthors as Array<{ name: string; photo?: Media | number | null }> || []).map((writeIn, i) => {
                    const photo = writeIn.photo && typeof writeIn.photo !== 'number' ? writeIn.photo as Media : null;
                    if (!photo?.url) return null;
                    return (
                      <div key={`write-in-${i}`} className="relative w-7 h-7 rounded-full overflow-hidden bg-gray-800 border-2 border-white z-10">
                        <Image src={photo.url} alt={writeIn.name} fill className="object-cover" />
                      </div>
                    );
                  })}
                </div>

                {/* Author Names */}
                <div className="font-meta text-[13px] font-[440] tracking-[0.08em] pointer-events-auto sm:text-[14px]">
                  {(() => {
                    const staffAuthors = (article.authors || []).filter((a): a is User => typeof a !== 'number');
                    const writeInAuthors = ((article as unknown as Record<string, unknown>).writeInAuthors || []) as Array<{ name: string }>;
                    const allNames: { name: string; href?: string; key: string }[] = [
                      ...staffAuthors.map((u) => ({ name: `${u.firstName} ${u.lastName}`, href: `/staff/${u.slug || u.id}`, key: `staff-${u.id}` })),
                      ...writeInAuthors.map((w, i) => ({ name: w.name, key: `write-in-${i}` })),
                    ];
                    if (allNames.length === 0) return <>By <em>The Polytechnic</em> Editorial Board</>;
                    return (
                      <>
                        By {allNames.map((author, index) => (
                          <React.Fragment key={author.key}>
                            {index > 0 && index === allNames.length - 1 ? ' and ' : index > 0 ? ', ' : ''}
                            {author.href ? (
                              <Link href={author.href} className="text-white hover:text-white/75 hover:underline decoration-1 underline-offset-2 transition-colors">
                                {author.name}
                              </Link>
                            ) : author.name}
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
                    {new Date(article.publishedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                </>
              )}
            </div>

            {article.subdeck && (
              <div className="flex flex-col items-center">
                <h2 data-ie-field="subdeck" className="font-meta text-xl md:text-2xl font-normal text-white/90 leading-snug max-w-3xl drop-shadow-md">
                  {article.subdeck}
                </h2>
              </div>
            )}
          </div>
        </div>

        {/* Photo Credit (z-20, bottom-right) */}
        {(photographer || writeInPhotographer) && (
          <div className="absolute bottom-3 right-4 z-20 pointer-events-none">
            <p className="font-meta text-[11px] italic text-white/50">
              {photographer
                ? `${photographer.firstName} ${photographer.lastName}/The Polytechnic`
                : writeInPhotographer}
            </p>
          </div>
        )}


      </div>

      <MobileMenuDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onOpen={() => setIsMenuOpen(true)}
        handleLinkClick={(e, _href) => {
          if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) return;
          setIsMenuOpen(false);
        }}
        isDarkMode={isDarkMode}
        onThemeToggle={toggleDarkMode}
        onSearchOpen={() => { setIsMenuOpen(false); setIsSearchOpen(true); }}
        className=""
      />

      {isSearchOpen && <SearchOverlay onClose={() => setIsSearchOpen(false)} />}
    </>
  );
};
