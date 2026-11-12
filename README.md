# Nossia

**English** · [Português](./README.pt.md)

A private, phone-first web app for couples: plan dates, keep memories, organise trips and find time together.

Live at [nossia.vercel.app](https://nossia.vercel.app). The app is currently in European Portuguese.

> **Status:** in development, used by a small group.

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Database](#database)
- [Admin](#admin)
- [Deployment](#deployment)
- [Security and privacy](#security-and-privacy)
- [Contributing](#contributing)
- [Roadmap](#roadmap)

Guides: [User guide](./docs/user-guide.md) · [Guia de utilização](./docs/guia-de-utilizacao.md)

## Features

| Area | What it does |
|---|---|
| **House** | Both partners' avatars and Summer, the house pet, in a room that reacts to the weather, season, work hours and dates. The window shows the weather, the wall map your trips and the calendar your plans. Tap your partner to send a kiss, hug or wave. |
| **Today** | Proposals to accept, the next date, seasonal and weather-aware suggestions, and an add box that understands text like "Jantar sexta às 20h". |
| **Taste** | Each partner privately swipes ideas. What both pass disappears, and what both like comes first. |
| **Ideas** | A shared catalogue, a random draw, a "feeling" questionnaire, links shared from other apps and CSV/XLSX import. |
| **Events** | Real events within 60 km of the couple, added in the admin, booked in one tap. The tab only shows when there are events. |
| **Places** | Find restaurants, cafés and bars with OpenStreetMap, then split them into to try, approved and not again. |
| **Agenda** | Planned dates and proposals, commitments and shared free time. A date one partner plans is a proposal until the other accepts. |
| **Long weekends** | National and municipal holidays turned into long weekends and bridges that fit both partners' hours, with a reminder three weeks before. |
| **Trips** | Destination guides, plans per day, flight searches from the couple's airport and a world map of past trips with photos. |
| **Gifts** | A secret list of gift ideas for your partner, with upcoming occasions and a reminder. Only the writer sees it. |
| **Memories** | A three-tap close (😍 🙂 😐, a photo), notes, what you watched and what you ate. A map of dates and trips. |
| **Partners** | Each partner has their own account, joined with a single-use invite link. |
| **Notifications** | Web push reminders and a private iCal feed for the iPhone calendar. |
| **Account** | First-run guide, privacy policy and account deletion. |
| **Admin** | Aggregate totals and catalogue management at `/admin`. |

## Tech stack

- **Frontend:** React 19, TypeScript, Vite, Leaflet, Lucide
- **Backend:** Supabase (Postgres with Row Level Security, Auth, Storage)
- **Serverless:** Vercel Functions in [`api/`](./api)
- **External services:** OpenStreetMap Nominatim, Open-Meteo, Web Push

## Project structure

```text
api/                  Vercel functions: calendar feed, notifications, account deletion
public/               PWA manifest, service worker and icons
src/App.tsx           Main application shell and views
src/AdminPage.tsx     Admin page
src/InfoPages.tsx     Privacy policy and in-app guide
src/quickParse.ts     Understands text typed in the add box
src/suggestions.ts    Ranks ideas by time, weather and season
supabase/migrations/  Database schema, in filename order
docs/                 User guides
```

## Getting started

You need Node.js LTS, npm and a Supabase project.

```bash
npm install
```

```bash
cp .env.example .env.local
```

Fill in the Supabase values in `.env.local`, apply the [migrations](#database), then:

```bash
npm run dev
```

To run the tests:

```bash
npm test
```

To check types and create a production build:

```bash
npm run build
```

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | Browser and server | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Browser and server | Public key; data is protected by RLS |
| `VITE_VAPID_PUBLIC_KEY` | Browser and server | Web push public key |
| `VAPID_PRIVATE_KEY` | Server only | Web push private key |
| `CRON_SECRET` | Server only | Authorises the hourly reminder job |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Sends reminders and deletes accounts |

**Never commit `.env.local` or any server-only value.** Never expose them with a `VITE_` prefix.

## Database

Apply every file in [`supabase/migrations`](./supabase/migrations), in filename order, using the Supabase SQL Editor or CLI.

In Supabase Auth, set the site URL and allow the `/recover` redirect for your local and deployed domains.

The hourly reminders need a scheduled `pg_cron` and `pg_net` job that calls `POST /api/notifications` with `Authorization: Bearer <CRON_SECRET>`.

## Admin

1. Sign up in the app with a dedicated email.
2. Run this in the Supabase SQL Editor:

   ```sql
   update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"catalog_admin": true}'::jsonb
   where email = 'YOUR_ADMIN_EMAIL';
   ```

3. Sign out and in again, then open `/admin`.

The flag is signed into the session, so it can't be set from the browser. The page shows only totals and the public catalogue, and admin accounts are left out of the totals.

## Deployment

Import the repository into Vercel and add the [environment variables](#environment-variables). Every push to `main` deploys to production. Apply a new migration **before** merging code that depends on it.

## Security and privacy

- Row Level Security on every private table, scoped to the couple.
- Photos in a private Storage bucket, served through short-lived signed URLs.
- Deleting an account removes the couple's data and photos, unless a partner still uses it.
- GPS is only requested when someone chooses to search nearby.

The policy shown to users is in the app at `/privacidade`. To report a security issue, please open a GitHub issue without sensitive details and ask for a private contact.

## Contributing

1. Create a branch from `main`, such as `feature/activity-draw` or `fix/activity-filter`.
2. Make the change and run `npm run build`.
3. Open a Pull Request describing the change, how it was tested and any migration it needs.

## Roadmap

- English in the app, once the Portuguese version is complete
- A yearly replay with the films, restaurants and places you loved
- A companion character with clothes earned through dates
