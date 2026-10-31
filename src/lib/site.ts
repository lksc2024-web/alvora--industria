/**
 * Fonte única de verdade de marca, textos, assets e configurações comerciais.
 * Projeto demonstrativo — marca fictícia, sem dados comerciais reais.
 */

export const brand = {
  name: "ALVORA",
  wordmark: "ALVORA",
  descriptor: "Café de Origem",
  signature: "Da origem à xícara.",
  conceito:
    "Alvora nasce de alvorada: o instante dourado em que a lavoura acorda e o fruto decide virar café.",
  demo: "Projeto demonstrativo. ALVORA é uma marca fictícia criada para esta experiência.",
} as const;

export const seo = {
  title: "ALVORA — Da origem à xícara",
  description:
    "Experiência digital cinematográfica que acompanha a transformação do café: do fruto na lavoura à xícara servida. Projeto demonstrativo de uma indústria de café.",
  locale: "pt_BR",
  keywords: [
    "café",
    "indústria de café",
    "torrefação",
    "café de origem",
    "experiência digital",
    "da origem à xícara",
  ],
} as const;

export const nav = [
  { label: "A jornada", href: "#jornada" },
  { label: "Torrefação", href: "#torrefacao" },
  { label: "Experiência", href: "#experiencia" },
  { label: "Produtos", href: "#produtos" },
  { label: "Indústria", href: "#industria" },
  { label: "Contato", href: "#contato" },
] as const;

export const hero = {
  eyebrow: "Indústria de café · Origem brasileira",
  headline: ["Toda grande experiência", "começa na origem."],
  lead: "Um fruto vermelho amadurece em altitude. Dentro dele, a semente que vai atravessar a colheita, a secagem, o fogo e a água até encontrar a sua xícara.",
  primaryCta: { label: "Percorrer a jornada", href: "#jornada" },
  secondaryCta: { label: "Conhecer a indústria", href: "#industria" },
  scrollHint: "Role para acompanhar",
} as const;

/** Ato II — as oito cenas da transformação, sincronizadas com o scroll. */
export type JourneyScene = {
  id: string;
  index: string;
  title: string;
  body: string;
  /** início da cena dentro do progresso normalizado 0..1 da seção fixada */
  at: number;
};

export const journey: JourneyScene[] = [
  {
    id: "fruto",
    index: "01",
    title: "O fruto",
    body: "Na planta, a cereja do café amadurece do verde ao rubro. É fruta — polpa doce, casca brilhante — e guarda no centro as sementes que ninguém ainda chama de grão.",
    at: 0.0,
  },
  {
    id: "colheita",
    index: "02",
    title: "A colheita",
    body: "Colhe-se no ponto exato de maturação. A seleção separa a cereja madura da verde e do refugo: o primeiro filtro de qualidade do lote.",
    at: 0.07,
  },
  {
    id: "beneficiamento",
    index: "03",
    title: "Beneficiamento e secagem",
    body: "A polpa é retirada e a semente — ainda envolta no pergaminho — segue para o terreiro. A umidade cai lentamente até estabilizar.",
    at: 0.15,
  },
  {
    id: "industria",
    index: "04",
    title: "A entrada na indústria",
    body: "Descascado o pergaminho, surge o grão cru, esverdeado e denso. Ele é classificado, pesado e encaminhado para o beneficiamento industrial.",
    at: 0.225,
  },
  {
    id: "torra",
    index: "05",
    title: "A torrefação",
    body: "O calor reorganiza o grão por dentro. Açúcares caramelizam, o volume cresce, a cor atravessa o canela, o cobre e o castanho profundo.",
    at: 0.3,
  },
  {
    id: "moagem",
    index: "06",
    title: "A moagem",
    body: "O grão se abre em partículas. A granulometria escolhida define quanta superfície a água vai encontrar — e, com ela, o corpo da bebida.",
    at: 0.62,
  },
  {
    id: "preparo",
    index: "07",
    title: "O preparo",
    body: "Água na temperatura certa atravessa o pó sob pressão controlada. Em segundos, aromas presos desde a lavoura voltam ao ar.",
    at: 0.75,
  },
  {
    id: "xicara",
    index: "08",
    title: "A xícara",
    body: "O líquido cai denso, brilhante, coroado por crema. A jornada inteira cabe agora em poucos mililitros.",
    at: 0.845,
  },
];

export const roasting = {
  eyebrow: "Momento 01",
  title: "O ponto exato do fogo",
  lead: "Dentro do tambor, a torra é uma conversa entre tempo e temperatura. Alguns segundos separam o doce do amargo.",
  steps: [
    {
      label: "Secagem",
      temp: "160 °C",
      note: "A umidade residual deixa o grão. A cor ainda é palha.",
    },
    {
      label: "Primeiro crack",
      temp: "196 °C",
      note: "O grão se expande e estala. Começa o desenvolvimento aromático.",
    },
    {
      label: "Desenvolvimento",
      temp: "210 °C",
      note: "Caramelização e reação de Maillard constroem o corpo e a doçura.",
    },
    {
      label: "Descarga",
      temp: "216 °C",
      note: "Resfriamento imediato interrompe a torra no perfil desenhado.",
    },
  ],
  note: "Temperaturas ilustrativas de um perfil de torra média. Projeto demonstrativo.",
} as const;

export const pour = {
  eyebrow: "Ato III",
  title: "O café encontra a xícara",
  lead: "Densidade, brilho e crema. O fio cai contínuo e a bebida se fecha em uma superfície viva.",
} as const;

export const ritual = {
  eyebrow: "Momento 02",
  title: "O ritual do preparo",
  lead: "Vinte e cinco segundos de extração. A crema se forma em espiral, carrega os óleos e sustenta o aroma na superfície.",
  marks: [
    { t: "00:08", d: "Primeiras gotas, cor de mel escuro." },
    { t: "00:16", d: "O fio engrossa e escurece. Corpo se formando." },
    { t: "00:25", d: "Crema estabilizada, avelã com veios de cobre." },
  ],
} as const;

export const human = {
  eyebrow: "Ato IV",
  title: ["Mais do que café.", "Uma experiência que aproxima pessoas."],
  lead: "O café termina a jornada onde ela faz sentido: numa mesa, entre conversas. É o último elo da cadeia e, talvez, o único que ninguém mede em quilos.",
  cards: [
    {
      src: "/img/cafeteria.jpg",
      alt: "Salão de cafeteria com luz quente, mesas de madeira e plantas",
      title: "O salão",
      body: "Luz baixa, madeira e vapor. O ambiente é parte da receita.",
    },
    {
      src: "/img/degustacao-02.jpg",
      alt: "Pessoa de olhos fechados aproximando uma xícara branca do rosto",
      title: "O primeiro gole",
      body: "Aroma antes do sabor: o olfato chega sempre primeiro.",
    },
    {
      src: "/img/degustacao-01.jpg",
      alt: "Pessoa bebendo café em uma caneca escura, com vapor subindo",
      title: "A pausa",
      body: "Um intervalo curto que reorganiza o resto do dia.",
    },
    {
      src: "/img/cappuccino.jpg",
      alt: "Cappuccino visto de cima com desenho de roseta na espuma",
      title: "O desenho",
      body: "Leite texturizado sobre crema: técnica que virou linguagem.",
    },
  ],
} as const;

export const products = {
  eyebrow: "Ato V",
  title: "Catálogo conceitual",
  lead: "Uma linha desenhada para atravessar o dia inteiro — do espresso da manhã à sobremesa da noite. Peças conceituais criadas para esta demonstração.",
  items: [
    {
      id: "graos",
      name: "Café em grãos",
      line: "Torra média · Arábica",
      body: "Grão inteiro para quem mói na hora e quer controle total da extração.",
      src: "/img/grao-macro.jpg",
      alt: "Macro de um grão de café torrado mostrando a fenda central",
      span: "lg:col-span-7 lg:row-span-2",
    },
    {
      id: "moido",
      name: "Café moído",
      line: "Granulometria média",
      body: "Moagem calibrada para coador de papel e prensa francesa.",
      src: "/img/moagem.jpg",
      alt: "Café moído caindo de um moinho industrial",
      span: "lg:col-span-5",
    },
    {
      id: "solubilizados",
      name: "Solúvel e derivados",
      line: "Extrato · Creme · Solúvel",
      body: "Formatos conceituais para food service e uso industrial.",
      src: "/img/derivados.jpg",
      alt: "Potes de vidro âmbar com café solúvel, extrato e creme de café",
      span: "lg:col-span-5",
    },
    {
      id: "geladas",
      name: "Bebidas geladas",
      line: "Cold brew · Frappé",
      body: "Extrações a frio e bebidas batidas para o verão.",
      src: "/img/bebidas-geladas.jpg",
      alt: "Copos de café gelado e frappé com chantilly ao lado de um espresso",
      span: "lg:col-span-4",
    },
    {
      id: "espresso",
      name: "Espresso e cappuccino",
      line: "Linha cafeteria",
      body: "Blend desenhado para máquina, com crema persistente.",
      src: "/img/cappuccino.jpg",
      alt: "Cappuccino com arte em espuma visto de cima",
      span: "lg:col-span-4",
    },
    {
      id: "sobremesas",
      name: "Sobremesas com café",
      line: "Gastronomia",
      body: "Aplicações em confeitaria, do clássico tiramisù a cremes.",
      src: "/img/sobremesa.jpg",
      alt: "Fatia de tiramisù polvilhada com cacau ao lado de um espresso",
      span: "lg:col-span-4",
    },
  ],
  disclaimer:
    "Catálogo conceitual, sem preços, estoque, certificações ou alegações nutricionais.",
} as const;

export const industry = {
  eyebrow: "Ato VI",
  title: "A indústria por trás do gole",
  lead: "Entre a lavoura e a prateleira existe uma cadeia industrial inteira: recepção, classificação, torra, moagem, envase e distribuição — cada etapa com seu próprio controle.",
  pillars: [
    {
      n: "01",
      title: "Recepção e classificação",
      body: "Lotes identificados na entrada, amostrados e classificados por peneira, bebida e defeitos antes de seguirem para a produção.",
      src: "/img/silos-industria.jpg",
      alt: "Silos metálicos de armazenagem ao entardecer, com sacarias empilhadas",
    },
    {
      n: "02",
      title: "Torra e moagem",
      body: "Perfis de torra registrados curva a curva. A moagem é ajustada por formato de embalagem e método de preparo de destino.",
      src: "/img/industria-torra.jpg",
      alt: "Planta industrial de torrefação com esteira transportando grãos",
    },
    {
      n: "03",
      title: "Controle de qualidade",
      body: "Prova de xícara a cada lote, além de verificação de umidade, granulometria e integridade da embalagem.",
      src: "/img/beneficiamento.jpg",
      alt: "Cerejas de café em canal de lavagem durante o beneficiamento",
    },
    {
      n: "04",
      title: "Envase e logística",
      body: "Envase com barreira e válvula desgaseificadora, paletização e roteirização para food service, varejo e indústria.",
      src: "/img/logistica.jpg",
      alt: "Caminhão de distribuição sendo carregado com caixas ao amanhecer",
    },
  ],
  b2b: {
    title: "Relações B2B",
    body: "Estrutura pensada para atender cafeterias, redes de food service, marcas próprias (private label) e indústrias que usam café como ingrediente.",
    bullets: [
      "Desenvolvimento de blends sob demanda",
      "Private label e embalagem personalizada",
      "Fornecimento recorrente para food service",
      "Café como ingrediente industrial",
    ],
  },
  note: "Esta seção descreve processos típicos do setor. Nenhum número de produção, faturamento, certificação ou cliente é apresentado — o projeto é demonstrativo.",
} as const;

export const conversion = {
  eyebrow: "Ato VII",
  title: "Por onde você quer começar?",
  lead: "Três caminhos, três conversas diferentes. Escolha o que descreve o seu momento.",
  paths: [
    {
      id: "produtos",
      kicker: "Para quem consome",
      title: "Quero conhecer os produtos",
      body: "Catálogo conceitual completo, perfis de torra e sugestões de preparo para cada formato.",
      action: "Ver o catálogo",
      href: "#produtos",
    },
    {
      id: "fornecer",
      kicker: "Para quem distribui",
      title: "Quero fornecer ou distribuir",
      body: "Condições de parceria, private label, volumes recorrentes e desenvolvimento de blends.",
      action: "Abrir formulário",
      href: "#contato",
    },
    {
      id: "falar",
      kicker: "Para quem decide",
      title: "Quero falar com a empresa",
      body: "Apresentação institucional, visita técnica e conversa sobre projetos específicos.",
      action: "Abrir formulário",
      href: "#contato",
    },
  ],
  form: {
    title: "Formulário demonstrativo",
    body: "Este projeto não possui backend, e-mail, domínio comercial ou canal de atendimento configurado. O formulário abaixo existe para demonstrar o fluxo de conversão — nada é enviado, armazenado ou respondido.",
    fields: {
      name: "Nome",
      org: "Empresa ou projeto",
      email: "E-mail",
      profile: "Perfil",
      message: "Como podemos ajudar?",
    },
    profiles: [
      "Quero conhecer os produtos",
      "Quero fornecer ou distribuir",
      "Quero falar com a empresa",
    ],
    submit: "Enviar (demonstrativo)",
    blocked:
      "Envio desativado: este é um protótipo sem servidor de recebimento. Nenhum dado saiu do seu navegador.",
  },
} as const;

export const footer = {
  statement:
    "ALVORA é uma marca fictícia criada para demonstrar uma experiência digital completa para a indústria do café. Não existe empresa, CNPJ, domínio comercial, canal de atendimento ou produto à venda por trás deste site.",
  assets:
    "Fotografias derivadas de composições fornecidas pelo cliente do projeto. Cenas 3D, partículas, líquidos e transições construídos em WebGL/Three.js e GSAP especificamente para esta experiência.",
  columns: [
    {
      title: "Experiência",
      links: [
        { label: "A jornada do café", href: "#jornada" },
        { label: "Torrefação", href: "#torrefacao" },
        { label: "O ritual", href: "#ritual" },
      ],
    },
    {
      title: "Negócio",
      links: [
        { label: "Catálogo conceitual", href: "#produtos" },
        { label: "Indústria e logística", href: "#industria" },
        { label: "Relações B2B", href: "#industria" },
      ],
    },
    {
      title: "Projeto",
      links: [
        { label: "Formulário demonstrativo", href: "#contato" },
        { label: "Voltar ao início", href: "#topo" },
      ],
    },
  ],
} as const;
