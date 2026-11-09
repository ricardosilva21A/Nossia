# Nossia

[English](./README.md) · **Português**

Uma aplicação web privada para casais, pensada para o telemóvel: marcar dates, guardar memórias, organizar viagens e encontrar tempo a dois.

Disponível em [nossia.vercel.app](https://nossia.vercel.app). De momento, a app está em português de Portugal.

> **Estado:** em desenvolvimento, usada por um grupo pequeno.

## Índice

- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Como começar](#como-começar)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Base de dados](#base-de-dados)
- [Administração](#administração)
- [Publicação](#publicação)
- [Segurança e privacidade](#segurança-e-privacidade)
- [Contribuir](#contribuir)
- [Próximos passos](#próximos-passos)

Guias: [Guia de utilização](./docs/guia-de-utilizacao.md) · [User guide](./docs/user-guide.md)

## Funcionalidades

| Área | O que faz |
|---|---|
| **Casa** | A mascote de cada pessoa numa casa partilhada que reage ao tempo, à época, aos horários e aos dates. |
| **Hoje** | Próximo date, sugestões de acordo com a época e o tempo, e uma caixa que percebe frases como "Jantar sexta às 20h". |
| **Gostos** | Cada pessoa escolhe ideias em privado. O que os dois passam desaparece e o que os dois gostam vem primeiro. |
| **Ideias** | Catálogo partilhado, favoritas, sorteio, perguntas para escolher pelo feeling e importação de CSV/XLSX. |
| **Sítios** | Procura restaurantes, cafés e bares com o OpenStreetMap e separa-os em queremos ir, aprovados e não repetir. |
| **Agenda** | Dates marcados, calendário, horários de trabalho, tempo livre em comum, compromissos e tarefas. |
| **Viagens** | Guias de destinos, planos por dia, pesquisa de voos a partir do aeroporto do casal e mapa-mundo das viagens com fotografias. |
| **Memórias** | Notas, fotografias, se querem repetir, o que viram e o que comeram. |
| **Par** | Cada pessoa tem a sua conta, ligada através de um convite de utilização única. |
| **Notificações** | Lembretes web push e um calendário iCal privado para o iPhone. |
| **Conta** | Guia inicial, política de privacidade e apagar conta. |
| **Administração** | Totais agregados e gestão do catálogo em `/admin`. |

## Tecnologias

- **Frontend:** React 19, TypeScript, Vite, Leaflet, Lucide
- **Backend:** Supabase (Postgres com Row Level Security, Auth, Storage)
- **Serverless:** Vercel Functions em [`api/`](./api)
- **Serviços externos:** OpenStreetMap Nominatim, Open-Meteo, Web Push

## Estrutura do projeto

```text
api/                  Funções Vercel: calendário, notificações, apagar conta
public/               Manifesto PWA, service worker e ícones
src/App.tsx           Estrutura principal e vistas da aplicação
src/AdminPage.tsx     Página de administração
src/InfoPages.tsx     Política de privacidade e guia na app
src/quickParse.ts     Interpreta o texto da caixa de adicionar
src/suggestions.ts    Ordena ideias por tempo, meteorologia e época
supabase/migrations/  Esquema da base de dados, por ordem do nome
docs/                 Guias de utilização
```

## Como começar

Precisas de Node.js LTS, npm e um projeto Supabase.

```bash
npm install
```

```bash
cp .env.example .env.local
```

Preenche os valores do Supabase em `.env.local`, aplica as [migrações](#base-de-dados) e depois:

```bash
npm run dev
```

Para correr os testes:

```bash
npm test
```

Para verificar os tipos e criar a versão de produção:

```bash
npm run build
```

## Variáveis de ambiente

| Variável | Onde | Para quê |
|---|---|---|
| `VITE_SUPABASE_URL` | Browser e servidor | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Browser e servidor | Chave pública; os dados são protegidos por RLS |
| `VITE_VAPID_PUBLIC_KEY` | Browser e servidor | Chave pública de web push |
| `VAPID_PRIVATE_KEY` | Só servidor | Chave privada de web push |
| `CRON_SECRET` | Só servidor | Autoriza a tarefa horária de lembretes |
| `SUPABASE_SERVICE_ROLE_KEY` | Só servidor | Envia lembretes e apaga contas |

**Nunca faças commit do `.env.local` nem de valores só de servidor.** Nunca os exponhas com o prefixo `VITE_`.

## Base de dados

Aplica todos os ficheiros de [`supabase/migrations`](./supabase/migrations), por ordem do nome, no SQL Editor do Supabase ou com a CLI.

No Supabase Auth, define o URL do site e permite o redirecionamento `/recover` nos domínios local e publicado.

Os lembretes horários precisam de uma tarefa `pg_cron` e `pg_net` que chame `POST /api/notifications` com `Authorization: Bearer <CRON_SECRET>`.

## Administração

1. Cria uma conta na app com um email próprio para administração.
2. Corre isto no SQL Editor do Supabase:

   ```sql
   update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"catalog_admin": true}'::jsonb
   where email = 'O_TEU_EMAIL_DE_ADMIN';
   ```

3. Termina a sessão, volta a entrar e abre `/admin`.

A permissão faz parte da sessão assinada, por isso não pode ser definida no browser. A página só mostra totais e o catálogo público, e as contas de administração ficam fora dos totais.

## Publicação

Importa o repositório para a Vercel e adiciona as [variáveis de ambiente](#variáveis-de-ambiente). Cada alteração em `main` é publicada em produção. Aplica uma migração nova **antes** de fazer merge do código que depende dela.

## Segurança e privacidade

- Row Level Security em todas as tabelas privadas, limitada ao casal.
- Fotografias num espaço privado, servidas com ligações assinadas de curta duração.
- Apagar uma conta remove os dados e as fotografias do casal, exceto se o par ainda os usar.
- O GPS só é pedido quando alguém escolhe procurar por perto.

A política apresentada aos utilizadores está na app, em `/privacidade`. Para reportar um problema de segurança, abre uma issue no GitHub sem detalhes sensíveis e pede um contacto privado.

## Contribuir

1. Cria um ramo a partir de `main`, como `feature/activity-draw` ou `fix/activity-filter`.
2. Faz a alteração e corre `npm run build`.
3. Abre um Pull Request a descrever a alteração, como foi testada e as migrações necessárias.

## Próximos passos

- Inglês na app, depois de a versão portuguesa estar completa
- Um resumo anual com os filmes, restaurantes e sítios de que mais gostaram
- Uma personagem com roupas ganhas através de dates
