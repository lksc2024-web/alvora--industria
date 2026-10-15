/**
 * QA automatizado da experiência ALVORA.
 *
 *   node qa/run-qa.mjs [baseUrl] [outDir]
 *
 * Duas passagens:
 *   A) layout/overflow/a11y em 10 viewports, com WebGL desligado — é rápido e
 *      ao mesmo tempo valida o caminho de fallback em todos os tamanhos.
 *   B) a experiência WebGL de verdade em 3 viewports representativos. Aqui o
 *      Chromium headless renderiza por software (SwiftShader), então cada
 *      captura custa dezenas de segundos — os timeouts são generosos de
 *      propósito e NÃO representam o desempenho em uma GPU real.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = resolve(process.argv[3] ?? "qa/shots");
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: "mobile-360x800", w: 360, h: 800, mobile: true },
  { name: "mobile-390x844", w: 390, h: 844, mobile: true },
  { name: "mobile-430x932", w: 430, h: 932, mobile: true },
  { name: "mobile-landscape-844x390", w: 844, h: 390, mobile: true },
  { name: "tablet-768x1024", w: 768, h: 1024, mobile: true },
  { name: "tablet-820x1180", w: 820, h: 1180, mobile: true },
  { name: "tablet-1024x1366", w: 1024, h: 1366, mobile: true },
  { name: "desktop-1366x768", w: 1366, h: 768, mobile: false },
  { name: "desktop-1440x900", w: 1440, h: 900, mobile: false },
  { name: "desktop-1920x1080", w: 1920, h: 1080, mobile: false },
];

const WEBGL_VIEWPORTS = [
  { name: "webgl-mobile-390x844", w: 390, h: 844, mobile: true },
  { name: "webgl-tablet-820x1180", w: 820, h: 1180, mobile: true },
  { name: "webgl-desktop-1440x900", w: 1440, h: 900, mobile: false },
];

const FALLBACK_STOPS = [
  ["01-hero", 0.0],
  ["02-jornada", 0.14],
  ["03-torrefacao", 0.3],
  ["04-xicara", 0.42],
  ["05-humana", 0.54],
  ["06-produtos", 0.66],
  ["07-industria", 0.78],
  ["08-ritual", 0.88],
  ["09-conversao", 0.95],
  ["10-rodape", 1.0],
];

const WEBGL_STOPS = [
  ["01-hero", 0.0],
  ["02-jornada-fruto", 0.05],
  ["03-jornada-terreiro", 0.13],
  ["04-jornada-torra", 0.2],
  ["05-jornada-xicara", 0.27],
  ["06-torrefacao", 0.37],
  ["07-pour", 0.49],
  ["08-ritual", 0.87],
];

const IGNORE = [/favicon/i, /Download the React DevTools/i, /\[Fast Refresh\]/i];
const report = { base: BASE, startedAt: new Date().toISOString(), runs: [] };

function record(run, type, text) {
  if (IGNORE.some((r) => r.test(text))) return;
  run.messages.push({ type, text: String(text).slice(0, 400) });
}

const shot = (page, path) =>
  page.screenshot({
    path,
    timeout: 240000,
    animations: "disabled",
    caret: "hide",
    scale: "css",
  });

async function scrollTo(page, fraction, settle = 800) {
  await page.evaluate((f) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: Math.round(max * f), behavior: "instant" });
  }, fraction);
  await page.waitForTimeout(settle);
}

async function checkOverflow(page) {
  return page.evaluate(() => {
    const docW = document.documentElement.scrollWidth;
    const winW = window.innerWidth;
    const offenders = [];
    if (docW > winW + 1) {
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && (r.right > winW + 1.5 || r.left < -1.5)) {
          offenders.push(
            `<${el.tagName.toLowerCase()} class="${String(el.className).slice(0, 70)}"> ${Math.round(r.left)}..${Math.round(r.right)}`,
          );
          if (offenders.length > 5) break;
        }
      }
    }
    return { docW, winW, overflow: docW > winW + 1, offenders };
  });
}

function wire(page, run) {
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") record(run, m.type(), m.text());
  });
  page.on("pageerror", (e) => record(run, "pageerror", e.message));
  page.on("requestfailed", (r) =>
    record(run, "requestfailed", `${r.url()} — ${r.failure()?.errorText}`),
  );
}

/* ---------------- A) layout + fallback, sem WebGL ------------------- */

async function runFallback(browser, vp) {
  const run = { viewport: vp.name, mode: "sem-webgl", messages: [], checks: {}, stops: [] };
  const context = await browser.newContext({
    viewport: { width: vp.w, height: vp.h },
    deviceScaleFactor: vp.mobile ? 2 : 1,
    isMobile: vp.mobile,
    hasTouch: vp.mobile,
    locale: "pt-BR",
  });
  await context.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      const t = String(type);
      if (t.includes("webgl") || t.includes("experimental")) return null;
      return orig.call(this, type, ...rest);
    };
  });
  const page = await context.newPage();
  wire(page, run);

  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForLoadState("networkidle", { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1200);

  const dir = resolve(OUT, vp.name);
  mkdirSync(dir, { recursive: true });

  let worst = null;
  for (const [label, f] of FALLBACK_STOPS) {
    await scrollTo(page, f, 650);
    const ov = await checkOverflow(page);
    run.stops.push({ label, docW: ov.docW, winW: ov.winW, overflow: ov.overflow, offenders: ov.offenders });
    if (ov.overflow && !worst) worst = { label, ...ov };
    await shot(page, resolve(dir, `${label}.png`));
  }
  run.checks.horizontalOverflow = worst ?? false;
  run.checks.canvases = await page.evaluate(() => document.querySelectorAll("canvas").length);
  run.checks.docHeight = await page.evaluate(() => document.documentElement.scrollHeight);

  run.checks.semantics = await page.evaluate(() => {
    const h1 = [...document.querySelectorAll("h1")].map((n) => n.textContent?.trim());
    const imgs = [...document.querySelectorAll("img")];
    const anchors = [...document.querySelectorAll("a[href^='#']")].map((a) => a.getAttribute("href"));
    return {
      h1Count: h1.length,
      h1: h1[0] ?? null,
      h2Count: document.querySelectorAll("h2").length,
      h3Count: document.querySelectorAll("h3").length,
      images: imgs.length,
      missingAlt: imgs.filter((i) => !i.getAttribute("alt")).length,
      brokenAnchors: anchors.filter((h) => h && h !== "#" && !document.querySelector(h)),
      lang: document.documentElement.lang,
      title: document.title,
      landmarks: {
        header: document.querySelectorAll("header").length,
        main: document.querySelectorAll("main").length,
        footer: document.querySelectorAll("footer").length,
        nav: document.querySelectorAll("nav").length,
      },
    };
  });

  // formulário demonstrativo
  await page.evaluate(() => document.querySelector("#contato")?.scrollIntoView());
  await page.waitForTimeout(500);
  try {
    await page.getByRole("button", { name: /Enviar \(demonstrativo\)/i }).click({ timeout: 10000 });
    await page.waitForTimeout(400);
    const txt = await page.getByRole("status").first().textContent();
    run.checks.form = { submitted: true, notice: (txt ?? "").trim().slice(0, 180) };
    await shot(page, resolve(dir, "11-formulario.png"));
  } catch (e) {
    run.checks.form = { submitted: false, error: String(e).slice(0, 180) };
  }

  // menu mobile
  if (vp.w < 1024) {
    try {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(300);
      await page.getByRole("button", { name: /Abrir menu/i }).click({ timeout: 8000 });
      await page.waitForTimeout(400);
      run.checks.mobileMenu = await page.evaluate(() => {
        const m = document.querySelector("#menu-mobile");
        return { open: m ? !m.hasAttribute("hidden") : false, links: m?.querySelectorAll("a").length ?? 0 };
      });
      await shot(page, resolve(dir, "12-menu.png"));
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    } catch (e) {
      run.checks.mobileMenu = { error: String(e).slice(0, 160) };
    }
  }

  // navegação por âncora + foco por teclado
  try {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    const before = await page.evaluate(() => window.scrollY);
    await page.evaluate(() => document.querySelector("#produtos")?.scrollIntoView());
    await page.waitForTimeout(700);
    const after = await page.evaluate(() => window.scrollY);
    run.checks.anchorNav = { moved: after > before + 100 };
  } catch {
    run.checks.anchorNav = { moved: false };
  }

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.keyboard.press("Tab");
  await page.waitForTimeout(250);
  run.checks.firstFocus = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const s = getComputedStyle(el);
    return {
      tag: el.tagName.toLowerCase(),
      text: (el.textContent ?? "").trim().slice(0, 40),
      outlineVisible: s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0,
    };
  });

  await context.close();
  return run;
}

/* ---------------- B) experiência WebGL real -------------------------- */

async function runWebGL(browser, vp) {
  const run = { viewport: vp.name, mode: "webgl", messages: [], checks: {}, stops: [] };
  const context = await browser.newContext({
    viewport: { width: vp.w, height: vp.h },
    deviceScaleFactor: 1,
    isMobile: vp.mobile,
    hasTouch: vp.mobile,
    locale: "pt-BR",
  });
  // força o perfil de qualidade baixo: o QA roda em WebGL por software
  await context.addInitScript(() => {
    window.__ALVORA_TIER__ = "low";
  });
  const page = await context.newPage();
  wire(page, run);

  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(4000);

  const dir = resolve(OUT, vp.name);
  mkdirSync(dir, { recursive: true });

  for (const [label, f] of WEBGL_STOPS) {
    await scrollTo(page, f, 2200);
    const ov = await checkOverflow(page);
    run.stops.push({ label, overflow: ov.overflow, offenders: ov.offenders });
    const canvases = await page.evaluate(() => {
      const live = [...document.querySelectorAll("canvas")];
      return live.map((c) => ({
        size: `${c.width}x${c.height}`,
        visible: c.getBoundingClientRect().top < window.innerHeight && c.getBoundingClientRect().bottom > 0,
      }));
    });
    run.stops[run.stops.length - 1].canvases = canvases;
    await shot(page, resolve(dir, `${label}.png`));
    process.stdout.write(`    ${label} ok\n`);
  }

  run.checks.horizontalOverflow = run.stops.find((s) => s.overflow) ?? false;
  run.checks.contexts = await page.evaluate(() => document.querySelectorAll("canvas").length);
  run.checks.webgl2 = await page.evaluate(
    () => !!document.createElement("canvas").getContext("webgl2"),
  );
  await context.close();
  return run;
}

/* ---------------- C) movimento reduzido ------------------------------ */

async function runReduced(browser) {
  const run = { viewport: "reduced-motion-1440x900", mode: "reduced", messages: [], checks: {}, stops: [] };
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
    locale: "pt-BR",
  });
  const page = await context.newPage();
  wire(page, run);
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForLoadState("networkidle", { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1500);

  const dir = resolve(OUT, "reduced-motion");
  mkdirSync(dir, { recursive: true });
  run.checks.canvases = await page.evaluate(() => document.querySelectorAll("canvas").length);
  run.checks.docHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  for (const [label, f] of [
    ["01-hero", 0],
    ["02-jornada", 0.16],
    ["03-torrefacao", 0.32],
    ["04-xicara", 0.45],
    ["05-produtos", 0.68],
    ["06-conversao", 0.95],
  ]) {
    await scrollTo(page, f, 600);
    await shot(page, resolve(dir, `${label}.png`));
  }
  const ov = await checkOverflow(page);
  run.checks.horizontalOverflow = ov.overflow ? ov : false;
  await context.close();
  return run;
}

/* -------------------------------------------------------------------- */

const browser = await chromium.launch({
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
  ],
});

const only = process.env.QA_ONLY ?? "all";

if (only === "all" || only === "fallback") {
  for (const vp of VIEWPORTS) {
    process.stdout.write(`→ [layout] ${vp.name}\n`);
    report.runs.push(await runFallback(browser, vp));
  }
  process.stdout.write("→ [reduced-motion]\n");
  report.runs.push(await runReduced(browser));
}

if (only === "all" || only === "webgl") {
  for (const vp of WEBGL_VIEWPORTS) {
    process.stdout.write(`→ [webgl] ${vp.name}\n`);
    report.runs.push(await runWebGL(browser, vp));
  }
}

await browser.close();

report.finishedAt = new Date().toISOString();
report.summary = {
  runs: report.runs.length,
  comOverflow: report.runs.filter((r) => r.checks.horizontalOverflow).map((r) => r.viewport),
  comErroDePagina: report.runs
    .filter((r) => r.messages.some((m) => m.type === "pageerror"))
    .map((r) => r.viewport),
  totalMensagens: report.runs.reduce((a, r) => a + r.messages.length, 0),
};

writeFileSync(
  resolve(OUT, `report-${only}.json`),
  JSON.stringify(report, null, 2),
);

console.log("\n=== RESUMO ===");
console.log(JSON.stringify(report.summary, null, 2));
for (const r of report.runs) {
  const errs = r.messages.filter((m) => m.type === "pageerror" || m.type === "error");
  console.log(
    `${r.viewport.padEnd(26)} overflow=${r.checks.horizontalOverflow ? "SIM" : "não"}  erros=${errs.length}  ${JSON.stringify(r.checks.form ?? r.checks.contexts ?? "")}`,
  );
  for (const e of errs.slice(0, 5)) console.log(`    [${e.type}] ${e.text}`);
}
