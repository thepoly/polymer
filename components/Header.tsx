"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Menu, ChevronRight, Search } from "lucide-react";

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isMobileMenuOpen]);

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const navItems = ['News', 'Features', 'Opinion', 'Sports', 'Staff', 'Editorial', 'Checkmate', 'Archives', 'About'];
  const desktopNavItems = ['News', 'Features', 'Opinion', 'Sports', 'Staff', 'Contact', 'About', 'Archives', 'Submit'];

  return (
    <>
      {/* ==================================================================
          MOBILE & TABLET HEADER
          ================================================================== */}
      <header className="lg:hidden sticky top-0 z-50 bg-header-nav border-b border-header-border mb-6">
        <div className="flex items-center justify-between px-3 h-[70px] sm:h-[90px] bg-header-nav relative z-[70]">
          
          <div className="flex-shrink-0 min-w-[44px] z-20">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
            >
              <Menu className="w-5 h-5 text-header-nav-text" />
            </button>
          </div>

          <div className="flex-grow flex justify-center items-center px-0 overflow-visible">
             <div className="relative h-[50px] sm:h-[70px] w-full max-w-[280px] transform scale-[1.05] -translate-x-2">
               <Image
                src="/logo.svg"
                alt="The Polytechnic"
                fill
                style={{ filter: 'var(--logo-filter)' }}
                className="object-contain"
                priority
              />
             </div>
          </div>

          <div className="flex-shrink-0 flex items-center gap-1.5 -mr-1 z-20 bg-header-nav pl-2">
            <svg className="w-4 h-4 hidden min-[460px]:block" viewBox="0 0 20 20" fill="none">
              <path d="M10 0.833252V2.49992M10 17.4999V19.1666M3.51671 3.51659L4.70004 4.69992M15.3 15.2999L16.4834 16.4833M0.833374 9.99992H2.50004M17.5 9.99992H19.1667M3.51671 16.4833L4.70004 15.2999M15.3 4.69992L16.4834 3.51659M14.1667 9.99992C14.1667 12.3011 12.3012 14.1666 10 14.1666C7.69885 14.1666 5.83337 12.3011 5.83337 9.99992C5.83337 7.69873 7.69885 5.83325 10 5.83325C12.3012 5.83325 14.1667 7.69873 14.1667 9.99992Z" className="stroke-header-nav-text" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <svg className="w-1.5 h-1.5 hidden min-[515px]:block" viewBox="0 0 8 8" fill="none">
              <circle cx="4" cy="4" r="4" fill="#17AC3C" />
            </svg>
            <span className="text-xs font-bold tracking-wide whitespace-nowrap text-header-nav-text">18° F</span>
          </div>
        </div>
        
        {!isMobileMenuOpen && (
          <div className="bg-header-nav pb-1 -mt-2 text-center relative z-40">
             <span className="text-[11px] sm:text-sm font-bold text-header-nav-text tracking-wide">
              {currentDate}
             </span>
          </div>
        )}

        {isMobileMenuOpen && (
          <div className="fixed inset-0 top-[70px] sm:top-[90px] z-[60] bg-header-nav overflow-y-auto flex flex-col">
            <nav className="flex flex-col p-6 gap-0">
              {navItems.map((item) => (
                <Link 
                  key={item} 
                  href={item === 'Staff' ? '/staff' : `/${item.toLowerCase()}`}
                  className="flex items-center justify-between text-2xl font-bold py-4 border-b border-border-main text-left text-header-nav-text hover:text-accent transition-all group"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item} <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-accent" />
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* ==================================================================
          DESKTOP HEADER
          ================================================================== */}
      {/* 👇 Added mb-2.5 right here for that exact 30% spacing 👇 */}
      <header className="hidden lg:block mb-4">
        
        {/* TOP LOGO ROW */}
        <div className="bg-header-nav pt-2 pb-5">
          <div className="max-w-[1280px] mx-auto px-4 md:px-6 xl:px-[30px] relative">
            
            <div className="relative flex items-center justify-between h-[100px]">
              
              {/* Left Column (Search + Weather) */}
              <div className="relative z-10 flex flex-col items-start justify-between h-full pointer-events-auto w-[250px] py-2"> 
                {/* Search Icon at Top Left */}
                <div>
                   <Search className="w-4 h-4 text-header-nav-text cursor-pointer hover:text-header-nav-text/80 transition-colors" />
                </div>
                
                {/* Weather Block */}
                <div className="-mt-6">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-header-nav-text" viewBox="0 0 20 20" fill="none"><path d="M10 0.833252V2.49992M10 17.4999V19.1666M3.51671 3.51659L4.70004 4.69992M15.3 15.2999L16.4834 16.4833M0.833374 9.99992H2.50004M17.5 9.99992H19.1667M3.51671 16.4833L4.70004 15.2999M15.3 4.69992L16.4834 3.51659M14.1667 9.99992C14.1667 12.3011 12.3012 14.1666 10 14.1666C7.69885 14.1666 5.83337 12.3011 5.83337 9.99992C5.83337 7.69873 7.69885 5.83325 10 5.83325C12.3012 5.83325 14.1667 7.69873 14.1667 9.99992Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span className="text-[15px] font-bold whitespace-nowrap text-header-nav-text">
                      Sunny 18° F <span className="text-[#17AC3C] text-2xl leading-none relative top-1">•</span>
                    </span>
                  </div>
                  <div className="text-[15px] font-bold text-header-nav-text mt-0.5">Volume XCI No. 22</div>
                </div>
              </div>

              {/* CENTER LOGO */}
              <div className="absolute left-[50%] top-[50%] mt-3 -translate-x-1/2 -translate-y-1/2 h-full w-full max-w-[650px] pointer-events-none">
                <div className="relative w-full h-full">
                  <Image 
                    src="/logo.svg" 
                    alt="The Polytechnic" 
                    fill 
                    style={{ filter: 'var(--header-logo-invert)' }}
                    className="object-contain" 
                    priority 
                  />
                </div>
              </div>

              {/* Right Column (Date) */}
              <div className="relative z-10 flex items-center justify-end h-full w-[250px] text-[15px] font-bold text-right whitespace-nowrap text-header-nav-text pointer-events-auto">
                {currentDate}
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM NAV SECTION */}
        <div className="bg-header-nav">
          <div className="max-w-[1280px] mx-auto px-4 md:px-6 xl:px-[30px]">
            <div className="flex justify-center border-b-[4px] border-double border-header-nav-text -mx-[2.5px]">
              <nav className="flex flex-wrap items-center py-2 gap-8">
                {desktopNavItems.map((item, index) => (
                <Link 
                  key={`${item}-${index}`} 
                  href={item === 'Staff' ? '/staff' : `/${item.toLowerCase()}`}
                  className="flex items-center gap-1 text-[16px] text-header-nav-text hover:text-accent transition-colors uppercase"
                >
                  {item} <ChevronDown className="w-4 h-4 text-text-muted" />
                </Link>
              ))}
              </nav>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}