import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { safeMailLog } from "@/lib/email/manual-mail";
import { mailApiError, mailJson } from "@/lib/email/mail-api";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const denied = await requireAdmin(request, "mail:read"); if (denied) return denied;
  const page = Number(new URL(request.url).searchParams.get("page") || "1");
  if (!Number.isInteger(page) || page < 1 || page > 10000) return mailJson({ error: "Page invalide." }, 400);
  try {
    const where = { name: { startsWith: "mail." } };
    const [items, total] = await Promise.all([prisma.webhookEvent.findMany({ where, orderBy: { createdAt: "desc" }, take: 25, skip: (page - 1) * 25 }), prisma.webhookEvent.count({ where })]);
    return mailJson({ items: items.map(safeMailLog), total, page, pageSize: 25 });
  } catch (error) { return mailApiError(error); }
}
