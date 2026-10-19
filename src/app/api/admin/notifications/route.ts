import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { dashboardPeriod } from "@/lib/admin/dashboard-metrics";
import { notificationEvents, notificationStatuses, notificationLogDetails } from "@/lib/admin/notification-log";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const denied = requireAdmin(request); if (denied) return denied;
  const status = request.nextUrl.searchParams.get("status") || "";
  if (status && !notificationStatuses.includes(status as typeof notificationStatuses[number])) return NextResponse.json({ error: "Statut de notification invalide." }, { status: 400 });
  const rawPage = Number(request.nextUrl.searchParams.get("page") || 1);
  if (!Number.isInteger(rawPage) || rawPage < 1 || rawPage > 10000) return NextResponse.json({ error: "Page invalide." }, { status: 400 });
  const { start, end, keys } = dashboardPeriod();
  const base = { name: { in: notificationEvents }, createdAt: { gte: start, lt: end } };
  const where = { ...base, ...(status ? { status } : {}) };
  try {
    const [items, total, counts] = await Promise.all([
      prisma.webhookEvent.findMany({ where, orderBy: { createdAt: "desc" }, take: 20, skip: (rawPage - 1) * 20, select: { id: true, name: true, status: true, payload: true, createdAt: true } }),
      prisma.webhookEvent.count({ where }), prisma.webhookEvent.groupBy({ by: ["status"], where: base, _count: { _all: true } })
    ]);
    return NextResponse.json({ items: items.map(item => ({ id: item.id, name: item.name, status: item.status, createdAt: item.createdAt, ...notificationLogDetails(item.payload) })), total, page: rawPage, pageSize: 20, counts: Object.fromEntries(notificationStatuses.map(key => [key, counts.find(item => item.status === key)?._count._all ?? 0])), period: { first: keys[0], last: keys[29], timezone: "Europe/Paris" } }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Le journal est indisponible. Aucun indicateur ne peut etre confirme." }, { status: 503 }); }
}
