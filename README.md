# Polymer

Polymer is the ongoing digital rebuild of **The Polytechnic** web presence.
This repository currently contains the alpha web app, Payload CMS integration, and deployment automation.

## Current Status

- Phase: early alpha
- Focus: frontend experience, content modeling, and editorial platform readiness
- Target launch window: **March 2026**

## Project Plan

### Phase 1: Foundation and Alpha Experience (in progress)

- Set up a unified Next.js + Payload CMS application
- Build a responsive newspaper-style frontend experience
- Establish initial collections and migration baseline
- Establish CI-driven deployment workflow

### Phase 2: Core Content Experience (planned)

- Replace placeholder front page modules with real content data
- Implement section pages (News, Features, Opinion, Sports, etc.)
- Add search and archive browsing paths

### Phase 3: Editorial and Platform Readiness (planned)

- Add content publishing/editorial workflows
- Improve accessibility, performance, and SEO
- Finalize analytics/observability and release hardening

## Repository Structure

```text
.
|-- app/                     # Next.js app routes (frontend + payload)
|-- collections/             # Payload CMS collections
|-- components/              # Shared UI and dashboard components
|-- migrations/              # Payload migration files
|-- docs/                    # Mockups and design artifacts
|-- .github/workflows/       # Deployment workflow(s)
|-- package.json             # Project scripts and dependencies
```

## Tech Stack

- Next.js (App Router)
- React
- TypeScript
- Payload CMS
- PostgreSQL
- Tailwind CSS v4
- pnpm

## Local Development

### Prerequisites

- Node.js 20+
- pnpm 10+
- PostgreSQL

### Run the app

```bash
pnpm install
pnpm dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Deployment

Production deploys run via GitHub Actions (`.github/workflows/deploy.yml`) on pushes to `main`.
The workflow syncs the repo to `/var/www/polymer/`, installs dependencies, runs Payload migrations, builds the app, and reloads the `polymer` PM2 process.

## License

MIT (see `LICENSE`).
