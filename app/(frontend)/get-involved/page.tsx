import type { Metadata } from 'next';
import { ArrowDown, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import DeskList from '@/components/GetInvolved/DeskList';
import CopyButton from '@/components/GetInvolved/CopyButton';

export const metadata: Metadata = {
  title: 'Get involved',
  description: "Join The Polytechnic's staff, submit an op-ed or letter, or send a news tip.",
  alternates: { canonical: '/get-involved' },
};

const focusStyle = 'focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2';
const primaryStyle = `inline-flex min-h-12 w-full items-center justify-center gap-2 bg-text-main px-5 py-3 font-meta text-[13px] font-bold uppercase tracking-[0.08em] text-bg-main hover:bg-accent md:w-auto ${focusStyle}`;

function PathLabel({ children }: { children: string }) {
  return (
    <p className="flex items-center gap-3 font-meta text-[12px] font-bold uppercase tracking-[0.14em] text-text-muted">
      <span>{children}</span><span aria-hidden="true" className="h-px flex-1 bg-rule" />
    </p>
  );
}

export default function GetInvolvedPage() {
  return (
    <div className="min-h-screen bg-bg-main text-text-main">
      <Header />
      <main data-get-involved-page className="mx-auto w-full max-w-[1280px] px-5 pb-0 pt-8 md:px-6 md:pb-16 md:pt-12 lg:pb-3 xl:px-[30px]">
        <style>{`
          @media (prefers-reduced-motion: no-preference) {
            html:has([data-get-involved-page]) { scroll-behavior: smooth; }
          }
        `}</style>
        <div className="border-b border-rule-strong pb-8 md:pb-10 lg:border-b-0 lg:pb-0">
          <h1 className="font-copy text-[clamp(24px,8vw,72px)] font-normal leading-[0.95] tracking-[-0.02em] lg:text-[76px] lg:text-balance">Get involved with The Poly</h1>
        </div>

        <nav aria-label="Get involved paths" className="border-b border-rule py-4 lg:hidden">
          {[
            { label: 'Join the staff', href: '#join' },
            { label: 'Submit an op-ed or letter', href: '#opinion' },
            { label: 'Send a news tip', href: '#tip' },
          ].map(path => (
            <a key={path.href} href={path.href} className={`flex min-h-11 items-center justify-between gap-3 font-meta text-[16px] font-semibold text-text-main hover:text-accent md:text-[18px] ${focusStyle}`}>
              {path.label}<ArrowDown aria-hidden="true" className="h-4 w-4 shrink-0" />
            </a>
          ))}
        </nav>

        <div className="lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start lg:gap-x-16">
          <section id="join" aria-labelledby="join-heading" className="grid min-w-0 scroll-mt-24 grid-cols-1 gap-8 pb-2 pt-8 md:py-10 lg:gap-y-0 lg:pb-0 lg:pt-6">
            <div className="min-w-0 lg:contents">
              <div className="contents lg:block lg:pb-6">
                <PathLabel>Join the staff</PathLabel>
                <h2 id="join-heading" className="mt-4 font-copy text-[34px] font-normal leading-[1.05] md:text-[44px]">Come to a meeting.</h2>
                <p className="mt-4 font-copy text-[19px] leading-[1.55]">No application or experience needed. Pick a desk to see what it does.</p>
              </div>
              <div className="contents lg:row-start-3 lg:block">
                <DeskList />
                <div className="mt-6 flex flex-col items-start gap-4 md:flex-row md:flex-wrap md:items-center md:gap-5">
                  <Link href="/contact" className={primaryStyle}>Email the editors<ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
                  <Link href="/staff" className={`inline-flex min-h-11 items-center font-meta text-[13px] font-semibold text-accent ${focusStyle}`}>
                    <span className="border-b border-accent">Meet the current staff</span>
                  </Link>
                </div>
              </div>
            </div>

            <aside aria-label="Weekly meetings" className="@container order-first self-start bg-accent p-5 text-white dark:text-bg-main md:p-6 lg:order-none lg:row-start-2">
              <p className="font-meta text-[11px] font-bold uppercase leading-[1.4] tracking-[0.12em]">Weekly meetings · Open to everyone</p>
              <div className="mt-6 grid grid-cols-2 divide-x divide-current">
                <div className="min-w-0 pr-3 md:pr-4">
                  <p className="font-copy text-[clamp(32px,12cqw,36px)] leading-none md:text-[clamp(28px,12cqw,46px)]">Sunday</p>
                  <p className="mt-2 font-copy text-[24px] leading-tight md:text-[28px]">1 pm</p>
                  <p className="mt-3 font-meta text-[12px] leading-[1.4]">Content and business</p>
                </div>
                <div className="min-w-0 pl-3 md:pl-4">
                  <p className="font-copy text-[clamp(32px,12cqw,36px)] leading-none md:text-[clamp(28px,12cqw,46px)]">Monday</p>
                  <p className="mt-2 font-copy text-[24px] leading-tight md:text-[28px]">6 pm</p>
                  <p className="mt-3 font-meta text-[12px] leading-[1.4]">Copyediting</p>
                </div>
              </div>
              <p className="mt-6 border-t border-current pt-4 font-meta text-[13px] font-semibold">Rensselaer Union 3324</p>
            </aside>
          </section>

          <div className="grid min-w-0 grid-cols-1">
            <section id="opinion" aria-labelledby="opinion-heading" className="min-w-0 scroll-mt-24 py-8 md:py-10 lg:pt-6">
              <PathLabel>Submit an op-ed or letter</PathLabel>
              <h2 id="opinion-heading" className="mb-[18px] mt-4 font-copy text-[30px] font-normal leading-[1.1] md:text-[34px]">Share your view</h2>
              <p className="font-copy text-[18px] leading-[1.55]">Our editors review every submission and will be in touch.</p>
              <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
                <div>
                  <p className="font-meta text-[12px] font-bold uppercase tracking-[0.12em]">Letter to the editor</p>
                  <p className="mt-2 font-copy text-[16px] leading-[1.45] text-text-muted">A short response to something we published.</p>
                </div>
                <div>
                  <p className="font-meta text-[12px] font-bold uppercase tracking-[0.12em]">Op-ed</p>
                  <p className="mt-2 font-copy text-[16px] leading-[1.45] text-text-muted">A longer piece on an issue that matters to campus.</p>
                </div>
              </div>
              <Link href="/submit" className={`mt-6 ${primaryStyle}`}>Start a submission<ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
            </section>

            <section id="tip" aria-labelledby="tip-heading" className="min-w-0 scroll-mt-24 border-t border-rule pb-3 pt-8 md:py-10">
              <PathLabel>Send a news tip</PathLabel>
              <h2 id="tip-heading" className="mb-[18px] mt-4 font-copy text-[30px] font-normal leading-[1.1] md:text-[34px]">Seen something newsworthy?</h2>
              <div className="flex flex-wrap items-center gap-3 bg-[var(--opinions-choice-bg)] p-5">
                <span id="get-involved-tip-email" className="min-w-0 select-all font-copy text-[22px] leading-tight [overflow-wrap:anywhere]">news@poly.rpi.edu</span>
                <CopyButton value="news@poly.rpi.edu" targetId="get-involved-tip-email" />
              </div>
            </section>

            <div className="mt-10 grid grid-cols-1 gap-8 border-t border-rule-strong pt-6 sm:grid-cols-2">
              <div className="min-w-0">
                <h3 className="font-copy text-[22px] font-normal leading-[1.15]">Running an event?</h3>
                <p className="mt-2 font-copy text-[16px] leading-[1.45] text-text-muted">Send the details to the Features desk.</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span id="get-involved-events-email" className="select-all font-copy text-[18px]">features@poly.rpi.edu</span>
                  <CopyButton value="features@poly.rpi.edu" targetId="get-involved-events-email" label="Copy Features desk email address" />
                </div>
              </div>
              <div className="min-w-0">
                <h3 className="font-copy text-[22px] font-normal leading-[1.15]">Advertise with The Poly</h3>
                <p className="mt-2 font-copy text-[16px] leading-[1.45] text-text-muted">Ad rates and placements in the print edition.</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span id="get-involved-ads-email" className="select-all font-copy text-[18px]">business@poly.rpi.edu</span>
                  <CopyButton value="business@poly.rpi.edu" targetId="get-involved-ads-email" label="Copy advertising email address" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
