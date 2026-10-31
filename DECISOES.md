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


## Fotografias realistas como material da animação 3D (31/10/2026)

O fruto, os grãos e a xícara modelados em código pareciam de plástico. O
cliente gerou no ChatGPT onze fotos verticais, uma por etapa. A animação 3D foi
mantida inteira; as fotos viraram o material dela:

- `public/textura/`: recortes das fotos (cereja, grão cru, grão torrado, folha
  e crema). Os grãos foram recortados por GrabCut e girados para o eixo longo
  ficar na horizontal, com a fenda no mesmo lugar da malha.
- `morphMaterial.ts`: a face chata do grão recebe a foto de frente; o dorso usa
  a metade de cima da mesma foto. A cereja é projetada a partir da câmera, para
  nunca esticar. A cor da rampa de torra continua dando o tom de cada estágio,
  e a foto dá o detalhe e um relevo leve. `roast` na rampa troca o grão cru
  pelo torrado.
- `shaders.ts`: o fundo de cada cena mostra o pedaço da foto da etapa sem o
  objeto principal (bokeh, sol, brasa, terreiro), desfocado por mipmap. A crema
  da xícara usa a foto real girando devagar.
- Fundos por etapa em `photoTextures.ts` (`BG`).
- As fotos têm 940 × 1672. Versões maiores podem substituir os arquivos de
  `public/foto/`; os recortes de `public/textura/` saem delas.

### Revisão: recortes das fotos em vez de textura em malha 3D (31/10/2026)

Vestir as malhas 3D com a foto ainda parecia 3D: a luz do three.js refazia a
foto e o giro esticava a imagem nas bordas. Agora o fruto e os grãos são os
próprios recortes das fotos (`public/textura/*-recorte.png`), como foi feito
com o perfume e os calçados da Âmbar, e fazem a mesma coreografia:

- a cereja se abre em duas metades, que giram como portas e mostram a polpa;
- o grão cru aparece dentro dela e o lote inteiro vira grãos fotografados;
- na torra, a cor esquenta e uma frente irregular transforma o grão cru no
  grão torrado da foto;
- na moagem, o grão se parte em torrões que voam, enquanto o pó sobe;
- o fio de café usa a faixa do fio real da foto escorrendo, e a xícara usa a
  porcelana fotografada.

Código em `src/three/photoSprites.ts`. O giro é limitado a poucos graus para a
foto nunca esticar.

### Torrefação e xícara como fotos vivas (31/10/2026)

O tambor e a xícara em malha 3D continuavam com cara de modelo. As duas seções
agora mostram a própria foto realista, e o movimento acontece dentro dela
(`src/three/LivingPhoto.tsx`, coreografia em `livingScenes.ts`):

- **Torrefação (07-tambor):** o leito de grãos gira dentro da boca do tambor,
  a cascata desce, a bandeja de resfriamento roda em volta do agitador e a
  fumaça sobe. Grãos recortados da foto de produto caem da borda com gravidade
  e giro e somem ao entrar no leito. A câmera começa na boca do tambor e desce
  com a descarga; o tom sai de um dourado claro (secagem) para a torra escura
  da foto, junto com as etapas da lista.
- **Xícara (10 → 11):** o fio escorre, a superfície faz ondas a partir do ponto
  de impacto, a crema gira e o vapor sobe. Na rolagem o fio termina: acima da
  cauda a foto mostra `10-sem-fio.jpg` (o fio retirado e preenchido com o que
  está dos lados), e a cauda afina até sumir. A câmera mergulha na crema e sai
  na crema da foto 11, que se afasta até mostrar a xícara servida.
- Técnica: flowmap em duas fases, com a fase desencontrada por ruído para não
  pulsar. Nada de vídeo; o peso é o da própria foto.
- `RoastScene` e `PourScene` saíram.

### Uma descida só, da cereja à xícara (31/10/2026)

Jornada, torrefação e xícara eram três seções, e a passagem entre elas parecia
um pulo. Agora é uma seção só (`CoffeeJourney`), e a rolagem é gravidade:

- **Começo (0 a 0,33):** a cena 3D com os recortes, como estava: a cereja se
  abre, a semente aparece, o lote vira grão cru e a torra começa.
- **Queda (0,33 a 0,41):** o grão cai e a câmera desce com ele. O mundo 3D
  sobe exatamente o quanto sobe a borda de cima das fotos (`setViewOffset`),
  então as duas camadas se movem como uma imagem só. O grão encolhe até o
  tamanho dos grãos da cascata e entra nela.
- **Descida pelas fotos vivas:** tambor, moagem, preparo e o fio na xícara
  ficam empilhados como andares (`stack` em `LivingPhoto`). As emendas ficam
  nas partes desfocadas e têm borda irregular; sempre há material cruzando a
  emenda (cascata, pó, água, o fio). A torra acontece dentro do tambor, com as
  temperaturas na legenda.
- **Final:** o fio termina, a câmera mergulha na crema e sai na xícara servida.
- As seções `RoastingExperience` e `CoffeePour` saíram; `#torrefacao` e
  `#xicara` viraram âncoras dentro da descida.
- Linha do tempo e medidas das fotos em `src/three/livingScenes.ts`.
