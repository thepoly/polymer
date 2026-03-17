import type { Metadata } from "next";
import { Barlow_Condensed, Cinzel } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import { cookies } from "next/headers";

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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://poly.rpi.edu'),
  title: {
    default: "The Polytechnic",
    template: "%s | The Polytechnic",
  },
  description: "The Polytechnic is Rensselaer Polytechnic Institute's independent student newspaper, serving the RPI community since 1885.",
  openGraph: {
    type: 'website',
    siteName: 'The Polytechnic',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
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
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value;

  const isDarkMode = theme === "dark";

  return (
    <html lang="en" className={isDarkMode ? "dark" : ""}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Raleway:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${cinzel.variable} ${barlowCondensed.variable} ${bebasNeuePro.variable} antialiased`}
      >
        <ThemeProvider initialDarkMode={isDarkMode}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
