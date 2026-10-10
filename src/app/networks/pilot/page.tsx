import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/home/SiteHeader";
import { SiteFooter } from "@/components/home/SiteFooter";
import { PILOT_EMAIL, PILOT_SUBJECT } from "@/components/home/links";
import { CopyEmail } from "./CopyEmail";

export const metadata: Metadata = {
  title: "Run a pilot | ASCENDR Networks",
  description: "Talk to us about piloting ASCENDR Networks with your fund, accelerator or university.",
};

/**
 * Pilot contact page. "Run a pilot" used to be a bare mailto: link, which does
 * nothing on a computer with no mail app set up. This page always works: it
 * shows the address, copies it, and opens Gmail or the default mail app.
 */
export default function PilotPage() {
  const subject = encodeURIComponent(PILOT_SUBJECT);
  const body = encodeURIComponent(
    "Organisation:\nType (fund, accelerator, university, other):\nApproximate network size:\nWhat you want to measure:\n"
  );
  const mailto = `mailto:${PILOT_EMAIL}?subject=${subject}&body=${body}`;
  const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(PILOT_EMAIL)}&su=${subject}&body=${body}`;

  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <main className="px-4 py-16 md:px-6 md:py-24">
        <div className="mx-auto max-w-xl rounded-3xl border border-ink/10 bg-white p-8 md:p-10">
          <p className="text-[13px] font-medium uppercase tracking-wide text-text-secondary">ASCENDR Networks</p>
          <h1 className="mt-2 text-[32px] font-semibold leading-tight text-ink md:text-[40px]">Run a pilot</h1>
          <p className="mt-4 text-[16px] leading-relaxed text-text-secondary">
            We are working with a small number of funds, accelerators and universities. Email us with your
            organisation, roughly how many people are in your network, and what you want to measure. We reply
            within two working days.
          </p>

          <div className="mt-6 rounded-2xl bg-surface px-4 py-3">
            <p className="text-[12px] text-text-secondary">Email</p>
            <p className="select-all break-all text-[17px] font-medium text-ink">{PILOT_EMAIL}</p>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a
              href={gmail}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-ink px-6 py-3 text-[15px] font-medium text-white transition-colors hover:bg-ink-700"
            >
              Write in Gmail
            </a>
            <a
              href={mailto}
              className="inline-flex items-center justify-center rounded-full border border-ink/15 bg-white px-6 py-3 text-[15px] font-medium text-ink transition-colors hover:border-ink/40"
            >
              Open mail app
            </a>
            <CopyEmail email={PILOT_EMAIL} />
          </div>

          <p className="mt-8 text-[14px] text-text-secondary">
            Want to see it first?{" "}
            <Link href="/networks#demo" className="font-medium text-ink underline-offset-4 hover:underline">
              Try the interactive demo
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
