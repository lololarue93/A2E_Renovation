import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { customerReviewsKey, emptyCustomerReviews, publishedCustomerReviews, readCustomerReviews } from "./customer-reviews";

export async function getCustomerReviewsSettings() {
  const row = await prisma.siteSettings.findUnique({ where: { key: customerReviewsKey }, select: { value: true } });
  return row ? readCustomerReviews(row.value) : emptyCustomerReviews();
}

export async function getPublicCustomerReviews() {
  noStore();
  if (!process.env.DATABASE_URL) return [];
  try { return publishedCustomerReviews(await getCustomerReviewsSettings()); }
  catch { return []; }
}
