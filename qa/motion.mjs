/**
 * Regressão do bug "não aparece nenhuma animação".
 *
 * Com prefers-reduced-motion: reduce (o que o Chrome reporta no Windows
 * sempre que as animações do sistema estão desligadas), a narrativa 3D DEVE
 * continuar existindo — o que se reduz é o movimento autônomo, não a história.
 * Antes desta correção, as quatro seções caíam para a versão estática e a
 * pessoa via um site sem nenhum efeito.
 *
 *   node qa/motion.mjs [baseUrl]
 */
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "  OK  " : " FALHA"}  ${name}${detail ? " — " + detail : ""}`);
  if (!ok) failures++;
};

async function probe(label, reducedMotion) {
  console.log(`\n== ${label} ==`);
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion,
    locale: "pt-BR",
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(3000);

  const docHeight = await page.evaluate(
    () => document.documentElement.scrollHeight,
  );
  // a versão 3D é muito mais alta: as seções fixadas pedem centenas de vh
  check(`${label}: narrativa 3D presente (altura do documento)`, docHeight > 20000, `${docHeight}px`);

  // espera a hidratação: na primeira carga após subir o servidor ela pode
  // levar mais que os 3 s iniciais, sobretudo com a CPU ocupada
  let motionAttr = "(ausente)";
  for (let i = 0; i < 25; i++) {
    motionAttr = await page.evaluate(
      () => document.documentElement.dataset.motion ?? "(ausente)",
    );
    if (motionAttr !== "(ausente)") break;
    await page.waitForTimeout(600);
  }
  check(
    `${label}: data-motion no <html>`,
    motionAttr === (reducedMotion === "reduce" ? "reduced" : "full"),
    motionAttr,
  );

  // chega perto da jornada e espera o canvas existir
  await page.evaluate(() =>
    document.querySelector("#jornada")?.scrollIntoView({ behavior: "instant" }),
  );
  let canvases = 0;
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(1000);
    canvases = await page.evaluate(() => document.querySelectorAll("canvas").length);
    if (canvases > 0) break;
  }
  check(`${label}: canvas WebGL montado na jornada`, canvases > 0, `${canvases} canvas`);

  const toggle = await page.getByRole("button", { name: /anima/i }).count();
  check(`${label}: controle de animações no cabeçalho`, toggle > 0, `${toggle} botão(ões)`);

  check(`${label}: sem erro de página`, errs.length === 0, errs.slice(0, 2).join(" | "));

  await ctx.close();
}

await probe("movimento reduzido", "reduce");
await probe("movimento normal", "no-preference");

await browser.close();
console.log(`\n${failures === 0 ? "TODOS OS CHECKS PASSARAM" : failures + " CHECK(S) FALHARAM"}`);
process.exit(failures === 0 ? 0 : 1);
