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
      <header className="lg:hidden sticky top-0 z-50 bg-white border-b border-black">
        <div className="flex items-center justify-between px-3 h-[75px] sm:h-[110px] bg-white relative z-[70]">
          
          <div className="flex-shrink-0 min-w-[44px]">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-7 h-7 text-black" /> : <Menu className="w-7 h-7 text-black" />}
            </button>
          </div>

          {/* Logo Container: Fixed Heights to prevent the "Giant Logo" bug */}
          <div className="flex-grow flex justify-center items-center px-4">
             <div className="relative h-[45px] sm:h-[70px] w-full max-w-[280px] sm:max-w-[400px]">
               <Image
                src="/logo.svg"
                alt="The Polytechnic"
                fill
                className="object-contain"
                priority
              />
             </div>
          </div>

          <div className="flex-shrink-0 flex items-center gap-1.5 -mr-1">
            <svg className="w-4 h-4 hidden min-[460px]:block" viewBox="0 0 20 20" fill="none">
              <path d="M10 0.833252V2.49992M10 17.4999V19.1666M3.51671 3.51659L4.70004 4.69992M15.3 15.2999L16.4834 16.4833M0.833374 9.99992H2.50004M17.5 9.99992H19.1667M3.51671 16.4833L4.70004 15.2999M15.3 4.69992L16.4834 3.51659M14.1667 9.99992C14.1667 12.3011 12.3012 14.1666 10 14.1666C7.69885 14.1666 5.83337 12.3011 5.83337 9.99992C5.83337 7.69873 7.69885 5.83325 10 5.83325C12.3012 5.83325 14.1667 7.69873 14.1667 9.99992Z" stroke="#1E1E1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <svg className="w-1.5 h-1.5 hidden min-[515px]:block" viewBox="0 0 8 8" fill="none">
              <circle cx="4" cy="4" r="4" fill="#17AC3C" />
            </svg>
            <span className="text-xs font-bold tracking-wide whitespace-nowrap">18° F</span>
          </div>
        </div>
        
        {!isMobileMenuOpen && (
          <div className="bg-white py-2 text-center border-t border-gray-100 relative z-40">
             <span className="text-[11px] sm:text-sm font-bold text-black tracking-wide">
              {currentDate}
             </span>
          </div>
        )}

        {isMobileMenuOpen && (
          <div className="fixed inset-0 top-[75px] sm:top-[110px] z-[60] bg-white overflow-y-auto flex flex-col">
            <nav className="flex flex-col p-6 gap-0">
              {navItems.map((item) => (
                <button key={item} className="flex items-center justify-between text-2xl font-bold py-4 border-b border-gray-100 text-left hover:text-[#D6001C] transition-all group">
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
      <header className="hidden lg:block bg-white px-4 xl:px-[30px] pt-1 pb-4">
        <div className="relative flex items-center justify-between mb-1">
          <div className="z-10 w-[150px]">
             <Search className="w-4 h-4 text-gray-400 cursor-pointer hover:text-black transition-colors" />
          </div>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none whitespace-nowrap">
            <span className="text-[11px] font-bold tracking-widest text-gray-500">
              Serving the Rensselaer Community Since 1885
            </span>
          </div>
          <div className="z-10 w-[150px] flex justify-end">
            <button className="text-[11px] font-bold tracking-widest uppercase hover:text-[#D6001C] transition-colors">
              Editor's Picks
            </button>
          </div>
        </div>

        <div className="flex flex-row items-center justify-between my-2">
          <div className="flex flex-col items-start justify-center w-[210px] h-[75px]"> 
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none"><path d="M10 0.833252V2.49992M10 17.4999V19.1666M3.51671 3.51659L4.70004 4.69992M15.3 15.2999L16.4834 16.4833M0.833374 9.99992H2.50004M17.5 9.99992H19.1667M3.51671 16.4833L4.70004 15.2999M15.3 4.69992L16.4834 3.51659M14.1667 9.99992C14.1667 12.3011 12.3012 14.1666 10 14.1666C7.69885 14.1666 5.83337 12.3011 5.83337 9.99992C5.83337 7.69873 7.69885 5.83325 10 5.83325C12.3012 5.83325 14.1667 7.69873 14.1667 9.99992Z" stroke="#1E1E1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <svg className="w-1.5 h-1.5" viewBox="0 0 8 8" fill="none"><circle cx="4" cy="4" r="4" fill="#17AC3C" /></svg>
              <span className="text-[15px] font-bold whitespace-nowrap">Sunny 18° F</span>
            </div>
            <div className="text-[15px] font-bold text-gray-600 mt-0.5">Volume XCI No. 22</div>
          </div>

          <div className="flex-1 flex justify-center px-4 h-[75px]">
             <div className="relative h-full w-full max-w-[500px]">
              <Image src="/logo.svg" alt="The Polytechnic" fill className="object-contain" priority />
            </div>
          </div>

          <div className="w-[210px] h-[75px] flex items-center justify-end text-[15px] font-bold text-right whitespace-nowrap">
            {currentDate}
          </div>
        </div>

        <nav className="flex flex-wrap items-center justify-center mt-3 gap-8">
          {navItems.map((item) => (
            <button key={item} className="flex items-center gap-1 font-bold text-[15px] text-black hover:text-[#D6001C] transition-colors uppercase">
              {item} <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
          ))}
        </nav>
        <div className="w-full h-[2px] bg-black mt-3"></div>
      </header>
    </>
  );
}
