-- Additive CRM migration: existing website leads remain the canonical records.
ALTER TABLE "Lead"
  ADD COLUMN "company" TEXT,
  ADD COLUMN "nextAction" TEXT,
  ADD COLUMN "nextActionAt" TIMESTAMP(3),
  ADD COLUMN "crmVersion" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Lead_status_nextActionAt_idx" ON "Lead"("status", "nextActionAt");
CREATE INDEX "Lead_sourceLead_idx" ON "Lead"("sourceLead");

CREATE TABLE "LeadActivity" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "actor" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LeadActivity_leadId_occurredAt_idx" ON "LeadActivity"("leadId", "occurredAt");
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
