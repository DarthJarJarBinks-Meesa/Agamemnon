import { Hero } from "@/components/Hero";
import { MarketingShell } from "@/components/MarketingShell";
import { OfferingsCarousel } from "@/components/OfferingsCarousel";
import { Platforms } from "@/components/Platforms";
import { ProductSections } from "@/components/ProductSections";

export default function Home() {
  return (
    <MarketingShell>
      <main>
        <Hero />
        <OfferingsCarousel />
        <ProductSections />
        <Platforms />
      </main>
    </MarketingShell>
  );
}
