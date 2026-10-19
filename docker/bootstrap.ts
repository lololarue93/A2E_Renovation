import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { priceItems, pricingCoefficients, detailedPriceKeys } from "../src/lib/pricing/price-data";
import { siteSettings } from "../src/lib/site-data";

const prisma = new PrismaClient();

// Production initialization: create missing records, preserve every existing value.
// The demonstration seed intentionally remains a separate, manual command.
async function bootstrap() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password === "change-me" || password.length < 12) {
    throw new Error("Configure ADMIN_EMAIL and ADMIN_PASSWORD (12 characters minimum) before initialization.");
  }

  const administrator = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!administrator) {
    await prisma.user.create({ data: { email, passwordHash: await bcrypt.hash(password, 12), role: "admin" } });
  }
  const pendingDetailedKeys = new Set(detailedPriceKeys);
  for (const item of priceItems) {
    // New demonstration rates need an explicit reviewed admin import.
    // Neither activate them nor overwrite a company's existing catalogue.
    if (pendingDetailedKeys.has(item.key)) continue;
    await prisma.priceItem.upsert({ where: { key: item.key }, update: {}, create: item });
  }
  await prisma.pricingSettings.upsert({
    where: { key: "coefficients" }, update: {}, create: { key: "coefficients", value: pricingCoefficients }
  });
  await prisma.siteSettings.upsert({
    where: { key: "company" }, update: {}, create: { key: "company", value: siteSettings }
  });
  console.info("Production initialization complete; existing prices, settings and users preserved.");
  console.info("Detailed item rates require a reviewed admin import before the new calculator is opened.");
}

bootstrap()
  .catch(() => {
    // Do not print Prisma connection errors: they may contain connection details.
    console.error("Production initialization failed. Check database readiness and administrator configuration.");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
