# Polymer

Polymer is the ongoing digital rebuild of **The Polytechnic** web presence.

## Overview

A technical and stylistic revamp of RPI’s Newspaper, The Polytechnic, improving the webpage’s UX/UI and SEO.

## Goals

### Frontend

Rebuild the frontend from scratch using React ([Next.js](https://nextjs.org/)).

**General Poly Landing Page/Sections:**

- Design landing page structure (take note from [The Harvard Crimson](https://www.thecrimson.com/); fix obsolete newsletter subscription; take note from [Stanford Daily's email digests](https://stanforddaily.com/email-digests/)).
- Add Date & Volume.
- Top News gets a dedicated section (like [Stanford Daily](https://stanforddaily.com/)), as do Opinion and Sports.
- Improve section structures to include a featured/top article for each section.
- Add a "Most Read" / "Opinions Choice" section.
- Add access to visual copies of past papers (either [link to archive](https://chicagomaroon.com/archive/) or have a [print issues section](https://dailybruin.com/category/print)).
- Add a "by | date" format next to articles (like [Chicago Maroon](https://chicagomaroon.com/) or [Stanford Daily](https://stanforddaily.com/category/opinions/)).

**Opinions Section:**

- Add a drop-down menu on hover (Editorial, Columns, Op-Ed, Letter to the Editor) - similar to [Daily Princetonian](https://www.dailyprincetonian.com/).
- Include pictures/graphics with opinion pieces to elevate the section (standard for collegiate newspapers).
- Opinions section will have an ["Opinion's Choice"](https://www.thecrimson.com/section/opinion/) highlighted section.
- Dedicated section for Columns!

### Backend & Analytics

- **CMS:** [Payload CMS](https://payloadcms.com/)
- **Diagnostics/Analytics:** Implement an analytics tool to measure website traffic.
- **Migration:** Database copy and migration from the old Poly website backend.
- **Deployment:** Deploy the new site on our RPI server (with VMware).

## Milestones

### Done on February 15th - Visual Mockup

- Receive formal and cohesive opinions from the Polytechnic Executive Board regarding complaints and suggestions for improvements.
- Visualize and finalize a new web design and a list of features/improvements that we’d like to instill on our new website (using Figma or whiteboards).

### Done on February 23 - Backend

- Picking and finalizing which backend we’re using (likely Payload, but doing more research is part of this phase).
- Locally test the backend, and plan how it will interface with our Frontend site.
- Test the migration of articles and photos from our old website to our new one, or choose to keep the old one running.

### Done on March 28 - Frontend

- Building the Frontend and implementing all of the previous design choices that were agreed on.
- Address General Poly Landing Page Issues:
  - Our landing pages newsletter subscription is obsolete.
  - No structure to our landing page.
  - Date & Volume.
  - Top News gets a section and so does Opinion, Sports.
- Address Section structures:
  - Add a featured/top for each section.
  - Add a Most Read/ Opinions Choice.
  - Access to visual copies of past papers.
  - Add a by | date next to our articles.
- Address Opinions page:
  - Would like a drop down menu when you hover over opinions.
  - Drop down includes editorial, columns, op-ed, letter to the editor.
  - Pictures/graphics with opinion pieces will elevate the section.
  - Opinions section will have an “Opinion’s Choice”.
  - Columns!

### April 15th - Deployment and Feedback

- Deploy the site to our RPI vmware server.
- Migrate the old database to the new website.
- Implement an analytics tool to measure website traffic.

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
