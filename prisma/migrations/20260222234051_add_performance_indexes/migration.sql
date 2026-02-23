-- DropIndex
DROP INDEX "InviteCode_code_idx";

-- CreateIndex
CREATE INDEX "Entry_isDraft_entryDate_idx" ON "Entry"("isDraft", "entryDate");

-- CreateIndex
CREATE INDEX "WritingPrompt_isActive_idx" ON "WritingPrompt"("isActive");
