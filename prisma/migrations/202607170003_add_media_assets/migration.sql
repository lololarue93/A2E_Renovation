CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "realisationId" TEXT,
    "kind" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "alt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MediaAsset_realisationId_createdAt_idx" ON "MediaAsset"("realisationId", "createdAt");
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_realisationId_fkey" FOREIGN KEY ("realisationId") REFERENCES "Realisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
