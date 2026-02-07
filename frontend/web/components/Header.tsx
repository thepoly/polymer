"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ChevronDown, Menu, X, ChevronRight, Search } from "lucide-react";

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Lock body scroll when menu is open
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
          MOBILE & TABLET HEADER (Visible below 1024px)
          ================================================================== */}
      <header className="lg:hidden sticky top-0 z-50 bg-white border-b border-black">
        {/* Container - Increased Height for Spacing */}
        {/* Mobile: 75px (was 60px) | Tablet: 110px (was 80px) */}
        <div className="flex items-center justify-between px-3 h-[75px] sm:h-[110px] relative z-[70] bg-white">
          
          {/* Left: Hamburger */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors relative z-10"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-7 h-7 text-black" />
            ) : (
              <Menu className="w-7 h-7 text-black" />
            )}
          </button>

          {/* Center: Logo (Another 20% Bigger) */}
          {/* Mobile: 300px | Tablet: 432px */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[58px] sm:w-[432px] sm:h-[86px]">
             <Image
              src="/logo.svg"
              alt="The Polytechnic"
              fill
              className="object-contain"
              priority
            />
          </div>

          {/* Right: Weather */}
          <div className="flex items-center gap-1.5 -mr-1 p-2 relative z-10">
            {/* Sun: Hidden < 460px */}
            <svg className="w-4 h-4 hidden min-[460px]:block" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g clipPath="url(#clip0_mobile)">
                <path d="M10 0.833252V2.49992M10 17.4999V19.1666M3.51671 3.51659L4.70004 4.69992M15.3 15.2999L16.4834 16.4833M0.833374 9.99992H2.50004M17.5 9.99992H19.1667M3.51671 16.4833L4.70004 15.2999M15.3 4.69992L16.4834 3.51659M14.1667 9.99992C14.1667 12.3011 12.3012 14.1666 10 14.1666C7.69885 14.1666 5.83337 12.3011 5.83337 9.99992C5.83337 7.69873 7.69885 5.83325 10 5.83325C12.3012 5.83325 14.1667 7.69873 14.1667 9.99992Z" stroke="#1E1E1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </g>
              <defs>
                <clipPath id="clip0_mobile"><rect width="20" height="20" fill="white" /></clipPath>
              </defs>
            </svg>
            
            {/* Dot: Hidden < 515px */}
            <svg className="w-1.5 h-1.5 hidden min-[515px]:block" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="4" cy="4" r="4" fill="#17AC3C" />
            </svg>
            
            <span className="text-xs font-bold tracking-wide whitespace-nowrap">18° F</span>
          </div>
        </div>
        
        {/* Date Sub-header */}
        {!isMobileMenuOpen && (
          <div className="bg-white py-1.5 text-center border-t border-gray-100 relative z-40">
             <span className="text-[10px] sm:text-xs font-bold text-black tracking-wide">
              {currentDate}
             </span>
          </div>
        )}

        {/* Fullscreen Menu */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 top-[75px] sm:top-[110px] z-[60] bg-white overflow-y-auto animate-in fade-in slide-in-from-bottom-5 duration-300 flex flex-col">
            <nav className="flex flex-col p-6 gap-0">
              {navItems.map((item) => (
                <button
                  key={item}
                  className="flex items-center justify-between text-2xl sm:text-3xl font-bold py-4 sm:py-5 border-b border-gray-100 text-left hover:text-[#D6001C] hover:pl-4 transition-all group"
                >
                  {item}
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300 group-hover:text-[#D6001C]" />
                </button>
              ))}
            </nav>
            <div className="mt-auto p-8 bg-gray-50 text-center space-y-4">
              <p className="text-xs sm:text-sm font-bold text-gray-400 tracking-wide">
                {currentDate}
              </p>
              <div className="text-[10px] sm:text-xs text-gray-400 font-medium">
                © {new Date().getFullYear()} The Polytechnic
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ==================================================================
          DESKTOP HEADER (Visible above 1024px)
          "Tight & Title Case" + Breathing Room
          ================================================================== */}
      <header className="hidden lg:block bg-white px-4 xl:px-[30px] pt-1 pb-4">
        
        {/* 1. TOP STRAP */}
        <div className="relative flex items-center justify-between mb-1">
          {/* Left: Search */}
          <div className="z-10 w-[150px]">
             <Search className="w-4 h-4 text-gray-400 cursor-pointer hover:text-black transition-colors" />
          </div>
          
          {/* Center: Tagline */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none whitespace-nowrap">
            <span className="text-[11px] font-bold tracking-widest text-gray-500">
              Serving the Rensselaer Community Since 1885
            </span>
          </div>

          {/* Right: Editor's Picks */}
          <div className="z-10 w-[150px] flex justify-end">
            <button className="text-[11px] font-bold tracking-widest uppercase hover:text-[#D6001C] transition-colors">
              Editor's Picks
            </button>
          </div>
        </div>


        {/* 2. MAIN HEADER ROW */}
        {/* Added my-2 for equal top/bottom breathing room */}
        <div className="flex flex-row items-center justify-between my-2">
          
          {/* Left: Weather */}
          <div className="flex flex-col items-start justify-center w-[210px] h-[75px]"> 
            <div className="flex items-center gap-2 mb-0">
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g clipPath="url(#clip0_desktop)">
                  <path d="M10 0.833252V2.49992M10 17.4999V19.1666M3.51671 3.51659L4.70004 4.69992M15.3 15.2999L16.4834 16.4833M0.833374 9.99992H2.50004M17.5 9.99992H19.1667M3.51671 16.4833L4.70004 15.2999M15.3 4.69992L16.4834 3.51659M14.1667 9.99992C14.1667 12.3011 12.3012 14.1666 10 14.1666C7.69885 14.1666 5.83337 12.3011 5.83337 9.99992C5.83337 7.69873 7.69885 5.83325 10 5.83325C12.3012 5.83325 14.1667 7.69873 14.1667 9.99992Z" stroke="#1E1E1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </g>
                <defs>
                  <clipPath id="clip0_desktop"><rect width="20" height="20" fill="white" /></clipPath>
                </defs>
              </svg>
              <svg className="w-1.5 h-1.5" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="4" cy="4" r="4" fill="#17AC3C" />
              </svg>
              <span className="text-[15px] font-bold tracking-[1.02px] whitespace-nowrap">
                Sunny 18° F
              </span>
            </div>
            <div className="text-[15px] font-bold tracking-[1.02px] whitespace-nowrap mt-0.5 text-gray-600">
              Volume XCI No. 22
            </div>
          </div>

          {/* Center: Logo */}
          <div className="flex-1 flex justify-center px-4">
             <div className="relative h-[75px] w-full max-w-[500px]">
              <Image
                src="/logo.svg"
                alt="The Polytechnic"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* Right: Date */}
          <div className="w-[210px] h-[75px] flex items-center justify-end text-[15px] font-bold tracking-[1.02px] text-right whitespace-nowrap">
            {currentDate}
          </div>
        </div>

        {/* 3. NAVIGATION BAR */}
        <nav className="flex flex-wrap items-center justify-center mt-3 gap-8">
          {navItems.map((item) => (
            <button
              key={item}
              className="flex items-center gap-1 font-bold tracking-[1.2px] text-[15px] text-black hover:text-[#D6001C] transition-colors group whitespace-nowrap uppercase"
            >
              {item}
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#D6001C]" strokeWidth={2.5} />
            </button>
          ))}
        </nav>

        {/* Divider */}
        <div className="w-full h-[2px] bg-black mt-3"></div>
      </header>
    </>
  );
}
