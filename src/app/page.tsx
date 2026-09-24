import { SiteHeader } from "@/components/home/SiteHeader";
import { Hero } from "@/components/home/Hero";
import { FourQuestions } from "@/components/home/FourQuestions";
import { CareerJourney } from "@/components/home/CareerJourney";
import { Faq } from "@/components/home/Faq";
import { ClosingCta } from "@/components/home/ClosingCta";
import { SiteFooter } from "@/components/home/SiteFooter";

export const dynamic = "force-dynamic";

/**
 * Public homepage.
 *
 * Structured around the product thesis rather than a feature list: state the
 * promise, name the four questions a career actually asks, then DEMONSTRATE
 * the answer with a single worked example instead of explaining it.
 *
 * Every section is a server component — the page ships no client JS. The FAQ
 * uses native <details> for the same reason.
 */
export default function Home() {
  return (
    <main className="min-h-screen bg-bg text-text">
      <SiteHeader />
      <Hero />
      <FourQuestions />
      <CareerJourney />
      <Faq />
      <ClosingCta />
      <SiteFooter />
    </main>
  );
}
