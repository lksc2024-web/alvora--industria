# ALVORA — From Origin to Cup

**Status:** fictional coffee-industry brand / interactive technical demonstration. ALVORA is not a registered operating company or a product for sale.

## Overview

A scroll-driven 3D narrative following coffee from the fruit through harvesting, drying, roasting, grinding, and espresso preparation. The experience explores a cinematic presentation while documenting accessibility and progressive fallback behavior.

## Stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS 4
- Three.js, React Three Fiber, Drei
- GSAP / ScrollTrigger
- Playwright-based QA scripts

## Architecture

- `src/app/` — page composition, metadata, styles, sitemap and robots
- `src/components/` — content and interactive page sections
- `src/three/` — geometry, shaders, scenes and canvas wrapper
- `src/lib/` — site content, motion, WebGL and viewport hooks
- `qa/` — browser audit and smoke scripts
- `DECISOES.md` — engineering decisions and known limitations

## Local setup

```bash
npm ci
npm run dev
# open http://localhost:3000
```

Production build (not independently executed as part of this documentation update):

```bash
npm run build
npm run start
```

## QA commands

With the application running:

```bash
QA_ONLY=fallback node qa/run-qa.mjs
QA_ONLY=webgl node qa/run-qa.mjs
```

These are documented commands, **not a claim of passing results**. Check `DECISOES.md` for pending work and limitations.

## Signature interactive sequences

The original project documentation describes three key experiences:

| Sequence | Engineering detail |
| --- | --- |
| Coffee journey (`#jornada`) | Eight scroll-controlled scenes, a cherry-to-bean geometry morph, instanced beans transitioning between layouts, and particles shifting from dust to embers, grounds, and steam |
| Roasting (`#torrefacao`) | A metallic drum, moving beans, embers, and scroll-driven roasting stages from drying through discharge |
| Espresso ritual (`#ritual`) | A macro crema simulation with spiral movement and a camera transition |

The `CoffeeThread` visual connects the pouring sequence to later content. The implementation is described in the source repository; animation quality and device performance have not been independently benchmarked.

## Engineering decisions and asset strategy

The original README documents procedural 3D geometry and shaders, including `coffeeGeometry.ts`, `morphMaterial.ts`, `shaders.ts`, and a generated canvas environment map. It describes the experience as code-driven, without paid runtime services or externally loaded 3D assets. Refer to [DECISOES.md](./DECISOES.md) for known limitations and technical trade-offs.

## Accessibility and performance approach

The repository documents reduced-motion alternatives, no-WebGL fallbacks, semantic content, and controlled rendering based on visibility. Their effectiveness still requires independent verification across browsers and devices.

## QA coverage confirmed in source

The tracked `qa/run-qa.mjs` defines **10 fallback viewport configurations** (including mobile landscape, tablets, and desktops) and **3 WebGL viewport configurations**. It records layout overflow, console and request failures, semantic landmarks, navigation and form interactions, and screenshots. The WebGL pass uses headless Chromium software rendering; its timing is **not** representative of a device GPU. These are checks implemented in source, **not passing test results**.

## Demo and screenshots

Live URL and actual screenshots: pending independent verification and inclusion. No fabricated metrics or screenshots are used.

## License and attribution

No license is asserted here. Confirm rights for any third-party materials before reuse.
