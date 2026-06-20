# Multi-Event Guestbooks — Design

**Date:** 2026-06-19
**Status:** Approved (pending spec review)
**Author:** CJ + Claude

## Summary

Generalize the existing single "baby shower guestbook" into reusable **Events**.
The family can create any number of guestbooks (baby shower, birthday, anniversary,
generic party), each with its own title, type, optional date, and shareable public
link. Guests submit a name + text message privately; the family reviews messages and
can promote favorites into journal entries — the existing flow, generalized to many
named events.

This replaces the hardcoded `AppSettings.showerEnabled` / `showerCode` singleton.

### Decisions (from brainstorming)

- **Structure:** Multiple named events (new `Event` table), not a single configurable one.
- **Guest input:** Message only (name + text). **No public file uploads.**
- **Visibility:** Private to family. Guests see only a thank-you after submitting; no
  public wall of other guests' messages.
- **Public route:** `/party/{code}`. The old `/shower/{code}` 308-redirects to it.
- **Sequencing:** Build this feature first, then run a full-project security/UX/correctness
  review (covering existing code + this feature), fix everything, then a single push to main.

## Goals

- Support arbitrarily many concurrent/historical guestbook events.
- Preserve all existing baby-shower data and keep already-shared links working.
- Keep the public attack surface as small as today (no uploads, no public reads).
- Match existing UI patterns (warm theme, card styling, settings layout).

## Non-Goals (YAGNI)

- Public photo/file uploads from guests.
- Public live wall / guests seeing each other's messages.
- RSVP, gift registry, or attendance tracking.
- Per-event custom theming beyond the type-derived theme/emoji.
- Email/push notifications on new messages.

## Data Model

### New `Event` model

```prisma
model Event {
  id             String    @id @default(cuid())
  code           String    @unique          // public link token, crypto.randomBytes(6).hex
  type           String    @default("party") // shower | birthday | anniversary | party | other
  title          String                      // e.g. "Mia's 1st Birthday"
  honoreeName    String?                     // who it's for; UI defaults to AppSettings.childName
  eventDate      DateTime?
  enabled        Boolean   @default(true)
  welcomeMessage String?                     // optional custom prompt line on the public page
  createdById    String
  createdBy      User      @relation("CreatedEvents", fields: [createdById], references: [id])
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  messages       GuestMessage[]

  @@index([code])
  @@index([enabled])
}
```

`User` gains `eventsCreated Event[] @relation("CreatedEvents")`.

### `GuestMessage` changes

- Add `eventId String?` + relation `event Event? @relation(fields: [eventId], references: [id], onDelete: Cascade)`.
- Add `@@index([eventId])`.
- `showerCode` and `promotedToEntry*` stay. `showerCode` is retained for migration backfill,
  then becomes legacy/unused (kept nullable to avoid a destructive SQLite column drop on a table
  that may hold production rows; new writes set `eventId`, not `showerCode`).

### `AppSettings` changes

- Remove `showerEnabled` and `showerCode` (migrated into an `Event`). The singleton row keeps
  child/app/theme fields. `gender` is still used to theme `type === 'shower'` events.

### Theme / emoji derivation (no DB column)

A pure helper maps `type` → `{ emoji, theme, verb }`. `theme` is a `data-theme` key used for
accent styling; types without a dedicated palette fall back to the existing `warm` styling (the
visual treatment is otherwise identical to today's page):

| type        | emoji | theme            | sample heading                       |
|-------------|-------|------------------|--------------------------------------|
| shower      | 👶    | AppSettings.gender | "Leave a wish for {honoree}"        |
| birthday    | 🎂    | `birthday`       | "Wish {honoree} a happy birthday"    |
| anniversary | 💕    | `anniversary`    | "Celebrate {honoree}"                |
| party       | 🎉    | `party`          | "Leave a message for {honoree}"      |
| other       | 💛    | `warm`           | "Leave a message for {honoree}"      |

## Migration (no data loss)

Single Prisma migration:

1. Create `Event` table + indexes; add `eventId` + index to `GuestMessage`.
2. Data backfill (raw SQL in the migration):
   - If `AppSettings.showerCode` is non-null **or** `showerEnabled = 1`, insert one `Event`:
     `type='shower'`, `title='Baby Shower'`, `code = COALESCE(showerCode, <new hex>)`,
     `enabled = showerEnabled`, `honoreeName = childName`,
     `createdById =` first admin user id (fallback: any user). If the DB has **no** users at all,
     skip seeding the event entirely (a fresh install has no shower data to preserve).
   - `UPDATE GuestMessage SET eventId = <that event id> WHERE showerCode = <that code>`.
   - Any orphan `GuestMessage` rows (no matching event) are left with `eventId = NULL` and
     surfaced in the admin guestbook under an "Unassigned" group (not dropped).
3. Drop `showerEnabled` / `showerCode` from `AppSettings`.

The migration is idempotent-safe (guarded by existence checks) and reversible enough for dev.
If there is no existing shower data, no seed `Event` is created.

## Routes / API

All admin routes require an authenticated session with `role === 'admin'` (same as the current
shower config/messages routes). Public routes are unauthenticated.

### Public (unauthenticated, allowlisted in middleware)

- `GET /api/events/validate?code=` → `{ valid, type, title, honoreeName, theme, emoji, welcomeMessage }`
  for an **enabled** event; `{ valid: false }` otherwise. Constant-time code compare.
- `POST /api/events/messages` body `{ code, guestName, message }`:
  - Zod validation (`guestName` 1–100, `message` 1–2000, `code` non-empty).
  - Per-`code` + client-IP rate limit (reuse `checkRateLimit`, 10 / hour).
  - Resolve event by `code`; reject if missing or `enabled === false` (generic 403).
  - `DOMPurify.sanitize(..., { ALLOWED_TAGS: [] })` strip-all on name + message.
  - Create `GuestMessage { eventId, guestName, message }`.

### Admin

- `GET /api/events` → list events with `_count.messages`.
- `POST /api/events` body `{ type, title, honoreeName?, eventDate?, welcomeMessage? }` → creates
  event with a fresh random `code`, `enabled: true`, `createdById = session.user.id`.
- `GET /api/events/[id]` → event detail.
- `PATCH /api/events/[id]` → update any of `{ type, title, honoreeName, eventDate, welcomeMessage,
  enabled, regenerateCode }`.
- `DELETE /api/events/[id]` → delete event (cascade deletes its `GuestMessage` rows; entries already
  promoted keep `promotedToEntryId` via `SetNull` on that relation, unaffected).
- `GET /api/events/[id]/messages` → messages for one event (admin review).
- Existing promote-to-entry path is reused, now scoped by event.

### Removed / aliased

- `/api/shower/config`, `/api/shower/validate`, `/api/shower/messages` are removed; their behavior
  moves to `/api/events/*`.
- `/shower/[code]` page is replaced by a 308 redirect to `/party/[code]`.
- Middleware public-path rules updated: drop `/api/shower/*` exceptions; add `GET /api/events/validate`,
  `POST /api/events/messages`, and `/party/` (page) as public.

## Pages / Components

### Public guest page — `/party/[code]`

Behaviorally identical to the current `/shower/[code]` page but driven by event type:
heading/verb/emoji/theme from the type helper, `honoreeName` instead of hardcoded `childName`,
optional `welcomeMessage`. States: loading / invalid / form / submitted. Same accessibility and
character-count affordances.

### Admin — Settings

Replace `ShowerSettings.tsx` with `GuestbookManager.tsx`:
- Lists events (title, type emoji, date, message count, enabled toggle, copy-link, regenerate, delete).
- "New guestbook" form (type, title, honoree, date, optional welcome message).
- Reuses existing Button/Input/Modal/Select UI components and the warm card styling.

### Admin — `/guestbook`

Add an event filter/selector; group messages by event (plus an "Unassigned" group for any orphans).
Promote-to-entry action unchanged. Empty/loading/error states preserved.

## Security Considerations

- Public POST remains unauthenticated but hardened: Zod schema, strip-all sanitization,
  per-code+IP rate limit, constant-time code comparison, generic error messages, disabled/unknown
  events rejected. No public uploads. No public read of stored messages.
- `code` is a random 6-byte hex (48 bits) token — same entropy as today; treated as a capability URL.
- Admin endpoints enforce `role === 'admin'`; IDOR-safe because event lookups are by id under an
  admin gate and public lookups are by unguessable `code` against `enabled` events only.
- Delete cascades only to that event's guest messages; promoted journal entries are preserved.
- The whole-project review pass (next phase) re-audits these routes alongside the rest of the app.

## Testing

- Unit: type→theme helper; code validation/constant-time path; sanitization strips tags.
- API: admin CRUD authz (401/403 without admin), public validate/submit happy path + rate-limit 429
  + disabled-event 403 + bad-code rejection.
- Migration: existing shower with messages → one `Event` + backfilled `eventId`, links still resolve;
  empty DB → no seed event.
- e2e (chaos-monkey): extend existing shower coverage to the `/party/[code]` flow and the settings
  manager.

## Rollout

1. Schema + migration.
2. Type/theme helper + shared validation.
3. `/api/events/*` routes.
4. Public `/party/[code]` page + `/shower/[code]` redirect.
5. `GuestbookManager` settings UI + `/guestbook` per-event review.
6. Middleware update; remove `/api/shower/*`.
7. Tests; manual verification of migration on a copy of the dev DB.
