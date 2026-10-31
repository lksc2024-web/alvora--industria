# ALVORA — Da origem à xícara

Experiência digital cinematográfica para uma indústria de café. A página conta
**uma única história**: um fruto vermelho na lavoura atravessa a colheita, a
secagem, a torra, a moagem e o preparo até cair numa xícara — e a transformação
acontece, literalmente, enquanto você rola a página.

> **ALVORA é uma marca fictícia**, criada para este projeto demonstrativo.
> Não existe empresa, CNPJ, domínio, canal de atendimento ou produto à venda.

## Como rodar

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run start
```

## Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS v4** (tokens em `@theme`, via `@tailwindcss/postcss`)
- **three.js 0.186** + **@react-three/fiber 9** + **@react-three/drei 10**
- **GSAP 3 / ScrollTrigger** — apenas para ler o progresso de cada seção
- **Playwright** para o QA automatizado

Nenhum serviço pago e nenhum asset externo em runtime. As cenas da abertura,
da jornada, da torrefação e da xícara usam fotografias realistas geradas pelo
cliente no ChatGPT (`public/foto/`), animadas em WebGL pelo `PhotoStage`:
profundidade calculada, parallax, líquido escorrendo, crema girando, vapor e
brasas. Nenhum vídeo.

## Estrutura

```
src/
  app/
    layout.tsx          metadados, Open Graph, fontes
    page.tsx            composição dos atos
    globals.css         design system (cores, tipografia, utilitários)
    sitemap.ts robots.ts
  lib/
    site.ts             ÚNICA fonte de textos, imagens e config comercial
    hooks.ts            reduced-motion, WebGL, visibilidade, scroll, qualidade
  components/
    SiteHeader  HeroSection  CoffeeJourney  RoastingExperience
    CoffeePour  CoffeeThread HumanExperience RitualExperience
    ProductShowcase IndustrySection ConversionSection SiteFooter
  three/
    coffeeGeometry.ts   fruto ↔ grão na mesma malha, xícara, pires, folha
    morphMaterial.ts    material com morph + rampa de torra
    shaders.ts          fundo, partículas, fio de café, crema
    useStudioEnv.ts     environment map gerado em canvas (sem HDR externo)
    SceneCanvas.tsx     wrapper de Canvas com loop controlado por visibilidade
    HeroScene  JourneyScene  RoastScene  PourScene  RitualScene
qa/
  run-qa.mjs            varredura de dispositivos, overflow, a11y, formulário
  smoke.mjs             teste rápido de uma viewport
```

## Os três momentos visuais

| # | Seção | O que acontece |
|---|---|---|
| 1 | **A jornada** (`#jornada`) | 8 cenas controladas pela rolagem. Uma malha interpola de cereja a grão; um enxame de grãos instanciados se reorganiza entre sete layouts; um sistema de partículas muda de poeira para brasa, pó e vapor. |
| 2 | **Torrefação** (`#torrefacao`) | Tambor metálico, massa de grãos tombando, brasas e luz âmbar. A rolagem é o perfil de torra: secagem → crack → desenvolvimento → descarga. |
| 3 | **O ritual** (`#ritual`) | Macro da superfície do espresso. A crema se forma em espiral e estabiliza; a câmera mergulha e se afasta. |

Entre a xícara (`#xicara`) e a seção humana, um fio de café continua descendo
pela calha lateral (`CoffeeThread`), costurando as duas seções.

## Acessibilidade e fallbacks

- `prefers-reduced-motion` e ausência de WebGL trocam as seções fixadas por
  versões editoriais completas — mesma narrativa, mesmo conteúdo.
- A jornada de 8 cenas existe em `sr-only` como lista ordenada.
- Skip link, foco visível, `lang="pt-BR"`, `alt` em todas as imagens.

## QA

```bash
npm run start                       # em um terminal
QA_ONLY=fallback node qa/run-qa.mjs # layout/a11y em 10 viewports
QA_ONLY=webgl    node qa/run-qa.mjs # a experiência 3D em 3 viewports
```

Resultados e screenshots vão para `qa/shots/` (fora do versionamento).

Veja [DECISOES.md](./DECISOES.md) para o registro de decisões, limitações
conhecidas e pendências.
