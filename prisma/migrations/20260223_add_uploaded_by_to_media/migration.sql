-- AlterTable
ALTER TABLE "Media" ADD COLUMN "uploadedBy" TEXT;

-- CreateIndex
CREATE INDEX "Media_uploadedBy_idx" ON "Media"("uploadedBy");
