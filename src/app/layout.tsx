import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

/**
 * Typeface: Outfit.
 *
 * Matched to the reference site (getro.com), whose face is a geometric sans
 * in the Circular Std / Gilroy class — single-story 'a', circular 'o',
 * straight-tailed 'y', slant-cut 't'. Those are commercial licences, so
 * Outfit is the closest freely-licensable equivalent: same geometric
 * skeleton, single-story 'a', and a taller x-height than Poppins, which
 * keeps it legible at UI sizes.
 *
 * ONE family for both headings and body, which is what the reference does.
 * A geometric sans is lower-contrast and more uniform than a humanist one,
 * so it depends on SIZE and LEADING for readability, not on a second face.
 * That is why body copy here is 18px at 1.7 line-height rather than 16/1.6 —
 * shrink it back and this face gets hard to read. See tailwind.config.ts.
 *
 * Loaded via next/font: self-hosted at build time, no runtime request to
 * Google, no flash of unstyled text, no layout shift.
 */
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
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
    <html lang="en" className={outfit.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
