# ALVORA — Decisões de projeto

Documento vivo. Registra o que foi decidido, por quê, e o que ficou pendente,
para que o trabalho possa ser retomado por qualquer pessoa (ou sessão) depois.

---

## 1. Restrições dadas pelo cliente

| Restrição | Consequência prática |
|---|---|
| **Nenhum crédito pago** (Higgsfield, geração de imagem/vídeo/3D) | Toda a experiência visual é construída em código: WebGL, shaders, Canvas e CSS. |
| Projeto isolado em `C:\Users\Manu\Projects\industria-cafe` | Nenhum projeto existente foi tocado. Repositório Git próprio. |
| Marca fictícia, sem empresa real | Nenhum dado de contato, certificação, preço, número de produção ou cliente foi inventado. |
| Materiais disponíveis: 2 composições em mosaico | Os painéis foram recortados individualmente; nenhum texto foi recortado pela metade. |

## 2. Marca

- **Nome:** ALVORA — de *alvorada*. Curto, pronunciável em português, evoca o
  amanhecer dourado que aparece nas composições de referência.
- **Descritor:** Café de Origem.
- **Assinatura:** *Da origem à xícara.*
- Declarada como fictícia no rodapé e nos metadados. Sem alegação de registro.

### Paleta

| Token | Hex | Uso |
|---|---|---|
| `espresso-950/900/800` | `#070403` → `#140d08` | Fundos, profundidade |
| `bark-600/500` | `#2a1b10` / `#3b2616` | Superfícies intermediárias |
| `copper-500/400` | `#b0662f` / `#c87f45` | Acento quente, fio de café |
| `gold-400/300` | `#d9a15b` / `#e8be85` | Destaques, tipografia de acento |
| `leaf-800/600` | `#16271d` / `#24412f` | Botânico (lavoura) |
| `cream-100/200` | `#f4ead9` / `#e4d4ba` | Texto |

### Tipografia

- **Display:** Fraunces (variável, eixos `SOFT`, `WONK`, `opsz`) — serifa
  editorial com personalidade, longe do default de template.
- **Texto:** Archivo — grotesca neutra, boa em caption industrial.

## 3. Stack

| Camada | Escolha | Motivo |
|---|---|---|
| Framework | Next.js 16.4 (App Router) + TypeScript | Build estático, otimização de imagem, metadados, deploy Vercel direto. |
| Estilo | Tailwind CSS v4 via `@tailwindcss/postcss` | Tokens em `@theme`, sem config JS. |
| 3D | three 0.186 + @react-three/fiber 9 + drei 10 | Padrão de mercado, integração React, controle fino de loop. |
| Scroll | GSAP 3.15 + ScrollTrigger | Progresso normalizado por seção, carregado sob demanda. |
| QA | Playwright 1.64 | Emulação de dispositivos, screenshots, console. |

### Decisão: PostCSS em vez do loader Turbopack do Tailwind

O scaffold do Next 16 configura `turbopack.rules` para processar **todo** `*.css`
com `@tailwindcss/turbopack`. Isso intercepta o CSS interno gerado pelo
`next/font/google` e quebra o build com
`Can't resolve '@vercel/turbopack-next/internal/font/google/font'`.
Trocamos pelo plugin PostCSS oficial — build limpo, mesmo resultado.

### Decisão: `position: sticky` em vez de `ScrollTrigger.pin`

O ScrollTrigger é usado **apenas** para ler o progresso da seção
(`onUpdate → ref.current`). A fixação é CSS puro. Vantagens:

- Sem `pin-spacer`, sem salto de layout no refresh.
- Sem scroll hijacking: a rolagem do usuário nunca é sequestrada.
- Funciona igual em iOS, onde o pin do GSAP costuma oscilar.
- O progresso vai para um `ref`, não para o state → zero re-render por frame.

## 4. A narrativa em 3D

### O fio condutor: uma geometria, dois estados

`src/three/coffeeGeometry.ts` constrói **uma** malha que carrega dois conjuntos
de posições e normais:

- `aCherry` — o fruto: elipsoide com depressão no pedúnculo e coroa na base.
- `aBean` — o grão: achatado em Z, com a fenda central em S na face plana.

O shader (`morphMaterial.ts`) interpola entre os dois por `uMorph`. É por isso
que a transformação **não** é um corte entre objetos diferentes: é o mesmo
corpo mudando. A sequência real da produção é respeitada na rampa de cor:

```
fruto maduro → fruto escuro → semente em pergaminho → grão cru verde
→ torra canela → torra média → torra escura → grão oleoso
```

Fruto, semente e grão torrado nunca são tratados como a mesma coisa.

### O lote: um enxame que se reorganiza

Um único `InstancedMesh` (170–560 grãos conforme o dispositivo) atravessa sete
layouts — planta, colheita, terreiro, esteira, tambor, funil de moagem,
ausência — e a transição entre dois layouts vizinhos é uma interpolação, não um
corte. São sempre os **mesmos** grãos.

### As partículas: um sistema, quatro papéis

Um único `Points` com movimento calculado **no vertex shader** (a CPU não toca
nos buffers). Os uniforms interpolam entre papéis ao longo da rolagem:
poeira do terreiro → brasa da torra → pó da moagem → vapor da xícara.

### O café sendo servido

Sem simulação física. O fio é um cilindro aberto cuja silhueta é deslocada por
ruído no vertex shader, com revelação de cima para baixo (`uProgress`), fresnel
âmbar nas bordas, faixas de fluxo descendo e um realce especular fixo. A crema é
um disco com ruído em coordenada espiral — o que produz as veias características
do espresso — mais menisco e reflexo.

O fluxo continua depois da seção: `CoffeeThread` desenha um fio SVG na calha
lateral esquerda, revelado por `stroke-dashoffset` conforme a rolagem, com
`pointer-events: none`, `aria-hidden` e oculto abaixo de `md` (onde a calha é
estreita demais para não encostar no texto).

### Environment sem HDR externo

`useStudioEnv` gera um equirretangular em `<canvas>` (gradiente + softboxes),
converte com `PMREMGenerator` e injeta como `scene.environment`. Zero arquivos
externos, poucos KB de GPU, e é o que dá reflexo ao grão oleoso, ao metal do
tambor e à porcelana.

## 5. Performance

- **Um canvas por cena**, e o `frameloop` vira `demand` quando a seção sai da
  tela (`IntersectionObserver`). Nunca há dois canvases renderizando juntos.
- `dpr` limitado a `[1, 1.75]`; antialias desligado quando o DPR já é alto.
- Perfil de qualidade (`useQuality`) por largura de tela, `deviceMemory` e
  `hardwareConcurrency`: reduz instâncias e partículas em aparelhos fracos.
- Segmentação da esfera base cai de `88×60` para `56×40` no perfil baixo.
- `clearcoat` do material nunca chega a zero — evita recompilar o programa de
  shader no meio da rolagem (causaria engasgo visível).
- Cenas carregadas com `next/dynamic` + `ssr: false` → o three.js fica fora do
  HTML inicial.
- O hero pinta primeiro um **poster JPEG** (é o LCP) e a cena WebGL entra por
  cima com fade quando estiver pronta.

## 6. Acessibilidade

- `prefers-reduced-motion`: as três seções fixadas trocam para versões
  editoriais com a mesma narrativa e o mesmo conteúdo; animações CSS zeradas.
- Sem WebGL: mesmo caminho de fallback, detectado antes de montar o canvas.
- A jornada de 8 cenas existe em `sr-only` como lista ordenada completa — quem
  usa leitor de tela não depende de rolar a cena 3D.
- Skip link, foco visível (`outline` dourado), `lang="pt-BR"`, hierarquia
  `h1 → h2 → h3`, `alt` descritivo em todas as imagens.
- Overlays decorativos são `aria-hidden` e `pointer-events-none`.

## 7. Honestidade do conteúdo

Nada foi inventado: sem preços, estoque, certificações, capacidade produtiva,
faturamento, número de funcionários, clientes, WhatsApp, e-mail ou domínio.
O formulário é explicitamente demonstrativo e **não** simula envio concluído —
ao submeter, informa que não há servidor de recebimento e que nada saiu do
navegador. As temperaturas de torra estão marcadas como ilustrativas. As pessoas
nas fotografias são declaradas como figurativas, não como clientes ou
depoimentos.

## 8. `prefers-reduced-motion` não é um interruptor

Primeira versão trocava **as quatro seções 3D inteiras** pela versão editorial
estática quando `prefers-reduced-motion: reduce` estava ativo. O resultado foi
que o cliente abriu o site e perguntou onde estavam as animações: no Windows,
esse media query fica ligado sempre que as animações do sistema estão
desativadas — inclusive quando a pessoa fez isso por desempenho, não por
desconforto vestibular. Ele estava vendo o fallback de acessibilidade.

O erro de raciocínio foi tratar a narrativa como "movimento". Ela é conduzida
pela rolagem da própria pessoa: é manipulação direta, não animação autônoma.
O que de fato incomoda em `reduced-motion` é o que se move sozinho.

Como ficou:

| | Narrativa 3D | Movimento autônomo | Transições CSS |
|---|---|---|---|
| `full` | sim | sim | sim |
| `reduced` (padrão do sistema) | **sim** | não — o "tempo" das cenas passa a vir da rolagem | não |
| sem WebGL | não — versão editorial | — | conforme a preferência |

Em `reduced` o relógio das cenas (`performance.now()`) é substituído pelo
progresso da seção. Tambor, partículas e enxame continuam se movendo, mas só
enquanto a pessoa rola: nada acontece sozinho.

Há um controle explícito no cabeçalho (`MotionToggle`) para alternar entre os
dois, guardado em `localStorage`. Ele também escreve `data-motion` no `<html>`,
e o CSS de movimento reduzido é escapado por `html:not([data-motion="full"])` —
sem isso, quem liga as animações pela interface continuaria sem transições,
porque a media query é do sistema e ignora a escolha feita na página.

> Detalhe de implementação que custou um bug: `data-motion` é escrito por um
> único componente (`MotionSync`, montado no layout). Com meia dúzia de
> componentes usando o hook, cada um escrevendo o atributo no seu próprio
> efeito, a ordem de execução decidia o valor final — e o CSS acabava seguindo
> a instância errada.

Também passou a existir detecção de GPU fraca (`WEBGL_debug_renderer_info`):
Intel HD/UHD, Mali de entrada, Adreno 1xx–5xx e renderizadores por software
rebaixam um degrau no perfil de qualidade. Tela grande não significa GPU
grande — a máquina onde o problema apareceu tem uma Intel HD Graphics com
driver de 2015.

## 9. Armadilhas encontradas (vale registrar)

**`smoothstep` invertido é indefinido em GLSL.** Para desenhar um disco que
cresce de dentro para fora, o caminho intuitivo é
`smoothstep(raio, raio - margem, r)`. A especificação só define `smoothstep`
quando `edge0 < edge1`; fora disso o resultado é por conta do driver. Num
driver devolvia a rampa invertida (certo por acidente), noutro devolvia 0 — e
a bebida simplesmente não aparecia na xícara. O correto é
`1.0 - smoothstep(menor, maior, x)`.

**Enquadramento 3D não é responsivo de graça.** Em 9:16 o campo horizontal
cai pela metade e um objeto que cabia no quadro em 16:9 passa a ser mais largo
que a tela. `fitFactor` escala a distância da câmera com `1/aspect` (limitado
a 2,45×), aplicado como multiplicador do vetor câmera→alvo — assim o ângulo de
visada não muda, só a distância.

**Ângulo de câmera conta mais que o modelo.** A xícara do Ato III estava
correta, mas a 8° da horizontal a própria borda ocultava a superfície da
bebida: o objeto lia como um pote vazio. A 30° a mesma geometria lê como café.

**Tamanho de ponto sem teto é uma bomba de fill-rate.** `gl_PointSize`
proporcional a `1/z` levava partículas de vapor a passar de 200 px. Com
blending aditivo e algumas centenas de partículas, isso é overdraw suficiente
para derrubar o frame rate em GPU móvel. O `clamp` resolveu.

**Ruído de tela cheia é o item mais caro da cena.** O fundo cobre cada pixel;
`fbm` de 4 oitavas ali custava mais que todo o resto somado. Duas oitavas são
visualmente equivalentes nessa escala.

## 9. Limitações conhecidas

1. **Resolução das fotografias.** Os painéis individuais dentro do mosaico
   `1536×1024` têm ~250–350 px. Foram recortados e reescalados em 1,8×, e por
   isso aparecem apenas em cartões de tamanho moderado, com gradiente e grão.
   Todos os momentos de tela cheia são WebGL, onde não há limite de resolução.
2. **Testes em emulação.** Não há dispositivo físico disponível: celular, iPad e
   desktop foram testados por emulação do Chromium (viewport, DPR, touch).
3. **WebGL no QA** roda sobre SwiftShader (software). O desempenho medido em
   headless não representa o de uma GPU real.

## 10. Pendências / melhorias futuras

- Substituir as fotografias por capturas em alta resolução quando houver
  material original (ou autorização para geração).
- Pós-processamento opcional (bloom seletivo na torra) atrás do perfil `high`.
- Versão em inglês com `next-intl`.
- Instrumentar Web Vitals reais com `@vercel/speed-insights`.
