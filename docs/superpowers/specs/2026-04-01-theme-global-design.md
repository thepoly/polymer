# Theme Global — Design Spec

**Date:** 2026-04-01  
**Status:** Approved

## Overview

A Payload-managed theme system for Polymer. Editors (admin + eic) can upload replacement logos and change site colors from the Payload admin panel. All changes are recorded via Payload's built-in global versioning. Colors are seeded from current hardcoded values on first deploy and never reset by subsequent deploys.

---

## New: `Logos` Collection

A dedicated upload collection for logo files. Separate from `media` so logos don't appear in the article photo browser, and so SVG/PNG uploads are not run through sharp's image resizing pipeline.

- **Slug:** `logos`
- **Upload:** enabled, no `imageSizes`, no resize
- **Access:**
  - `read`: public (frontend needs to serve logo URLs)
  - `create`: admin + eic
  - `delete`: admin only
- **Fields:**
  - `label` (text, required) — human-readable name shown in the admin picker (e.g. "Halloween 2026", "Default")

---

## New: `Theme` Global

Site-wide theme settings. One record, always present.

- **Slug:** `theme`
- **Versions:** `true` — Payload records every save with timestamp + user. This is the full audit trail.
- **Access:** admin + eic only for read and write

### Fields

#### Logos (group)

Four optional relationship fields to the `logos` collection. If unset, the frontend falls back to the static SVGs in `/public`.

| Field name | Fallback |
|---|---|
| `logoDesktopLight` | `/logo-light.svg` |
| `logoDesktopDark` | `/logo-dark.svg` |
| `logoMobileLight` | `/logo-light-mobile.svg` |
| `logoMobileDark` | `/logo-dark-mobile.svg` |

#### Colors — Light Mode (group)

12 color fields, each type `text` with a `defaultValue` matching the current CSS hardcoded value. All optional — if blank, the CSS fallback in `globals.css` takes over.

| Field | CSS variable | Default |
|---|---|---|
| `lightBackground` | `--background` | `#ffffff` |
| `lightForeground` | `--foreground` | `#000000` |
| `lightForegroundMuted` | `--foreground-muted` | `#5f5f5f` |
| `lightAccent` | `--accent-color` | `#D6001C` |
| `lightBorderColor` | `--border-color` | `#d8d8d8` |
| `lightRuleColor` | `--rule-color` | `rgba(0, 0, 0, 0.15)` |
| `lightRuleStrongColor` | `--rule-strong-color` | `rgba(0, 0, 0, 0.8)` |
| `lightHeaderTopBg` | `--header-top-bg` | `#ffffff` |
| `lightHeaderTopText` | `--header-top-text` | `#000000` |
| `lightHeaderNavBg` | `--header-nav-bg` | `#ffffff` |
| `lightHeaderNavText` | `--header-nav-text` | `#000000` |
| `lightHeaderBorder` | `--header-border` | `#d8d8d8` |

#### Colors — Dark Mode (group)

Same 12 fields, prefixed `dark`.

| Field | CSS variable | Default |
|---|---|---|
| `darkBackground` | `--background` | `#0a0a0a` |
| `darkForeground` | `--foreground` | `#e8e8e8` |
| `darkForegroundMuted` | `--foreground-muted` | `#c8ced6` |
| `darkAccent` | `--accent-color` | `#d96b76` |
| `darkBorderColor` | `--border-color` | `#3a3a3a` |
| `darkRuleColor` | `--rule-color` | `rgba(255, 255, 255, 0.18)` |
| `darkRuleStrongColor` | `--rule-strong-color` | `rgba(255, 255, 255, 0.4)` |
| `darkHeaderTopBg` | `--header-top-bg` | `#0a0a0a` |
| `darkHeaderTopText` | `--header-top-text` | `#e8e8e8` |
| `darkHeaderNavBg` | `--header-nav-bg` | `#0a0a0a` |
| `darkHeaderNavText` | `--header-nav-text` | `#e8e8e8` |
| `darkHeaderBorder` | `--header-border` | `#3a3a3a` |

---

## Adding More Colors Later

To add a new color variable to the theme:

1. Add a field to `Theme` global (light + dark pair)
2. Add the CSS variable injection to `ThemeStyle` component
3. Add the fallback value to `globals.css`

The new field starts using the CSS fallback until an admin sets it in the panel. No migration needed unless the field needs a seeded value.

---

## Seed Migration

A TypeScript migration (`migrations/`) that runs `payload.updateGlobal('theme', { ... })` with the current hardcoded color values. This runs once on first deploy (Payload migrations are idempotent — already-run migrations are skipped). After first deploy, the DB values are authoritative; no subsequent deploy can reset them.

A corresponding SQL entry goes in `scripts/run_deploy_sql_migrations.sh` per the project's dual-migration requirement.

The migration checks `payload.findGlobal('theme')` first — if the Theme global already has data (i.e. a re-deploy to a pre-existing DB), it skips the seed entirely.

---

## Frontend Delivery

### `lib/getTheme.ts`

Server-side utility. Calls Payload's local API (`payload.findGlobal({ slug: 'theme' })`). Returns resolved logo URLs and color values, with fallbacks applied for any unset fields.

### `components/ThemeStyle.tsx`

A React server component that accepts the theme object and renders a `<style>` tag injecting CSS variable overrides into `:root` and `html.dark`. Only emits variables that are explicitly set (not blank). Rendered in the root layout.

Example output:

```html
<style>
  :root {
    --accent-color: #c00020;
    --background: #fafafa;
    /* ... */
  }
  html.dark {
    --accent-color: #e07080;
    --background: #111111;
    /* ... */
  }
</style>
```

### Root Layout (`app/(frontend)/layout.tsx`)

Calls `getTheme()` on the server, passes color/logo data down. Renders `<ThemeStyle>`.

### `Header.tsx`

Currently a client component that hardcodes logo paths. Change: accept `logoSrcs` prop (4 URLs) from its server component parent, which gets them from `getTheme()`. Client component logic unchanged — it just uses the passed-in URLs instead of hardcoded strings.

---

## Access Control

Both `Logos` and `Theme` restrict write access to `admin` and `eic` roles, matching the existing role-based access pattern in `collections/Users.ts`.

---

## Audit Trail

`versions: true` on the `Theme` global causes Payload to record a full snapshot on every save, tagged with the user and timestamp. Accessible in the admin under the global's "Versions" tab. No custom audit code required.

---

## What Does Not Change

- `globals.css` keeps its hardcoded values as CSS fallbacks. They are never removed — they serve as the safety net if the DB is unreachable or a new field hasn't been set yet.
- All existing Tailwind utility classes (`text-accent`, `bg-bg-main`, etc.) continue working unchanged — they reference the same CSS variables.
- The four static SVGs in `/public` remain in place as logo fallbacks.
