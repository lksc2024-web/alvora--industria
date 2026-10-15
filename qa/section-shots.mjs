/**
 * Captura uma seção fixada em pontos exatos do SEU progresso (0..1),
 * em vez de frações da página inteira.
 *   node qa/section-shots.mjs <baseUrl> <outDir> <w> <h> <#secao> <p1,p2,...>
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const [, , BASE, OUTARG, W = "390", H = "844", SEL = "#xicara", PS = "0.1,0.4,0.75"] =
  process.argv;
const OUT = resolve(OUTARG);
mkdirSync(OUT, { recursive: true });

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
page.on("console", (m) => m.type() === "error" && errs.push("console: " + m.text()));

await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForTimeout(3500);

const name = SEL.replace("#", "");
for (const raw of PS.split(",")) {
  const p = Number(raw);
  // replica o mapeamento do ScrollTrigger: start top-top, end bottom-bottom
  await page.evaluate(
    ([sel, frac]) => {
      const el = document.querySelector(sel);
      if (!el) throw new Error("seção não encontrada: " + sel);
      const rect = el.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      const travel = el.offsetHeight - window.innerHeight;
      window.scrollTo({ top: Math.round(top + travel * frac), behavior: "instant" });
    },
    [SEL, p],
  );
  await page.waitForTimeout(3200);
  const t = Date.now();
  await page.screenshot({
    path: resolve(OUT, `${name}-${String(p).replace(".", "")}.png`),
    timeout: 300000,
    animations: "disabled",
    caret: "hide",
    scale: "css",
  });
  console.log(`${name} p=${p} — ${((Date.now() - t) / 1000).toFixed(1)}s`);
}

console.log("ERROS:", errs.length);
errs.slice(0, 8).forEach((e) => console.log("  " + e));
await browser.close();
