import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { customerReviewsKey, customerReviewsSchema, emptyCustomerReviews, readCustomerReviews } from "@/lib/reviews/customer-reviews";
import { getCustomerReviewsSettings } from "@/lib/reviews/customer-review-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const headers = { "Cache-Control": "no-store" };
class ReviewConflict extends Error {}
function failure(error: unknown) {
  if (error instanceof ReviewConflict || (error && typeof error === "object" && "code" in error && ["P2034", "P2002"].includes(String(error.code)))) {
    return NextResponse.json({ error: "Les avis ont change depuis votre chargement. Votre brouillon est conserve. Rechargez la liste avant de reporter vos modifications." }, { status: 409, headers });
  }
  if (error instanceof z.ZodError) return NextResponse.json({ error: "La configuration des avis stockee est invalide. L'enregistrement n'est pas confirme. Faites verifier la configuration en base." }, { status: 503, headers });
  return NextResponse.json({ error: "La base est indisponible ou la relecture a echoue. L'enregistrement n'est pas confirme. Votre brouillon est conserve ; rechargez avant de reessayer." }, { status: 503, headers });
}

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request); if (denied) return denied;
  try { return NextResponse.json({ settings: await getCustomerReviewsSettings() }, { headers }); }
  catch (error) { return failure(error); }
}

/** All creates, edits, publications and staged deletions require one explicit save. */
export async function PUT(request: NextRequest) {
  const denied = requireAdmin(request); if (denied) return denied;
  const parsed = customerReviewsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Verifiez les champs des avis et l'accord client avant publication.", details: parsed.error.issues.map(issue => ({ path: issue.path.join("."), message: issue.message })) }, { status: 400, headers });
  try {
    const saved = await prisma.$transaction(async tx => {
      const row = await tx.siteSettings.findUnique({ where: { key: customerReviewsKey }, select: { value: true } });
      const current = row ? readCustomerReviews(row.value) : emptyCustomerReviews();
      if (current.version !== parsed.data.version) throw new ReviewConflict();
      const next = { ...parsed.data, version: current.version + 1 };
      await tx.siteSettings.upsert({ where: { key: customerReviewsKey }, create: { key: customerReviewsKey, value: next }, update: { value: next } });
      await tx.auditLog.create({ data: { actor: process.env.ADMIN_EMAIL, action: "reviews.updated", entity: "SiteSettings", entityId: customerReviewsKey, payload: { version: next.version, count: next.reviews.length, published: next.reviews.filter(review => review.published).length } } });
      return next;
    }, { isolationLevel: "Serializable" });
    const confirmed = await getCustomerReviewsSettings();
    if (JSON.stringify(confirmed) !== JSON.stringify(saved)) throw new ReviewConflict();
    return NextResponse.json({ ok: true, settings: confirmed }, { headers });
  } catch (error) { return failure(error); }
}
