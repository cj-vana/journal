# Multi-Event Guestbooks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generalize the single hardcoded "baby shower guestbook" into reusable multi-event guestbooks (shower, birthday, anniversary, party, other), each with its own shareable link, while preserving existing data and links.

**Architecture:** New `Event` table; `GuestMessage` gains an `eventId` FK; the `AppSettings.showerEnabled/showerCode` singleton is migrated into an `Event` and removed. Public guest page moves to `/party/[code]`; old `/shower/[code]` links 308-redirect in middleware. Admin manages events from Settings and reviews messages per-event in `/guestbook`. The public POST stays unauthenticated but keeps all existing hardening (Zod, strip-all sanitize, per-code+IP rate limit). New `/api/events/*` routes replace `/api/shower/*`.

**Tech Stack:** Next.js 16 (App Router, RSC), Prisma 5 + SQLite (`migrate deploy`), NextAuth v5 beta, Zod 4, isomorphic-dompurify, Tailwind, lucide-react.

## Global Constraints

- **No new dependencies.** Use only what's already in `package.json`.
- **No unit-test runner exists** (scripts are `dev`/`build`/`lint`/`test:e2e`/`test:chaos`). Verification per task = `npx tsc --noEmit` + `npm run lint` + (where noted) a `ts-node` smoke check, a migration smoke check, and `curl` integration checks. The pure helper gets a real failing-test-first cycle via `ts-node`. Do NOT add jest/vitest.
- **Admin API routes** authenticate with `apiAuth()` from `@/lib/api-auth` and require `session.user.role === 'admin'`. **Page** guards use `requireAdmin()` from `@/lib/auth-utils`.
- **Public routes** are unauthenticated and MUST be allowlisted in `src/middleware.ts`.
- **Route handler param type:** `{ params: Promise<{ ... }> }` and `await params` (Next 16).
- **Event codes:** `crypto.randomBytes(8).toString('hex')` (server only — never import `crypto` from a module used by client components).
- **UI:** reuse `@/components/ui/*` (`Button`, `Input`, `Select`, `DatePicker`, `Modal`), `cn` from `@/lib/utils`, and the warm theme classes (`warm-*`, `accent-*`, `cream-*`, `rounded-2xl`, `border-warm-200`, `shadow-sm`). Match existing card/list styling exactly.
- **Sanitization:** strip-all on public input — `DOMPurify.sanitize(value, { ALLOWED_TAGS: [] }).trim()`.
- **Event types (canonical list, used everywhere):** `shower | birthday | anniversary | party | other`.

---

### Task 1: Schema + data migration

**Files:**
- Modify: `prisma/schema.prisma` (add `Event`, edit `GuestMessage`, edit `AppSettings`, edit `User`)
- Create: `prisma/migrations/20260619120000_add_events/migration.sql`

**Interfaces:**
- Produces: Prisma models `Event`, updated `GuestMessage` (with `eventId`/`event`), `AppSettings` (without `showerEnabled`/`showerCode`). Later tasks consume `prisma.event.*` and `prisma.guestMessage.event`.

- [ ] **Step 1: Edit `prisma/schema.prisma`**

In `model User`, add to the relations block (after `invitesCreated ...`):
```prisma
  eventsCreated  Event[]        @relation("CreatedEvents")
```

Add the new model (place after `model GuestMessage`):
```prisma
model Event {
  id             String         @id @default(cuid())
  code           String         @unique
  type           String         @default("party")
  title          String
  honoreeName    String?
  eventDate      DateTime?
  enabled        Boolean        @default(true)
  welcomeMessage String?
  createdById    String
  createdBy      User           @relation("CreatedEvents", fields: [createdById], references: [id])
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
  messages       GuestMessage[]

  @@index([code])
  @@index([enabled])
}
```

Replace `model GuestMessage` with (adds `eventId`/`event`, makes `showerCode` optional, adds index):
```prisma
model GuestMessage {
  id                String    @id @default(cuid())
  guestName         String
  message           String
  showerCode        String?
  eventId           String?
  event             Event?    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  promotedToEntryId String?
  promotedToEntry   Entry?    @relation(fields: [promotedToEntryId], references: [id], onDelete: SetNull)
  createdAt         DateTime  @default(now())
  @@index([eventId])
  @@index([showerCode])
  @@index([createdAt])
}
```

In `model AppSettings`, delete these two lines:
```prisma
  showerEnabled  Boolean   @default(false)
  showerCode     String?
```

- [ ] **Step 2: Write the migration SQL**

Create `prisma/migrations/20260619120000_add_events/migration.sql` verbatim:
```sql
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'party',
    "title" TEXT NOT NULL,
    "honoreeName" TEXT,
    "eventDate" DATETIME,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "welcomeMessage" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Event_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Event_code_key" ON "Event"("code");
CREATE INDEX "Event_code_idx" ON "Event"("code");
CREATE INDEX "Event_enabled_idx" ON "Event"("enabled");

-- Data migration: fold an existing baby-shower into one Event (only when there is
-- shower data AND at least one user exists to own it). hex(randomblob(...)) yields the
-- same shape as crypto.randomBytes(n).toString('hex').
INSERT INTO "Event" ("id", "code", "type", "title", "honoreeName", "enabled", "createdById", "createdAt", "updatedAt")
SELECT
    lower(hex(randomblob(12))),
    COALESCE(s."showerCode", lower(hex(randomblob(8)))),
    'shower',
    'Baby Shower',
    s."childName",
    s."showerEnabled",
    (SELECT "id" FROM "User" ORDER BY ("role" = 'admin') DESC, "createdAt" ASC LIMIT 1),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "AppSettings" s
WHERE s."id" = 'singleton'
  AND (s."showerCode" IS NOT NULL OR s."showerEnabled" = true)
  AND EXISTS (SELECT 1 FROM "User");

-- Rebuild GuestMessage: add eventId FK, make showerCode nullable, backfill eventId.
CREATE TABLE "new_GuestMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guestName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "showerCode" TEXT,
    "eventId" TEXT,
    "promotedToEntryId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GuestMessage_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GuestMessage_promotedToEntryId_fkey" FOREIGN KEY ("promotedToEntryId") REFERENCES "Entry" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_GuestMessage" ("id", "guestName", "message", "showerCode", "eventId", "promotedToEntryId", "createdAt")
SELECT
    g."id", g."guestName", g."message", g."showerCode",
    (SELECT e."id" FROM "Event" e WHERE e."code" = g."showerCode" LIMIT 1),
    g."promotedToEntryId", g."createdAt"
FROM "GuestMessage" g;
DROP TABLE "GuestMessage";
ALTER TABLE "new_GuestMessage" RENAME TO "GuestMessage";
CREATE INDEX "GuestMessage_eventId_idx" ON "GuestMessage"("eventId");
CREATE INDEX "GuestMessage_showerCode_idx" ON "GuestMessage"("showerCode");
CREATE INDEX "GuestMessage_createdAt_idx" ON "GuestMessage"("createdAt");

-- Rebuild AppSettings: drop showerEnabled / showerCode.
CREATE TABLE "new_AppSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "childName" TEXT NOT NULL DEFAULT 'Baby',
    "appTitle" TEXT NOT NULL DEFAULT 'Our Journal',
    "childBirthDate" DATETIME,
    "theme" TEXT NOT NULL DEFAULT 'warm',
    "gender" TEXT NOT NULL DEFAULT 'neutral',
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_AppSettings" ("id", "childName", "appTitle", "childBirthDate", "theme", "gender", "updatedAt")
SELECT "id", "childName", "appTitle", "childBirthDate", "theme", "gender", "updatedAt" FROM "AppSettings";
DROP TABLE "AppSettings";
ALTER TABLE "new_AppSettings" RENAME TO "AppSettings";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
```

- [ ] **Step 3: Back up dev DB, then apply**

Run:
```bash
cp data/db/journal.db data/db/journal.db.bak 2>/dev/null || true
npx prisma migrate deploy
npx prisma generate
```
Expected: migration `20260619120000_add_events` applied; client regenerated with `Event`.

- [ ] **Step 4: Verify migration result + no schema drift**

Run:
```bash
npx prisma migrate status
```
Expected: "Database schema is up to date!"

Then confirm the seeded event + backfill (only meaningful if shower data existed):
```bash
node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();(async()=>{console.log('events',await p.event.count());console.log('msgs w/ eventId',await p.guestMessage.count({where:{eventId:{not:null}}}));await p.\$disconnect()})()"
```
Expected: prints counts without error (an empty dev DB prints `events 0`).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260619120000_add_events
git commit -m "feat: add Event model and migrate shower data into it"
```

---

### Task 2: Event type/theme helper (pure, client-safe)

**Files:**
- Create: `src/lib/events.ts`
- Test: `src/lib/events.test.ts` (ts-node smoke test, deleted after — see Step 5)

**Interfaces:**
- Produces:
  - `type EventType = 'shower'|'birthday'|'anniversary'|'party'|'other'`
  - `EVENT_TYPES: { value: EventType; label: string }[]`
  - `isEventType(v: string): v is EventType`
  - `eventMeta(type: string): { emoji: string; theme: string; verb: string }`
  - `eventHeading(type: string, honoree: string): string`

- [ ] **Step 1: Write the failing test**

Create `src/lib/events.test.ts`:
```ts
import assert from 'node:assert'
import { eventMeta, isEventType, eventHeading, EVENT_TYPES } from './events'

assert.equal(isEventType('birthday'), true)
assert.equal(isEventType('wedding'), false)
assert.equal(eventMeta('birthday').emoji, '🎂')
assert.equal(eventMeta('nonsense').emoji, '💛') // falls back to 'other'
assert.equal(eventHeading('birthday', 'Mia'), 'Wish a happy birthday to Mia')
assert.equal(eventHeading('shower', 'Mia'), 'Leave a wish for Mia')
assert.equal(EVENT_TYPES.length, 5)
console.log('events.ts OK')
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx ts-node --compiler-options '{"module":"CommonJS"}' src/lib/events.test.ts`
Expected: FAIL — `Cannot find module './events'`.

- [ ] **Step 3: Implement `src/lib/events.ts`**

```ts
// Pure, client-safe helpers for guestbook events. No node-only imports here —
// this module is imported by client components.

export type EventType = 'shower' | 'birthday' | 'anniversary' | 'party' | 'other'

export const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'shower', label: 'Baby Shower' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'anniversary', label: 'Anniversary' },
  { value: 'party', label: 'Party' },
  { value: 'other', label: 'Other' },
]

const TYPE_META: Record<EventType, { emoji: string; theme: string; verb: string }> = {
  shower: { emoji: '👶', theme: 'neutral', verb: 'Leave a wish for' },
  birthday: { emoji: '🎂', theme: 'birthday', verb: 'Wish a happy birthday to' },
  anniversary: { emoji: '💕', theme: 'anniversary', verb: 'Celebrate' },
  party: { emoji: '🎉', theme: 'party', verb: 'Leave a message for' },
  other: { emoji: '💛', theme: 'warm', verb: 'Leave a message for' },
}

export function isEventType(value: string): value is EventType {
  return Object.prototype.hasOwnProperty.call(TYPE_META, value)
}

export function eventMeta(type: string): { emoji: string; theme: string; verb: string } {
  return TYPE_META[isEventType(type) ? type : 'other']
}

export function eventHeading(type: string, honoree: string): string {
  return `${eventMeta(type).verb} ${honoree}`
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx ts-node --compiler-options '{"module":"CommonJS"}' src/lib/events.test.ts`
Expected: prints `events.ts OK`.

- [ ] **Step 5: Remove the throwaway test, typecheck, commit**

The repo has no test runner, so the smoke test is not kept in the tree. Run:
```bash
rm src/lib/events.test.ts
npx tsc --noEmit
git add src/lib/events.ts
git commit -m "feat: add event type/theme helper"
```
Expected: tsc clean.

---

### Task 3: Server-only event utilities

**Files:**
- Create: `src/lib/event-server.ts`

**Interfaces:**
- Consumes: `@/lib/prisma`, node `crypto`.
- Produces:
  - `generateEventCode(): string` — 16 hex chars (8 random bytes).
  - `eventThemeFor(type: string, gender: string): string` — returns `gender` for `shower`, else `eventMeta(type).theme`.

- [ ] **Step 1: Implement `src/lib/event-server.ts`**

```ts
import crypto from 'crypto'
import { eventMeta } from './events'

export function generateEventCode(): string {
  return crypto.randomBytes(8).toString('hex')
}

// Shower events inherit the child's configured gender theme; everything else uses
// the type's default theme.
export function eventThemeFor(type: string, gender: string): string {
  return type === 'shower' ? gender || 'neutral' : eventMeta(type).theme
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/lib/event-server.ts
git commit -m "feat: add server-only event utilities"
```

---

### Task 4: Admin event APIs — list/create + detail/update/delete

**Files:**
- Create: `src/app/api/events/route.ts` (GET list, POST create)
- Create: `src/app/api/events/[id]/route.ts` (PATCH, DELETE)

**Interfaces:**
- Consumes: `apiAuth`, `prisma`, `z`, `generateEventCode`, `EVENT_TYPES`/`isEventType`.
- Produces: REST endpoints used by `GuestbookManager` (Task 7). Event JSON shape:
  `{ id, code, type, title, honoreeName, eventDate, enabled, welcomeMessage, createdAt, _count: { messages } }`.

- [ ] **Step 1: Implement `src/app/api/events/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { apiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { isEventType } from '@/lib/events'
import { generateEventCode } from '@/lib/event-server'

async function requireAdmin() {
  const session = await apiAuth()
  if (!session?.user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (session.user.role !== 'admin') return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { session }
}

export async function GET() {
  try {
    const gate = await requireAdmin()
    if (gate.error) return gate.error

    const events = await prisma.event.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { messages: true } } },
    })
    return NextResponse.json(events)
  } catch (error) {
    console.error('Events GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }
}

const createSchema = z.object({
  type: z.string().refine(isEventType, 'Invalid type'),
  title: z.string().trim().min(1).max(120),
  honoreeName: z.string().trim().max(100).optional(),
  eventDate: z.string().optional(),
  welcomeMessage: z.string().trim().max(280).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const gate = await requireAdmin()
    if (gate.error) return gate.error

    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }
    const { type, title, honoreeName, eventDate, welcomeMessage } = parsed.data

    let parsedDate: Date | null = null
    if (eventDate) {
      const d = new Date(eventDate)
      if (Number.isNaN(d.getTime())) return NextResponse.json({ error: 'Invalid eventDate' }, { status: 400 })
      parsedDate = d
    }

    const event = await prisma.event.create({
      data: {
        code: generateEventCode(),
        type,
        title,
        honoreeName: honoreeName || null,
        eventDate: parsedDate,
        welcomeMessage: welcomeMessage || null,
        enabled: true,
        createdById: gate.session.user.id,
      },
      include: { _count: { select: { messages: true } } },
    })
    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('Events POST error:', error)
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Implement `src/app/api/events/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { apiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { isEventType } from '@/lib/events'
import { generateEventCode } from '@/lib/event-server'

type RouteContext = { params: Promise<{ id: string }> }

const updateSchema = z.object({
  type: z.string().refine(isEventType, 'Invalid type').optional(),
  title: z.string().trim().min(1).max(120).optional(),
  honoreeName: z.string().trim().max(100).nullable().optional(),
  eventDate: z.string().nullable().optional(),
  welcomeMessage: z.string().trim().max(280).nullable().optional(),
  enabled: z.boolean().optional(),
  regenerateCode: z.boolean().optional(),
})

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const session = await apiAuth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await context.params
    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })

    const d = parsed.data
    const data: Prisma.EventUpdateInput = {}
    if (d.type !== undefined) data.type = d.type
    if (d.title !== undefined) data.title = d.title
    if (d.honoreeName !== undefined) data.honoreeName = d.honoreeName || null
    if (d.welcomeMessage !== undefined) data.welcomeMessage = d.welcomeMessage || null
    if (d.enabled !== undefined) data.enabled = d.enabled
    if (d.eventDate !== undefined) {
      if (d.eventDate === null || d.eventDate === '') {
        data.eventDate = null
      } else {
        const date = new Date(d.eventDate)
        if (Number.isNaN(date.getTime())) return NextResponse.json({ error: 'Invalid eventDate' }, { status: 400 })
        data.eventDate = date
      }
    }
    if (d.regenerateCode) data.code = generateEventCode()

    const event = await prisma.event.update({
      where: { id },
      data,
      include: { _count: { select: { messages: true } } },
    })
    return NextResponse.json(event)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }
    console.error('Event PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const session = await apiAuth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await context.params
    await prisma.event.delete({ where: { id } }) // cascades GuestMessage rows
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }
    console.error('Event DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/app/api/events/route.ts src/app/api/events/[id]/route.ts
git commit -m "feat: add admin event CRUD APIs"
```

---

### Task 5: Public validate + submit APIs, and admin message APIs

**Files:**
- Create: `src/app/api/events/validate/route.ts` (GET, public)
- Create: `src/app/api/events/messages/route.ts` (POST, public)
- Create: `src/app/api/events/[id]/messages/route.ts` (GET, admin — per-event list)
- Create: `src/app/api/events/messages/[id]/route.ts` (DELETE + POST promote, admin)

**Interfaces:**
- Consumes: `prisma`, `z`, `DOMPurify`, `checkRateLimit`, `apiAuth`, `eventMeta`/`eventThemeFor`, `contentToHtml`.
- Produces:
  - `GET /api/events/validate?code=` → `{ valid, type, title, honoreeName, theme, emoji, welcomeMessage }` | `{ valid:false }`
  - `POST /api/events/messages` body `{ code, guestName, message }`
  - `GET /api/events/[id]/messages` → `GuestMessage[]`
  - `DELETE /api/events/messages/[id]`, `POST /api/events/messages/[id]` (promote → `{ entryId }`)

- [ ] **Step 1: Implement `src/app/api/events/validate/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { eventMeta } from '@/lib/events'
import { eventThemeFor } from '@/lib/event-server'

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code')
    if (!code) return NextResponse.json({ valid: false })

    const event = await prisma.event.findUnique({
      where: { code },
      select: { type: true, title: true, honoreeName: true, enabled: true, welcomeMessage: true },
    })
    if (!event || !event.enabled) return NextResponse.json({ valid: false })

    const settings = await prisma.appSettings.findFirst({
      where: { id: 'singleton' },
      select: { gender: true, childName: true },
    })

    return NextResponse.json({
      valid: true,
      type: event.type,
      title: event.title,
      honoreeName: event.honoreeName || settings?.childName || 'the family',
      theme: eventThemeFor(event.type, settings?.gender || 'neutral'),
      emoji: eventMeta(event.type).emoji,
      welcomeMessage: event.welcomeMessage,
    })
  } catch (error) {
    console.error('Event validate error:', error)
    return NextResponse.json({ valid: false })
  }
}
```

Note: `code` is a 64-bit random capability token looked up by unique index — exact-match equality, no enumeration risk, so no constant-time compare is needed (mirrors capability-URL pattern).

- [ ] **Step 2: Implement `src/app/api/events/messages/route.ts` (public submit)**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'
import { checkRateLimit } from '@/lib/rate-limit'

const messageSchema = z.object({
  code: z.string().min(1).max(64),
  guestName: z.string().min(1).max(100),
  message: z.string().min(1).max(2000),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = messageSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })

    const { code, guestName, message } = parsed.data
    const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    const clientIp = forwardedFor || req.headers.get('x-real-ip') || 'unknown'

    if (!checkRateLimit(`event:${code}:${clientIp}`, 10, 60 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many submissions' }, { status: 429 })
    }

    const event = await prisma.event.findUnique({ where: { code }, select: { id: true, enabled: true } })
    if (!event || !event.enabled) {
      return NextResponse.json({ error: 'This guestbook is not active' }, { status: 403 })
    }

    const cleanName = DOMPurify.sanitize(guestName, { ALLOWED_TAGS: [] }).trim()
    const cleanMessage = DOMPurify.sanitize(message, { ALLOWED_TAGS: [] }).trim()
    if (!cleanName || !cleanMessage) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })

    const created = await prisma.guestMessage.create({
      data: { guestName: cleanName, message: cleanMessage, eventId: event.id },
      select: { id: true, createdAt: true },
    })
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('Event message POST error:', error)
    return NextResponse.json({ error: 'Failed to submit message' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Implement `src/app/api/events/[id]/messages/route.ts` (admin list)**

```ts
import { NextResponse } from 'next/server'
import { apiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: Request, context: RouteContext) {
  try {
    const session = await apiAuth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await context.params
    const messages = await prisma.guestMessage.findMany({
      where: { eventId: id },
      orderBy: { createdAt: 'desc' },
      take: 500,
    })
    return NextResponse.json(messages)
  } catch (error) {
    console.error('Event messages GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Implement `src/app/api/events/messages/[id]/route.ts` (admin delete + promote)**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { apiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

type RouteContext = { params: Promise<{ id: string }> }

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const session = await apiAuth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await context.params
    await prisma.guestMessage.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }
    console.error('Event message DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 })
  }
}

export async function POST(_req: NextRequest, context: RouteContext) {
  try {
    const session = await apiAuth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await context.params
    const { contentToHtml } = await import('@/lib/tiptap-html-extensions')

    const entry = await prisma.$transaction(async (tx) => {
      const guestMessage = await tx.guestMessage.findUnique({
        where: { id },
        include: { event: { select: { title: true } } },
      })
      if (!guestMessage) throw new Error('NOT_FOUND')

      const tiptapDoc = {
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: `A message from ${guestMessage.guestName}:` }] },
          { type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: guestMessage.message }] }] },
        ],
      }
      const contentStr = JSON.stringify(tiptapDoc)
      const eventTitle = guestMessage.event?.title ?? 'Guestbook'

      const created = await tx.entry.create({
        data: {
          title: `${eventTitle}: message from ${guestMessage.guestName}`,
          content: contentStr,
          contentHtml: contentToHtml(contentStr),
          authorId: session.user.id,
          entryDate: guestMessage.createdAt,
        },
      })

      const promoted = await tx.guestMessage.updateMany({
        where: { id, promotedToEntryId: null },
        data: { promotedToEntryId: created.id },
      })
      if (promoted.count === 0) throw new Error('ALREADY_PROMOTED')
      return created
    })

    return NextResponse.json({ entryId: entry.id })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'NOT_FOUND') return NextResponse.json({ error: 'Message not found' }, { status: 404 })
      if (error.message === 'ALREADY_PROMOTED') return NextResponse.json({ error: 'Already promoted' }, { status: 409 })
    }
    console.error('Event message promote error:', error)
    return NextResponse.json({ error: 'Failed to promote message' }, { status: 500 })
  }
}
```

- [ ] **Step 5: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/app/api/events
git commit -m "feat: add public validate/submit and admin message APIs for events"
```

---

### Task 6: Public `/party/[code]` page + layout; middleware redirect; remove old shower page

**Files:**
- Create: `src/app/party/layout.tsx`
- Create: `src/app/party/[code]/page.tsx`
- Delete: `src/app/shower/layout.tsx`, `src/app/shower/[code]/page.tsx`
- Modify: `src/middleware.ts`

**Interfaces:**
- Consumes: `GET /api/events/validate`, `POST /api/events/messages`, `eventMeta`/`eventHeading`.

- [ ] **Step 1: Create `src/app/party/layout.tsx`**

```tsx
export default function PartyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-50 to-warm-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/app/party/[code]/page.tsx`**

```tsx
'use client'

import { useState, useEffect, use } from 'react'
import { eventHeading, eventMeta } from '@/lib/events'

type PageState = 'loading' | 'invalid' | 'form' | 'submitted'

interface EventInfo {
  type: string
  title: string
  honoreeName: string
  theme: string
  emoji: string
  welcomeMessage: string | null
}

export default function PartyGuestPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const [state, setState] = useState<PageState>('loading')
  const [info, setInfo] = useState<EventInfo | null>(null)
  const [guestName, setGuestName] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/events/validate?code=${encodeURIComponent(code)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.valid) {
          setInfo(data)
          setState('form')
        } else {
          setState('invalid')
        }
      })
      .catch(() => setState('invalid'))
  }, [code])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/events/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestName, message, code }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to submit')
      }
      setState('submitted')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (state === 'loading') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-warm-200 p-8 text-center">
        <div className="animate-pulse text-warm-600">Loading...</div>
      </div>
    )
  }

  if (state === 'invalid' || !info) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-warm-200 p-8 text-center">
        <h1 className="text-2xl font-accent text-warm-800 mb-2">Unavailable</h1>
        <p className="text-warm-600">This guestbook link is no longer active.</p>
      </div>
    )
  }

  if (state === 'submitted') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-warm-200 p-8 text-center" data-theme={info.theme}>
        <div className="text-4xl mb-4">{info.emoji}</div>
        <h1 className="text-2xl font-accent text-warm-800 mb-2">Thank You!</h1>
        <p className="text-warm-600">
          Your message for {info.honoreeName} has been received. The family will treasure your kind words!
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-warm-200 p-8" data-theme={info.theme}>
      <div className="text-center mb-6">
        <div className="text-4xl mb-2" aria-hidden="true">{info.emoji}</div>
        <h1 className="text-2xl font-accent text-warm-800 mb-1">{eventHeading(info.type, info.honoreeName)}</h1>
        <p className="text-warm-600 text-sm">{info.welcomeMessage || 'Share your love and best wishes with the family'}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="guestName" className="block text-sm font-medium text-warm-800 mb-1.5">Your Name</label>
          <input
            id="guestName"
            type="text"
            required
            maxLength={100}
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="w-full bg-white border border-warm-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-accent-400 focus:border-accent-400 outline-none transition-colors"
            placeholder="Your name"
          />
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-warm-800 mb-1.5">Your Message</label>
          <textarea
            id="message"
            required
            maxLength={2000}
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full bg-white border border-warm-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-accent-400 focus:border-accent-400 outline-none transition-colors resize-none"
            placeholder="Write your message here..."
          />
          <p className="text-xs text-warm-500 mt-1">{message.length}/2000</p>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !guestName.trim() || !message.trim()}
          className="w-full bg-accent-400 hover:bg-accent-600 text-white rounded-xl font-medium py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Sending...' : 'Send Message'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Add the `/shower/` → `/party/` redirect in `src/middleware.ts`**

In `src/middleware.ts`, immediately after `const isLoggedIn = !!req.auth`, add:
```ts
  // Back-compat: old shower links now live under /party
  if (pathname.startsWith('/shower/')) {
    return NextResponse.redirect(new URL(pathname.replace('/shower/', '/party/'), req.url), 308)
  }
```

- [ ] **Step 4: Delete the old shower page + layout**

```bash
git rm src/app/shower/layout.tsx src/app/shower/[code]/page.tsx
```

- [ ] **Step 5: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/app/party src/middleware.ts
git commit -m "feat: public /party/[code] guest page, redirect old shower links"
```

---

### Task 7: Settings — GuestbookManager (replaces ShowerSettings)

**Files:**
- Create: `src/components/settings/GuestbookManager.tsx`
- Delete: `src/components/settings/ShowerSettings.tsx`
- Modify: `src/app/(app)/settings/page.tsx` (swap import + usage)

**Interfaces:**
- Consumes: `GET/POST /api/events`, `PATCH/DELETE /api/events/[id]`, `EVENT_TYPES`/`eventMeta`, UI `Button`/`Input`/`Select`/`DatePicker`/`Modal`.

- [ ] **Step 1: Create `src/components/settings/GuestbookManager.tsx`**

```tsx
'use client'

import { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import Modal from '@/components/ui/Modal'
import { EVENT_TYPES, eventMeta } from '@/lib/events'
import { Copy, RefreshCw, Check, Trash2, Plus } from 'lucide-react'

interface EventItem {
  id: string
  code: string
  type: string
  title: string
  honoreeName: string | null
  eventDate: string | null
  enabled: boolean
  welcomeMessage: string | null
  _count: { messages: number }
}

export default function GuestbookManager() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ type: 'birthday', title: '', honoreeName: '', eventDate: '', welcomeMessage: '' })

  useEffect(() => {
    fetch('/api/events')
      .then((r) => { if (!r.ok) throw new Error('load'); return r.json() })
      .then(setEvents)
      .catch(() => setError('Failed to load guestbooks'))
      .finally(() => setLoading(false))
  }, [])

  function shareUrl(code: string) {
    return `${typeof window !== 'undefined' ? window.location.origin : ''}/party/${code}`
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setBusyId(id)
    setError(null)
    try {
      const res = await fetch(`/api/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('update')
      const updated = await res.json()
      setEvents((prev) => prev.map((e) => (e.id === id ? updated : e)))
    } catch {
      setError('Failed to update guestbook')
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this guestbook and all of its messages? This cannot be undone.')) return
    setBusyId(id)
    setError(null)
    try {
      const res = await fetch(`/api/events/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('delete')
      setEvents((prev) => prev.filter((e) => e.id !== id))
    } catch {
      setError('Failed to delete guestbook')
    } finally {
      setBusyId(null)
    }
  }

  function handleCopy(id: string, code: string) {
    navigator.clipboard.writeText(shareUrl(code)).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 2000)
    }).catch(() => {})
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: form.type,
          title: form.title.trim(),
          honoreeName: form.honoreeName.trim() || undefined,
          eventDate: form.eventDate || undefined,
          welcomeMessage: form.welcomeMessage.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error('create')
      const created = await res.json()
      setEvents((prev) => [created, ...prev])
      setShowCreate(false)
      setForm({ type: 'birthday', title: '', honoreeName: '', eventDate: '', welcomeMessage: '' })
    } catch {
      setError('Failed to create guestbook')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="bg-white border border-warm-200 rounded-2xl shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-warm-800">Guestbooks</h2>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-1" /> New
        </Button>
      </div>

      <p className="text-sm text-warm-600 mb-4">
        Create a shareable guestbook for a baby shower, birthday, or any party. Guests leave messages
        without an account; you review them in the Guestbook page.
      </p>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-4">{error}</div>}

      {loading ? (
        <div className="animate-pulse h-16 bg-warm-100 rounded-xl" />
      ) : events.length === 0 ? (
        <p className="text-sm text-warm-500 py-4 text-center">No guestbooks yet. Create one to start collecting messages.</p>
      ) : (
        <ul className="space-y-3">
          {events.map((ev) => (
            <li key={ev.id} className="border border-warm-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true">{eventMeta(ev.type).emoji}</span>
                    <span className="font-medium text-warm-800 truncate">{ev.title}</span>
                  </div>
                  <p className="text-xs text-warm-500 mt-0.5">
                    {ev._count.messages} message{ev._count.messages !== 1 ? 's' : ''}
                    {ev.eventDate ? ` · ${new Date(ev.eventDate).toLocaleDateString()}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    role="switch"
                    aria-checked={ev.enabled}
                    aria-label={ev.enabled ? 'Disable guestbook' : 'Enable guestbook'}
                    onClick={() => patch(ev.id, { enabled: !ev.enabled })}
                    disabled={busyId === ev.id}
                    className={`relative w-11 h-6 rounded-full transition-colors ${ev.enabled ? 'bg-accent-400' : 'bg-warm-300'} ${busyId === ev.id ? 'opacity-50' : ''}`}
                  >
                    <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform mt-[2px] ml-[2px] ${ev.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              {ev.enabled && (
                <div className="flex items-center gap-2 mt-3">
                  <input
                    readOnly
                    value={shareUrl(ev.code)}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    className="flex-1 bg-warm-50 border border-warm-200 rounded-lg px-3 py-1.5 text-xs text-warm-700 font-mono"
                  />
                  <Button variant="secondary" size="sm" onClick={() => handleCopy(ev.id, ev.code)} title="Copy link">
                    {copiedId === ev.id ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { if (confirm('Generate a new link? The old link will stop working.')) patch(ev.id, { regenerateCode: true }) }} disabled={busyId === ev.id} title="Regenerate link">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(ev.id)} disabled={busyId === ev.id} title="Delete guestbook" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New guestbook">
        <form onSubmit={handleCreate} className="space-y-4">
          <Select
            label="Type"
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            options={EVENT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
          />
          <Input label="Title" required maxLength={120} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Mia's 1st Birthday" />
          <Input label="Honoree (optional)" maxLength={100} value={form.honoreeName} onChange={(e) => setForm((f) => ({ ...f, honoreeName: e.target.value }))} placeholder="Defaults to the child's name" />
          <DatePicker label="Event date (optional)" value={form.eventDate} onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))} />
          <Input label="Welcome message (optional)" maxLength={280} value={form.welcomeMessage} onChange={(e) => setForm((f) => ({ ...f, welcomeMessage: e.target.value }))} placeholder="Share a memory or a wish!" />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" disabled={creating || !form.title.trim()}>{creating ? 'Creating...' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
```

- [ ] **Step 2: Swap into the Settings page**

In `src/app/(app)/settings/page.tsx`: replace `import ShowerSettings from '@/components/settings/ShowerSettings'` with `import GuestbookManager from '@/components/settings/GuestbookManager'`, and replace `<ShowerSettings />` with `<GuestbookManager />`.

- [ ] **Step 3: Delete old component**

```bash
git rm src/components/settings/ShowerSettings.tsx
```

- [ ] **Step 4: Typecheck, lint, commit**

```bash
npx tsc --noEmit && npm run lint
git add src/components/settings/GuestbookManager.tsx src/app/(app)/settings/page.tsx
git commit -m "feat: GuestbookManager settings UI for multi-event guestbooks"
```

---

### Task 8: `/guestbook` per-event review + remove `/api/shower/*` + final verification

**Files:**
- Modify: `src/app/(app)/guestbook/page.tsx`
- Modify: `src/components/guestbook/GuestbookList.tsx`
- Delete: `src/app/api/shower/` (whole dir)

**Interfaces:**
- Consumes: `prisma.guestMessage` with `event` relation; `DELETE`/`POST /api/events/messages/[id]`.

- [ ] **Step 1: Update `src/app/(app)/guestbook/page.tsx`**

Replace the body with a version that includes the event relation and active-guestbook count (no more `showerEnabled`):
```tsx
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import GuestbookList from '@/components/guestbook/GuestbookList'
import Link from 'next/link'
import { Settings } from 'lucide-react'

export default async function GuestbookPage() {
  await requireAdmin()

  const [messages, activeCount] = await Promise.all([
    prisma.guestMessage.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: { event: { select: { id: true, title: true, type: true } } },
    }),
    prisma.event.count({ where: { enabled: true } }),
  ])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-accent text-warm-800">Guestbook</h1>
          <p className="text-warm-600 mt-1">
            {messages.length} message{messages.length !== 1 ? 's' : ''} from guests
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeCount === 0 && (
            <span className="text-sm text-warm-500 bg-warm-100 px-3 py-1 rounded-full">No active guestbooks</span>
          )}
          <Link href="/settings" className="flex items-center gap-2 text-sm text-warm-600 hover:text-warm-800 transition-colors">
            <Settings className="w-4 h-4" />
            Configure
          </Link>
        </div>
      </div>

      <GuestbookList
        messages={messages.map((m) => ({
          id: m.id,
          guestName: m.guestName,
          message: m.message,
          promotedToEntryId: m.promotedToEntryId,
          createdAt: m.createdAt.toISOString(),
          eventTitle: m.event?.title ?? null,
        }))}
      />
    </div>
  )
}
```

- [ ] **Step 2: Update `src/components/guestbook/GuestbookList.tsx`**

(a) Add `eventTitle: string | null` to the `GuestMessage` interface.
(b) Change both fetch URLs from `/api/shower/messages/${id}` to `/api/events/messages/${id}`.
(c) In the message card, show the event tag next to the name. After the `<h3>...{msg.guestName}</h3>` element and before the "Promoted" badge block, add:
```tsx
                {msg.eventTitle && (
                  <span className="text-xs bg-warm-100 text-warm-600 px-2 py-0.5 rounded-full">
                    {msg.eventTitle}
                  </span>
                )}
```

- [ ] **Step 3: Remove the old shower API**

```bash
git rm -r src/app/api/shower
```

- [ ] **Step 4: Confirm no stale references remain**

Run:
```bash
grep -rn "showerEnabled\|showerCode\|/api/shower\|ShowerSettings\|app/shower" src/ || echo "CLEAN"
```
Expected: `CLEAN` (the only remaining `shower` hits should be the `/shower/` redirect in middleware and `showerCode` column references that no longer exist — there should be none in `src/`).

- [ ] **Step 5: Full verification**

Run:
```bash
npx tsc --noEmit && npm run lint && npm run build
```
Expected: all pass, build completes.

- [ ] **Step 6: Manual smoke (dev server)**

```bash
npm run dev
```
Then verify: create a birthday guestbook in Settings → copy link → open `/party/<code>` in a private window → submit a message → see it in `/guestbook` with the event tag → promote it → confirm a journal entry is created. Confirm an old `/shower/<code>` URL 308-redirects to `/party/<code>`.

- [ ] **Step 7: Commit**

```bash
git add src/app/(app)/guestbook/page.tsx src/components/guestbook/GuestbookList.tsx
git commit -m "feat: per-event guestbook review; remove legacy shower API"
```

---

## Self-Review

**Spec coverage:**
- Multiple named events → Task 1 (`Event` model) ✓
- Message-only public input → Task 5 (submit route, no uploads) ✓
- Private-to-family → no public read endpoint; admin-only list ✓
- `/party/{code}` + old-link redirect → Task 6 ✓
- Migration with no data loss → Task 1 ✓
- Type→theme helper w/ warm fallback → Task 2/3 ✓
- Admin CRUD + validate/submit + per-event review → Tasks 4/5/8 ✓
- Middleware public allowlist updated → Tasks 6 (redirect) + note: validate/submit allowlist handled in middleware edit (Task 6 Step 3 adds redirect; the public allowlist additions for `/api/events/validate` GET, `/api/events/messages` POST, and `/party/` are part of the same middleware edit — see Addendum).
- Remove `/api/shower/*` → Task 8 ✓
- YAGNI exclusions (uploads, public wall, RSVP, notifications) → not built ✓

**Addendum — middleware public allowlist (fold into Task 6 Step 3):** Also update `src/middleware.ts` so the new public routes are reachable without auth and the old shower exceptions are removed:
- Remove the three `/api/shower/...` public exceptions and the `/shower/` public-path entry.
- Add, alongside the existing invite exception:
```ts
  // Event guestbook public routes
  if (pathname === '/api/events/validate' && req.method === 'GET') return NextResponse.next()
  if (pathname === '/api/events/messages' && req.method === 'POST') return NextResponse.next()
  if (pathname.startsWith('/party/')) return NextResponse.next()
```
(The `/shower/` → `/party/` redirect from Task 6 Step 3 runs before these checks, so old links still resolve for logged-out guests.)

**Placeholder scan:** none — all steps contain concrete code/commands.

**Type consistency:** `Event` JSON shape (`_count.messages`, `code`, `type`, `enabled`, etc.) is consistent across Tasks 4/7. `eventMeta`/`eventHeading`/`isEventType`/`EVENT_TYPES` signatures match between Tasks 2/3/5/6/7. Message endpoints: client calls `/api/events/messages/[id]` (Task 8) match the route created in Task 5. Public submit body `{ code, guestName, message }` matches between Task 5 route and Task 6 page.
