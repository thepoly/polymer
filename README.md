# Polymer

Polymer is the ongoing digital rebuild of **The Polytechnic** web presence.
This repository currently contains the early alpha frontend and deployment automation.

## Current Status

- Phase: early alpha
- Focus: landing/header experience, branding, and launch messaging
- Target launch window: **March 2026**

## Project Plan

### Phase 1: Foundation and Alpha Experience (in progress)

- Set up a Next.js frontend in `frontend/web`
- Build a responsive newspaper-style header/navigation
- Ship a temporary alpha overlay with rollout messaging
- Establish CI-driven deployment workflow

### Phase 2: Core Content Experience (planned)

- Replace placeholder homepage body with real content modules
- Implement section pages (News, Features, Opinion, Sports, etc.)
- Add search and archive browsing paths

### Phase 3: Editorial and Platform Readiness (planned)

- Add content publishing/editorial workflows
- Improve accessibility, performance, and SEO
- Finalize analytics/observability and release hardening

## Repository Structure

```text
.
|-- docs/                    # Mockups and design artifacts
|-- frontend/web/            # Next.js web application
|-- .github/workflows/       # Deployment workflow(s)
|-- package.json             # Root package metadata
|-- pnpm-workspace.yaml      # Workspace config
```

## Tech Stack

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS v4
- pnpm

## Local Development

### Prerequisites

- Node.js 20+
- pnpm 10+

### Run the frontend

```bash
cd frontend/web
pnpm install
pnpm dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Deployment

Production deploys run via GitHub Actions (`.github/workflows/deploy.yml`) on pushes to `main`.
The workflow syncs the repo to `/var/www/polymer/`, builds `frontend/web`, and restarts the `polymer` PM2 process.

## License

MIT (see `LICENSE`).
