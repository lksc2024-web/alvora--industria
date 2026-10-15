# ALVORA — Progresso

Arquivo de continuidade. Atualizado durante a execução.

## Estado atual

| Etapa | Estado |
|---|---|
| Ambiente verificado (Node 24, npm 11, git 2.55, Vercel CLI 59) | ✅ |
| Assets extraídos dos mosaicos (20 recortes, sem texto cortado) | ✅ |
| Marca, paleta, tipografia | ✅ |
| Design system (Tailwind v4 `@theme`) | ✅ |
| Geometria fruto ↔ grão + rampa de torra | ✅ |
| Shaders: fundo, partículas, fio de café, crema | ✅ |
| Ato I — Hero 3D + poster | ✅ |
| Ato II — Jornada em 8 cenas | ✅ |
| Momento 01 — Torrefação | ✅ |
| Ato III — Café servido + fio lateral | ✅ |
| Ato IV — Experiência humana (parallax) | ✅ |
| Ato V — Catálogo conceitual | ✅ |
| Ato VI — Indústria e distribuição | ✅ |
| Momento 02 — Ritual do preparo | ✅ |
| Ato VII — Conversão + formulário demonstrativo | ✅ |
| Rodapé com natureza conceitual | ✅ |
| SEO, OG, sitemap, robots | ✅ |
| Fallbacks (sem WebGL / reduced-motion) | ✅ |
| Build de produção | ✅ |
| QA layout/a11y — 10 viewports + reduced-motion | ✅ |
| QA WebGL — capturas e ajuste de direção de arte | 🔄 |
| Deploy Vercel | 🔄 |

## Correções aplicadas durante o QA

1. **Build quebrado pelo loader Turbopack do Tailwind** — o scaffold do Next 16
   roteia todo `*.css` para `@tailwindcss/turbopack`, inclusive o CSS interno do
   `next/font/google`, e o build falhava em
   `Can't resolve '@vercel/turbopack-next/internal/font/google/font'`.
   → Migrado para `@tailwindcss/postcss`.

2. **Evento `load` nunca disparava** — `images.formats` incluía AVIF e a
   codificação de ~20 fotografias no primeiro request levava mais de 60 s.
   → Apenas WebP, com `minimumCacheTTL` de 30 dias.

3. **Cinco contextos WebGL criados no primeiro paint** — todas as cenas
   montavam o `<Canvas>` imediatamente, mesmo a 20 000 px de distância.
   → `useInView` passou a expor `everInView`; o contexto só é criado quando a
   seção chega a 80% de viewport de distância.

4. **Fundo lavado (bege) nas cenas 3D** — o halo direcional do shader de fundo
   usava `pow(dot, 5.0)`, um lobo largo demais que cobria quase todo o domo.
   → Núcleo estreito (`pow 26`) + halo fraco (`pow 6` × 0,16) + vinheta
   esférica. O fundo voltou a ser espresso profundo.

5. **Objeto principal vazando do quadro em telas estreitas** — enquadramento
   fixo não considera que o campo horizontal encolhe em retrato.
   → `fitFactor(width, height)` afasta a câmera do alvo conforme a proporção,
   aplicado nas cinco cenas.

6. **Custo de fill-rate do fundo** — `aln_fbm` de 4 oitavas rodando em tela
   cheia era o item mais caro da cena.
   → 2 oitavas; diferença visual imperceptível nessa escala.

7. **Contraste insuficiente do hero sobre o poster** — headline dourada sobre
   o céu claro do pôr do sol ficava ilegível, principalmente em celular.
   → Poster com `brightness .62`, gradiente vertical reforçado e segundo
   gradiente horizontal para abrir espaço à tipografia.

## Pendências

- Validar a URL pública depois do deploy (assets, scroll, 3D, mobile).
- Capturas WebGL em tablet/desktop: o headless renderiza por software e cada
  frame custa dezenas de segundos; priorizadas as capturas de celular.

## Resultados de QA (layout/a11y, 11 execuções)

- Overflow horizontal: **nenhum** em 360/390/430/844(paisagem)/768/820/1024/
  1366/1440/1920 e em movimento reduzido.
- Erros de página e de console: **zero**.
- Formulário demonstrativo: aviso correto em todos os tamanhos, sem simular
  envio concluído.
- Âncoras internas: todas resolvem.
- Primeiro Tab: skip link com foco visível.
