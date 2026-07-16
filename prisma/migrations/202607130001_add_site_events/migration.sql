CREATE TABLE "SiteEvent" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "label" TEXT,
    "sessionId" TEXT,
    "referrer" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SiteEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SiteEvent_event_createdAt_idx" ON "SiteEvent"("event", "createdAt");
CREATE INDEX "SiteEvent_path_createdAt_idx" ON "SiteEvent"("path", "createdAt");
