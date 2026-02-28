# Collaborative Watchlists Migration Notes

## 1) Prisma apply steps (MongoDB)

1. `npx prisma validate`
2. `npx prisma generate`
3. `npx prisma db push`

Notes:
- This project uses MongoDB, so `prisma db push` is the normal schema sync path (not SQL migrations).
- The schema remaps existing collections with `@@map("WatchlistCollection")` and `@@map("WatchlistCollectionItem")` to new Prisma model names (`Watchlist`, `WatchlistItem`) to preserve existing data.

## 2) Backfill required/recommended fields for existing watchlists

Existing watchlists created before the collaborative schema may be missing:
- `visibility`
- `isSystemDefault`
- owner `WatchlistMember` row
- `rank` on `WatchlistItem`
- `addedByUserId` on `WatchlistItem` (optional)

The new API lazily repairs several of these at runtime:
- `GET /api/watchlists` syncs legacy watchlist rows into the default watchlist (`All Watchlisted`)
- access checks ensure owner membership exists
- reorder/add flows assign ranks

Recommended one-time backfill script (run after `db push`):
- For each `Watchlist`:
  - set `visibility = "SHARED"` if `isPublic === true`, else `"PRIVATE"`
  - set `isSystemDefault = true` for slug `all-watchlisted` or legacy slug `my-watchlist`
  - upsert owner `WatchlistMember` with role `OWNER`, status `ACTIVE`
- For each `WatchlistItem` in a watchlist ordered by `addedAt`:
  - assign rank `(index + 1) * 1024` where rank is missing

## 3) Default “All Watchlisted” behavior

- The new item-add route (`POST /api/watchlists/:id/items`) mirrors additions into the watchlist owner’s default `All Watchlisted` list.
- Legacy `Watchlist` rows are also mirrored on add for compatibility with older status/trending code.

## 4) Invite acceptance

- Invite accept route: `POST /api/watchlists/invites/:token/accept`
- Invite must be:
  - `status = INVITED`
  - not expired
  - email/user-target matched to the authenticated user

## 5) Edge cases to verify after deploy

- Duplicate adds:
  - handled via `upsert` / unique `(watchlistId, movieId)`
- Deleted movies:
  - item delete by path supports DB ObjectId or TMDB id lookup; missing movie returns `deleted: 0`
- Revoked/expired invites:
  - accept route rejects non-`INVITED` and expired tokens
- Leaving shared watchlist:
  - schema supports member status transitions (`LEFT`), but a dedicated leave route is not yet implemented
- Removing from default list while movie exists in another list:
  - legacy compatibility mirror may differ until full “aggregate-only” default semantics are enforced platform-wide

