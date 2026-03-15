import type { Metadata } from "next";
import { Cinzel, EB_Garamond, Source_Serif_4, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import { cookies } from "next/headers";
// START TEMPORARY OVERLAY IMPORT
// import AlphaOverlay from "@/components/AlphaOverlay";
// END TEMPORARY OVERLAY IMPORT

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
});

const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
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

  // CHANGED: Now it defaults to false (light) unless the cookie explicitly says "dark"
  const isDarkMode = theme === "dark";

  return (
    <html lang="en" className={isDarkMode ? "dark" : ""}>
      <body
        className={`${cinzel.variable} ${ebGaramond.variable} ${sourceSerif.variable} ${sourceSans.variable} antialiased`}
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
