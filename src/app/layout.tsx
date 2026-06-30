import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ASCENDR — The Global AI Career Growth Ecosystem",
  description:
    "Accelerate Your Career with AI and World-Class Mentors. Learning, mentorship, community, networking, hiring, and enterprise talent development in one AI-powered platform.",
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
