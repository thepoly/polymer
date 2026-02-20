import type { Metadata } from "next";
import { Geist, Geist_Mono, Cinzel } from "next/font/google";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import { cookies } from "next/headers";
// START TEMPORARY OVERLAY IMPORT
// import AlphaOverlay from "@/components/AlphaOverlay";
// END TEMPORARY OVERLAY IMPORT

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Polytechnic",
  description: "Serving Rensselaer Since 1885",
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
  const isDarkMode = theme === "light" ? false : true;

  return (
    <html lang="en" className={isDarkMode ? "dark" : ""}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${cinzel.variable} antialiased`}
      >
        {/* START TEMPORARY OVERLAY: Remove this component when alpha is over */}
        {/* <AlphaOverlay /> */}
        {/* END TEMPORARY OVERLAY */}
        <ThemeProvider initialDarkMode={isDarkMode}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
