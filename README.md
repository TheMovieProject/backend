Ongoing Fullstack Project

## Vercel timeout note

The `504 Gateway Timeout` failures on Vercel were caused by two issues stacking together:
- the UI was fanning out many parallel user-specific calls to `/api/liked/status` and `/api/watchlists`
- those requests were hitting Prisma + MongoDB from serverless route handlers, which amplifies cold-start and connection overhead under burst traffic

The fix keeps App Router route handlers in place, batches liked-status lookups, reuses a single Prisma client, and removes eager per-card watchlist fetching. To verify in Vercel, enable `DEBUG_API_TIMING=1` and check the `GET /api/watchlists`, `GET /api/liked/status`, and `POST /api/liked/status/bulk` logs for `auth_lookup`, `legacy_sync`, `db_query`, and `handler_total` timings.
