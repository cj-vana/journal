-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN "showerEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AppSettings" ADD COLUMN "showerCode" TEXT;

-- CreateTable
CREATE TABLE "GuestMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guestName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "showerCode" TEXT NOT NULL,
    "promotedToEntryId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "GuestMessage_showerCode_idx" ON "GuestMessage"("showerCode");

-- CreateIndex
CREATE INDEX "GuestMessage_createdAt_idx" ON "GuestMessage"("createdAt");
