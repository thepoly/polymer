import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy policy for The Polytechnic.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-bg-main transition-colors duration-300">
      <Header />
      <div className="mx-auto max-w-[680px] px-4 pb-20 pt-6 md:px-6 md:pt-8">
        <div className="mb-8 text-center">
          <h1 className="font-meta font-bold uppercase tracking-[0.02em] leading-[0.9] text-[36px] sm:text-[48px] md:text-[56px]">
            <span className="text-[#b7d7f5] dark:text-[#b7d7f5]">Privacy</span>{' '}
            <span className="text-[#b7d7f5] dark:text-[#b7d7f5]">Policy</span>
          </h1>
          <p className="font-copy text-xl italic leading-relaxed text-text-main dark:text-[#CCCCCC] mt-3 transition-colors">
            Last updated April 4, 2026.
          </p>
        </div>
        <div className="space-y-5 font-copy text-xl leading-relaxed text-text-main dark:text-[#CCCCCC] transition-colors">
          <p>
            We are The Polytechnic, RPI&apos;s student newspaper. We take seriously both the trust
            you place in us when you read our work and the responsibility that comes with running our
            website.
          </p>
          <p>
            When you visit poly.rpi.edu, we do not store any personally identifying information. We
            do not store your IP address. We use two functional cookies across our entire site, both
            expiring after a year. One remembers your dark or light mode preference. Another
            remembers whether you have seen our homepage dark mode prompt, so we do not show it to
            you again.
          </p>
          <p>
            We have no advertising partners and do not share anything with data brokers or marketing
            platforms. We link to outside sites from time to time; we&apos;re not responsible for
            what they do. If you are a Polytechnic staff member who logs into the CMS, our
            publishing platform sets a session cookie to keep you logged in, which expires when you
            log out — and our analytics system identifies you by name, email, and role for editorial
            and operational purposes.
          </p>
          <p>
            Our analytics are session-only. A temporary anonymous identifier is created when you
            open the site and discarded when you close your tab. We cannot track you across visits,
            and we have no interest in doing so.
          </p>
          <p>
            These analytics are run through PostHog to understand how people use the site. That
            means we collect things like which articles get read, how search gets used, what device
            and browser you&apos;re on, roughly where in the world you are (city and country,
            derived from your IP), which links you click, and how long you spend reading. If you
            copy text from an article, that text is also captured as an event. Analytics traffic is
            proxied through our own servers before reaching PostHog Cloud, which derives geolocation
            from your IP server-side but does not store it as part of any event record. PostHog does
            not use any of this for advertising or cross-site profiling,{' '}
            <a
              href="https://posthog.com/privacy"
              className="text-accent underline underline-offset-2 transition-colors"
            >
              per their privacy policy
            </a>
            .
          </p>
          <p>
            We will disclose information if legally required to do so, and will update this page if
            our privacy practices change.
          </p>
          <p>
            Questions? Reach out to us at{' '}
            <a
              href="mailto:tech@poly.rpi.edu"
              className="text-accent underline underline-offset-2 transition-colors"
            >
              tech@poly.rpi.edu
            </a>
            , or write to us at:
          </p>
          <address className="not-italic leading-[1.8]">
            The Rensselaer Polytechnic<br />
            Rensselaer Union<br />
            110 8th Street<br />
            Troy, NY 12180
          </address>
        </div>
      </div>
      <Footer />
    </main>
  );
}
