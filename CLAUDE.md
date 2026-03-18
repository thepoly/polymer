# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **The Polytechnic** — the website for RPI's student newspaper ("Serving Rensselaer Since 1885"). It's a Next.js 16 app with Payload CMS v3 as the headless CMS, backed by PostgreSQL. The package manager is pnpm.

## Commands

- `pnpm dev` — start dev server
- `pnpm build` — production build
- `pnpm lint` — run ESLint
- `pnpm test:smoke` — run Playwright smoke tests (`tests/smoke.spec.ts`)
- `pnpm generate:types` — regenerate `payload-types.ts` from Payload collections

## Architecture

### Route Groups

The app uses Next.js route groups to separate concerns:
- `app/(frontend)/` — public-facing newspaper site (front page, article pages, section pages, staff pages, search)
- `app/(payload)/` — Payload CMS admin panel and API routes (GraphQL, REST)
- `app/api/` — custom API routes (search, weather)

### Article URL Structure

Articles use the pattern `/{section}/{year}/{month}/{slug}` (e.g., `/news/2026/03/rpi-budget`). The URL is constructed from the article's section, publishedDate, and slug fields. See `utils/getArticleUrl.ts`.

### Payload Collections (in `collections/`)

- **Articles** — main content type with title, kicker, subdeck, section (news/sports/features/editorial/opinion), authors, featuredImage, richText content, slug. Has draft/publish workflow — `publishedDate` is auto-set on first publish via a `beforeChange` hook. Role-based access control (admin/eic/editor/writer).
- **Layout** — singleton-ish collection that controls the front page layout. Has slots for mainArticle, top1-3, op1-4, special (all article relationships). The front page (`app/(frontend)/page.tsx`) reads this to determine article placement, then fills remaining slots from recent articles per section.
- **Users** — staff members with roles and profile info (firstName, lastName, etc.)
- **Media** — file uploads
- **JobTitles** — editorial positions

### Article Layouts

Articles support multiple display layouts determined by content flags:
- **Standard** — default article layout (`components/Article/Layouts/Standard.tsx`)
- **Photofeature** — triggered when the first line of article content is `#photofeature#`. Uses a fullscreen hero image with overlay text. Components in `components/Article/Photofeature/`.

Layout detection happens in `components/Article/Layouts/index.ts`; the article page (`app/(frontend)/[section]/[year]/[month]/[slug]/page.tsx`) strips the flag before rendering.

### Front Page Data Flow

The front page (`app/(frontend)/page.tsx`) uses a deduplication system to avoid showing the same article twice. It:
1. Reads the Layout collection for editorially-pinned articles
2. Fetches recent articles per section
3. Fills empty layout slots with recent articles, deduplicating across all sections

### Theming

- Dark mode via cookie (`theme` cookie) + `ThemeProvider` component + Tailwind `dark` class on `<html>`
- Section-specific accent colors defined in `app/section-theme.ts`
- Custom fonts: Cinzel (via next/font), Raleway (Google Fonts link), Minion Pro and Myriad Pro (local OTF files in `public/fonts/`)
- Tailwind v4 with custom semantic tokens (e.g., `bg-bg-main`, `text-text-muted`, `font-copy`) defined in `globals.css`

### Key Payload Config

`payload.config.ts` uses:
- `postgresAdapter` with `DATABASE_URL` env var
- `lexicalEditor` for rich text
- Custom admin dashboard components in `components/Dashboard/`
- Types output to `payload-types.ts` (import as `@/payload-types`)

### Path Aliases

- `@/*` maps to project root (e.g., `@/components/...`, `@/payload.config`)
- `@payload-config` maps to `./payload.config.ts`

## Environment

Requires a `.env` file with at minimum `DATABASE_URL` and `PAYLOAD_SECRET`. Run `pnpm install` to auto-generate the env template via `scripts/generate-env.js`.
