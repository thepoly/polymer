"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ChevronDown, Menu, X, ChevronRight, Search } from "lucide-react";

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

  const navItems = ['News', 'Features', 'Opinion', 'Sports', 'Editorial', 'Checkmate', 'Archives', 'About'];

  return (
    <>
      {/* ==================================================================
          MOBILE & TABLET HEADER
          ================================================================== */}
      <header className="lg:hidden sticky top-0 z-50 bg-white border-b border-black mb-6">
        <div className="flex items-center justify-between px-3 h-[70px] sm:h-[90px] bg-white relative z-[70]">
          
          <div className="flex-shrink-0 min-w-[44px] z-20">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Menu className="w-5 h-5 text-black" />
            </button>
          </div>

          <div className="flex-grow flex justify-center items-center px-0 overflow-visible">
             {/* Logo Container: 
                 1. Scale reduced from [1.5] to [1.25] (125% size)
                 2. Translate reduced to -translate-x-2 to match the new size
             */}
             <div className="relative h-[50px] sm:h-[70px] w-full max-w-[280px] transform scale-[1.05] -translate-x-2">
               <Image
                src="/logo.svg"
                alt="The Polytechnic"
                fill
                className="object-contain"
                priority
              />
             </div>
          </div>

          <div className="flex-shrink-0 flex items-center gap-1.5 -mr-1 z-20 bg-white pl-2">
            <svg className="w-4 h-4 hidden min-[460px]:block" viewBox="0 0 20 20" fill="none">
              <path d="M10 0.833252V2.49992M10 17.4999V19.1666M3.51671 3.51659L4.70004 4.69992M15.3 15.2999L16.4834 16.4833M0.833374 9.99992H2.50004M17.5 9.99992H19.1667M3.51671 16.4833L4.70004 15.2999M15.3 4.69992L16.4834 3.51659M14.1667 9.99992C14.1667 12.3011 12.3012 14.1666 10 14.1666C7.69885 14.1666 5.83337 12.3011 5.83337 9.99992C5.83337 7.69873 7.69885 5.83325 10 5.83325C12.3012 5.83325 14.1667 7.69873 14.1667 9.99992Z" stroke="#1E1E1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <svg className="w-1.5 h-1.5 hidden min-[515px]:block" viewBox="0 0 8 8" fill="none">
              <circle cx="4" cy="4" r="4" fill="#17AC3C" />
            </svg>
            <span className="text-xs font-bold tracking-wide whitespace-nowrap text-black">18° F</span>
          </div>
        </div>
        
        {!isMobileMenuOpen && (
          <div className="bg-white pb-1 -mt-2 text-center relative z-40">
             <span className="text-[11px] sm:text-sm font-bold text-black tracking-wide">
              {currentDate}
             </span>
          </div>
        )}

        {isMobileMenuOpen && (
          <div className="fixed inset-0 top-[70px] sm:top-[90px] z-[60] bg-white overflow-y-auto flex flex-col">
            <nav className="flex flex-col p-6 gap-0">
              {navItems.map((item) => (
                <button key={item} className="flex items-center justify-between text-2xl font-bold py-4 border-b border-gray-100 text-left text-black hover:text-[#D6001C] transition-all group">
                  {item} <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#D6001C]" />
                </button>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* ==================================================================
          DESKTOP HEADER
          ================================================================== */}
      <header className="hidden lg:block mb-5">
        
        {/* TOP RED SECTION */}
        <div className="bg-[#D6001C] px-4 xl:px-[30px] pt-[11px] pb-4">
          
          {/* Top Utilities Row */}
          <div className="relative flex items-center justify-between mb-4 text-white">
            <div className="z-10 w-[150px]">
              <Search className="w-4 h-4 text-white/80 cursor-pointer hover:text-white transition-colors" />
            </div>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none whitespace-nowrap">
              <span className="text-[11px] font-bold tracking-widest text-white/90">
                Serving the Rensselaer Community Since 1885
              </span>
            </div>
            <div className="z-10 w-[150px] flex justify-end">
              <button className="text-[11px] font-bold tracking-widest uppercase text-white hover:text-gray-200 transition-colors">
                Editor&apos;s Picks
              </button>
            </div>
          </div>

          {/* MAIN LOGO ROW */}
          <div className="relative flex items-center justify-between h-[100px] my-2.5">
            
            {/* Left Column (Weather) */}
            <div className="relative z-10 flex flex-col items-start justify-center h-full pointer-events-auto w-[210px]"> 
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none"><path d="M10 0.833252V2.49992M10 17.4999V19.1666M3.51671 3.51659L4.70004 4.69992M15.3 15.2999L16.4834 16.4833M0.833374 9.99992H2.50004M17.5 9.99992H19.1667M3.51671 16.4833L4.70004 15.2999M15.3 4.69992L16.4834 3.51659M14.1667 9.99992C14.1667 12.3011 12.3012 14.1666 10 14.1666C7.69885 14.1666 5.83337 12.3011 5.83337 9.99992C5.83337 7.69873 7.69885 5.83325 10 5.83325C12.3012 5.83325 14.1667 7.69873 14.1667 9.99992Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <svg className="w-1.5 h-1.5" viewBox="0 0 8 8" fill="none"><circle cx="4" cy="4" r="4" fill="#17AC3C" stroke="white" strokeWidth="1"/></svg>
                <span className="text-[15px] font-bold whitespace-nowrap text-white">Sunny 18° F</span>
              </div>
              <div className="text-[15px] font-bold text-white/80 mt-0.5">Volume XCI No. 22</div>
            </div>

            {/* ABSOLUTE CENTERED LOGO */}
            <div className="absolute left-[50.2%] top-1/2 -translate-x-1/2 -translate-y-1/2 h-full w-full max-w-[650px] pointer-events-none">
              <div className="relative w-full h-full">
                <Image src="/logo.svg" alt="The Polytechnic" fill className="object-contain brightness-0 invert" priority />
              </div>
            </div>

            {/* Right Column (Date) */}
            <div className="relative z-10 flex items-center justify-end h-full w-[210px] text-[15px] font-bold text-right whitespace-nowrap text-white pointer-events-auto">
              {currentDate}
            </div>
          </div>
        </div>

        {/* BOTTOM NAV SECTION (WHITE) */}
        <div className="bg-white border-b border-black">
          <nav className="flex flex-wrap items-center justify-center py-3 gap-8">
            {navItems.map((item) => (
              <button key={item} className="flex items-center gap-1 font-bold text-[15px] text-black hover:text-[#D6001C] transition-colors uppercase">
                {item} <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>
            ))}
          </nav>
        </div>
      </header>
    </>
  );
}