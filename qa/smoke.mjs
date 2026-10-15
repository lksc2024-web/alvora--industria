import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = resolve(process.argv[3] ?? "qa/smoke");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
  ],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "pt-BR" });
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
page.on("console", (m) => {
  if (m.type() === "error") errs.push("console: " + m.text());
});

let t = Date.now();
await page.goto(BASE, { waitUntil: "load", timeout: 60000 });
console.log("load:", Date.now() - t, "ms");
await page.waitForTimeout(3000);

t = Date.now();
await page.screenshot({
  path: resolve(OUT, "hero.png"),
  timeout: 120000,
  animations: "disabled",
  caret: "hide",
  scale: "css",
});
console.log("screenshot hero:", Date.now() - t, "ms");

const info = await page.evaluate(() => ({
  canvases: [...document.querySelectorAll("canvas")].map((c) => `${c.width}x${c.height}`),
  webgl2: !!document.createElement("canvas").getContext("webgl2"),
  docHeight: document.documentElement.scrollHeight,
  title: document.title,
  h1: document.querySelector("h1")?.textContent,
}));
console.log(JSON.stringify(info, null, 2));

await page.evaluate(() => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  window.scrollTo({ top: Math.round(max * 0.16), behavior: "instant" });
});
await page.waitForTimeout(1500);
t = Date.now();
await page.screenshot({
  path: resolve(OUT, "jornada.png"),
  timeout: 120000,
  animations: "disabled",
  caret: "hide",
  scale: "css",
});
console.log("screenshot jornada:", Date.now() - t, "ms");

console.log("ERROS:", errs.length);
errs.slice(0, 12).forEach((e) => console.log("  " + e));

await browser.close();
