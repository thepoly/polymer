# Project Context: Polymer (Next.js + Payload CMS)

## Overview
This project, likely named "Polymer" (based on directory name), is a web application built with **Next.js 16** and **Payload CMS 3.x**. It serves as the digital platform for **The Rensselaer Polytechnic** (also known as **The Polytechnic** or **The Poly**), a **professional-looking student newspaper**.

The application combines a modern React frontend with a robust, headless CMS backend (Payload) integrated directly into the Next.js server, aiming to deliver a high-quality, trustworthy digital reading experience comparable to major news outlets, while managing the specific needs of a student editorial team.

## Tech Stack
*   **Framework:** Next.js 16.1.6 (App Router)
*   **CMS:** Payload CMS 3.75.0
*   **Language:** TypeScript
*   **Database:** PostgreSQL (via `@payloadcms/db-postgres`)
*   **Styling:** Tailwind CSS (inferred from dependencies)
*   **Package Manager:** pnpm (inferred from `pnpm-lock.yaml`)

## Key Features & Architecture

### 1. Payload CMS Configuration
*   **Config File:** `payload.config.ts`
*   **Database:** Configured to use PostgreSQL.
*   **Admin UI:**
    *   Custom branding (Logo, Icon).
    *   Custom Dashboard view (`@/components/Dashboard`).
    *   Custom Edit View components (Save/Publish buttons).
*   **Editor:** Lexical Editor.

### 2. Data Models (Collections)
Located in `collections/`:
*   **Articles:** The core content type.
    *   **Workflow:** Complex status workflow (`draft` -> `needs-copy` -> `needs-1st/2nd/3rd` -> `ready`).
    *   **Access Control:** Strict role-based access (admin, eic, copy-editor, editor, writer).
    *   **Logic:** Enforces assignment of 3 copy editors before starting the copy process.
    *   **Fields:** Title, Kicker, Subdeck, Section (News, Sports, Features, etc.), Authors, Featured Image.
*   **Users:** Manages authentication and roles.
*   **Media:** Handles file uploads.
*   **JobTitles, Layout:** Helper collections.

### 3. Frontend Architecture
*   **App Router:** Uses the `app/` directory structure.
    *   `app/(payload)/`: Routes for the CMS Admin UI and API.
    *   `app/(frontend)/`: Public-facing frontend routes.
*   **Components:**
    *   `components/Dashboard/`: Custom UI components for the Payload Admin panel (badges, buttons, sidebar elements).
    *   `components/FrontPage/`: Components for the public-facing site (Article cards, Section headers).

## Development Workflow

### Scripts
*   `pnpm dev`: Starts the development server (Next.js + Payload).
*   `pnpm build`: Builds the application for production.
*   `pnpm generate:types`: Generates TypeScript types from Payload collections.
*   `pnpm lint`: Runs ESLint.

### Environment Setup
*   **Auto-Generation:** A `postinstall` script (`scripts/generate-env.js`) automatically checks for a `.env` file.
*   If missing, it creates one with a generated `PAYLOAD_SECRET`.
*   **Database:** You must manually update the `DATABASE_URI` in `.env` to point to your PostgreSQL instance.

## Deployment
Defined in `.github/workflows/deploy.yml`:
*   **Infrastructure:** Self-hosted Linux server (likely Arch Linux based on workflow name).
*   **Trigger:** Pushes to `main`.
*   **Process:**
    1.  **Sync:** Uses `rsync` to mirror code to `/var/www/polymer`.
        *   Excludes: `.git`, `node_modules`, `.next`, `media`.
        *   **Persistence:** Media is symlinked from `/var/www/polymer-media` to ensure uploads persist across deploys.
    2.  **Configuration:** Generates `.env` dynamically from GitHub Secrets (`DATABASE_URL`, `PAYLOAD_SECRET`).
    3.  **Build:**
        *   Installs dependencies (`pnpm install --no-frozen-lockfile`).
        *   Runs database migrations (`pnpm payload migrate`).
        *   Builds the Next.js app (`pnpm run build`).
    4.  **Process Management:** Uses **PM2**.
        *   Service Name: `polymer`
        *   Strategy: Tries `pm2 reload polymer` (zero downtime), falls back to `pm2 start`.

## Conventions
*   **Role-Based Access:** Logic often checks `user.roles` (e.g., `['admin', 'eic', 'copy-editor', ...].includes(role)`).
*   **Custom Admin Views:** The project heavily customizes the Payload Admin experience to fit a specific editorial workflow (e.g., 3-stage copy editing).
*   **Path Aliases:** Uses `@/` to resolve paths to the project root (e.g., `@/components/...`).
