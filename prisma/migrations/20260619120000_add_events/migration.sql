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
    "updatedAt" DATETIME NOT NULL,
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
