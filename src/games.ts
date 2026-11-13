// No imports: the notification endpoint loads this file too, and its module rules are stricter.
// These two match Activity (activities.ts) and HomePartner (types.ts); a test checks the first.
type Activity = "comer" | "ver" | "ar_livre" | "criar" | "cultura" | "jogar" | "descansar" | "conversar" | "escapadinha";
type HomePartner = "partner_one" | "partner_two";

// Couple games: short questions answered by both, revealed only when both have answered.
// What each one says about themselves stays saved, and the app uses it later: gift hints,
// travel dreams on the map, and tastes for the ideas it finds. The questions are ours,
// written by hand. Ids never change once published (answers point at them).

export type DeckKey = "conhecer" | "isto" | "quem" | "sonhos" | "memorias";

type Base = { id: string; deck: DeckKey };
// About you: you answer for yourself, then guess the other's answer.
export type KnowQuestion = Base & { kind: "know"; self: string; guess: string; options: string[]; gift?: boolean; travel?: boolean };
// This or that: each picks one, and it shows whether you picked the same.
export type PairQuestion = Base & { kind: "pair"; text: string; options: [string, string]; tastes?: [Activity, Activity] };
// Who is more likely to…: each points at one of the two.
export type WhoQuestion = Base & { kind: "who"; text: string };
// Dreams and memories: a few words each, side by side.
export type OpenQuestion = Base & { kind: "open"; text: string; gift?: boolean; travel?: boolean };
export type GameQuestion = KnowQuestion | PairQuestion | WhoQuestion | OpenQuestion;

export type GameAnswer = { question_id: string; user_id: string; role: "self" | "guess"; answer: string; created_at: string };

export const decks: Array<{ key: DeckKey; emoji: string; title: string; hint: string }> = [
  { key: "conhecer", emoji: "🧠", title: "Quanto me conheces?", hint: "Respondes sobre ti e adivinhas o outro" },
  { key: "isto", emoji: "⚖️", title: "Isto ou aquilo", hint: "Escolhem os dois: será que batem certo?" },
  { key: "quem", emoji: "👉", title: "Quem é mais…?", hint: "Apontem um ao outro" },
  { key: "sonhos", emoji: "✨", title: "Sonhos", hint: "Sítios, planos e vontades" },
  { key: "memorias", emoji: "📸", title: "Memórias", hint: "O que cada um guarda de vocês" },
];

const know = (id: string, self: string, guess: string, options: string[], extra: { gift?: boolean; travel?: boolean } = {}): KnowQuestion => ({ id, deck: "conhecer", kind: "know", self, guess, options, ...extra });
const pair = (id: string, text: string, a: string, b: string, tastes?: [Activity, Activity]): PairQuestion => ({ id, deck: "isto", kind: "pair", text, options: [a, b], ...(tastes ? { tastes } : {}) });
const who = (id: string, text: string): WhoQuestion => ({ id, deck: "quem", kind: "who", text });
const open = (id: string, deck: "sonhos" | "memorias", text: string, extra: { gift?: boolean; travel?: boolean } = {}): OpenQuestion => ({ id, deck, kind: "open", text, ...extra });

export const questions: GameQuestion[] = [
  know("k01", "Qual é a tua comida preferida?", "Qual é a comida preferida de {n}?", ["Pizza", "Sushi", "Francesinha", "Massa"]),
  know("k02", "A tua sobremesa preferida?", "A sobremesa preferida de {n}?", ["Chocolate", "Gelado", "Bolo de bolacha", "Fruta"], { gift: true }),
  know("k03", "Que flores preferes?", "Que flores prefere {n}?", ["Rosas", "Girassóis", "Tulipas", "Não ligo a flores"], { gift: true }),
  know("k04", "O que bebes num jantar especial?", "O que bebe {n} num jantar especial?", ["Vinho", "Cerveja", "Água ou sumo", "Um cocktail"]),
  know("k05", "Como tomas o café?", "Como toma {n} o café?", ["Expresso", "Com leite", "Descafeinado", "Não bebo café"]),
  know("k06", "A tua estação do ano preferida?", "A estação preferida de {n}?", ["Primavera", "Verão", "Outono", "Inverno"]),
  know("k07", "Férias ideais?", "As férias ideais de {n}?", ["Praia", "Cidade", "Montanha", "Ficar em casa"], { travel: true }),
  know("k08", "Que superpoder escolhias?", "Que superpoder escolhia {n}?", ["Voar", "Teletransporte", "Ler mentes", "Ficar invisível"]),
  know("k09", "O teu animal preferido?", "O animal preferido de {n}?", ["Cão", "Gato", "Golfinho", "Panda"]),
  know("k10", "Que filmes preferes?", "Que filmes prefere {n}?", ["Comédia", "Terror", "Romance", "Ação"], { gift: true }),
  know("k11", "Que música ouves mais?", "Que música ouve mais {n}?", ["Pop", "Rock", "Hip-hop", "Música portuguesa"], { gift: true }),
  know("k12", "A que horas estás no teu melhor?", "A que horas está {n} no seu melhor?", ["De manhã cedo", "A meio do dia", "À noite", "Nunca 😴"]),
  know("k13", "A prenda perfeita para ti é…", "A prenda perfeita para {n} é…", ["Uma experiência", "Algo feito à mão", "Algo útil", "Uma surpresa cara 😏"], { gift: true }),
  know("k14", "A tarefa de casa que mais detestas?", "A tarefa de casa que {n} mais detesta?", ["Loiça", "Passar a ferro", "Aspirar", "Limpar a casa de banho"]),
  know("k15", "O que te irrita mais?", "O que irrita mais {n}?", ["Atrasos", "Barulho a mastigar", "Mensagens sem resposta", "Ter fome"]),
  know("k16", "O fim de semana ideal?", "O fim de semana ideal de {n}?", ["Sofá e série", "Sair à aventura", "Jantar com amigos", "Dormir até tarde"]),
  know("k17", "A tua cor preferida?", "A cor preferida de {n}?", ["Azul", "Verde", "Vermelho", "Preto"], { gift: true }),
  know("k18", "Que tamanho de t-shirt vestes?", "Que tamanho de t-shirt veste {n}?", ["XS", "S", "M", "L", "XL"], { gift: true }),
  know("k19", "Que cheiros preferes?", "Que cheiros prefere {n}?", ["Florais", "Doces", "Frescos", "Amadeirados"], { gift: true }),
  know("k20", "O teu doce de infância?", "O doce de infância de {n}?", ["Gomas", "Chupa-chupas", "Bolicao", "Pão com manteiga e açúcar"], { gift: true }),
  know("k21", "Do que tens mais medo?", "Do que tem {n} mais medo?", ["Aranhas", "Alturas", "Escuro", "Palhaços"]),
  know("k22", "Choras com filmes?", "{n} chora com filmes?", ["Sempre", "Às vezes", "Nunca", "Só às escondidas"]),
  know("k23", "O teu desporto?", "O desporto de {n}?", ["Futebol", "Ginásio", "Caminhar", "O sofá conta?"]),
  know("k24", "A app que mais abres?", "A app que {n} mais abre?", ["Instagram", "TikTok", "WhatsApp", "Outra qualquer"]),
  know("k25", "Se ganhasses o Euromilhões, a primeira coisa era…", "Se {n} ganhasse o Euromilhões, a primeira coisa era…", ["Viajar", "Comprar casa", "Despedir-me", "Ajudar a família"]),
  know("k26", "O prato que cozinhas melhor?", "O prato que {n} cozinha melhor?", ["Massa", "Bife", "Ovos mexidos", "Encomendo 😅"]),
  know("k27", "Livro, série ou podcast?", "{n}: livro, série ou podcast?", ["Livro", "Série", "Podcast", "Nenhum"], { gift: true }),
  know("k28", "O teu destino de sonho?", "O destino de sonho de {n}?", ["Japão", "Islândia", "Brasil", "Itália"], { travel: true }),
  know("k29", "Como gostas de passar os teus anos?", "Como gosta {n} de passar os anos?", ["Festa grande", "Jantar a dois", "Escapadinha", "Esquecer que é"], { gift: true }),
  know("k30", "A tua mania?", "A mania de {n}?", ["Organizar tudo", "Roer as unhas", "Cantar no duche", "Falar sozinho/a"]),
  know("k31", "No cinema, o que comes?", "No cinema, o que come {n}?", ["Pipocas doces", "Pipocas salgadas", "Nachos", "Gomas"]),
  know("k32", "Para relaxar, o que fazes?", "Para relaxar, o que faz {n}?", ["Banho quente", "Sesta", "Exercício", "Ver vídeos"]),
  know("k33", "A primeira coisa que fazes ao acordar?", "A primeira coisa que {n} faz ao acordar?", ["Ver o telemóvel", "Café", "Duche", "Snooze cinco vezes"]),
  know("k34", "Calor ou frio?", "{n}: calor ou frio?", ["Calor sempre", "Frio com mantas", "Nem um nem outro", "Depende do dia"]),
  know("k35", "O acessório que usas mais?", "O acessório que {n} usa mais?", ["Relógio", "Brincos ou colar", "Óculos de sol", "Nenhum"], { gift: true }),
  know("k36", "Para uma ocasião especial, que restaurante?", "Para uma ocasião especial, que restaurante escolhe {n}?", ["Italiano", "Japonês", "Português tradicional", "Marisqueira"]),
  know("k37", "Uma bebida quente?", "A bebida quente de {n}?", ["Chá", "Chocolate quente", "Café", "Nenhuma"], { gift: true }),
  know("k38", "Gostas de surpresas?", "{n} gosta de surpresas?", ["Adoro", "Só das boas", "Prefiro saber", "Detesto"]),
  know("k39", "O que te faz sentir mais amado/a?", "O que faz {n} sentir-se mais amado/a?", ["Palavras bonitas", "Tempo juntos", "Prendas", "Carinho", "Ajuda nas tarefas"], { gift: true }),
  know("k40", "O pequeno-almoço ideal?", "O pequeno-almoço ideal de {n}?", ["Torradas", "Panquecas", "Iogurte e fruta", "Só café"]),

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
  pair("p19", "No fim do ano:", "Balanço a dois", "Festa com amigos", ["conversar", "jogar"]),
  pair("p20", "Ao ar livre:", "Bicicleta", "Canoagem", ["ar_livre", "ar_livre"]),
  pair("p21", "Bicho:", "Cão", "Gato"),
  pair("p22", "Sabor:", "Doce", "Salgado"),
  pair("p23", "Falar:", "Mensagem", "Chamada"),
  pair("p24", "Estação:", "Verão", "Inverno"),
  pair("p25", "Jantar rápido:", "Pizza", "Hambúrguer"),
  pair("p26", "Tempo:", "Chuva", "Sol"),
  pair("p27", "Morar:", "Cidade", "Campo"),
  pair("p28", "De manhã:", "Chá", "Café"),
  pair("p29", "Viajar no tempo:", "Para o passado", "Para o futuro"),
  pair("p30", "Superpoder:", "Ler mentes", "Ficar invisível"),
  pair("p31", "Viagem:", "Avião", "Carro"),
  pair("p32", "Planos:", "Planear tudo", "Improvisar"),
  pair("p33", "Banho:", "Duche rápido", "Banheira demorada"),
  pair("p34", "Acompanhamento:", "Batatas fritas", "Arroz"),
  pair("p35", "Carinho:", "Abraço", "Beijo"),
  pair("p36", "Sexta à noite:", "Festa", "Sofá"),
  pair("p37", "Para sempre sem:", "Chocolate", "Queijo"),
  pair("p38", "Férias em Portugal:", "Serra da Estrela", "Algarve"),
  pair("p39", "Cidade:", "Lisboa", "Porto"),
  pair("p40", "Ver o sol:", "Nascer", "Pôr"),

  who("q01", "se perder mesmo com GPS"),
  who("q02", "adormecer a meio do filme"),
  who("q03", "chorar num filme de animação"),
  who("q04", "comer o último bocado sem perguntar"),
  who("q05", "chegar atrasado/a"),
  who("q06", "perder as chaves"),
  who("q07", "gastar demais nos saldos"),
  who("q08", "meter conversa com estranhos"),
  who("q09", "ganhar num jogo de tabuleiro"),
  who("q10", "fazer batota num jogo"),
  who("q11", "acordar cedo ao fim de semana"),
  who("q12", "planear a próxima viagem"),
  who("q13", "cantar alto no carro"),
  who("q14", "tirar mil fotografias à comida"),
  who("q15", "desistir de uma caminhada a meio"),
  who("q16", "pedir desculpa primeiro"),
  who("q17", "ter fome primeiro"),
  who("q18", "dizer \"só mais um episódio\""),
  who("q19", "roubar os cobertores"),
  who("q20", "adotar um animal sem avisar"),
  who("q21", "esquecer um aniversário"),
  who("q22", "demorar horas a escolher no menu"),
  who("q23", "rir na hora errada"),
  who("q24", "sobreviver a um apocalipse zombie"),
  who("q25", "contar uma novidade à mãe primeiro"),
  who("q26", "mandar memes às 3 da manhã"),
  who("q27", "comprar uma coisa inútil online"),
  who("q28", "preparar uma surpresa"),
  who("q29", "dizer \"eu avisei\""),
  who("q30", "ficar com a última palavra numa discussão"),

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
  open("s12", "sonhos", "Um livro ou filme que querias ver comigo?", { gift: true }),
  open("s13", "sonhos", "Um hobby novo que gostavas de ter?", { gift: true }),
  open("s14", "sonhos", "Um sonho de criança que ainda queres cumprir?"),
  open("s15", "sonhos", "Onde gostavas de passar os próximos anos?", { travel: true }),
  open("s16", "sonhos", "Uma experiência que pagavas para repetir?"),
  open("s17", "sonhos", "Uma ilha onde gostavas de ir?", { travel: true }),
  open("s18", "sonhos", "Um restaurante onde queres muito ir?", { gift: true }),
  open("s19", "sonhos", "O que fazias com um dia inteiro só para ti?"),
  open("s20", "sonhos", "Uma tradição que querias que tivéssemos?"),

  open("m01", "memorias", "O que lembras do nosso primeiro date?"),
  open("m02", "memorias", "Quando percebeste que gostavas de mim?"),
  open("m03", "memorias", "A viagem mais engraçada que fizemos?"),
  open("m04", "memorias", "Uma coisa que fiz e nunca esqueceste?"),
  open("m05", "memorias", "O nosso momento mais embaraçoso?"),
  open("m06", "memorias", "A melhor refeição que comemos juntos?"),
  open("m07", "memorias", "Uma música que te lembra de nós?"),
  open("m08", "memorias", "A primeira coisa que reparaste em mim?"),
  open("m09", "memorias", "Um dia normal que acabou por ser especial?"),
  open("m10", "memorias", "A maior gargalhada que demos juntos?"),
  open("m11", "memorias", "Uma discussão que hoje te dá vontade de rir?"),
  open("m12", "memorias", "O melhor presente que te dei?"),
  open("m13", "memorias", "Um sítio que é \"nosso\"?"),
  open("m14", "memorias", "O date que correu pior (mas teve graça)?"),
  open("m15", "memorias", "Uma piada que só nós percebemos?"),
  open("m16", "memorias", "Lembras-te da primeira mensagem que trocámos?"),
  open("m17", "memorias", "Um momento em que tiveste orgulho em mim?"),
  open("m18", "memorias", "A nossa fotografia preferida?"),
  open("m19", "memorias", "O que mudou em ti desde que estamos juntos?"),
  open("m20", "memorias", "Uma memória nossa com família ou amigos?"),
];

const byId = new Map(questions.map((question) => [question.id, question]));
export const questionById = (id: string) => byId.get(id) ?? null;

// The question as one of the two reads it. `about` is the other's name for the guess half.
export function promptFor(question: GameQuestion, part: "self" | "guess" = "self", about = "") {
  if (question.kind === "know") return part === "self" ? question.self : question.guess.replace("{n}", about);
  if (question.kind === "who") return `Quem é mais provável de ${question.text}?`;
  if (question.kind === "pair") return `${question.text} ${question.options[0]} ou ${question.options[1]}?`;
  return question.text;
}

// Each one's answers to one question, split into mine and theirs.
export function answersFor(all: GameAnswer[], questionId: string, myId: string) {
  const mine: Partial<Record<"self" | "guess", string>> = {};
  const theirs: Partial<Record<"self" | "guess", string>> = {};
  all.filter((answer) => answer.question_id === questionId).forEach((answer) => {
    (answer.user_id === myId ? mine : theirs)[answer.role] = answer.answer;
  });
  return { mine, theirs, iAnswered: mine.self !== undefined, bothAnswered: mine.self !== undefined && theirs.self !== undefined };
}

export type Outcome =
  | { kind: "know"; myGuessHit: boolean; theirGuessHit: boolean }
  | { kind: "pair"; same: boolean }
  | { kind: "who"; same: boolean; mine: HomePartner; theirs: HomePartner }
  | { kind: "open" };

export function outcomeOf(question: GameQuestion, mine: Partial<Record<"self" | "guess", string>>, theirs: Partial<Record<"self" | "guess", string>>): Outcome {
  if (question.kind === "know") return { kind: "know", myGuessHit: mine.guess === theirs.self, theirGuessHit: theirs.guess === mine.self };
  if (question.kind === "pair") return { kind: "pair", same: mine.self === theirs.self };
  if (question.kind === "who") return { kind: "who", same: mine.self === theirs.self, mine: mine.self as HomePartner, theirs: theirs.self as HomePartner };
  return { kind: "open" };
}

// The reaction on reveal: loud when you get it, louder when you don't.
const reactions = {
  hit: [["🎯", "ACERTASTE!"], ["😍", "Conhece-te como ninguém"], ["💘", "Em cheio!"], ["🏆", "Nota 20!"], ["👀", "Isto é que é atenção"]],
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

// How many each one got right in "Quanto me conheces?".
export function knowScore(all: GameAnswer[], myId: string) {
  let me = 0;
  let partner = 0;
  let rounds = 0;
  questions.filter((question) => question.kind === "know").forEach((question) => {
    const { mine, theirs, bothAnswered } = answersFor(all, question.id, myId);
    if (!bothAnswered) return;
    rounds += 1;
    if (mine.guess === theirs.self) me += 1;
    if (theirs.guess === mine.self) partner += 1;
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
    return [{ id: question.id, question: question.kind === "know" ? question.self : question.text, answer: answer.answer }];
  });
}
