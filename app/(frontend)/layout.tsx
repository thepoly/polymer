import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Cinzel } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import HeaderTransitionProvider from "@/components/HeaderTransitionProvider";
import SiteAnalytics, { AnalyticsUser } from "@/components/analytics/SiteAnalytics";
import WebVitals from "@/components/analytics/WebVitals";
import { cookies, headers } from "next/headers";
import { getPayload } from "payload";
import configPromise from "@/payload.config";
import { User } from "@/payload-types";
import ThemeStyle from "@/components/ThemeStyle";
import MobileScrollHeader from "@/components/MobileScrollHeader";
import { getTheme } from "@/lib/getTheme";
import { getSeo } from "@/lib/getSeo";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const bebasNeuePro = localFont({
  src: [
    {
      path: "../../public/fonts/bebas-neue-pro/Bebas Neue Pro Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/bebas-neue-pro/Bebas Neue Pro Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-display-news",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeo()

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://poly.rpi.edu'),
    applicationName: seo.siteIdentity.siteName,
    title: {
      default: seo.siteIdentity.defaultTitle,
      template: `%s | ${seo.siteIdentity.titleSuffix}`,
    },
    description: seo.siteIdentity.defaultDescription,
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: seo.siteIdentity.appleWebAppTitle,
    },
    formatDetection: {
      telephone: false,
    },
    openGraph: {
      type: 'website',
      siteName: seo.siteIdentity.siteName,
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
    },
    alternates: {
      types: {
        'application/rss+xml': [
          { url: '/feed', title: seo.siteIdentity.siteName },
        ],
      },
    },
    icons: {
      icon: [
        {
          url: '/dynamicPfavicon.svg',
          type: 'image/svg+xml',
        },
      ],
      apple: [
        {
          url: '/static-app-icon.svg',
          type: 'image/svg+xml',
        },
      ],
    },
  }
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("theme")?.value;

  const isDarkMode = themeCookie === "dark";

  const siteTheme = await getTheme();

  // Fetch current user if logged in
  const payload = await getPayload({ config: configPromise });
  const headersList = await headers();
  const { user: authUser } = await payload.auth({ headers: headersList });

  let analyticsUser: AnalyticsUser | null = null;
  if (authUser) {
    try {
      const user = await payload.findByID({
        collection: "users",
        id: authUser.id,
        depth: 0,
        disableErrors: true,
      }) as User | null;

      if (user) {
        analyticsUser = {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roles: user.roles,
          slug: user.slug,
          blackTheme: user.blackTheme,
          has_bio: !!user.bio,
          position_count: user.positions?.length || 0,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        };
      }
    } catch (err) {
      console.error("[RootLayout] Failed to fetch user for analytics:", err);
    }
  }

  return (
    <html lang="en" className={isDarkMode ? "dark" : ""}>
      <head>
        <ThemeStyle lightMode={siteTheme.lightMode} darkMode={siteTheme.darkMode} />
        <link
          rel="preload"
          href="/fonts/raleway/Raleway-Variable.ttf"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/raleway/Raleway-Italic-Variable.ttf"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
      </head>
      <body
        className={`${cinzel.variable} ${barlowCondensed.variable} ${bebasNeuePro.variable} antialiased`}
      >
        <ThemeProvider initialDarkMode={isDarkMode} logoSrcs={siteTheme.logoSrcs}>
          <SiteAnalytics user={analyticsUser} />
          <WebVitals />
          <MobileScrollHeader />
          <HeaderTransitionProvider>{children}</HeaderTransitionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
