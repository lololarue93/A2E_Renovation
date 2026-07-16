import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { priceItems, pricingCoefficients } from "../src/lib/pricing/price-data";
import { realisations, siteSettings, team, trustBadges } from "../src/lib/site-data";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@ags-a2e.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "change-me";

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash: await bcrypt.hash(adminPassword, 10), role: "admin" },
    create: { email: adminEmail, passwordHash: await bcrypt.hash(adminPassword, 10), role: "admin" }
  });

  for (const item of priceItems) {
    await prisma.priceItem.upsert({
      where: { key: item.key },
      update: item,
      create: item
    });
  }

  await prisma.pricingSettings.upsert({
    where: { key: "coefficients" },
    update: { value: pricingCoefficients },
    create: { key: "coefficients", value: pricingCoefficients }
  });

  await prisma.siteSettings.upsert({
    where: { key: "company" },
    update: { value: siteSettings },
    create: { key: "company", value: siteSettings }
  });

  for (const [index, badge] of trustBadges.entries()) {
    await prisma.trustBadge.upsert({
      where: { id: `demo-badge-${index}` },
      update: { label: badge.label, note: badge.note, icon: badge.label, sortOrder: index },
      create: { id: `demo-badge-${index}`, label: badge.label, note: badge.note, icon: badge.label, sortOrder: index }
    });
  }

  for (const [index, person] of team.entries()) {
    const [firstName, ...lastParts] = person.name.split(" ");
    await prisma.employee.upsert({
      where: { id: `demo-employee-${index}` },
      update: { firstName, lastName: lastParts.join(" "), role: person.role, bio: person.bio, specialties: person.specialties, sortOrder: index },
      create: { id: `demo-employee-${index}`, firstName, lastName: lastParts.join(" "), role: person.role, bio: person.bio, specialties: person.specialties, sortOrder: index }
    });
  }

  for (const [index, realisation] of realisations.entries()) {
    await prisma.realisation.upsert({
      where: { id: `demo-realisation-${index}` },
      update: { ...realisation, description: `${realisation.title} - projet démonstration remplaçable depuis l'admin.` },
      create: { id: `demo-realisation-${index}`, ...realisation, description: `${realisation.title} - projet démonstration remplaçable depuis l'admin.` }
    });
  }
}

main().finally(async () => prisma.$disconnect());
