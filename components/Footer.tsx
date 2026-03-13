import Image from "next/image";
import Link from "next/link";

const primaryLinks = [
  { label: "News", href: "/news" },
  { label: "Features", href: "/features" },
  { label: "Opinion", href: "/opinion" },
  { label: "Sports", href: "/sports" },
  { label: "Editorial", href: "/editorial" },
];

const utilityLinks = [
  { label: "Staff", href: "/staff" },
  { label: "About", href: "/about" },
  { label: "Archives", href: "/archives" },
  { label: "Contact", href: "/contact" },
  { label: "Submit", href: "/submit" },
];

export default function Footer() {
  return (
    <footer className="border-t-[3px] border-double border-border-main bg-bg-main">
      <div className="mx-auto max-w-[1280px] px-4 py-8 md:px-6 xl:px-[30px]">
        <div className="flex flex-col items-center gap-4 border-b border-border-main pb-6 md:flex-row md:justify-between">
          <div className="flex flex-col items-center md:items-start">
            <Link href="/" className="relative block h-[44px] w-[230px] sm:h-[52px] sm:w-[280px]">
              <Image
                src="/logo.svg"
                alt="The Polytechnic"
                fill
                style={{ filter: "var(--header-logo-invert)" }}
                className="object-contain"
              />
            </Link>
            <p className="font-copy mt-2 text-[14px] text-text-muted">
              Serving the Rensselaer community since 1885.
            </p>
          </div>

          <div className="font-ui flex flex-col items-center gap-1 text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted md:items-end">
            <span>Troy, New York</span>
            <span className="text-accent">Vol. XCI No. 22</span>
          </div>
        </div>

        <nav className="font-ui mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[11px] font-bold uppercase tracking-[0.18em] text-header-nav-text">
          {primaryLinks.concat(utilityLinks).map((item) => (
            <Link key={item.label} href={item.href} className="transition-colors hover:text-accent">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
