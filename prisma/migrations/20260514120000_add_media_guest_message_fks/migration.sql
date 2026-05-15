PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Media" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entryId" TEXT,
    "uploadedBy" TEXT,
    "type" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "caption" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Media_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Media_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Media" ("caption", "createdAt", "entryId", "filename", "id", "mimeType", "path", "size", "type", "uploadedBy")
SELECT "Media"."caption", "Media"."createdAt", "Media"."entryId", "Media"."filename", "Media"."id", "Media"."mimeType", "Media"."path", "Media"."size", "Media"."type", "User"."id"
FROM "Media"
LEFT JOIN "User" ON "User"."id" = "Media"."uploadedBy";
DROP TABLE "Media";
ALTER TABLE "new_Media" RENAME TO "Media";
CREATE INDEX "Media_entryId_idx" ON "Media"("entryId");
CREATE INDEX "Media_type_idx" ON "Media"("type");
CREATE INDEX "Media_uploadedBy_idx" ON "Media"("uploadedBy");

CREATE TABLE "new_GuestMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guestName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "showerCode" TEXT NOT NULL,
    "promotedToEntryId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GuestMessage_promotedToEntryId_fkey" FOREIGN KEY ("promotedToEntryId") REFERENCES "Entry" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_GuestMessage" ("createdAt", "guestName", "id", "message", "promotedToEntryId", "showerCode")
SELECT "GuestMessage"."createdAt", "GuestMessage"."guestName", "GuestMessage"."id", "GuestMessage"."message", "Entry"."id", "GuestMessage"."showerCode"
FROM "GuestMessage"
LEFT JOIN "Entry" ON "Entry"."id" = "GuestMessage"."promotedToEntryId";
DROP TABLE "GuestMessage";
ALTER TABLE "new_GuestMessage" RENAME TO "GuestMessage";
CREATE INDEX "GuestMessage_showerCode_idx" ON "GuestMessage"("showerCode");
CREATE INDEX "GuestMessage_createdAt_idx" ON "GuestMessage"("createdAt");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
