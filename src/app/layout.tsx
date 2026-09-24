import type { Metadata } from "next";
import "./globals.css";

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
