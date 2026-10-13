# TwoGether

**Discover new experiences. Create shared memories.**

TwoGether is a private web application designed for couples to discover activities, plan dates, and preserve memories of the experiences they share.

The project combines activity recommendations, personalized planning, a shared experience diary, and contextual information to help couples spend meaningful time together.

> **Project status:** In development.

## Table of Contents

- [Overview](#overview)
- [Objectives](#objectives)
- [Planned Features](#planned-features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Development Workflow](#development-workflow)
- [Documentation](#documentation)
- [Security and Privacy](#security-and-privacy)
- [Roadmap](#roadmap)
- [License](#license)

## Overview

TwoGether is an English-language, private web app for one shared couple account. Couples can collect date ideas, plan activities, save favourites and keep notes, ratings, and locations for dates they have experienced.

The first release stores a couple profile and date ideas in Supabase PostgreSQL. Supabase Auth protects the account, and database Row Level Security restricts records to that couple. Photos, weather, maps, and push notifications are planned follow-up features.

## Objectives

- Make discovering date ideas simple and engaging.
- Encourage couples to try new experiences.
- Avoid repeatedly suggesting activities already completed, unless repetition is explicitly requested.
- Keep plans, experiences, and memories organized in one place.
- Provide a private, shared space for preserving memories.
- Offer a responsive experience across desktop and mobile devices.

## Available in this release

- One shared account per couple, with both names and optional birthdays.
- Required relationship anniversary and optional first-met, first-message, and first-date dates.
- Shared date ideas, categories, favourites, and planned dates.
- A random date draw that chooses from unplanned ideas, honours the selected category, and avoids repeats until the available ideas have had a turn.
- Completed-date memories with optional notes, ratings, and location.
- Replanning a completed date creates a separate planned entry and keeps the original memory.
- A proposal prompt linking to the supplied interactive page.

The current release does not include photo uploads, weather recommendations, calendar/map views, or push notifications.

## Technology Stack

| Technology | Purpose |
|---|---|
| React | User interface |
| TypeScript | Type safety |
| Vite | Development server and build tooling |
| CSS | Styling and responsive design |
| Supabase Auth | Authentication |
| Supabase PostgreSQL | Application data |
| Supabase Storage | Private photo storage |
| Open-Meteo | Weather information |
| Git and GitHub | Version control and project management |
| Vercel | Web application deployment |

## Architecture

TwoGether follows a frontend-first architecture supported by Supabase services.

- **Frontend:** React, TypeScript, and Vite.
- **Authentication:** Supabase Auth.
- **Database:** PostgreSQL managed by Supabase.
- **File storage:** Supabase Storage with access restrictions.
- **External data:** Open-Meteo for weather information.
- **Deployment:** Vercel, integrated with the GitHub repository.

Database access must be protected by Row Level Security (RLS). Server-side secrets must never be exposed in client-side code.

## Getting Started

### Prerequisites

Install the following tools:

- Node.js LTS
- npm
- Git
- A GitHub account
- A Supabase project

### Local development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and add the Supabase project URL and publishable/anonymous key. The app displays setup guidance and does not pretend data is syncing when these settings are absent.

### Database setup

Apply [`supabase/migrations/20261013000000_initial_couple_app.sql`](./supabase/migrations/20261013000000_initial_couple_app.sql) to your Supabase project using the Supabase SQL Editor or Supabase CLI. It creates the couple profile and date-ideas tables, row-level access policies, and an Auth trigger that creates the couple profile from sign-up metadata.

In Supabase Auth, configure the site URL and allowed redirect URLs for your local app and deployed domain. Email confirmation can be enabled in the Supabase Auth settings.

### Deploying to Vercel

Import the GitHub repository into Vercel and add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the project's environment variables for each deployment environment. Redeploy after changing environment variables. Never use a Supabase service-role key in the frontend.

Create a production build locally with:

```bash
npm run build
```

## Environment Variables

The application uses the following browser-safe client configuration:

```dotenv
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Use the Supabase publishable/anonymous key only. The schema's Row Level Security policies are responsible for protecting private data.

**Never commit `.env.local`, database passwords, service-role keys, or other private credentials.** Only public client configuration intended for browser use may be exposed to the frontend. Access to private data must be enforced through database and storage policies.

## Development Workflow

1. Create an Issue describing the task.
2. Associate it with the appropriate milestone and GitHub Project.
3. Create a branch from the main development branch.
4. Implement the change and run the relevant checks.
5. Open a Pull Request with a description and testing information.
6. Review and merge the change once the acceptance criteria are met.

Use descriptive branch names, such as:

- `feature/activity-draw`
- `feature/experience-diary`
- `fix/activity-filter`
- `docs/project-architecture`

## Documentation

The GitHub Wiki contains the detailed project documentation, including:

- Product vision and requirements.
- System architecture and data model.
- Security and privacy policies.
- User interface design.
- Development phases and backlog.
- Testing and deployment procedures.
- Technical decision records.

## Security and Privacy

TwoGether is intended to store personal plans, notes, and photographs.

The implementation must enforce:

- Authentication for private application areas.
- Couple-level authorization for shared records.
- Row Level Security on private database tables.
- Restricted access to stored photographs.
- Secure handling of credentials and environment variables.
- Explicit permission before accessing device location.
- Appropriate error handling without exposing sensitive information.

## Next steps

1. Add private photo uploads using Supabase Storage.
2. Add an activity draw with time, budget, location, and weather filters.
3. Add calendar/map views, statistics, and reminders.

The app is intended to deploy as a Vercel web app connected to a Supabase project, with its source hosted on GitHub.