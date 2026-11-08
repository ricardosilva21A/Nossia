import type { ReactNode } from "react";

const contactEmail = "";

function InfoPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="info-page">
      <a className="brand" href="/" aria-label="Voltar à Nossia"><span className="brand-mark">n</span><span className="brand-name">nossia</span></a>
      <h1>{title}</h1>
      {children}
    </main>
  );
}

export function PrivacyPage() {
  return (
    <InfoPage title="Política de privacidade">
      <p className="info-updated">Última atualização: 8 de novembro de 2026</p>
      <p>A Nossia é uma aplicação privada para casais. Esta página explica que dados guarda, para quê e quem os vê.</p>
      <h2>Que dados guardamos</h2>
      <ul>
        <li><strong>Conta:</strong> email, palavra-passe protegida e nomes.</li>
        <li><strong>Datas do casal:</strong> início da relação, aniversários e outras datas que escolham indicar.</li>
        <li><strong>O que escrevem:</strong> ideias, dates, notas, memórias, compromissos, tarefas, horários, viagens e sítios.</li>
        <li><strong>Fotografias</strong> que carreguem, guardadas num espaço privado.</li>
        <li><strong>Localização:</strong> só as moradas e cidades que indiquem. O GPS só é usado se o permitirem, para procurar sítios por perto.</li>
        <li><strong>Notificações:</strong> os dados técnicos do dispositivo, se as ativarem.</li>
      </ul>
      <h2>Para quê</h2>
      <p>Só para a aplicação funcionar: mostrar os vossos planos aos dois, enviar lembretes e sugerir ideias. Não há publicidade, não vendemos dados e não os usamos para treinar inteligência artificial.</p>
      <h2>Quem vê os dados</h2>
      <p>Os dados do casal só são visíveis para as duas contas desse casal. A área de administração mostra apenas totais, como o número de contas, e o catálogo público de ideias.</p>
      <h2>Serviços que usamos</h2>
      <ul>
        <li><strong>Supabase</strong> (União Europeia): base de dados, contas e fotografias.</li>
        <li><strong>Vercel:</strong> alojamento do site.</li>
        <li><strong>Open-Meteo:</strong> previsão do tempo, a partir da localização que escolherem.</li>
        <li><strong>OpenStreetMap / Nominatim:</strong> mapas e procura de sítios.</li>
        <li><strong>Google Fonts:</strong> tipo de letra do site.</li>
        <li><strong>Apple, Google ou Mozilla:</strong> entrega das notificações, conforme o dispositivo.</li>
      </ul>
      <p>As ligações para o Google Voos, Google Maps ou TheFork levam-vos a esses sites, que têm as suas próprias regras.</p>
      <h2>Durante quanto tempo</h2>
      <p>Guardamos os dados enquanto a conta existir. Se apagares a conta e não houver outra no casal, apagamos tudo, incluindo as fotografias. Se o teu par tiver conta, os dados partilhados do casal ficam com essa pessoa. As cópias de segurança do fornecedor podem demorar algum tempo a expirar.</p>
      <h2>Os vossos direitos</h2>
      <p>Ao abrigo do RGPD, podem pedir acesso aos vossos dados, corrigi-los, apagá-los ou recebê-los num formato portátil. Muitos dados podem ser editados na própria aplicação, e a conta pode ser apagada em Nós, Definições. Também podem apresentar queixa à CNPD, a autoridade portuguesa de proteção de dados.</p>
      <h2>Idade</h2>
      <p>A Nossia destina-se a maiores de 18 anos.</p>
      {contactEmail && <><h2>Contacto</h2><p>Para qualquer pedido sobre privacidade: <a href={`mailto:${contactEmail}`}>{contactEmail}</a></p></>}
    </InfoPage>
  );
}

export function HelpPage() {
  return (
    <InfoPage title="Guia de utilização">
      <h2>Começar</h2>
      <ol>
        <li>Cria a conta com os vossos nomes e a data da relação.</li>
        <li>Em Nós, Definições, abre o Perfil do casal e cria a ligação de convite para o teu par.</li>
        <li>No iPhone, abre o site no Safari, toca em Partilhar e em <strong>Adicionar ao ecrã principal</strong>.</li>
      </ol>
      <h2>Marcar coisas depressa</h2>
      <p>Na caixa do Hoje, escreve como dirias: “Jantar italiano sexta às 20h”. A Nossia percebe o dia e a hora. Escolhe se é um date, um compromisso, uma ideia para depois ou algo que já fizeram.</p>
      <h2>Ideias</h2>
      <p>Vejam o catálogo, guardem favoritas, sorteiem uma ideia ou respondam a algumas perguntas para receber sugestões de acordo com o tempo e a época.</p>
      <h2>Restaurantes e sítios</h2>
      <p>Em Ideias, Sítios, escolham entre experimentar um novo ou voltar a um de que gostaram. Quando dizem que querem repetir um jantar, o restaurante passa para os Aprovados, com o que comeram.</p>
      <h2>Mudar de planos</h2>
      <p>Usem o lápis no cartão para mudar o dia, a hora ou o sítio de um date, ou o × para o apagar. Compromissos, tarefas e viagens também se editam.</p>
      <h2>Depois de um date</h2>
      <p>Toquem em “Já fizemos”. A Nossia pergunta se querem repetir e, conforme o date, o que viram ou o que comeram. Podem juntar notas e fotografias.</p>
      <h2>Filmes e séries</h2>
      <p>No Hoje, “Vimos um filme ou série” regista logo e pergunta o título. Podem repetir sempre que quiserem.</p>
      <h2>Agenda</h2>
      <p>Em Agenda, Semana, ponham os horários de trabalho para a Nossia mostrar quando estão os dois livres, e organizem compromissos e tarefas.</p>
      <h2>Viagens</h2>
      <p>Planeiem destinos e o que fazer em cada dia. Depois de uma viagem, juntem fotografias e vejam-na no Mapa-mundo. O aeroporto de partida muda-se em Nós, Definições.</p>
      <h2>Notificações e calendário</h2>
      <p>Em Nós, Definições, ativem as notificações. No iPhone, só funcionam com a Nossia no ecrã principal. Nas mesmas definições, podem subscrever os dates no calendário do iPhone.</p>
      <h2>Apagar a conta</h2>
      <p>Está em Nós, Definições. Lê a <a href="/privacidade">política de privacidade</a> para saberes o que acontece aos dados.</p>
    </InfoPage>
  );
}
