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

  const menuItems = [
    { label: 'News', href: '/news' },
    { label: 'Features', href: '/features' },
    { label: 'Opinion', href: '/opinion' },
    { label: 'Sports', href: '/sports' },
    { label: 'Editorial', href: '/editorial' },
  ];

  return (
    <>
      <div className="relative w-full h-screen mb-12 bg-black text-white overflow-hidden">
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
        <div className="absolute top-0 left-0 right-0 z-50 px-4 py-4 md:px-6 grid grid-cols-3 items-center">
          
          {/* Left: Animated Hamburger & Search */}
          <div className="flex items-center justify-start gap-4 md:gap-6">
            
            {/* Custom Animated Menu Button */}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="group relative w-6 h-5 flex flex-col justify-between items-center focus:outline-none z-50"
              aria-label="Toggle Menu"
            >
              <span 
                className={`block w-full h-0.5 bg-white rounded-full transition-all duration-300 ease-in-out origin-center
                  ${isMenuOpen ? 'rotate-45 translate-y-[9px]' : ''}`} 
              />
              <span 
                className={`block w-full h-0.5 bg-white rounded-full transition-all duration-300 ease-in-out
                  ${isMenuOpen ? 'opacity-0 translate-x-2' : 'opacity-100'}`} 
              />
              <span 
                className={`block w-full h-0.5 bg-white rounded-full transition-all duration-300 ease-in-out origin-center
                  ${isMenuOpen ? '-rotate-45 -translate-y-[9px]' : ''}`} 
              />
            </button>

            <button className={`hover:opacity-80 transition-opacity duration-300 ${isMenuOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
              <Search className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          </div>

          {/* Center: Logo */}
          <div className="flex justify-center">
            <Link href="/" className="relative w-32 md:w-48 h-8 hover:opacity-90 transition-opacity">
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
        <div className="absolute bottom-0 left-0 right-0 z-10 flex flex-col items-center text-center px-4 pb-4 sm:pb-6 md:pb-8 pointer-events-none">
          <div className="max-w-4xl w-full space-y-1 md:space-y-2">
            
            <h1 className="font-serif font-bold italic text-2xl sm:text-3xl md:text-4xl lg:text-5xl leading-tight tracking-tight drop-shadow-lg text-white">
              {article.title}
            </h1>

            {article.subdeck && (
              <div className="flex flex-col items-center">
                <h2 className="font-serif text-lg sm:text-xl md:text-2xl text-gray-100 leading-snug max-w-3xl drop-shadow-md">
                  {article.subdeck}
                </h2>
              </div>
            )}

            {/* Author and Date */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 text-white drop-shadow-md">
              <div className="flex items-center gap-3">
                {/* Author Headshots */}
                <div className="flex -space-x-2">
                  {article.authors?.map((author) => {
                    const user = author as User;
                    const headshot = user.headshot as Media | null;
                    if (!headshot?.url) return null;
                    return (
                      <div key={user.id} className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-800 border-2 border-white">
                        <Image
                          src={headshot.url}
                          alt={`${user.firstName} ${user.lastName}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Author Names */}
                <div className="font-serif font-bold text-lg">
                  By {article.authors && article.authors.length > 0 ? (
                    article.authors.map((author, index) => {
                      const user = author as User;
                      return (
                        <React.Fragment key={user.id}>
                          {index > 0 && index === article.authors!.length - 1 ? ' and ' : index > 0 ? ', ' : ''}
                          {user.firstName} {user.lastName}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    'The Poly Staff'
                  )}
                </div>
              </div>

              {/* Date Separator & Date */}
              {article.publishedDate && (
                <>
                  <span className="hidden sm:inline text-white/80">•</span>
                  <div className="font-serif text-white/90 text-lg">
                    {new Date(article.publishedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Menu Overlay (z-40) */}
        <div 
          className={`fixed inset-0 z-40 bg-black flex flex-col pt-24 px-6 md:px-12 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]
            ${isMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}
        >
          <nav className="flex flex-col w-full max-w-2xl mx-auto mt-4">
            {menuItems.map((item, index) => (
              <Link 
                key={index} 
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                style={{ transitionDelay: isMenuOpen ? `${150 + (index * 75)}ms` : '0ms' }}
                className={`
                  group flex items-center justify-between py-5 border-b border-white/20 hover:border-white 
                  transition-all duration-500 ease-out transform
                  ${isMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}
                `}
              >
                <span className="font-serif text-2xl md:text-3xl font-light text-white">{item.label}</span>
                <ChevronRight className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300" />
              </Link>
            ))}
          </nav>
        </div>
        
      </div>
    </>
  );
};
