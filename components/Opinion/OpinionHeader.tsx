import Link from 'next/link';
import Image from 'next/image';
import { Search } from 'lucide-react';

export default function OpinionHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
      <div className="relative flex items-center h-[58px] px-4 md:px-6">
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
    </header>
  );
}
