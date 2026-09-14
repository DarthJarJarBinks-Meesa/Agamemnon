import { Hero } from "@/components/Hero";
import { OfferingsCarousel } from "@/components/OfferingsCarousel";
import { Platforms } from "@/components/Platforms";
import { ProductSections } from "@/components/ProductSections";
import { RequestAccessProvider } from "@/components/RequestAccessModal";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function Home() {
  return (
    <RequestAccessProvider>
      <div id="top" className="min-h-screen bg-bg text-fg">
        <SiteHeader />
        <main>
          <Hero />
          <OfferingsCarousel />
          <ProductSections />
          <Platforms />
        </main>
        <SiteFooter />
      </div>
    </RequestAccessProvider>
  );
}
