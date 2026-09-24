import type { Metadata } from "next";
import { Manrope, Source_Sans_3 } from "next/font/google";
import "./globals.css";

/**
 * Type pairing.
 *
 * Manrope — brand, headings, navigation, buttons, numbers. Slightly narrow
 * with tight apertures, so it reads as considered rather than defaulted.
 *
 * Source Sans 3 — body copy, descriptions, forms, dashboards. A humanist face
 * with taller x-height and more open counters, which holds up at 14–16px in
 * dense UI far better than a geometric sans does.
 *
 * Loaded with next/font rather than a CSS @import: Next downloads the files at
 * build time and self-hosts them, so there is no request to Google at runtime,
 * no flash of unstyled text, and no layout shift. `display: swap` plus the
 * automatic size-adjust fallback keeps text visible during load.
 *
 * Both are variable fonts — one file covers every weight in the range, so
 * adding a weight below costs nothing extra to download.
 */

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ascendr-two.vercel.app";

const TITLE = "ASCENDR — Your Network. Your Skills. Your Next Opportunity.";
const DESCRIPTION =
  "ASCENDR is an AI-powered career intelligence platform that connects your goals, skills, mentors, professional network and opportunities — helping you turn career ambition into measurable progress.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "ASCENDR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export const viewport = {
  themeColor: "#4000F9",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${manrope.variable} ${sourceSans.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
