# Nossia

**Make time for us.**

Nossia is a private web application designed for couples to discover activities, plan dates, and preserve memories of the experiences they share.

The project combines activity recommendations, personalized planning, a shared experience diary, and contextual information to help couples spend meaningful time together.

> **Project status:** In development.

## Table of Contents

- [Overview](#overview)
- [Objectives](#objectives)
- [Available in this release](#available-in-this-release)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Development Workflow](#development-workflow)
- [Documentation](#documentation)
- [Security and Privacy](#security-and-privacy)
- [Remaining Roadmap](#remaining-roadmap)
- [License](#license)

## Overview

Nossia is a private web app for one shared couple account. Couples can collect date ideas, plan activities, save favourites and keep notes, ratings, and locations for dates they have experienced.

The first release stores a couple profile, date ideas, locations, and photo-album metadata in Supabase PostgreSQL. Supabase Auth protects the account, and database Row Level Security restricts records to that couple. Private photos are stored in Supabase Storage. OpenStreetMap powers date maps and place search.

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
- A random date draw that chooses from unplanned ideas and prefers a different idea on each result.
- Two recommendation modes: an instant random draw (up to three results per draw session) or a Feeling questionnaire matching mood, duration, budget, distance, and optional things to avoid.
- Date ideas include matching metadata for mood, duration in minutes, approximate budget for two, whether it can be done at home, and estimated one-way travel time.
- Choosing a suggested date plans it for today; choosing another day is a separate action.
- Completed-date memories with optional notes, ratings, and location.
- A monthly calendar showing planned dates and completed memories, with unscheduled plans listed separately.
- An OpenStreetMap view for planned and completed dates. Choose a place from search results to save a private map pin.
- An English-language interface and an “Our stats” view that counts completed dates by mood. After five completed dates, the couple profile highlights the two most common moods.
- Private photo albums for completed dates, accessible while saving a memory or later from the Memories view, with uploads restricted to supported image formats up to 10 MB each.
- Replanning a completed date creates a separate planned entry and keeps the original memory.
- A proposal prompt linking to the supplied interactive page.

Weather recommendations and push notifications are not included in this release.

The couple profile is calculated from the mood tags on completed date ideas; it is not a psychological assessment. “Surprise me” dates are excluded from mood rankings.

### Date idea fields and Feeling matching

The Excel import/upload workflow is not implemented yet. For preparing an existing list, use one row per idea and these columns:

| Column | Required | Meaning / allowed values |
|---|---:|---|
| `title` | Yes | Short date-idea name. |
| `description` | Yes | What the couple will do. |
| `mood` | Yes | `Romantic`, `Fun`, `Relaxing`, `Adventure`, `Creative`, or `Surprise me`. |
| `duration_minutes` | Yes | Estimated total time in minutes (for example, `90`). |
| `budget_eur` | Yes | Estimated total cost for both people in euros (for example, `30`). |
| `at_home` | Yes | `true` or `false`. |
| `travel_minutes` | No | Estimated one-way travel time in minutes; leave blank if unknown. Use `0` for at-home activities. |
| `emoji` | No | Optional display emoji. |

Example:

```csv
title,description,mood,duration_minutes,budget_eur,at_home,travel_minutes,emoji
"Sunset picnic","Pack a basket and watch the sunset together.",Romantic,150,30,false,30,🧺
"Cook something new","Choose a cuisine and make dinner together.",Fun,90,10,true,0,🍝
```

Feeling first considers unplanned ideas, then applies the selected mood, duration, budget, distance, and optional exclusions. “At home” matches ideas marked `at_home`; the 30-minute and one-hour choices match ideas marked at home or with a known travel time within that limit. “No limit” does not filter by travel or budget. If no ideas match, Nossia asks you to adjust your answers instead of silently suggesting an incompatible activity. Random mode makes at most three draws in its current draw session and favours ideas not already shown.

Weather and current-device location are not used. Weather is a future enhancement; the optional “things to avoid” answer covers an immediate restriction without adding more required questions.

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
| OpenStreetMap | Map tiles and place search |
| Git and GitHub | Version control and project management |
| Vercel | Web application deployment |

## Architecture

Nossia follows a frontend-first architecture supported by Supabase services.

- **Frontend:** React, TypeScript, and Vite.
- **Authentication:** Supabase Auth.
- **Database:** PostgreSQL managed by Supabase.
- **File storage:** Private Supabase Storage bucket with couple-scoped access policies.
- **Maps and place search:** OpenStreetMap tiles and a user-triggered place search.
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

Apply the SQL migrations, in filename order, from the [`supabase/migrations`](./supabase/migrations) directory to your Supabase project using the Supabase SQL Editor or Supabase CLI:

1. [`20261013000000_initial_couple_app.sql`](./supabase/migrations/20261013000000_initial_couple_app.sql)
2. [`20261013230000_calendar_map_photo_albums.sql`](./supabase/migrations/20261013230000_calendar_map_photo_albums.sql)
3. [`20261013233000_nossia_feeling_recommendations.sql`](./supabase/migrations/20261013233000_nossia_feeling_recommendations.sql)

The initial migration creates the couple profile and date-ideas tables, row-level access policies, and an Auth trigger that creates the couple profile from sign-up metadata. The second migration adds date coordinates, the private photo-albums table, the `date-photos` Storage bucket, and couple-scoped policies for photo records and files. The third adds the metadata used by Feeling recommendations. If earlier migrations have already been applied, apply only the new third migration.

In Supabase Auth, configure the site URL and allowed redirect URLs for your local app and deployed domain. If the Vercel domain changes, add `https://nossia.vercel.app/**` to the allowed redirects and set the Site URL to `https://nossia.vercel.app`. The Supabase project and credentials do not need to change. Email confirmation can be enabled in the Supabase Auth settings.

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

Nossia is intended to store personal plans, notes, and photographs.

The implementation must enforce:

- Authentication for private application areas.
- Couple-level authorization for shared records.
- Row Level Security on private database tables.
- Restricted access to stored photographs through both database and Storage policies.
- Secure handling of credentials and environment variables.
- Explicit permission before accessing device location.
- Location searches are sent to OpenStreetMap's Nominatim service only when a user chooses to search for a place; the app does not access device GPS.
- Appropriate error handling without exposing sensitive information.

## Remaining roadmap

1. Add weather-aware recommendations and use weather to refine indoor/outdoor suggestions.
2. Add an upload/import workflow for date ideas from Excel.
3. Add push notifications and reminders.

The app is intended to deploy as a Vercel web app connected to a Supabase project, with its source hosted on GitHub.