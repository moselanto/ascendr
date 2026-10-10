import { SiteHeader } from "@/components/home/SiteHeader";
import { Hero } from "@/components/home/Hero";
import { FourQuestions } from "@/components/home/FourQuestions";
import { CareerJourney } from "@/components/home/CareerJourney";
import { RoleExplorer } from "@/components/home/RoleExplorer";
import { TrustStrip } from "@/components/home/TrustStrip";
import { NetworksSection } from "@/components/home/NetworksSection";
import { PricingSection } from "@/components/home/PricingSection";
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
export default async function Home(props: { searchParams?: Promise<{ role?: string }> }) {
  const searchParams = await props.searchParams;
  return (
    <main className="min-h-screen bg-bg text-text">
      <SiteHeader />
      <Hero />
      <TrustStrip />
      <FourQuestions />
      <CareerJourney />
      <RoleExplorer selected={searchParams?.role} />
      <NetworksSection />
      <PricingSection />
      <Faq />
      <ClosingCta />
      <SiteFooter />
    </main>
  );
}
