import { CoffeeJourney } from "@/components/CoffeeJourney";
import { CoffeeThread } from "@/components/CoffeeThread";
import { ConversionSection } from "@/components/ConversionSection";
import { HeroSection } from "@/components/HeroSection";
import { HumanExperience } from "@/components/HumanExperience";
import { IndustrySection } from "@/components/IndustrySection";
import { ProductShowcase } from "@/components/ProductShowcase";
import { RitualExperience } from "@/components/RitualExperience";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function Home() {
  return (
    <>
      <SiteHeader />

      <main id="conteudo">
        {/* Ato I — o nascimento do café */}
        <HeroSection />

        {/* Ato II — a transformação inteira, da cereja à xícara, numa descida só:
            fruto, semente, tambor, moagem, preparo e o café caindo na xícara */}
        <CoffeeJourney />

        {/* Ato IV — o fio que desce da xícara e costura a seção humana */}
        <div className="relative">
          <CoffeeThread />
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
