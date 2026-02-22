-- CreateIndex
CREATE INDEX "Entry_isDraft_authorId_entryDate_idx" ON "Entry"("isDraft", "authorId", "entryDate");

-- CreateIndex
CREATE INDEX "GrowthRecord_recordedBy_idx" ON "GrowthRecord"("recordedBy");

-- CreateIndex
CREATE INDEX "Milestone_recordedBy_idx" ON "Milestone"("recordedBy");
