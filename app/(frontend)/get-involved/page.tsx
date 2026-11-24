import type { Metadata } from 'next';
import { ArrowDown, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import DeskList from '@/components/GetInvolved/DeskList';
import CopyButton from '@/components/GetInvolved/CopyButton';
import PhotoWindow from '@/components/PhotoWindow';
import Peephole, { PHOTO_POSITION_CLASSES, type PagePhoto } from '@/components/GetInvolved/Peephole';
import { getInvolvedPage } from '@/lib/getInvolvedPage';
import { photoPositionVars } from '@/components/GetInvolved/photoPositions';

export const metadata: Metadata = {
  title: 'Get involved',
  description: "Join The Polytechnic's staff, submit an op-ed or letter, or send a news tip.",
  alternates: { canonical: '/get-involved' },
};

const focusStyle = 'focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2';
// Primary buttons are openings onto the page photo (see PrimaryLabel).
const primaryStyle = `group relative inline-flex min-h-12 w-full items-center justify-center px-5 py-3 font-meta text-[13px] font-bold uppercase tracking-[0.08em] text-white md:w-auto ${focusStyle}`;

function PrimaryLabel({ children, photo }: { children: string; photo: PagePhoto }) {
  return (
    <>
      <Peephole photo={photo} scrim="bg-black/35 group-hover:bg-white" />
      <span className="relative z-10 inline-flex items-center gap-2 transition-colors group-hover:text-black">{children}<ArrowRight aria-hidden="true" className="h-4 w-4" /></span>
    </>
  );
}

function PathLabel({ children }: { children: string }) {
  return (
    <p className="flex items-center gap-3 font-meta text-[12px] font-bold uppercase tracking-[0.14em] text-text-muted">
      <span>{children}</span><span aria-hidden="true" className="h-px flex-1 bg-rule" />
    </p>
  );
}

export default async function GetInvolvedPage() {
  // The photo and its position per screen size are set by editors in the
  // Get Involved Page global. Saving it revalidates this page.
  const { photo: pagePhoto, positions } = await getInvolvedPage();
  const photo: PagePhoto = {
    ...pagePhoto,
    maxZoom: Math.max(positions.mobile.zoom, positions.tablet.zoom, positions.desktop.zoom),
  };

  return (
    <div className="min-h-screen bg-bg-main text-text-main">
      <Header flushMobileBottom />
      <main data-get-involved-page style={photoPositionVars(positions)} className="mx-auto w-full max-w-[1280px] px-5 pb-0 pt-6 md:px-6 md:pb-3 lg:pt-12 xl:px-[30px]">
        <style>{`
          @media (prefers-reduced-motion: no-preference) {
            html:has([data-get-involved-page]) { scroll-behavior: smooth; }
          }
        `}</style>
        <PhotoWindow
          src={photo}
          alt={photo.alt}
          maxZoom={photo.maxZoom}
          imageClassName={PHOTO_POSITION_CLASSES}
          className="h-[clamp(240px,42vh,400px)] lg:h-[clamp(360px,52vh,520px)]"
        >
          <div aria-hidden="true" className="absolute inset-0 z-10 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
          {photo.credit && (
            <span className="absolute right-2 top-2 z-10 bg-black/55 px-2 py-1 font-meta text-[11px] leading-none tracking-[0.02em] text-white md:right-3 md:top-3">
              {photo.credit}
            </span>
          )}
          <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-5 md:px-8 md:pb-7 lg:px-10 lg:pb-9">
            <h1 className="text-balance font-copy text-[clamp(34px,9.5vw,44px)] font-normal leading-[0.95] tracking-[-0.02em] text-white md:text-[56px] lg:text-[76px]">Get involved with The Poly</h1>
          </div>
        </PhotoWindow>

        <nav aria-label="Get involved paths" className="border-b border-rule py-1 lg:hidden">
          {[
            { label: 'Join the staff', href: '#join' },
            { label: 'Submit an op-ed or letter', href: '#opinion' },
            { label: 'Send a news tip', href: '#tip' },
          ].map(path => (
            <a key={path.href} href={path.href} className={`flex min-h-11 items-center justify-between gap-3 font-meta text-[16px] font-semibold text-text-main hover:text-accent ${focusStyle}`}>
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
                  <Link href="/contact" className={primaryStyle}><PrimaryLabel photo={photo}>Email the editors</PrimaryLabel></Link>
                  <Link href="/staff" className={`inline-flex min-h-11 items-center font-meta text-[13px] font-semibold text-accent ${focusStyle}`}>
                    <span className="border-b border-accent">Meet the current staff</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* A second peephole onto the heading card's pinned photo: both
                windows show one still image. White text in both themes over a
                dark scrim. The @container sits on the inner div, not the aside:
                a container becomes the anchor for position: fixed children, which
                would pin this photo to the box instead of the screen. */}
            <aside aria-label="Weekly meetings" className="relative order-first self-start p-5 text-white md:p-6 lg:order-none lg:row-start-2">
              <Peephole photo={photo} />
              <div className="@container relative z-10">
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
              </div>
            </aside>
          </section>

          <div className="grid min-w-0 grid-cols-1">
            <section id="opinion" aria-labelledby="opinion-heading" className="min-w-0 scroll-mt-24 pb-0 pt-8 md:pt-10 lg:pt-6">
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
              <Link href="/submit" className={`mt-6 ${primaryStyle}`}><PrimaryLabel photo={photo}>Start a submission</PrimaryLabel></Link>
            </section>

            <section id="tip" aria-labelledby="tip-heading" className="min-w-0 scroll-mt-24 pb-0 pt-6">
              <PathLabel>Send a news tip</PathLabel>
              <h2 id="tip-heading" className="mb-[18px] mt-4 font-copy text-[30px] font-normal leading-[1.1] md:text-[34px]">Seen something newsworthy?</h2>
              <div className="relative flex flex-wrap items-center gap-3 p-5 text-white">
                <Peephole photo={photo} />
                <span id="get-involved-tip-email" className="relative z-10 min-w-0 select-all font-copy text-[22px] leading-tight [overflow-wrap:anywhere]">news@poly.rpi.edu</span>
                <CopyButton photo={photo} value="news@poly.rpi.edu" targetId="get-involved-tip-email" />
              </div>
            </section>

            <div className="mt-6 grid grid-cols-1 gap-8 border-t border-rule-strong pt-6 sm:grid-cols-2">
              <div className="min-w-0">
                <h3 className="font-copy text-[22px] font-normal leading-[1.15]">Running an event?</h3>
                <p className="mt-2 font-copy text-[16px] leading-[1.45] text-text-muted">Send the details to the Features desk.</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span id="get-involved-events-email" className="select-all font-copy text-[18px]">features@poly.rpi.edu</span>
                  <CopyButton photo={photo} value="features@poly.rpi.edu" targetId="get-involved-events-email" label="Copy Features desk email address" />
                </div>
              </div>
              <div className="min-w-0">
                <h3 className="font-copy text-[22px] font-normal leading-[1.15]">Advertise with The Poly</h3>
                <p className="mt-2 font-copy text-[16px] leading-[1.45] text-text-muted">Ad rates and placements in the print edition.</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span id="get-involved-ads-email" className="select-all font-copy text-[18px]">business@poly.rpi.edu</span>
                  <CopyButton photo={photo} value="business@poly.rpi.edu" targetId="get-involved-ads-email" label="Copy advertising email address" />
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
