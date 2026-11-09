// Starting points for "when should we go?": months that tend to work well and why. Written by
// hand from general knowledge, so it's a suggestion and not a forecast.
export type DestinationGuide = {
  city: string;
  country: string;
  flag: string;
  months: number[];
  why: string;
  todo: string[];
};

export const monthNames = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export const destinationGuides: DestinationGuide[] = [
  { city: "Budapeste", country: "Hungria", flag: "🇭🇺", months: [5, 6, 9, 12], why: "Mercados de Natal em dezembro; primavera e setembro para passear a pé.", todo: ["Banhos termais Széchenyi", "Passeio de barco no Danúbio", "Bastião dos Pescadores ao pôr do sol", "Bares em ruínas no bairro judeu"] },
  { city: "Praga", country: "Chéquia", flag: "🇨🇿", months: [4, 5, 9, 12], why: "Mercados de Natal em dezembro; primavera e setembro com bom tempo.", todo: ["Ponte Carlos de manhã cedo", "Castelo de Praga", "Relógio astronómico", "Cervejaria tradicional"] },
  { city: "Viena", country: "Áustria", flag: "🇦🇹", months: [4, 5, 9, 12], why: "Mercados de Natal em dezembro; primavera e setembro para os jardins.", todo: ["Palácio de Schönbrunn", "Café vienense com Sachertorte", "Concerto clássico", "Roda gigante do Prater"] },
  { city: "Paris", country: "França", flag: "🇫🇷", months: [4, 5, 6, 9, 10], why: "Primavera e início do outono, com dias agradáveis para andar a pé.", todo: ["Passeio ao longo do Sena", "Museu d'Orsay", "Montmartre ao fim da tarde", "Piquenique no Champ de Mars"] },
  { city: "Bordéus", country: "França", flag: "🇫🇷", months: [5, 6, 9, 10], why: "Fim de primavera e setembro, com as vindimas no início do outono.", todo: ["Espelho de água da Place de la Bourse", "La Cité du Vin", "Dia em Saint-Émilion", "Canelés numa pastelaria"] },
  { city: "Roma", country: "Itália", flag: "🇮🇹", months: [4, 5, 10], why: "Primavera e outono: menos calor do que no verão.", todo: ["Coliseu e Fórum Romano", "Trastevere ao jantar", "Fontana di Trevi à noite", "Gelado perto do Panteão"] },
  { city: "Florença", country: "Itália", flag: "🇮🇹", months: [4, 5, 9, 10], why: "Primavera e início do outono, longe do calor de julho e agosto.", todo: ["Galeria Uffizi", "Pôr do sol na Piazzale Michelangelo", "Ponte Vecchio", "Prova de vinhos na Toscana"] },
  { city: "Veneza", country: "Itália", flag: "🇮🇹", months: [4, 5, 9, 10], why: "Primavera e outono, com menos multidões.", todo: ["Passeio de gôndola", "Ilha de Burano", "Praça de São Marcos cedo", "Cicchetti num bacaro"] },
  { city: "Nápoles", country: "Itália", flag: "🇮🇹", months: [4, 5, 6, 9, 10], why: "Primavera e início do outono, bons também para a costa.", todo: ["Pizza numa pizzaria histórica", "Ruínas de Pompeia", "Centro histórico", "Costa Amalfitana"] },
  { city: "Milão", country: "Itália", flag: "🇮🇹", months: [4, 5, 9, 10], why: "Primavera e outono, com passeios ao Lago de Como.", todo: ["Terraços do Duomo", "Aperitivo em Navigli", "A Última Ceia", "Dia no Lago de Como"] },
  { city: "Barcelona", country: "Espanha", flag: "🇪🇸", months: [5, 6, 9, 10], why: "Maio, junho e setembro: praia e cidade sem o pico do verão.", todo: ["Sagrada Família", "Park Güell", "Tapas no El Born", "Fim de tarde na Barceloneta"] },
  { city: "Madrid", country: "Espanha", flag: "🇪🇸", months: [4, 5, 10], why: "Primavera e outono; o verão é muito quente.", todo: ["Museu do Prado", "Parque do Retiro", "Tapas em La Latina", "Churros com chocolate"] },
  { city: "Sevilha", country: "Espanha", flag: "🇪🇸", months: [3, 4, 5, 10, 11], why: "Primavera e outono; o verão é dos mais quentes da Europa.", todo: ["Real Alcázar", "Praça de Espanha", "Flamenco em Triana", "Terraço das Setas ao pôr do sol"] },
  { city: "Granada", country: "Espanha", flag: "🇪🇸", months: [4, 5, 10], why: "Primavera e outono, com clima ameno para a Alhambra.", todo: ["Alhambra", "Miradouro de São Nicolau", "Tapas no Albaicín", "Banhos árabes"] },
  { city: "San Sebastián", country: "Espanha", flag: "🇪🇸", months: [6, 7, 9], why: "Junho a setembro, com praia e esplanadas de pintxos.", todo: ["Rota de pintxos na Parte Velha", "Praia de La Concha", "Monte Igueldo", "Sidraria basca"] },
  { city: "Palma de Maiorca", country: "Espanha", flag: "🇪🇸", months: [5, 6, 9, 10], why: "Fim de primavera e setembro: bom mar sem o pico de agosto.", todo: ["Catedral de Palma", "Enseadas de Caló des Moro", "Serra de Tramuntana", "Comboio para Sóller"] },
  { city: "Amesterdão", country: "Países Baixos", flag: "🇳🇱", months: [4, 5, 6, 9], why: "Abril e maio pelas tulipas; junho e setembro para os canais.", todo: ["Passeio de barco nos canais", "Museu Van Gogh", "Jardins de Keukenhof (primavera)", "Bicicleta pelo Jordaan"] },
  { city: "Bruxelas", country: "Bélgica", flag: "🇧🇪", months: [5, 6, 9, 12], why: "Mercados de Natal em dezembro; fim de primavera e setembro.", todo: ["Grand-Place", "Prova de chocolates", "Dia em Bruges", "Waffles e cervejas belgas"] },
  { city: "Londres", country: "Reino Unido", flag: "🇬🇧", months: [5, 6, 9, 12], why: "Luzes de Natal em dezembro; dias longos em maio e junho.", todo: ["Musical no West End", "South Bank a pé", "Borough Market", "Museus gratuitos"] },
  { city: "Edimburgo", country: "Reino Unido", flag: "🇬🇧", months: [5, 6, 8, 12], why: "Festivais em agosto, Natal e Hogmanay em dezembro.", todo: ["Subir a Arthur's Seat", "Castelo de Edimburgo", "Royal Mile", "Prova de whisky"] },
  { city: "Dublin", country: "Irlanda", flag: "🇮🇪", months: [5, 6, 7, 9], why: "De maio a setembro, com dias mais longos e menos chuva.", todo: ["Música ao vivo em Temple Bar", "Trinity College", "Falésias de Howth", "Dia nas Cliffs of Moher"] },
  { city: "Berlim", country: "Alemanha", flag: "🇩🇪", months: [5, 6, 9, 12], why: "Mercados de Natal em dezembro; fim de primavera e setembro.", todo: ["East Side Gallery", "Ilha dos Museus", "Portão de Brandemburgo", "Mercado de rua em Kreuzberg"] },
  { city: "Munique", country: "Alemanha", flag: "🇩🇪", months: [5, 6, 9, 12], why: "Oktoberfest de setembro a outubro; mercados de Natal em dezembro.", todo: ["Cervejaria tradicional", "Jardim Inglês", "Castelo de Neuschwanstein", "Marienplatz"] },
  { city: "Copenhaga", country: "Dinamarca", flag: "🇩🇰", months: [5, 6, 7, 8, 12], why: "Dias longos no verão; Tivoli iluminado em dezembro.", todo: ["Nyhavn", "Jardins Tivoli", "Bicicleta pela cidade", "Sauna à beira do porto"] },
  { city: "Estocolmo", country: "Suécia", flag: "🇸🇪", months: [6, 7, 8, 12], why: "Verão com muitas horas de luz; Natal em Gamla Stan.", todo: ["Gamla Stan", "Museu Vasa", "Barco pelo arquipélago", "Fika num café"] },
  { city: "Atenas", country: "Grécia", flag: "🇬🇷", months: [4, 5, 10], why: "Primavera e outono; o verão é muito quente.", todo: ["Acrópole cedo", "Bairro de Plaka", "Pôr do sol em Sounion", "Jantar com vista para o Partenon"] },
  { city: "Santorini", country: "Grécia", flag: "🇬🇷", months: [5, 6, 9, 10], why: "Fim de primavera e setembro, com mar quente e menos gente.", todo: ["Pôr do sol em Oia", "Passeio de barco na caldeira", "Trilho Fira–Oia", "Prova de vinhos locais"] },
  { city: "Dubrovnik", country: "Croácia", flag: "🇭🇷", months: [5, 6, 9, 10], why: "Fim de primavera e setembro, sem as multidões de agosto.", todo: ["Caminhar nas muralhas", "Teleférico ao pôr do sol", "Kayak no Adriático", "Ilha de Lokrum"] },
  { city: "Istambul", country: "Turquia", flag: "🇹🇷", months: [4, 5, 9, 10], why: "Primavera e outono, com temperaturas agradáveis.", todo: ["Santa Sofia e Mesquita Azul", "Grande Bazar", "Barco no Bósforo", "Hammam tradicional"] },
  { city: "Marraquexe", country: "Marrocos", flag: "🇲🇦", months: [3, 4, 5, 10, 11], why: "Primavera e outono; o verão é demasiado quente.", todo: ["Praça Jemaa el-Fnaa", "Jardim Majorelle", "Noite num riad", "Passeio ao deserto de Agafay"] },
  { city: "Reiquiavique", country: "Islândia", flag: "🇮🇸", months: [2, 3, 6, 7, 9], why: "Auroras boreais no inverno; sol da meia-noite em junho e julho.", todo: ["Círculo Dourado", "Blue Lagoon", "Procurar auroras boreais", "Praia de areia negra de Vík"] },
  { city: "Funchal", country: "Portugal", flag: "🇵🇹", months: [4, 5, 6, 9, 10, 12], why: "Ameno todo o ano; fogo de artifício famoso na passagem de ano.", todo: ["Levada das 25 Fontes", "Pico do Arieiro ao nascer do sol", "Carros de cesto do Monte", "Mercado dos Lavradores"] },
  { city: "Ponta Delgada", country: "Portugal", flag: "🇵🇹", months: [5, 6, 7, 8, 9], why: "De maio a setembro, com menos chuva nos Açores.", todo: ["Sete Cidades", "Caldeiras das Furnas", "Observação de baleias", "Banhos na Poça da Dona Beija"] },
  { city: "Lisboa", country: "Portugal", flag: "🇵🇹", months: [4, 5, 6, 9, 10], why: "Primavera e início do outono; arraiais dos Santos em junho.", todo: ["Elétrico 28", "Miradouro da Senhora do Monte", "Pastéis de Belém", "Arraial em Alfama (junho)"] },
];

export function findGuide(city: string) {
  const normalize = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLocaleLowerCase("pt-PT");
  return destinationGuides.find((guide) => normalize(guide.city) === normalize(city)) ?? null;
}

export function bestMonthsLabel(guide: DestinationGuide) {
  const names = guide.months.map((month) => monthNames[month - 1]);
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}` : names[0];
}

// Good now, or within the next two months.
export function guidesForSoon(now = new Date()) {
  const soon = [0, 1, 2].map((offset) => ((now.getMonth() + offset) % 12) + 1);
  return destinationGuides.filter((guide) => guide.months.some((month) => soon.includes(month)));
}

export function flightsUrl(airport: string, city: string, month?: string) {
  const query = `Voos de ${airport} para ${city}${month ? ` em ${month}` : ""}`;
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}&hl=pt-PT&curr=EUR`;
}
