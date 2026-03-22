'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Search, ChevronRight } from 'lucide-react';
import { Article, Media, User } from '@/payload-types';

type Props = {
  article: Article;
};

export const ArticleHeader: React.FC<Props> = ({ article }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const featuredImage = article.featuredImage as Media | null;

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

  const menuItems = [
    { label: 'News', href: '/news' },
    { label: 'Features', href: '/features' },
    { label: 'Opinion', href: '/opinion' },
    { label: 'Sports', href: '/sports' },
  ];

  return (
    <>
      <div className="relative w-full h-screen mb-10 bg-black text-white overflow-hidden">
        {/* Background Image Layer (z-0) */}
        {featuredImage?.url && (
          <div className="absolute inset-0 w-full h-full z-0">
            <Image
              src={featuredImage.url}
              alt={featuredImage.alt || article.title}
              fill
              className="object-cover opacity-90"
              priority
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent via-50% to-black/90" />
          </div>
        )}

        {/* Top Navigation Bar (z-50) */}
        <div className="absolute top-0 left-0 right-0 z-50 px-3 py-3 md:px-5 md:py-4 grid grid-cols-3 items-center">
          
          {/* Left: Animated Hamburger & Search */}
          <div className="flex items-center justify-start gap-3 md:gap-5">
            
            {/* Custom Animated Menu Button */}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="group relative w-5 h-4 flex flex-col justify-between items-center focus:outline-none z-50"
              aria-label="Toggle Menu"
            >
              <span 
                className={`block w-full h-0.5 bg-white rounded-full transition-all duration-300 ease-in-out origin-center
                  ${isMenuOpen ? 'rotate-45 translate-y-[7px]' : ''}`} 
              />
              <span 
                className={`block w-full h-0.5 bg-white rounded-full transition-all duration-300 ease-in-out
                  ${isMenuOpen ? 'opacity-0 translate-x-2' : 'opacity-100'}`} 
              />
              <span 
                className={`block w-full h-0.5 bg-white rounded-full transition-all duration-300 ease-in-out origin-center
                  ${isMenuOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} 
              />
            </button>

            <button className={`hover:opacity-80 transition-opacity duration-300 ${isMenuOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
              <Search className="w-4 h-4 md:w-5 md:h-5" />
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

          {/* Right: Empty div for grid balance */}
          <div />
        </div>

        {/* Bottom Content Area (z-10) */}
        <div className="absolute bottom-0 left-0 right-0 z-10 flex flex-col items-center text-center px-4 pb-3 sm:pb-5 md:pb-6 pointer-events-none">
          <div className="max-w-3xl w-full space-y-1">
            
            <h1 data-ie-field="title" className={`font-display font-bold text-[39px] md:text-[34px] lg:text-[42px] text-white leading-[1.05] tracking-[-0.02em] drop-shadow-lg ${article.section === "news" ? "font-display-news uppercase" : ""} ${article.section === "features" ? "font-normal italic" : ""} ${article.section === "sports" ? "italic tracking-[0.015em]" : ""}`}>
              {article.title}
            </h1>

            {article.subdeck && (
              <div className="flex flex-col items-center">
                <h2 data-ie-field="subdeck" className="font-meta text-xl md:text-2xl font-normal text-white/90 leading-snug max-w-[38rem] drop-shadow-md">
                  {article.subdeck}
                </h2>
              </div>
            )}

            {/* Author and Date */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3 text-white drop-shadow-md">
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
                <div className="font-meta text-[12px] font-[440] tracking-[0.08em] pointer-events-auto sm:text-[13px]">
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
                              <Link href={author.href} className="hover:text-red-500 hover:underline decoration-1 underline-offset-2 transition-colors">
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
                  <div className="font-serif text-white/90 text-base">
                    {new Date(article.publishedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Menu Overlay (z-40) */}
        <div 
          className={`fixed inset-0 z-40 bg-black flex flex-col pt-20 px-5 md:px-10 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]
            ${isMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}
        >
          <nav className="flex flex-col w-full max-w-xl mx-auto mt-3">
            {menuItems.map((item, index) => (
              <Link 
                key={index} 
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                style={{ transitionDelay: isMenuOpen ? `${150 + (index * 75)}ms` : '0ms' }}
                className={`
                  group flex items-center justify-between py-4 border-b border-white/20 hover:border-white 
                  transition-all duration-500 ease-out transform
                  ${isMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}
                `}
              >
                <span className="font-serif text-xl md:text-2xl font-light text-white">{item.label}</span>
                <ChevronRight className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300" />
              </Link>
            ))}
          </nav>
        </div>
        
      </div>
    </>
  );
};
