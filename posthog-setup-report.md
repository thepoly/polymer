<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into The Polytechnic's Next.js App Router project. PostHog is initialized via `instrumentation-client.ts` (the recommended approach for Next.js 15.3+), with a reverse proxy configured in `next.config.ts` to route analytics traffic through `/ingest`. A server-side PostHog client (`lib/posthog-server.ts`) enables event capture from API routes. Five client-side events track reader engagement across search and article sharing, and one server-side event tracks search API calls.

| Event | Description | File(s) |
|-------|-------------|---------|
| `search_overlay_opened` | Fired when a reader opens the search overlay from the header | `components/Header.tsx` |
| `search_performed` | Fired when a search completes and results are returned (debounced) | `components/SearchInput.tsx`, `components/SearchOverlay.tsx` |
| `search_result_clicked` | Fired when a reader clicks a search result article | `components/SearchInput.tsx`, `components/SearchOverlay.tsx` |
| `article_shared` | Fired when a reader shares an article via the scroll bar share menu (all platforms) | `components/ArticleScrollBar.tsx` |
| `search_api_called` | Server-side: fired when the search API route handles a query | `app/api/search/route.ts` |

### New files

| File | Purpose |
|------|---------|
| `instrumentation-client.ts` | Client-side PostHog initialization (Next.js 15.3+ pattern) |
| `lib/posthog-server.ts` | Server-side PostHog client singleton |

### Modified files

| File | Change |
|------|--------|
| `next.config.ts` | Added `/ingest` reverse proxy rewrites + `skipTrailingSlashRedirect` |
| `.env` | Added `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics**: https://us.posthog.com/project/349733/dashboard/1380328
- **Search volume & click-through** (daily searches vs. clicks): https://us.posthog.com/project/349733/insights/Pki6qM1Q
- **Search → click funnel** (overlay open → search → result click): https://us.posthog.com/project/349733/insights/qjFbdRUV
- **Article shares by method** (link, email, social breakdown): https://us.posthog.com/project/349733/insights/lVfdUlID
- **Search overlay opens per day** (feature engagement trend): https://us.posthog.com/project/349733/insights/XGCiVpOf
- **Top shared articles** (most viral content in last 30 days): https://us.posthog.com/project/349733/insights/9xxaIPcc

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
