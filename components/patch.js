const fs = require('fs');
const file = 'Header.tsx';

if (fs.existsSync(file) === false) {
  console.error(file + ' not found.');
  process.exit(1);
}

let code = fs.readFileSync(file, 'utf8');

// Broadened regex to catch the button regardless of its current class names
const regex = /<button[^>]*rainbow-search-trigger[\s\S]*?<\/button>/;

const replacement = `<button 
                className="group rainbow-search-trigger relative flex h-8 cursor-pointer items-center justify-center rounded-full p-[1px] overflow-hidden text-text-main" 
                onClick={() => setIsSearchOverlayOpen(true)}
              >
                {/* The spinning rainbow background - only visible on hover */}
                <span className="absolute left-1/2 top-1/2 aspect-square w-[300%] -translate-x-1/2 -translate-y-1/2 animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_0deg,#ef4444,#f59e0b,#10b981,#3b82f6,#8b5cf6,#ef4444)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                
                {/* Content span with NO background (transparent middle) */}
                <span className="relative flex h-full w-full items-center gap-1.5 rounded-full px-3 transition-shadow group-hover:[text-shadow:0_0_1px_rgba(0,0,0,0.5)]">
                  <Search className="rainbow-search-trigger__icon h-3.5 w-3.5 shrink-0" />
                  <span className="rainbow-search-trigger__content whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.1em]">Search</span>
                </span>
              </button>`;

if (regex.test(code)) {
  fs.writeFileSync(file, code.replace(regex, replacement));
  console.log('Spliced bigger, hover-only, hollow rainbow search button into Header.tsx');
} else {
  console.error('Target search button block not found.');
}
