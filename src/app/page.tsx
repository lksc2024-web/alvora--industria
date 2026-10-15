import { CoffeeJourney } from "@/components/CoffeeJourney";
import { CoffeePour } from "@/components/CoffeePour";
import { CoffeeThread } from "@/components/CoffeeThread";
import { ConversionSection } from "@/components/ConversionSection";
import { HeroSection } from "@/components/HeroSection";
import { HumanExperience } from "@/components/HumanExperience";
import { IndustrySection } from "@/components/IndustrySection";
import { ProductShowcase } from "@/components/ProductShowcase";
import { RitualExperience } from "@/components/RitualExperience";
import { RoastingExperience } from "@/components/RoastingExperience";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function Home() {
  return (
    <>
      <SiteHeader />

      <main id="conteudo">
        {/* Ato I — o nascimento do café */}
        <HeroSection />

        {/* Ato II — a transformação, da origem à xícara */}
        <CoffeeJourney />

        {/* Momento 01 — torrefação imersiva */}
        <RoastingExperience />

        {/* Ato III + Ato IV — o café servido e o fio que costura as duas seções */}
        <div className="relative">
          <CoffeeThread />
          <CoffeePour />
          <HumanExperience />
        </div>

        {/* Ato V — catálogo conceitual */}
        <ProductShowcase />

        {/* Ato VI — indústria e distribuição */}
        <IndustrySection />

        {/* Momento 02 — o ritual do preparo */}
        <RitualExperience />

        {/* Ato VII — conversão */}
        <ConversionSection />
      </main>

      <SiteFooter />
    </>
  );
}
