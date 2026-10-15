/**
 * Captura dirigida das cenas WebGL, para avaliação de direção de arte.
 *   node qa/webgl-shots.mjs <baseUrl> <outDir> <w> <h> [stops csv]
 *
 * Lembrete: o headless renderiza por software. Cada captura leva dezenas de
 * segundos aqui e isso NÃO reflete o desempenho em GPU real.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const [, , BASE = "http://localhost:3000", OUTARG = "qa/webgl", W = "390", H = "844", STOPS] =
  process.argv;
const OUT = resolve(OUTARG);
mkdirSync(OUT, { recursive: true });

const DEFAULT = [
  ["01-hero", 0.0],
  ["02-fruto", 0.05],
  ["03-colheita", 0.09],
  ["04-terreiro", 0.14],
  ["05-industria", 0.18],
  ["06-torra", 0.22],
  ["07-moagem", 0.26],
  ["08-xicara", 0.3],
  ["09-torrefacao", 0.38],
  ["10-pour", 0.5],
  ["11-ritual", 0.86],
];

const stops = STOPS
  ? STOPS.split(",").map((s) => {
      const hit = DEFAULT.find((d) => d[0].includes(s));
      return hit ?? [s, Number(s)];
    })
  : DEFAULT;

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const ctx = await browser.newContext({
  viewport: { width: Number(W), height: Number(H) },
  deviceScaleFactor: 1,
  locale: "pt-BR",
});
await ctx.addInitScript(() => {
  window.__ALVORA_TIER__ = "low";
});
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
page.on("console", (m) => {
  if (m.type() === "error") errs.push("console: " + m.text());
});

await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForTimeout(4000);

for (const [label, f] of stops) {
  await page.evaluate((fr) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: Math.round(max * fr), behavior: "instant" });
  }, f);
  await page.waitForTimeout(2600);
  const t = Date.now();
  await page.screenshot({
    path: resolve(OUT, `${label}.png`),
    timeout: 300000,
    animations: "disabled",
    caret: "hide",
    scale: "css",
  });
  console.log(`${label} (${f}) — ${((Date.now() - t) / 1000).toFixed(1)}s`);
}

console.log("ERROS:", errs.length);
errs.slice(0, 10).forEach((e) => console.log("  " + e));
await browser.close();
