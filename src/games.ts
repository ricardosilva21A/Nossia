// No imports: the notification endpoint loads this file too, and its module rules are stricter.
// These two match Activity (activities.ts) and HomePartner (types.ts); a test checks the first.
type Activity = "comer" | "ver" | "ar_livre" | "criar" | "cultura" | "jogar" | "descansar" | "conversar" | "escapadinha";
type HomePartner = "partner_one" | "partner_two";

// Couple games, hosted by the house's animal: it asks the questions, keeps the answers and tells
// each one what the other said, but only once both have answered. What each one says about
// themselves stays saved, and the app uses it later: gift hints, travel dreams on the map, and
// tastes for the ideas it finds. The questions are ours, written by hand. Ids never change once
// published (answers point at them).

export type DeckKey = "conhecer" | "isto" | "quem" | "sonhos" | "memorias";

type Base = { id: string; deck: DeckKey };
// About you: first you guess the other's answer, then you give your own. With options it's a
// tap; without, both write, and the one it's about says whether the guess was right.
// `lookup`: while typing, suggest real titles (films and series from IMDb, songs from iTunes).
export type KnowQuestion = Base & { kind: "know"; topic: string; guess: string; self: string; options?: string[]; lookup?: "film" | "series" | "song"; gift?: boolean; travel?: boolean };
// This or that: each picks one, and it shows whether you picked the same.
export type PairQuestion = Base & { kind: "pair"; text: string; options: [string, string]; tastes?: [Activity, Activity] };
// Who is more likely to…: each points at one of the two.
export type WhoQuestion = Base & { kind: "who"; text: string };
// Dreams and memories: a few words each, side by side.
export type OpenQuestion = Base & { kind: "open"; text: string; gift?: boolean; travel?: boolean };
export type GameQuestion = KnowQuestion | PairQuestion | WhoQuestion | OpenQuestion;

// "verdict" is the one a written answer is about saying whether the other's guess was right.
export type GameRole = "self" | "guess" | "verdict";
export type Verdict = "hit" | "close" | "miss";
export type GameAnswer = { question_id: string; user_id: string; role: GameRole; answer: string; created_at: string };

export const decks: Array<{ key: DeckKey; emoji: string; title: string; hint: string }> = [
  { key: "conhecer", emoji: "🧠", title: "Quanto me conheces?", hint: "Adivinhas o outro, depois respondes tu" },
  { key: "isto", emoji: "⚖️", title: "Isto ou aquilo", hint: "Escolhem os dois: será que batem certo?" },
  { key: "quem", emoji: "👉", title: "Quem é mais…?", hint: "Apontem um ao outro" },
  { key: "sonhos", emoji: "✨", title: "Sonhos", hint: "Sítios, planos e vontades" },
  { key: "memorias", emoji: "📸", title: "Memórias", hint: "O que cada um guarda de vocês" },
];

const choice = (id: string, topic: string, guess: string, self: string, options: string[], extra: { gift?: boolean; travel?: boolean } = {}): KnowQuestion => ({ id, deck: "conhecer", kind: "know", topic, guess, self, options, ...extra });
const written = (id: string, topic: string, guess: string, self: string, extra: { gift?: boolean; travel?: boolean; lookup?: "film" | "series" | "song" } = {}): KnowQuestion => ({ id, deck: "conhecer", kind: "know", topic, guess, self, ...extra });
const pair = (id: string, text: string, a: string, b: string, tastes?: [Activity, Activity]): PairQuestion => ({ id, deck: "isto", kind: "pair", text, options: [a, b], ...(tastes ? { tastes } : {}) });
const who = (id: string, text: string): WhoQuestion => ({ id, deck: "quem", kind: "who", text });
const open = (id: string, deck: "sonhos" | "memorias", text: string, extra: { gift?: boolean; travel?: boolean } = {}): OpenQuestion => ({ id, deck, kind: "open", text, ...extra });

export const questions: GameQuestion[] = [
  // Quanto me conheces? Tap one: categories that make sense, some just for laughs.
  choice("c01", "a comida preferida", "Que comida é que {n} prefere?", "E tu, qual preferes?", ["Portuguesa", "Italiana", "Japonesa", "Mexicana", "Indiana", "Hambúrgueres"]),
  choice("c02", "a sobremesa preferida", "Qual é a sobremesa de que {n} mais gosta?", "E a tua?", ["Chocolate", "Gelado", "Bolos e tartes", "Doces conventuais", "Fruta"], { gift: true }),
  choice("c03", "a bebida numa noite fora", "Numa noite fora, o que pede {n}?", "E tu, o que pedes?", ["Vinho", "Cerveja", "Cocktail", "Sangria", "Sumo ou água"]),
  choice("c04", "os filmes preferidos", "Que filmes prefere {n}?", "E tu?", ["Comédia", "Terror", "Romance", "Ação", "Animação", "Documentário"], { gift: true }),
  choice("c05", "a música que mais ouve", "Que música ouve mais {n}?", "E tu?", ["Pop", "Rock", "Rap", "Eletrónica", "Música portuguesa", "Indie"], { gift: true }),
  choice("c06", "as férias ideais", "Férias ideais para {n}?", "E as tuas?", ["Praia", "Cidade", "Montanha", "Road trip", "Sofá em casa"], { travel: true }),
  choice("c07", "como está às 7 da manhã", "Às 7 da manhã, {n} está…", "E tu, como estás?", ["Cheio de energia", "A funcionar a café", "A carregar no snooze", "Ainda a sonhar"]),
  choice("c08", "o ataque de fome à 1 da manhã", "Fome à 1 da manhã: o que vai {n} buscar?", "E tu?", ["Pizza fria", "Cereais", "Tosta mista", "Chocolate escondido", "Nada, vou dormir"]),
  choice("c09", "o maior medo", "Do que tem {n} mais medo?", "E tu?", ["Aranhas", "Baratas", "Alturas", "Palhaços", "Ficar sem bateria"]),
  choice("c10", "o estilo numa discussão", "Numa discussão, {n}…", "E tu?", ["Amua e cala-se", "Fala até ganhar", "Pede desculpa logo", "Faz uma piada"]),
  choice("c11", "o animal que seria", "Se {n} fosse um animal, seria…", "E tu?", ["Preguiça", "Gato", "Golden retriever", "Coruja", "Pinguim"]),
  choice("c12", "a prenda perfeita", "A prenda perfeita para {n} é…", "E para ti?", ["Uma experiência", "Algo feito à mão", "Algo útil", "Comida boa", "Surpresa cara 😏"], { gift: true }),
  choice("c13", "a tarefa de casa que detesta", "Que tarefa de casa detesta {n}?", "E tu?", ["Loiça", "Passar a ferro", "Aspirar", "Casa de banho", "Estender a roupa"]),
  choice("c14", "a cor preferida", "Qual é a cor preferida de {n}?", "E a tua?", ["Azul", "Verde", "Vermelho", "Preto", "Branco", "Rosa"], { gift: true }),
  choice("c15", "o tamanho de t-shirt", "Que tamanho de t-shirt veste {n}?", "E tu?", ["XS", "S", "M", "L", "XL"], { gift: true }),
  choice("c16", "as flores preferidas", "Que flores preferia receber {n}?", "E tu?", ["Rosas", "Girassóis", "Tulipas", "Um vaso que não morra", "Flores não, obrigado"], { gift: true }),
  choice("c17", "como fica quando está doente", "Quando está doente, {n}…", "E tu?", ["Vira bebé", "Faz-se de forte", "Vai logo ao médico", "Desaparece na cama"]),
  choice("c18", "o domingo perfeito", "O domingo perfeito de {n}?", "E o teu?", ["Sofá e séries", "Passeio na natureza", "Almoço de família", "Dormir até à tarde", "Sair à aventura"]),
  choice("c19", "a comida que odeia", "Que comida não suporta {n}?", "E tu?", ["Coentros", "Fígado", "Azeitonas", "Cebola crua", "Marisco", "Como tudo"]),
  choice("c20", "o maior vício", "O maior vício de {n}?", "E o teu?", ["Telemóvel", "Café", "Doces", "Séries", "Compras online"]),
  choice("c21", "o que faria com o Euromilhões", "Se ganhasse o Euromilhões, {n} primeiro…", "E tu?", ["Viajava", "Comprava casa", "Despedia-se", "Ajudava a família", "Escondia que ganhou"]),
  choice("c22", "a razão de ser famoso", "{n} ficava famoso por…", "E tu?", ["Cantar", "Cozinhar", "Fazer memes", "Desporto", "Dormir em qualquer lado"]),
  choice("c23", "o papel num apocalipse zombie", "Num apocalipse zombie, {n} era…", "E tu?", ["O líder", "O primeiro a cair", "O que esconde a comida", "Amigo dos zombies"]),
  choice("c24", "a app que mais abre", "Que app abre {n} mais vezes?", "E tu?", ["Instagram", "TikTok", "WhatsApp", "YouTube", "Outra qualquer"]),
  choice("c25", "como passa os anos", "Como gosta {n} de passar os anos?", "E tu?", ["Festa grande", "Jantar a dois", "Escapadinha", "Fingir que não é"], { gift: true }),
  choice("c26", "o que o faz sentir amado", "O que faz {n} sentir-se mais amado?", "E a ti?", ["Palavras bonitas", "Tempo juntos", "Prendas", "Miminhos", "Ajuda nas tarefas"], { gift: true }),
  choice("c27", "o destino de sonho", "O destino de sonho de {n}?", "E o teu?", ["Japão", "Islândia", "Brasil", "Itália", "Tailândia", "Nova Iorque"], { travel: true }),
  choice("c28", "o pequeno-almoço ideal", "O pequeno-almoço ideal de {n}?", "E o teu?", ["Torradas", "Panquecas", "Iogurte e fruta", "Pastel de nata", "Só café"]),

  // Quanto me conheces? Written: both write, and the one it's about says if the guess was right.
  written("t01", "o filme favorito", "Qual é o filme favorito de {n}?", "E o teu?", { gift: true, lookup: "film" }),
  written("t02", "a série para ver outra vez", "Que série via {n} outra vez desde o início?", "E tu?", { gift: true, lookup: "series" }),
  written("t03", "a música do duche", "Que música canta {n} no duche?", "E tu?", { gift: true, lookup: "song" }),
  written("t04", "a comida de conforto", "Num dia mau, o que quer {n} comer?", "E tu?", { gift: true }),
  written("t05", "o sítio para ir amanhã", "Se pudesse ir amanhã para qualquer sítio, {n} ia para…", "E tu?", { travel: true }),
  written("t06", "o pedido de sempre no restaurante", "O que pede {n} sem olhar para o menu?", "E tu?"),
  written("t07", "a palavra que mais diz", "Qual é a palavra (ou asneira) que {n} mais diz?", "E tu?"),
  written("t08", "a coisa mais estranha que já comeu", "A coisa mais estranha que {n} já comeu?", "E tu?"),
  written("t09", "o emoji de sempre", "Que emoji usa {n} a toda a hora?", "E tu?"),
  written("t10", "o crush famoso", "O crush famoso de {n} 😏", "E o teu?"),
  written("t11", "o medo mais ridículo", "O medo mais ridículo de {n}?", "E o teu?"),
  written("t12", "o que comprava com 1000 euros", "Com 1000 € para gastar hoje, {n} comprava…", "E tu?", { gift: true }),
  written("t13", "o hobby preferido", "O passatempo preferido de {n}?", "E o teu?", { gift: true }),
  written("t14", "a pior moda que seguiu", "A pior moda que {n} já seguiu?", "E tu?"),
  written("t15", "o nome para outro animal", "Que nome daria {n} a um segundo animal cá em casa?", "E tu?"),

  pair("p01", "Para um date:", "Museu", "Parque", ["cultura", "ar_livre"]),
  pair("p02", "Para um date:", "Spa", "Escape room", ["descansar", "jogar"]),
  pair("p03", "Para um date:", "Workshop de cerâmica", "Prova de vinhos", ["criar", "comer"]),
  pair("p04", "Num domingo:", "Caminhada", "Sesta", ["ar_livre", "descansar"]),
  pair("p05", "Fim de semana:", "Fora", "Em casa", ["escapadinha", "descansar"]),
  pair("p06", "Ao fim do dia:", "Jogo de tabuleiro", "Passeio", ["jogar", "ar_livre"]),
  pair("p07", "Para sair à noite:", "Teatro", "Bowling", ["ver", "jogar"]),
  pair("p08", "No verão:", "Feira medieval", "Festival de música", ["cultura", "ver"]),
  pair("p09", "Juntos:", "Pintar", "Cozinhar", ["criar", "comer"]),
  pair("p10", "Ao sábado de manhã:", "Piquenique", "Brunch", ["ar_livre", "comer"]),
  pair("p11", "Esta noite:", "Conversar até tarde", "Ver um filme", ["conversar", "ver"]),
  pair("p12", "Para descansar:", "Termas", "Praia", ["descansar", "ar_livre"]),
  pair("p13", "Para rir:", "Karaoke", "Comédia ao vivo", ["jogar", "ver"]),
  pair("p14", "Numa cidade nova:", "Ver os monumentos", "Provar a comida", ["cultura", "comer"]),
  pair("p15", "Para aprender:", "Aula de dança", "Aula de fotografia", ["jogar", "criar"]),
  pair("p16", "Nas férias:", "Road trip", "Uma só cidade", ["escapadinha", "cultura"]),
  pair("p17", "Num dia de chuva:", "Cinema", "Mantas e chá em casa", ["ver", "descansar"]),
  pair("p18", "Para um aniversário:", "Jantar especial", "Escapadinha surpresa", ["comer", "escapadinha"]),
  pair("p19", "Bicho:", "Cão", "Gato"),
  pair("p20", "Sabor:", "Doce", "Salgado"),
  pair("p21", "Falar:", "Mensagem", "Chamada"),
  pair("p22", "Morar:", "Cidade", "Campo"),
  pair("p23", "Planos:", "Planear tudo", "Improvisar"),
  pair("p24", "Para sempre sem:", "Chocolate", "Queijo"),
  pair("p25", "Férias em Portugal:", "Serra da Estrela", "Algarve"),
  pair("p26", "Cidade:", "Lisboa", "Porto"),
  pair("p27", "Para sempre:", "Cantar tudo o que dizes", "Dançar sempre que andas"),
  pair("p28", "Para sempre sem:", "Telemóvel", "Séries"),
  pair("p29", "Ter de comer todos os dias:", "Só sopa", "Só bacalhau"),
  pair("p30", "Superpoder inútil:", "Saber sempre as horas", "Nunca ter soluços"),
  pair("p31", "Num casamento:", "A dançar a noite toda", "Na mesa dos doces"),
  pair("p32", "Viver com:", "Um cão gigante", "Três gatos pequenos"),
  pair("p33", "Ficar preso:", "Num elevador com o ex", "Numa reunião de condomínio"),
  pair("p34", "Para sempre:", "Verão", "Natal"),
  pair("p35", "Acordar:", "Com o despertador", "Com o cão em cima"),
  pair("p36", "Uma noite de:", "Jogos com amigos", "Filme a dois"),

  who("q01", "se perder mesmo com GPS"),
  who("q02", "adormecer a meio do filme"),
  who("q03", "chorar num filme de animação"),
  who("q04", "comer o último bocado sem perguntar"),
  who("q05", "chegar atrasado"),
  who("q06", "perder as chaves"),
  who("q07", "gastar demais nos saldos"),
  who("q08", "meter conversa com estranhos"),
  who("q09", "fazer batota num jogo"),
  who("q10", "cantar alto no carro"),
  who("q11", "tirar mil fotografias à comida"),
  who("q12", "desistir de uma caminhada a meio"),
  who("q13", "pedir desculpa primeiro"),
  who("q14", "ter fome primeiro"),
  who("q15", "dizer \"só mais um episódio\""),
  who("q16", "roubar os cobertores"),
  who("q17", "adotar um animal sem avisar"),
  who("q18", "demorar horas a escolher no menu"),
  who("q19", "rir na hora errada"),
  who("q20", "sobreviver a um apocalipse zombie"),
  who("q21", "mandar memes às 3 da manhã"),
  who("q22", "comprar uma coisa inútil online"),
  who("q23", "dizer \"eu avisei\""),
  who("q24", "falar com o animal cá de casa como se fosse gente"),
  who("q25", "comer às escondidas"),
  who("q26", "chorar com um anúncio"),
  who("q27", "ficar preso na roupa ao vestir"),
  who("q28", "ganhar uma discussão sem ter razão"),
  who("q29", "esquecer o que ia dizer a meio"),
  who("q30", "acordar mal-disposto"),

  open("s01", "sonhos", "Um sítio onde queres ir antes dos 40?", { travel: true }),
  open("s02", "sonhos", "Uma coisa que nunca fizeste e queres experimentar comigo?"),
  open("s03", "sonhos", "Se pudesses viver um ano noutro país, qual era?", { travel: true }),
  open("s04", "sonhos", "A viagem de sonho a dois?", { travel: true }),
  open("s05", "sonhos", "Um concerto ou espetáculo que adoravas ver?", { gift: true }),
  open("s06", "sonhos", "Uma coisa que gostavas de aprender?", { gift: true }),
  open("s07", "sonhos", "Como imaginas um domingo perfeito daqui a 10 anos?"),
  open("s08", "sonhos", "Um prato de outro país que queres provar?", { travel: true }),
  open("s09", "sonhos", "Uma prenda que adoravas receber e nunca pediste?", { gift: true }),
  open("s10", "sonhos", "Uma aventura radical que queres fazer?", { gift: true }),
  open("s11", "sonhos", "Uma cidade portuguesa que ainda não conheces?", { travel: true }),
  open("s12", "sonhos", "Um sonho de criança que ainda queres cumprir?"),
  open("s13", "sonhos", "Uma ilha onde gostavas de ir?", { travel: true }),
  open("s14", "sonhos", "Um restaurante onde queres muito ir?", { gift: true }),
  open("s15", "sonhos", "Uma tradição que querias que tivéssemos?"),

  open("m01", "memorias", "O que lembras do nosso primeiro date?"),
  open("m02", "memorias", "Quando percebeste que gostavas de mim?"),
  open("m03", "memorias", "A viagem mais engraçada que fizemos?"),
  open("m04", "memorias", "Uma coisa que fiz e nunca esqueceste?"),
  open("m05", "memorias", "O nosso momento mais embaraçoso?"),
  open("m06", "memorias", "A melhor refeição que comemos juntos?"),
  open("m07", "memorias", "Uma música que te lembra de nós?"),
  open("m08", "memorias", "A primeira coisa que reparaste em mim?"),
  open("m09", "memorias", "A maior gargalhada que demos juntos?"),
  open("m10", "memorias", "Uma discussão que hoje te dá vontade de rir?"),
  open("m11", "memorias", "Um sítio que é \"nosso\"?"),
  open("m12", "memorias", "O date que correu pior (mas teve graça)?"),
  open("m13", "memorias", "Uma piada que só nós percebemos?"),
  open("m14", "memorias", "A nossa fotografia preferida?"),
  open("m15", "memorias", "O que mudou em ti desde que estamos juntos?"),
];

const byId = new Map(questions.map((question) => [question.id, question]));
export const questionById = (id: string) => byId.get(id) ?? null;
export const isWritten = (question: GameQuestion) => question.kind === "know" && !question.options;

// The question as one of the two reads it: the guess half names the other one.
export function promptFor(question: GameQuestion, part: "self" | "guess" = "guess", about = "") {
  if (question.kind === "know") return part === "self" ? question.self : question.guess.replace("{n}", about);
  if (question.kind === "who") return `Quem é mais provável de ${question.text}?`;
  if (question.kind === "pair") return `${question.text} ${question.options[0]} ou ${question.options[1]}?`;
  return question.text;
}

type Side = Partial<Record<GameRole, string>>;

// Each one's answers to one question, split into mine and theirs.
export function answersFor(all: GameAnswer[], questionId: string, myId: string) {
  const mine: Side = {};
  const theirs: Side = {};
  all.filter((answer) => answer.question_id === questionId).forEach((answer) => {
    (answer.user_id === myId ? mine : theirs)[answer.role] = answer.answer;
  });
  return { mine, theirs, iAnswered: mine.self !== undefined, bothAnswered: mine.self !== undefined && theirs.self !== undefined };
}

// Two written answers that obviously say the same thing count as a hit without asking:
// same words once case, accents, punctuation and a leading article are ignored.
export function sameAnswer(first = "", second = "") {
  const plain = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\b(o|a|os|as|the|um|uma)\b/g, " ").replace(/\s+/g, " ").trim();
  const a = plain(first);
  const b = plain(second);
  return a.length > 0 && a === b;
}

// How a guess went: right, nearly, wrong, or still waiting for the other to say.
export function guessResult(question: KnowQuestion, guess: string | undefined, answer: string | undefined, verdict: string | undefined): Verdict | "pending" {
  if (question.options) return guess === answer ? "hit" : "miss";
  if (sameAnswer(guess, answer)) return "hit";
  return verdict === "hit" || verdict === "close" || verdict === "miss" ? verdict : "pending";
}

export type Outcome =
  | { kind: "know"; mine: Verdict | "pending"; theirs: Verdict | "pending"; iMustJudge: boolean }
  | { kind: "pair"; same: boolean }
  | { kind: "who"; same: boolean; mine: HomePartner; theirs: HomePartner }
  | { kind: "open" };

// `mine` is how my guess went, `theirs` how theirs went (I'm the one who judges theirs).
export function outcomeOf(question: GameQuestion, mine: Side, theirs: Side): Outcome {
  if (question.kind === "know") {
    const theirResult = guessResult(question, theirs.guess, mine.self, mine.verdict);
    return { kind: "know", mine: guessResult(question, mine.guess, theirs.self, theirs.verdict), theirs: theirResult, iMustJudge: theirResult === "pending" };
  }
  if (question.kind === "pair") return { kind: "pair", same: mine.self === theirs.self };
  if (question.kind === "who") return { kind: "who", same: mine.self === theirs.self, mine: mine.self as HomePartner, theirs: theirs.self as HomePartner };
  return { kind: "open" };
}

// The reaction on reveal: loud when you get it, louder when you don't.
const reactions = {
  hit: [["🎯", "ACERTASTE!"], ["😍", "Conheces mesmo"], ["💘", "Em cheio!"], ["🏆", "Nota 20!"], ["👀", "Isto é que é atenção"]],
  close: [["🤏", "Quase quase!"], ["😬", "Por um triz"], ["🫠", "Andou lá perto"]],
  miss: [["😂", "QUE FALHANÇO"], ["🙈", "Nem perto…"], ["😅", "Precisam de mais dates"], ["🫣", "Vai já pedir desculpa"], ["🤡", "Falhou redondamente"], ["😱", "Quem és tu?!"]],
  same: [["💞", "Almas gémeas"], ["👯", "Iguaizinhos"], ["🤝", "Combinadíssimos"], ["✨", "Feitos um para o outro"]],
  differ: [["🧲", "Os opostos atraem-se"], ["😂", "Isto vai dar discussão"], ["🙃", "Pois… cada um para seu lado"], ["⚔️", "Guerra declarada"]],
  agree: [["😂", "Nem vale a pena discutir"], ["🤝", "Unanimidade"], ["📢", "Está decidido"]],
  disagree: [["🙃", "Cada um acusa o outro"], ["🤨", "Alguém está a mentir"], ["⚖️", "Vai a tribunal"]],
  open: [["🥹", "Que fofura"], ["💌", "Guardem isto"], ["😍", "Ai ai…"], ["👀", "Isto dá um date"]],
} as const;
export type ReactionKind = keyof typeof reactions;

function hash(text: string) {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) value = Math.imul(value ^ text.charCodeAt(index), 16777619);
  return value >>> 0;
}

export function reaction(kind: ReactionKind, seed: string) {
  const list = reactions[kind];
  const [emoji, text] = list[hash(`${kind}:${seed}`) % list.length];
  return { emoji, text };
}

// The question of the day: the same one for both (they start from the same place),
// skipping what this person already answered.
export function dailyQuestion(coupleId: string, today: string, answered: Set<string>) {
  const start = hash(`${coupleId}:${today}`) % questions.length;
  for (let step = 0; step < questions.length; step += 1) {
    const question = questions[(start + step) % questions.length];
    if (!answered.has(question.id)) return question;
  }
  return null;
}

// The next one to play in a deck: first what the other already answered (they're waiting),
// then the rest in order.
export function nextInDeck(deck: DeckKey, answered: Set<string>, waiting: Set<string>) {
  const inDeck = questions.filter((question) => question.deck === deck && !answered.has(question.id));
  return inDeck.find((question) => waiting.has(question.id)) ?? inDeck[0] ?? null;
}

// Written guesses about me that I still have to judge (right, nearly or wrong).
export function toJudge(all: GameAnswer[], myId: string) {
  const ids = [...new Set(all.map((answer) => answer.question_id))];
  return ids.filter((id) => {
    const question = questionById(id);
    if (!question || question.kind !== "know" || question.options) return false;
    const { mine, theirs, bothAnswered } = answersFor(all, id, myId);
    return bothAnswered && mine.verdict === undefined && !sameAnswer(theirs.guess, mine.self);
  });
}

// How many each one got right in "Quanto me conheces?" ("nearly" counts half).
export function knowScore(all: GameAnswer[], myId: string) {
  let me = 0;
  let partner = 0;
  let rounds = 0;
  const points = (result: Verdict | "pending") => (result === "hit" ? 1 : result === "close" ? 0.5 : 0);
  questions.forEach((question) => {
    if (question.kind !== "know") return;
    const { mine, theirs, bothAnswered } = answersFor(all, question.id, myId);
    if (!bothAnswered) return;
    const outcome = outcomeOf(question, mine, theirs);
    if (outcome.kind !== "know") return;
    rounds += 1;
    me += points(outcome.mine);
    partner += points(outcome.theirs);
  });
  return { me, partner, rounds };
}

// What "this or that" says about the dates they'd enjoy: every pick counts once.
export function gameTastes(all: GameAnswer[]): Activity[] {
  return all.flatMap((answer) => {
    const question = questionById(answer.question_id);
    if (!question || question.kind !== "pair" || !question.tastes || answer.role !== "self") return [];
    const index = question.options.indexOf(answer.answer);
    return index >= 0 ? [question.tastes[index]] : [];
  });
}

// What someone said about themselves, for gifts or travel. Only answers already revealed
// reach the app (the database hides the rest), so nothing here spoils a game.
export function factsOf(all: GameAnswer[], myId: string, whose: "me" | "partner", kind: "gift" | "travel") {
  return all.flatMap((answer) => {
    const question = questionById(answer.question_id);
    if (!question || (answer.user_id === myId) !== (whose === "me") || answer.role !== "self") return [];
    if (question.kind !== "know" && question.kind !== "open") return [];
    if (!question[kind]) return [];
    return [{ id: question.id, question: question.kind === "know" ? question.topic.charAt(0).toUpperCase() + question.topic.slice(1) : question.text, answer: answer.answer }];
  });
}
