-- Initial schema for a fresh A2E deployment.
-- Later migrations add analytics and estimate material details.

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('nouveau', 'a_rappeler', 'visite_a_planifier', 'devis_a_preparer', 'devis_envoye', 'signe', 'gagne', 'perdu');

-- CreateTable
CREATE TABLE "User" ("id" TEXT NOT NULL, "email" TEXT NOT NULL, "passwordHash" TEXT NOT NULL, "role" TEXT NOT NULL DEFAULT 'admin', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "User_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Lead" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "phone" TEXT NOT NULL, "email" TEXT NOT NULL, "city" TEXT, "sourceLead" TEXT NOT NULL DEFAULT 'website', "typeProjet" TEXT NOT NULL, "budget" INTEGER, "status" "LeadStatus" NOT NULL DEFAULT 'nouveau', "maturityScore" INTEGER, "consent" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Lead_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Project" ("id" TEXT NOT NULL, "leadId" TEXT NOT NULL, "type" TEXT NOT NULL, "city" TEXT, "postalCode" TEXT, "surface" DOUBLE PRECISION, "details" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Project_pkey" PRIMARY KEY ("id"));
CREATE TABLE "ProjectPhoto" ("id" TEXT NOT NULL, "projectId" TEXT NOT NULL, "url" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "ProjectPhoto_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Estimate" ("id" TEXT NOT NULL, "leadId" TEXT, "number" TEXT NOT NULL, "low" INTEGER NOT NULL, "mid" INTEGER NOT NULL, "high" INTEGER NOT NULL, "duration" TEXT NOT NULL, "complexity" TEXT NOT NULL, "assumptions" JSONB NOT NULL, "pdfUrl" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Estimate_pkey" PRIMARY KEY ("id"));
CREATE TABLE "EstimateLine" ("id" TEXT NOT NULL, "estimateId" TEXT NOT NULL, "label" TEXT NOT NULL, "quantity" DOUBLE PRECISION NOT NULL, "unit" TEXT NOT NULL, "low" INTEGER NOT NULL, "mid" INTEGER NOT NULL, "high" INTEGER NOT NULL, CONSTRAINT "EstimateLine_pkey" PRIMARY KEY ("id"));
CREATE TABLE "PriceItem" ("id" TEXT NOT NULL, "key" TEXT NOT NULL, "category" TEXT NOT NULL, "label" TEXT NOT NULL, "unit" TEXT NOT NULL, "low" INTEGER NOT NULL, "mid" INTEGER NOT NULL, "high" INTEGER NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "PriceItem_pkey" PRIMARY KEY ("id"));
CREATE TABLE "PricingSettings" ("id" TEXT NOT NULL, "key" TEXT NOT NULL, "value" JSONB NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "PricingSettings_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Realisation" ("id" TEXT NOT NULL, "title" TEXT NOT NULL, "city" TEXT NOT NULL, "type" TEXT NOT NULL, "description" TEXT NOT NULL, "duration" TEXT NOT NULL, "budget" TEXT NOT NULL, "tags" TEXT[], "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Realisation_pkey" PRIMARY KEY ("id"));
CREATE TABLE "RealisationPhoto" ("id" TEXT NOT NULL, "realisationId" TEXT NOT NULL, "beforeUrl" TEXT, "afterUrl" TEXT, "sortOrder" INTEGER NOT NULL DEFAULT 0, CONSTRAINT "RealisationPhoto_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Employee" ("id" TEXT NOT NULL, "firstName" TEXT NOT NULL, "lastName" TEXT NOT NULL, "role" TEXT NOT NULL, "photoUrl" TEXT, "bio" TEXT NOT NULL, "specialties" TEXT[], "area" TEXT, "phone" TEXT, "email" TEXT, "sortOrder" INTEGER NOT NULL DEFAULT 0, "active" BOOLEAN NOT NULL DEFAULT true, CONSTRAINT "Employee_pkey" PRIMARY KEY ("id"));
CREATE TABLE "TrustBadge" ("id" TEXT NOT NULL, "label" TEXT NOT NULL, "note" TEXT, "icon" TEXT, "active" BOOLEAN NOT NULL DEFAULT true, "sortOrder" INTEGER NOT NULL DEFAULT 0, CONSTRAINT "TrustBadge_pkey" PRIMARY KEY ("id"));
CREATE TABLE "SiteSettings" ("id" TEXT NOT NULL, "key" TEXT NOT NULL, "value" JSONB NOT NULL, CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id"));
CREATE TABLE "WebhookEvent" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "payload" JSONB NOT NULL, "status" TEXT NOT NULL DEFAULT 'pending', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id"));
CREATE TABLE "AuditLog" ("id" TEXT NOT NULL, "actor" TEXT, "action" TEXT NOT NULL, "entity" TEXT NOT NULL, "entityId" TEXT, "payload" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id"));

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Project_leadId_key" ON "Project"("leadId");
CREATE UNIQUE INDEX "Estimate_number_key" ON "Estimate"("number");
CREATE UNIQUE INDEX "PriceItem_key_key" ON "PriceItem"("key");
CREATE UNIQUE INDEX "PricingSettings_key_key" ON "PricingSettings"("key");
CREATE UNIQUE INDEX "SiteSettings_key_key" ON "SiteSettings"("key");
ALTER TABLE "Project" ADD CONSTRAINT "Project_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectPhoto" ADD CONSTRAINT "ProjectPhoto_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EstimateLine" ADD CONSTRAINT "EstimateLine_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RealisationPhoto" ADD CONSTRAINT "RealisationPhoto_realisationId_fkey" FOREIGN KEY ("realisationId") REFERENCES "Realisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
