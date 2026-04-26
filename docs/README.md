# Polymer Developer Docs

This directory holds docs aimed at engineers working on Polymer. The repo
root has lighter-weight onboarding (`/README.md`) and agent-oriented guides
(`/CLAUDE.md`, `/GEMINI.md`); use this folder when you need the actual
"how does X work" answer.

## Table of contents

| Doc | When to read it |
| --- | --- |
| [`architecture.md`](architecture.md) | First time touching the app: request flow, runtime layers, where things live |
| [`local-development.md`](local-development.md) | Setting up a working dev loop, env vars, troubleshooting |
| [`data-model.md`](data-model.md) | Adding/changing a Payload collection, global, or field |
| [`migrations.md`](migrations.md) | The dual-path migration rule (Payload TS + raw SQL) — read **before** you change the schema |
| [`search.md`](search.md) | Working on `/api/search`, `/archive`, or rate limiting |
| [`push-notifications.md`](push-notifications.md) | Touching breaking-news, FCM, or the `device-tokens` collection |
| [`analytics.md`](analytics.md) | Adding/removing PostHog events, privacy guardrails |
| [`deployment.md`](deployment.md) | Production runbook: deploy steps, host setup, rollback, ownership rules |
| [`android-release.md`](android-release.md) | Cutting an Android APK release |

## Conventions

- **Markdown only.** No diagrams that require external tooling. ASCII diagrams are fine.
- **Reference real files.** When a doc points at code, link the relative path so future moves are easy to find. Example: [`app/api/health/route.ts`](../app/api/health/route.ts).
- **Don't duplicate code.** Inline a small, illustrative snippet if you must, but link to the real implementation rather than mirroring full code blocks (those rot fast).
- **Update on PRs that change behavior.** A change that alters routes, env vars, schema, deploy steps, or push/analytics flows should also touch the corresponding doc here. CI does not enforce this — code review does.

## Specs and historical docs

- `superpowers/specs/` — design-doc style specs we wrote for major features (Capacitor Android shell, theme global, etc.). Not always kept up to date once a feature ships; treat them as design context, not source of truth.
- `mockups/`, `screenshots/` — visual references checked into the repo for posterity.
