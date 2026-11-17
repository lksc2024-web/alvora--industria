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

## Accessibility and performance approach

The repository documents reduced-motion alternatives, no-WebGL fallbacks, semantic content, and controlled rendering based on visibility. Their effectiveness still requires independent verification across browsers and devices.

## Demo and screenshots

Live URL and actual screenshots: pending independent verification and inclusion. No fabricated metrics or screenshots are used.

## License and attribution

No license is asserted here. Confirm rights for any third-party materials before reuse.
