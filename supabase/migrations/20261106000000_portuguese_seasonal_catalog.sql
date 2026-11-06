-- Portuguese shared catalog with seasons.
--
-- Publishes the Portuguese ideas to every couple, adds seasonal ones and replaces the
-- English starter ideas. Existing dates and favourites follow the idea they pointed at.
-- Ideas a couple wrote themselves stay private.

alter table public.ideas
  add column seasons text[] not null default '{}'
    check (seasons <@ array['sao_martinho', 'natal_preparar', 'natal', 'passagem_de_ano', 'reis', 'namorados', 'carnaval', 'pascoa', 'santos_populares', 'halloween', 'primavera', 'verao', 'outono', 'inverno']::text[]);

insert into public.ideas (
  title, description, category, duration, budget, emoji, mood,
  duration_minutes, budget_eur, travel_minutes, at_home, weather_setting, seasons
)
values
  ('Piquenique ao pôr do sol', 'Preparem comida e encontrem um lugar tranquilo para ver o pôr do sol.', 'Romantic', '2 h', '€€', '🧺', 'Romantic', 120, 25, 20, false, 'outdoor', array['primavera', 'verao', 'outono']),
  ('Jantar à luz das velas em casa', 'Cozinhem juntos, ponham a mesa com cuidado e jantem sem telemóveis.', 'Food & drink', '1h30', '€€', '🕯️', 'Romantic', 90, 20, 0, true, 'indoor', '{}'::text[]),
  ('Noite de perguntas para casais', 'Respondam alternadamente a perguntas divertidas e profundas para descobrirem coisas novas.', 'Romantic', '45 min', 'Grátis', '💬', 'Romantic', 45, 0, 0, true, 'indoor', '{}'::text[]),
  ('Recriar o primeiro encontro', 'Voltem ao local do primeiro encontro ou recriem em casa os detalhes de que se lembram.', 'Romantic', '2h30', '€€', '❤️', 'Romantic', 150, 30, 30, false, 'any', '{}'::text[]),
  ('Carta para abrir daqui a um ano', 'Escrevam cartas um ao outro e guardem-nas para lerem no próximo aniversário de namoro.', 'Romantic', '45 min', '€', '✉️', 'Romantic', 45, 5, 0, true, 'indoor', '{}'::text[]),
  ('Ver as estrelas', 'Levem uma manta para um local escuro e procurem constelações.', 'Adventure', '1h30', '€', '✨', 'Romantic', 90, 5, 25, false, 'outdoor', '{}'::text[]),
  ('Pequeno-almoço na cama', 'Preparem um pequeno-almoço especial e comam juntos sem pressa.', 'Food & drink', '45 min', '€€', '🥐', 'Romantic', 45, 12, 0, true, 'indoor', '{}'::text[]),
  ('Passeio de mãos dadas', 'Escolham uma zona bonita e caminhem sem destino definido.', 'Adventure', '1 h', 'Grátis', '🚶', 'Romantic', 60, 0, 15, false, 'outdoor', '{}'::text[]),
  ('Playlist da vossa relação', 'Criem uma playlist com músicas que representem momentos e piadas internas.', 'Culture', '40 min', 'Grátis', '🎶', 'Romantic', 40, 0, 0, true, 'indoor', '{}'::text[]),
  ('Massagem a dois', 'Preparem o ambiente e façam massagens alternadas para relaxar.', 'Relaxing', '45 min', '€', '💆', 'Relaxing', 45, 8, 0, true, 'indoor', '{}'::text[]),
  ('Noite de spa caseiro', 'Façam máscaras faciais, cuidem da pele e preparem música calma.', 'Relaxing', '1 h', '€€', '🧖', 'Relaxing', 60, 15, 0, true, 'indoor', '{}'::text[]),
  ('Ler lado a lado', 'Leiam durante meia hora e depois partilhem a parte favorita.', 'Relaxing', '1 h', 'Grátis', '📚', 'Relaxing', 60, 0, 0, true, 'indoor', '{}'::text[]),
  ('Café e conversa sem telemóveis', 'Preparem café ou chá e conversem durante meia hora sem consultar os telemóveis.', 'Relaxing', '30 min', '€', '☕', 'Relaxing', 30, 5, 0, true, 'indoor', '{}'::text[]),
  ('Ver um filme escolhido à vez', 'Cada um escolhe um filme numa ronda alternada e preparem pipocas.', 'Culture', '2 h', '€', '🎬', 'Relaxing', 120, 8, 0, true, 'indoor', '{}'::text[]),
  ('Ouvir um álbum inteiro', 'Escolham um álbum que nenhum dos dois conheça bem e ouçam-no do início ao fim.', 'Culture', '50 min', 'Grátis', '🎧', 'Relaxing', 50, 0, 0, true, 'indoor', '{}'::text[]),
  ('Pequena sesta com manta', 'Ponham os telemóveis em silêncio e descansem juntos.', 'Relaxing', '30 min', 'Grátis', '🛋️', 'Relaxing', 30, 0, 0, true, 'indoor', '{}'::text[]),
  ('Maratona de comédia', 'Escolham episódios curtos ou vídeos de comédia e dediquem a noite a rir.', 'Culture', '1h30', '€', '😂', 'Fun', 90, 5, 0, true, 'indoor', '{}'::text[]),
  ('Torneio de jogos de tabuleiro', 'Escolham alguns jogos, registem os pontos e inventem um prémio simbólico.', 'Culture', '1h30', '€', '🎲', 'Fun', 90, 10, 0, true, 'indoor', '{}'::text[]),
  ('Duelo de videojogos', 'Escolham um jogo competitivo ou cooperativo e façam uma pequena competição.', 'Culture', '1 h', 'Grátis', '🎮', 'Fun', 60, 0, 0, true, 'indoor', '{}'::text[]),
  ('Karaoke em casa', 'Escolham músicas conhecidas e cantem sem preocupação com a afinação.', 'Culture', '1 h', 'Grátis', '🎤', 'Fun', 60, 0, 0, true, 'indoor', '{}'::text[]),
  ('Prova cega de snacks', 'Provem snacks de olhos fechados e tentem adivinhar os sabores.', 'Food & drink', '45 min', '€€', '🍿', 'Fun', 45, 15, 0, true, 'indoor', '{}'::text[]),
  ('Competição de desenho', 'Desenhem o mesmo tema em cinco minutos e comparem os resultados.', 'Creative', '30 min', 'Grátis', '✏️', 'Fun', 30, 0, 0, true, 'indoor', '{}'::text[]),
  ('Construir uma cabana de mantas', 'Usem mantas, almofadas e luzes para construir uma cabana confortável.', 'Relaxing', '1 h', 'Grátis', '⛺', 'Fun', 60, 0, 0, true, 'indoor', '{}'::text[]),
  ('Bowling a dois', 'Joguem bowling e inventem desafios para cada ronda.', 'Culture', '1h30', '€€', '🎳', 'Fun', 90, 25, 25, false, 'indoor', '{}'::text[]),
  ('Mini-golf', 'Joguem uma partida de mini-golf e acrescentem desafios divertidos.', 'Culture', '1h30', '€€', '⛳', 'Fun', 90, 25, 25, false, 'any', '{}'::text[]),
  ('Escape room', 'Reservem uma experiência de escape room e resolvam os enigmas em equipa.', 'Adventure', '1h30', '€€€', '🔐', 'Adventure', 90, 50, 30, false, 'indoor', '{}'::text[]),
  ('Caminhada até um miradouro', 'Escolham um percurso adequado e terminem num miradouro com vista.', 'Adventure', '2h30', '€', '🥾', 'Adventure', 150, 5, 35, false, 'outdoor', '{}'::text[]),
  ('Explorar uma vila desconhecida', 'Escolham uma vila próxima e descubram ruas e lojas sem roteiro rígido.', 'Adventure', '3 h', '€€', '🗺️', 'Adventure', 180, 20, 45, false, 'outdoor', '{}'::text[]),
  ('Passeio de bicicleta', 'Façam um percurso tranquilo de bicicleta e parem para beber água ou tomar café.', 'Adventure', '2 h', '€', '🚲', 'Adventure', 120, 10, 20, false, 'outdoor', '{}'::text[]),
  ('Caça ao tesouro fotográfica', 'Façam uma lista de coisas para fotografar e tentem encontrar cada uma.', 'Creative', '1h30', 'Grátis', '📸', 'Adventure', 90, 0, 20, false, 'outdoor', '{}'::text[]),
  ('Ver o nascer do sol', 'Acordem cedo, levem uma bebida quente e encontrem um local seguro para ver o nascer do sol.', 'Adventure', '1h30', '€', '🌅', 'Adventure', 90, 8, 20, false, 'outdoor', '{}'::text[]),
  ('Visitar um museu', 'Escolham um museu ou exposição e cada um seleciona a peça favorita.', 'Culture', '2 h', '€€', '🏛️', 'Creative', 120, 20, 30, false, 'indoor', '{}'::text[]),
  ('Galeria de arte e café', 'Visitem uma exposição e conversem depois num café sobre as obras.', 'Culture', '2 h', '€€', '🖼️', 'Creative', 120, 25, 30, false, 'indoor', '{}'::text[]),
  ('Sessão de fotografia de casal', 'Escolham um local bonito e alternem entre fotografar um ao outro.', 'Creative', '1 h', 'Grátis', '📷', 'Creative', 60, 0, 20, false, 'outdoor', '{}'::text[]),
  ('Pintar canecas', 'Decorem canecas com desenhos personalizados usando materiais adequados.', 'Creative', '1h30', '€€', '🎨', 'Creative', 90, 20, 0, true, 'indoor', '{}'::text[]),
  ('Pintura em tela a dois', 'Escolham uma referência simples e pintem cada um a sua versão.', 'Creative', '2 h', '€€', '🖌️', 'Creative', 120, 25, 0, true, 'indoor', '{}'::text[]),
  ('Fazer pulseiras um para o outro', 'Escolham cores e contas que representem cada um e criem pulseiras para trocar.', 'Creative', '1 h', '€€', '📿', 'Creative', 60, 12, 0, true, 'indoor', '{}'::text[]),
  ('Criar um álbum de memórias', 'Juntem fotografias e escolham as que melhor representam a vossa história.', 'Creative', '1h30', 'Grátis', '📔', 'Creative', 90, 0, 0, true, 'indoor', '{}'::text[]),
  ('Montar um puzzle grande', 'Escolham um puzzle e montem-no juntos ao longo da tarde.', 'Culture', '2 h', '€€', '🧩', 'Relaxing', 120, 15, 0, true, 'indoor', '{}'::text[]),
  ('Escrever uma história a quatro mãos', 'Escrevam uma história alternando uma frase de cada vez e leiam o resultado.', 'Creative', '45 min', 'Grátis', '📝', 'Creative', 45, 0, 0, true, 'indoor', '{}'::text[]),
  ('Fazer uma cápsula do tempo', 'Guardem cartas, fotografias e pequenos objetos numa caixa para abrir no futuro.', 'Creative', '1 h', '€', '⏳', 'Creative', 60, 10, 0, true, 'indoor', '{}'::text[]),
  ('Desenhar a casa de sonho', 'Criem um quadro de ideias para uma casa futura, com divisões e cores favoritas.', 'Creative', '1 h', 'Grátis', '🏡', 'Creative', 60, 0, 0, true, 'indoor', '{}'::text[]),
  ('Cozinhar uma receita nova', 'Escolham uma receita que nenhum dos dois tenha feito e preparem-na em conjunto.', 'Food & drink', '1h30', '€€', '🍝', 'Creative', 90, 20, 0, true, 'indoor', '{}'::text[]),
  ('Fazer pizza caseira', 'Preparem a massa ou usem uma base pronta e inventem combinações de ingredientes.', 'Food & drink', '1h15', '€€', '🍕', 'Fun', 75, 15, 0, true, 'indoor', '{}'::text[]),
  ('Concurso de sobremesas', 'Cada um prepara uma sobremesa simples e depois provam ambas.', 'Food & drink', '1h30', '€€', '🧁', 'Fun', 90, 18, 0, true, 'indoor', '{}'::text[]),
  ('Prova de chocolates', 'Escolham chocolates diferentes, provem-nos e classifiquem-nos por sabor.', 'Food & drink', '40 min', '€€', '🍫', 'Romantic', 40, 12, 0, true, 'indoor', '{}'::text[]),
  ('Brunch num café novo', 'Escolham um café onde nunca tenham ido e experimentem um brunch diferente.', 'Food & drink', '1h30', '€€', '🥞', 'Romantic', 90, 30, 25, false, 'indoor', '{}'::text[]),
  ('Rota de pastelarias', 'Visitem duas ou três pastelarias e partilhem um doce diferente em cada uma.', 'Food & drink', '2 h', '€€', '🥐', 'Fun', 120, 20, 30, false, 'indoor', '{}'::text[]),
  ('Jantar temático de outro país', 'Escolham um país, preparem um prato típico e ponham música a condizer.', 'Food & drink', '2 h', '€€', '🌍', 'Creative', 120, 25, 0, true, 'indoor', '{}'::text[]),
  ('Degustação de queijos', 'Escolham queijos diferentes, preparem uma tábua e comparem os favoritos.', 'Food & drink', '1 h', '€€', '🧀', 'Romantic', 60, 20, 0, true, 'indoor', '{}'::text[]),
  ('Desafio de cozinhar com cinco ingredientes', 'Inventem uma refeição com cinco ingredientes principais que tenham disponíveis.', 'Food & drink', '1 h', '€', '🥘', 'Fun', 60, 10, 0, true, 'indoor', '{}'::text[]),
  ('Jantar num restaurante escolhido ao acaso', 'Escolham uma zona e decidam o restaurante por sorteio, respeitando o orçamento.', 'Food & drink', '2 h', '€€€', '🍽️', 'Surprise me', 120, 40, 30, false, 'indoor', '{}'::text[]),
  ('Experimentar comida de um país novo', 'Escolham uma cozinha que ainda não tenham experimentado e partilhem pratos.', 'Food & drink', '1h30', '€€€', '🥢', 'Adventure', 90, 35, 30, false, 'indoor', '{}'::text[]),
  ('Biblioteca e escolha surpresa', 'Cada um escolhe um livro ou revista para o outro.', 'Culture', '1 h', 'Grátis', '📚', 'Creative', 60, 0, 15, false, 'indoor', '{}'::text[]),
  ('Ver uma peça de teatro', 'Escolham uma peça ou espetáculo local e conversem depois sobre o que vos marcou.', 'Culture', '2h30', '€€€', '🎭', 'Romantic', 150, 40, 35, false, 'indoor', '{}'::text[]),
  ('Concerto pequeno ou música ao vivo', 'Procurem um concerto intimista ou música ao vivo num espaço local.', 'Culture', '2 h', '€€€', '🎸', 'Romantic', 120, 35, 30, false, 'any', '{}'::text[]),
  ('Noite de documentário', 'Escolham um documentário e partilhem três coisas que aprenderam.', 'Culture', '1h30', 'Grátis', '🎥', 'Relaxing', 90, 0, 0, true, 'indoor', '{}'::text[]),
  ('Planear uma escapadinha', 'Escolham um destino de sonho, vejam opções e criem uma lista de coisas a fazer.', 'Adventure', '1 h', 'Grátis', '✈️', 'Romantic', 60, 0, 0, true, 'indoor', '{}'::text[]),
  ('Apanhar um comboio para uma cidade próxima', 'Explorem uma cidade acessível de comboio e regressem no próprio dia.', 'Adventure', '4 h', '€€€', '🚆', 'Adventure', 240, 40, 30, false, 'any', '{}'::text[]),
  ('Visitar um jardim botânico', 'Percorram os jardins e tirem fotografias de plantas e detalhes interessantes.', 'Relaxing', '1h30', '€€', '🌿', 'Relaxing', 90, 15, 30, false, 'outdoor', '{}'::text[]),
  ('Fazer geocaching', 'Procurem caches próximas com uma aplicação e tentem encontrar uma ou duas.', 'Adventure', '1h30', 'Grátis', '🧭', 'Adventure', 90, 0, 20, false, 'outdoor', '{}'::text[]),
  ('Aula experimental de cerâmica', 'Reservem uma sessão e criem uma peça que vos faça lembrar a experiência.', 'Creative', '2 h', '€€€', '🏺', 'Creative', 120, 45, 30, false, 'indoor', '{}'::text[]),
  ('Experimentar escalada indoor', 'Façam uma sessão de iniciação com acompanhamento e equipamento adequado.', 'Adventure', '2 h', '€€€', '🧗', 'Adventure', 120, 40, 30, false, 'indoor', '{}'::text[]),
  ('Piscina ou spa', 'Reservem uma sessão de piscina ou spa e aproveitem para desligar da rotina.', 'Relaxing', '2 h', '€€€', '🏊', 'Relaxing', 120, 40, 30, false, 'indoor', '{}'::text[]),
  ('Jogar padel ou badminton', 'Aluguem um campo e joguem sem pressão competitiva.', 'Adventure', '1h30', '€€', '🏸', 'Fun', 90, 25, 20, false, 'any', '{}'::text[]),
  ('Treino leve em casal', 'Façam um treino simples adaptado ao vosso nível e terminem com alongamentos.', 'Adventure', '45 min', 'Grátis', '💪', 'Fun', 45, 0, 0, true, 'indoor', '{}'::text[]),
  ('Fazer uma lista de sonhos a dois', 'Escrevam dez experiências que gostariam de viver juntos e escolham uma para concretizar.', 'Creative', '40 min', 'Grátis', '🌠', 'Romantic', 40, 0, 0, true, 'indoor', '{}'::text[]),
  ('Criar um mapa de lugares especiais', 'Marquem os locais importantes para a vossa história e os sítios que querem visitar.', 'Creative', '1 h', 'Grátis', '📍', 'Romantic', 60, 0, 0, true, 'indoor', '{}'::text[]),
  ('Rever fotografias antigas', 'Escolham fotografias de diferentes fases e contem a história por trás de cada uma.', 'Creative', '1 h', 'Grátis', '🖼️', 'Romantic', 60, 0, 0, true, 'indoor', '{}'::text[]),
  ('Trocar três elogios específicos', 'Cada um diz três coisas concretas que aprecia no outro e explica porquê.', 'Romantic', '20 min', 'Grátis', '💗', 'Romantic', 20, 0, 0, true, 'indoor', '{}'::text[]),
  ('Fazer uma entrevista um ao outro', 'Preparem perguntas sobre sonhos, infância ou objetivos e respondam alternadamente.', 'Romantic', '45 min', 'Grátis', '🎙️', 'Romantic', 45, 0, 0, true, 'indoor', '{}'::text[]),
  ('Criar um ritual semanal', 'Inventem uma pequena tradição semanal, como um passeio ou uma conversa sem ecrãs.', 'Creative', '30 min', '€', '🔁', 'Romantic', 30, 5, 0, true, 'indoor', '{}'::text[]),
  ('Desafio sem gastar dinheiro', 'Durante duas horas, encontrem formas gratuitas de se divertirem com o que têm disponível.', 'Creative', '2 h', 'Grátis', '🪙', 'Fun', 120, 0, 15, false, 'any', '{}'::text[]),
  ('Troca de hobbies', 'Cada um ensina ao outro algo de que gosta, como desenhar, jogar ou cozinhar.', 'Creative', '1 h', 'Grátis', '🔄', 'Creative', 60, 0, 0, true, 'indoor', '{}'::text[]),
  ('Aprender cinco frases noutra língua', 'Escolham uma língua, aprendam expressões úteis e testem-se no final.', 'Creative', '40 min', 'Grátis', '🗣️', 'Creative', 40, 0, 0, true, 'indoor', '{}'::text[]),
  ('Construir um LEGO juntos', 'Usem um conjunto pequeno ou peças que já tenham para construir algo em equipa.', 'Creative', '1h30', '€€', '🧱', 'Relaxing', 90, 20, 0, true, 'indoor', '{}'::text[]),
  ('Fazer origami', 'Procurem instruções para dobrar papel e criem figuras diferentes um para o outro.', 'Creative', '45 min', '€', '🦢', 'Creative', 45, 5, 0, true, 'indoor', '{}'::text[]),
  ('Organizar um canto especial em casa', 'Transformem um pequeno espaço num canto confortável para ler ou conversar.', 'Relaxing', '1h30', '€€', '🪴', 'Creative', 90, 15, 0, true, 'indoor', '{}'::text[]),
  ('Trocar playlists surpresa', 'Cada um cria uma playlist curta para o outro sem revelar as músicas.', 'Culture', '45 min', 'Grátis', '🎼', 'Surprise me', 45, 0, 0, true, 'indoor', '{}'::text[]),
  ('Escolher roupa um para o outro', 'Escolham conjuntos usando apenas a roupa que já têm e façam uma mini sessão fotográfica.', 'Creative', '45 min', 'Grátis', '👕', 'Fun', 45, 0, 0, true, 'indoor', '{}'::text[]),
  ('Caixa surpresa de cinco euros', 'Cada um escolhe uma pequena surpresa para o outro dentro do mesmo orçamento.', 'Creative', '1 h', '€', '🎁', 'Surprise me', 60, 10, 20, false, 'any', '{}'::text[]),
  ('Escolha por moeda ao ar', 'Preparem duas opções para cada decisão e deixem uma moeda escolher o caminho ou a atividade.', 'Adventure', '2 h', '€€', '🪙', 'Surprise me', 120, 20, 25, false, 'any', '{}'::text[]),
  ('Rota sem mapa', 'Explore uma zona segura e alternem quem decide a direção em cada cruzamento.', 'Adventure', '1h30', '€', '🧭', 'Adventure', 90, 10, 20, false, 'outdoor', '{}'::text[]),
  ('Paragem surpresa para sobremesa', 'Saiam para passear e escolham uma pastelaria ou gelataria pelo caminho.', 'Food & drink', '1 h', '€€', '🍦', 'Surprise me', 60, 15, 20, false, 'indoor', '{}'::text[]),
  ('Ver o pôr do sol de um miradouro', 'Levem uma bebida e encontrem um miradouro acessível para ver o céu mudar de cor.', 'Adventure', '1h30', '€', '🌇', 'Romantic', 90, 8, 25, false, 'outdoor', '{}'::text[]),
  ('Fazer um terrário pequeno', 'Escolham um recipiente e plantas adequadas e montem um terrário decorativo.', 'Relaxing', '1h30', '€€', '🌱', 'Creative', 90, 20, 0, true, 'indoor', '{}'::text[]),
  ('Noite de mistérios e enigmas', 'Procurem enigmas ou um jogo de investigação para resolverem em conjunto.', 'Culture', '1 h', 'Grátis', '🕵️', 'Fun', 60, 0, 0, true, 'indoor', '{}'::text[]),
  ('Fazer um vídeo de memórias', 'Juntem fotografias e vídeos e montem um vídeo curto sobre a vossa relação.', 'Creative', '2 h', 'Grátis', '🎞️', 'Creative', 120, 0, 0, true, 'indoor', '{}'::text[]),
  ('Criar um calendário de encontros', 'Planeiem um encontro simples para cada mês e alternem quem escolhe a ideia.', 'Creative', '1 h', 'Grátis', '🗓️', 'Romantic', 60, 0, 0, true, 'indoor', '{}'::text[]),
  ('Noite de perguntas hipotéticas', 'Façam perguntas sobre lugares onde viveriam, sonhos e escolhas imaginárias.', 'Creative', '40 min', 'Grátis', '❓', 'Fun', 40, 0, 0, true, 'indoor', '{}'::text[]),
  ('Degustação de chás', 'Escolham três ou quatro chás e classifiquem os aromas e sabores.', 'Food & drink', '45 min', '€', '🍵', 'Relaxing', 45, 8, 0, true, 'indoor', '{}'::text[]),
  ('Pôr a mesa como num restaurante', 'Preparem uma refeição simples e transformem a mesa com música e apresentação cuidada.', 'Food & drink', '1h15', '€€', '🍽️', 'Romantic', 75, 15, 0, true, 'indoor', '{}'::text[]),
  ('Noite italiana em casa', 'Façam massa, escolham música italiana e terminem com uma sobremesa simples.', 'Food & drink', '1h40', '€€', '🍝', 'Romantic', 100, 20, 0, true, 'indoor', '{}'::text[]),
  ('Desafio de fotografia macro', 'Fotografem objetos do quotidiano muito de perto e tentem adivinhar o que aparece.', 'Creative', '45 min', 'Grátis', '🔍', 'Creative', 45, 0, 0, true, 'indoor', '{}'::text[]),
  ('Desenhar retratos um do outro', 'Façam retratos em dez minutos e mostrem-nos ao mesmo tempo.', 'Creative', '30 min', 'Grátis', '🖍️', 'Fun', 30, 0, 0, true, 'indoor', '{}'::text[]),
  ('Ver uma cidade à noite', 'Passeiem por uma zona movimentada e iluminada e parem para uma bebida.', 'Adventure', '2 h', '€€', '🌃', 'Romantic', 120, 20, 25, false, 'outdoor', '{}'::text[]),
  ('Visitar uma feira ou evento local', 'Procurem uma feira, exposição ou evento e escolham algo que nenhum conheça.', 'Culture', '2 h', '€€', '🎪', 'Surprise me', 120, 25, 30, false, 'any', '{}'::text[]),
  ('Rota de arte urbana', 'Procurem murais e arte urbana numa zona próxima e fotografem as obras favoritas.', 'Culture', '1h30', 'Grátis', '🎨', 'Creative', 90, 0, 20, false, 'outdoor', '{}'::text[]),
  ('Observar aves num parque', 'Caminhem devagar e tentem identificar aves sem as perturbar.', 'Relaxing', '1 h', 'Grátis', '🐦', 'Relaxing', 60, 0, 20, false, 'outdoor', '{}'::text[]),
  ('Criar um quiz sobre a relação', 'Preparem perguntas sobre preferências, datas e memórias partilhadas.', 'Culture', '40 min', 'Grátis', '🧠', 'Fun', 40, 0, 0, true, 'indoor', '{}'::text[]),
  ('Fazer uma lista de primeiras vezes', 'Escrevam experiências que gostariam de viver juntos e escolham uma acessível.', 'Creative', '40 min', 'Grátis', '✨', 'Romantic', 40, 0, 0, true, 'indoor', '{}'::text[]),
  ('Visitar uma livraria independente', 'Percorram as secções e recomendem títulos um ao outro.', 'Culture', '1 h', '€', '📖', 'Relaxing', 60, 10, 20, false, 'indoor', '{}'::text[]),
  ('Tomar um café com vista', 'Procurem um café com uma vista agradável e conversem sem pressa.', 'Food & drink', '1 h', '€€', '☕', 'Romantic', 60, 15, 25, false, 'any', '{}'::text[]),
  ('Fazer uma mini road trip', 'Escolham três paragens próximas, preparem uma playlist e façam um passeio de carro.', 'Adventure', '3 h', '€€', '🚗', 'Adventure', 180, 30, 60, false, 'any', '{}'::text[]),
  ('Criar um mocktail próprio', 'Inventem uma bebida com sumos, fruta, gelo e ervas aromáticas e deem-lhe um nome.', 'Food & drink', '30 min', '€', '🍹', 'Creative', 30, 10, 0, true, 'indoor', '{}'::text[]),
  ('Prova de refrigerantes', 'Provem bebidas diferentes em copos iguais e classifiquem-nas sem olhar para as embalagens.', 'Food & drink', '30 min', '€€', '🥤', 'Fun', 30, 12, 0, true, 'indoor', '{}'::text[]),
  ('Noite de casino sem dinheiro', 'Joguem cartas ou dados com fichas improvisadas, sem apostas monetárias.', 'Culture', '1 h', 'Grátis', '🎲', 'Fun', 60, 0, 0, true, 'indoor', '{}'::text[]),
  ('Passeio ao som de um podcast', 'Escolham um episódio interessante e ouçam-no durante um passeio.', 'Adventure', '1 h', 'Grátis', '🎧', 'Relaxing', 60, 0, 20, false, 'outdoor', '{}'::text[]),
  ('Visitar uma loja de decoração', 'Escolham os objetos mais bonitos ou estranhos e imaginem como os usariam em casa.', 'Creative', '1 h', '€', '🛋️', 'Fun', 60, 10, 20, false, 'indoor', '{}'::text[]),
  ('Pequeno-almoço de hotel em casa', 'Preparem fruta, pão, ovos ou panquecas e sirvam tudo como num hotel.', 'Food & drink', '1 h', '€€', '🍳', 'Romantic', 60, 15, 0, true, 'indoor', '{}'::text[]),
  ('Noite de cinema por tema', 'Escolham um tema e selecionem filme, snacks e decoração a condizer.', 'Culture', '2h30', '€€', '🎞️', 'Fun', 150, 12, 0, true, 'indoor', '{}'::text[]),
  ('Fazer uma rota de fontes e jardins', 'Escolham jardins públicos ou fontes numa zona próxima e visitem vários pontos a pé.', 'Adventure', '1h30', 'Grátis', '⛲', 'Relaxing', 90, 0, 20, false, 'outdoor', '{}'::text[]),
  ('Sessão de perguntas rápidas', 'Façam rondas de perguntas com respostas imediatas sobre gostos e hábitos.', 'Creative', '30 min', 'Grátis', '⚡', 'Fun', 30, 0, 0, true, 'indoor', '{}'::text[]),
  ('Criar um código secreto do casal', 'Inventem palavras ou sinais para piadas internas e situações do quotidiano.', 'Creative', '30 min', 'Grátis', '🔏', 'Fun', 30, 0, 0, true, 'indoor', '{}'::text[]),
  ('Preparar um kit para um dia difícil', 'Montem uma caixa com snacks, mensagens e coisas reconfortantes para dias complicados.', 'Relaxing', '45 min', '€', '🧡', 'Romantic', 45, 10, 0, true, 'indoor', '{}'::text[]),
  ('Sessão de gratidão', 'Cada um partilha três coisas boas da semana e uma forma como o outro contribuiu.', 'Relaxing', '20 min', 'Grátis', '🌼', 'Relaxing', 20, 0, 0, true, 'indoor', '{}'::text[]),
  ('Escolher um prato desconhecido no menu', 'Num restaurante, escolham pratos um para o outro respeitando preferências alimentares.', 'Food & drink', '1h30', '€€€', '🍜', 'Surprise me', 90, 35, 25, false, 'indoor', '{}'::text[]),
  ('Noite de puzzles e música', 'Montem um puzzle enquanto ouvem uma playlist escolhida alternadamente.', 'Culture', '1h30', '€', '🧩', 'Relaxing', 90, 10, 0, true, 'indoor', '{}'::text[]),
  ('Construir uma lista de restaurantes a experimentar', 'Cada um sugere restaurantes e escolham um para visitar no próximo encontro.', 'Food & drink', '30 min', 'Grátis', '📍', 'Fun', 30, 0, 0, true, 'indoor', '{}'::text[]),
  ('Troca de recomendações', 'Cada um recomenda uma música, filme, livro ou canal e depois conversam sobre o que acharam.', 'Culture', '1 h', 'Grátis', '🔁', 'Creative', 60, 0, 0, true, 'indoor', '{}'::text[]),
  ('Fazer café de especialidade', 'Experimentem um método de preparação de café e comparem os resultados.', 'Food & drink', '45 min', '€', '☕', 'Creative', 45, 10, 0, true, 'indoor', '{}'::text[]),
  ('Observar nuvens', 'Deitem-se numa manta num parque e inventem formas nas nuvens.', 'Adventure', '30 min', 'Grátis', '☁️', 'Relaxing', 30, 0, 10, false, 'outdoor', array['primavera', 'verao']),
  ('Preparar uma surpresa para o próximo mês', 'Planeiem em segredo um pequeno gesto ou atividade para revelar numa data combinada.', 'Creative', '45 min', '€', '🎁', 'Surprise me', 45, 10, 0, true, 'indoor', '{}'::text[]),
  ('Magusto a dois', 'Assem castanhas em casa ou num parque e acompanhem com uma bebida quente.', 'Food & drink', '1h30', '€', '🌰', 'Relaxing', 90, 10, 15, false, 'any', array['sao_martinho']),
  ('Ir a uma feira de São Martinho', 'Procurem uma feira perto de vocês, provem castanhas e jeropiga e passeiem sem pressa.', 'Food & drink', '2 h', '€€', '🍂', 'Fun', 120, 15, 30, false, 'outdoor', array['sao_martinho']),
  ('Fazer a lista de prendas', 'Sentem-se com um chá e decidam juntos o que oferecer à família e aos amigos.', 'Creative', '45 min', 'Grátis', '📝', 'Relaxing', 45, 0, 0, true, 'indoor', array['natal_preparar']),
  ('Tarde de compras de Natal', 'Vão às compras com a lista na mão e parem para um lanche a meio.', 'Culture', '3 h', '€€', '🛍️', 'Fun', 180, 30, 20, false, 'indoor', array['natal_preparar']),
  ('Comprar prendas em lojas locais', 'Passeiem pelo comércio de bairro e procurem prendas diferentes das habituais.', 'Culture', '2 h', '€€', '🎁', 'Fun', 120, 30, 15, false, 'any', array['natal_preparar']),
  ('Fazer prendas à mão', 'Escolham uma prenda para fazerem juntos, como compotas, velas ou um álbum.', 'Creative', '2 h', '€€', '🧶', 'Creative', 120, 20, 0, true, 'indoor', array['natal_preparar']),
  ('Ver as luzes de Natal', 'Agasalhem-se e passeiem pelas ruas iluminadas da vossa cidade.', 'Adventure', '1h30', '€', '✨', 'Romantic', 90, 5, 20, false, 'outdoor', array['natal']),
  ('Ir ver uma árvore de Natal gigante', 'Procurem a maior árvore de Natal da zona e tirem uma fotografia juntos.', 'Adventure', '1 h', 'Grátis', '🎄', 'Fun', 60, 0, 20, false, 'outdoor', array['natal']),
  ('Visitar um mercado de Natal', 'Provem doces e bebidas quentes e vejam o artesanato das bancas.', 'Culture', '2 h', '€€', '🎅', 'Romantic', 120, 20, 25, false, 'any', array['natal']),
  ('Montar a árvore de Natal', 'Ponham música de Natal, façam chocolate quente e decorem a árvore juntos.', 'Creative', '1h30', '€', '🎄', 'Relaxing', 90, 10, 0, true, 'indoor', array['natal']),
  ('Decorar a casa para o Natal', 'Escolham um canto da casa e façam a vossa própria decoração.', 'Creative', '1h30', '€€', '🕯️', 'Creative', 90, 15, 0, true, 'indoor', array['natal']),
  ('Maratona de filmes de Natal', 'Escolham um filme cada um, façam pipocas e fiquem no sofá de manta.', 'Culture', '3h30', '€', '🎬', 'Relaxing', 210, 5, 0, true, 'indoor', array['natal']),
  ('Fazer bolachas de Natal', 'Façam a massa, cortem formas e decorem as bolachas com glacé.', 'Food & drink', '1h30', '€', '🍪', 'Fun', 90, 10, 0, true, 'indoor', array['natal']),
  ('Visitar um presépio', 'Procurem um presépio tradicional ou ao vivo perto de vocês.', 'Culture', '1 h', 'Grátis', '⭐', 'Relaxing', 60, 0, 25, false, 'any', array['natal']),
  ('Patinar no gelo', 'Experimentem uma pista de gelo de Natal e não se preocupem com as quedas.', 'Adventure', '1 h', '€€', '⛸️', 'Fun', 60, 15, 25, false, 'any', array['natal']),
  ('Escrever postais de Natal', 'Escrevam postais à mão para quem é importante para vocês.', 'Creative', '45 min', '€', '💌', 'Romantic', 45, 5, 0, true, 'indoor', array['natal']),
  ('Balanço do ano a dois', 'Escolham o melhor momento do ano e o que querem fazer de diferente no próximo.', 'Romantic', '45 min', 'Grátis', '📖', 'Romantic', 45, 0, 0, true, 'indoor', array['passagem_de_ano']),
  ('Escrever os desejos para o novo ano', 'Escrevam objetivos a dois e guardem-nos num envelope para abrir daqui a um ano.', 'Creative', '30 min', 'Grátis', '🥂', 'Romantic', 30, 0, 0, true, 'indoor', array['passagem_de_ano']),
  ('Ver o fogo de artifício', 'Escolham um bom sítio com antecedência e levem algo para brindar.', 'Adventure', '2 h', '€', '🎆', 'Romantic', 120, 10, 25, false, 'outdoor', array['passagem_de_ano']),
  ('Provar bolos-rei diferentes', 'Comprem fatias de várias pastelarias e escolham o vosso preferido.', 'Food & drink', '45 min', '€€', '👑', 'Fun', 45, 12, 0, true, 'indoor', array['reis']),
  ('Jantar de Dia dos Namorados em casa', 'Cozinhem o prato preferido um do outro e ponham a mesa com calma.', 'Food & drink', '2 h', '€€', '🕯️', 'Romantic', 120, 25, 0, true, 'indoor', array['namorados']),
  ('Trocar cartas escritas à mão', 'Escrevam uma carta um ao outro e leiam-nas juntos.', 'Romantic', '40 min', '€', '💌', 'Romantic', 40, 2, 0, true, 'indoor', array['namorados']),
  ('Escolher disfarces a condizer', 'Inspirem-se num filme ou série de que gostem os dois e montem os disfarces.', 'Creative', '1h30', '€€', '🎭', 'Creative', 90, 20, 0, true, 'indoor', array['carnaval']),
  ('Ir ver um desfile de Carnaval', 'Mascarem-se, levem serpentinas e vão ver um corso perto de vocês.', 'Culture', '2h30', '€', '🎉', 'Fun', 150, 10, 30, false, 'outdoor', array['carnaval']),
  ('Fazer filhós ou malassadas', 'Experimentem uma receita tradicional de Carnaval e provem o resultado ainda quente.', 'Food & drink', '1h15', '€', '🍩', 'Fun', 75, 8, 0, true, 'indoor', array['carnaval']),
  ('Fazer um folar da Páscoa', 'Experimentem a receita da região de um de vocês e comam-no ainda morno.', 'Food & drink', '2 h', '€', '🥮', 'Relaxing', 120, 10, 0, true, 'indoor', array['pascoa']),
  ('Caça aos ovos para adultos', 'Cada um esconde ovos de chocolate com pistas para o outro encontrar.', 'Creative', '45 min', '€', '🥚', 'Fun', 45, 10, 0, true, 'indoor', array['pascoa']),
  ('Passeio entre as árvores em flor', 'Procurem um parque ou uma aldeia com árvores em flor e levem a máquina.', 'Adventure', '2 h', '€', '🌸', 'Romantic', 120, 5, 30, false, 'outdoor', array['primavera']),
  ('Plantar ervas aromáticas', 'Comprem vasos e sementes e comecem uma pequena horta na janela.', 'Creative', '1 h', '€€', '🌱', 'Relaxing', 60, 15, 0, true, 'indoor', array['primavera']),
  ('Ir a uma feira de flores ou de produtores', 'Passeiem pelas bancas e escolham ingredientes para o jantar.', 'Culture', '1h30', '€€', '💐', 'Relaxing', 90, 15, 20, false, 'outdoor', array['primavera']),
  ('Ir a um arraial', 'Dancem, comam sardinhas e aproveitem a noite num arraial dos Santos.', 'Food & drink', '3 h', '€€', '🎈', 'Fun', 180, 20, 25, false, 'outdoor', array['santos_populares']),
  ('Sardinhada em casa', 'Assem sardinhas ou outro peixe e sirvam com pimentos e broa.', 'Food & drink', '2 h', '€€', '🐟', 'Fun', 120, 20, 0, true, 'any', array['santos_populares']),
  ('Oferecer um manjerico com quadra', 'Escrevam uma quadra um para o outro e troquem os manjericos.', 'Romantic', '45 min', '€', '🌿', 'Romantic', 45, 8, 15, false, 'any', array['santos_populares']),
  ('Dia de praia', 'Levem a manta, o farnel e um livro e fiquem até ao fim da tarde.', 'Relaxing', '5 h', '€€', '🏖️', 'Relaxing', 300, 15, 40, false, 'outdoor', array['verao']),
  ('Banho ao fim do dia', 'Vão à praia ou ao rio quando já há menos gente e fiquem até anoitecer.', 'Adventure', '2 h', 'Grátis', '🌊', 'Romantic', 120, 0, 30, false, 'outdoor', array['verao']),
  ('Cinema ao ar livre', 'Procurem uma sessão ao ar livre, levem uma manta e algo para petiscar.', 'Culture', '2h30', '€€', '🍿', 'Romantic', 150, 12, 25, false, 'outdoor', array['verao']),
  ('Rota de gelados', 'Provem gelados em duas ou três gelatarias e elejam o melhor.', 'Food & drink', '1h30', '€€', '🍨', 'Fun', 90, 12, 15, false, 'outdoor', array['verao']),
  ('Ir a uma praia fluvial', 'Descubram uma praia fluvial que ainda não conheçam e levem almoço.', 'Adventure', '5 h', '€€', '🏞️', 'Adventure', 300, 15, 60, false, 'outdoor', array['verao']),
  ('Ir a um festival de verão', 'Escolham um concerto ou festa local e aproveitem a noite.', 'Culture', '4 h', '€€', '🎶', 'Fun', 240, 30, 40, false, 'outdoor', array['verao']),
  ('Passeio entre as folhas de outono', 'Procurem uma mata ou serra com as cores do outono e levem um termo.', 'Adventure', '2h30', '€', '🍁', 'Romantic', 150, 5, 40, false, 'outdoor', array['outono']),
  ('Fazer sopa de abóbora', 'Escolham uma abóbora, cozinhem juntos e comam com pão quente.', 'Food & drink', '1 h', '€', '🎃', 'Relaxing', 60, 8, 0, true, 'indoor', array['outono']),
  ('Visitar uma adega', 'Façam uma prova de vinhos e conheçam a história do sítio.', 'Food & drink', '2 h', '€€', '🍇', 'Romantic', 120, 25, 45, false, 'any', array['outono']),
  ('Noite de filmes de terror', 'Escolham um clássico e um recente, apaguem as luzes e fiquem perto um do outro.', 'Culture', '3 h', '€', '👻', 'Fun', 180, 5, 0, true, 'indoor', array['halloween']),
  ('Esculpir abóboras', 'Cada um desenha e esculpe a sua abóbora, e depois votem na melhor.', 'Creative', '1 h', '€', '🎃', 'Creative', 60, 8, 0, true, 'indoor', array['halloween']),
  ('Disfarces de Halloween a dois', 'Escolham uma dupla de um filme de que gostem e montem os disfarces em casa.', 'Creative', '1h30', '€€', '🦇', 'Creative', 90, 15, 0, true, 'indoor', array['halloween']),
  ('Chocolate quente e manta', 'Façam chocolate quente a sério e fiquem no sofá com um filme ou um livro.', 'Food & drink', '1 h', '€', '☕', 'Relaxing', 60, 5, 0, true, 'indoor', array['inverno']),
  ('Ir à neve na Serra da Estrela', 'Levem roupa quente, façam um boneco de neve e almocem uma sopa na serra.', 'Adventure', '8 h', '€€€', '⛄', 'Adventure', 480, 50, 180, false, 'outdoor', array['inverno']),
  ('Ir às termas', 'Passem umas horas numa piscina quente quando está frio lá fora.', 'Relaxing', '3 h', '€€€', '♨️', 'Relaxing', 180, 40, 60, false, 'indoor', array['inverno']),
  ('Jantar de fondue', 'Preparem um fondue de queijo ou de chocolate e sentem-se à mesa sem pressa.', 'Food & drink', '1h30', '€€', '🫕', 'Romantic', 90, 25, 0, true, 'indoor', array['inverno'])
on conflict (created_by_couple_id, title, description) do update
set category = excluded.category,
    duration = excluded.duration,
    budget = excluded.budget,
    emoji = excluded.emoji,
    mood = excluded.mood,
    duration_minutes = excluded.duration_minutes,
    budget_eur = excluded.budget_eur,
    travel_minutes = excluded.travel_minutes,
    at_home = excluded.at_home,
    weather_setting = excluded.weather_setting,
    seasons = excluded.seasons;

-- Ideas being replaced: the English starters, and private copies of what is now public.
create temporary table idea_merges (old_id uuid primary key, new_id uuid not null);

insert into idea_merges (old_id, new_id)
select old_idea.id, new_idea.id
from (values
  ('Sunset picnic', 'Piquenique ao pôr do sol'),
  ('Cook something new', 'Cozinhar uma receita nova'),
  ('Wander without a plan', 'Rota sem mapa'),
  ('A games night for two', 'Torneio de jogos de tabuleiro'),
  ('Visit a museum', 'Visitar um museu'),
  ('Try a pottery class', 'Aula experimental de cerâmica'),
  ('Breakfast in bed', 'Pequeno-almoço na cama'),
  ('Find a scenic trail', 'Caminhada até um miradouro')
) as merge (old_title, new_title)
join public.ideas as old_idea on old_idea.title = merge.old_title and old_idea.created_by_couple_id is null
join public.ideas as new_idea on new_idea.title = merge.new_title and new_idea.created_by_couple_id is null;

insert into idea_merges (old_id, new_id)
select private_idea.id, public_idea.id
from public.ideas as private_idea
join public.ideas as public_idea
  on public_idea.created_by_couple_id is null
  and public_idea.title = private_idea.title
  and public_idea.description = private_idea.description
where private_idea.created_by_couple_id is not null;

update public.couple_dates as couple_date
set idea_id = merge.new_id
from idea_merges as merge
where couple_date.idea_id = merge.old_id;

insert into public.couple_idea_favorites (couple_id, idea_id, created_at)
select favorite.couple_id, merge.new_id, favorite.created_at
from public.couple_idea_favorites as favorite
join idea_merges as merge on merge.old_id = favorite.idea_id
on conflict do nothing;

delete from public.ideas where id in (select old_id from idea_merges);

drop table idea_merges;
