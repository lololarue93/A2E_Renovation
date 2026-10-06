import { NextResponse } from "next/server";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const checks = await Promise.allSettled([
    prisma.$queryRaw`SELECT 1`,
    access(join(process.cwd(), "public", "uploads"), constants.W_OK)
  ]);
  const database = checks[0].status === "fulfilled";
  const media = checks[1].status === "fulfilled";
  const ok = database && media;
  return NextResponse.json(
    { ok, service: "a2e-web", checks: { database, media }, timestamp: new Date().toISOString() },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}
