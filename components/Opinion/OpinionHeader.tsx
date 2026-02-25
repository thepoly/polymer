'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, Search, ChevronRight } from 'lucide-react';

const navItems = ['News', 'Features', 'Opinion', 'Sports', 'Editorial', 'Checkmate', 'Archives', 'About'];

export default function OpinionHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);


  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
      <div className="relative flex items-center h-[58px] px-4 md:px-6">
        {/* Left: Hamburger menu */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
        >
          {isMobileMenuOpen ? (
            <X className="w-5 h-5 text-black" />
          ) : (
            <Menu className="w-5 h-5 text-black" />
          )}
        </button>

        {/* Center: Logo (absolutely centered) */}
        <Link href="/" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative h-[34px] w-[220px] md:h-[38px] md:w-[250px]">
            <Image
              src="/logo.svg"
              alt="The Polytechnic"
              fill
              className="object-contain"
              priority
            />
          </div>
        </Link>

        {/* Right: Search */}
        <button className="ml-auto p-2 hover:bg-gray-100 rounded transition-colors">
          <Search className="w-5 h-5 text-black" />
        </button>
      </div>

      {/* Sidebar menu */}
      {isMobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-[70] bg-black/30"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="fixed top-0 left-0 bottom-0 z-[80] w-[230px] bg-white shadow-lg border-r border-gray-200 overflow-y-auto">
            {/* Close button */}
            <div className="flex items-center h-[58px] px-4">
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-black" />
              </button>
            </div>

            <nav className="flex flex-col px-6">
              {/* Home with site logo */}
              <Link
                href="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between text-lg font-bold py-3 text-left text-black hover:text-[#D6001C] transition-all group"
              >
                Home
                <div className="relative h-[28px] w-[28px] mr-[-6px]">
                  <Image
                    src="/static-app-icon.svg"
                    alt="The Polytechnic"
                    fill
                    className="object-contain"
                  />
                </div>
              </Link>

              {navItems.map((item) => {
                if (item === 'Opinion') {
                  return (
                    <Link
                      key={item}
                      href="/opinion"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-between text-lg font-bold py-3 text-left text-black hover:text-[#D6001C] transition-all group"
                    >
                      {item} <ChevronRight className="w-5 h-5 text-black group-hover:text-[#D6001C]" />
                    </Link>
                  );
                }
                return (
                  <button key={item} className="flex items-center justify-between text-lg font-bold py-3 text-left text-black hover:text-[#D6001C] transition-all group">
                    {item} <ChevronRight className="w-5 h-5 text-black group-hover:text-[#D6001C]" />
                  </button>
                );
              })}
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
