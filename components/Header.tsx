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
      <header className="hidden lg:block mb-5">
        
        {/* TOP SECTION */}
        <div className="bg-header-nav px-3">
          <div className="max-w-[1280px] mx-auto bg-header-top border border-header-border rounded-2xl mt-2 px-4 xl:px-[30px] pt-[11px] pb-3 relative">
            
            {/* Top Utilities Row */}
            <div className="relative z-10 flex items-center justify-between mb-4 text-header-top-text">
              <div className="z-10 w-[150px]">
                <Search className="w-4 h-4 text-header-top-text/80 cursor-pointer hover:text-header-top-text transition-colors" />
              </div>
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none whitespace-nowrap">
                <span className="text-[11px] font-bold tracking-widest text-header-top-text/90">
                  Serving the Rensselaer Community Since 1885
                </span>
              </div>
              <div className="z-10 w-[150px] flex justify-end">
              </div>
            </div>

            {/* MAIN LOGO ROW */}
            <div className="relative flex items-center justify-between h-[100px] my-2.5">
              
              {/* Left Column (Weather) */}
              <div className="relative z-10 flex flex-col items-start justify-end h-full pointer-events-auto w-[210px] pb-0"> 
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none"><path d="M10 0.833252V2.49992M10 17.4999V19.1666M3.51671 3.51659L4.70004 4.69992M15.3 15.2999L16.4834 16.4833M0.833374 9.99992H2.50004M17.5 9.99992H19.1667M3.51671 16.4833L4.70004 15.2999M15.3 4.69992L16.4834 3.51659M14.1667 9.99992C14.1667 12.3011 12.3012 14.1666 10 14.1666C7.69885 14.1666 5.83337 12.3011 5.83337 9.99992C5.83337 7.69873 7.69885 5.83325 10 5.83325C12.3012 5.83325 14.1667 7.69873 14.1667 9.99992Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span className="text-[15px] font-bold whitespace-nowrap text-header-top-text">Sunny 18° F</span>
                </div>
                <div className="text-[15px] font-bold text-header-top-text/80 mt-0.5">Volume XCI No. 22</div>
              </div>

              {/* ABSOLUTE CENTERED LOGO */}
              <div className="absolute left-[50.2%] top-[48%] -translate-x-1/2 -translate-y-1/2 h-full w-full max-w-[650px] pointer-events-none scale-90">
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
              <div className="relative z-10 flex items-end justify-end h-full w-[210px] text-[15px] font-bold text-right whitespace-nowrap text-header-top-text pointer-events-auto pb-0">
                {currentDate}
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM NAV SECTION */}
        <div className="bg-header-nav px-3">
          <div className="max-w-[1280px] mx-auto px-4 md:px-6 flex justify-center border-b border-header-border">
            <nav className="flex flex-wrap items-center py-3 gap-8">
              {desktopNavItems.map((item) => (
              <Link 
                key={item} 
                href={item === 'Staff' ? '/staff' : `/${item.toLowerCase()}`}
                className="flex items-center gap-1 text-[15px] text-header-nav-text hover:text-accent transition-colors uppercase"
              >
                {item} <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
              </Link>
            ))}
          </nav>
        </div>
        </div>
      </header>
    </>
  );
}
