import type { Metadata } from "next";
import { Instrument_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";

/**
 * Typography: Instrument Sans + Instrument Serif.
 *
 * Instrument Sans is a neo-grotesk with slightly condensed, editorial
 * proportions. It reads like a product built by a design team rather than a
 * template, and holds up from 13px UI labels to 72px headlines.
 *
 * Instrument Serif is used sparingly, in italics, for one accent phrase per
 * section (via the `font-serif` utility). That contrast is what gives the page
 * an editorial, deliberate feel. Do not set whole paragraphs in it.
 *
 * Both load through next/font: self-hosted at build time, no layout shift.
 * The CSS variable names are unchanged (--font-sans), so the rest of the app
 * picks up the new face automatically.
 */
const sans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
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
  themeColor: "#0B1220",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
