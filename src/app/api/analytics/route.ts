import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getNotificationSettings } from "@/lib/settings/notification-settings";
import { isAnalyticsSessionId, isClientAnalyticsEvent, safeAnalyticsLabel, safeAnalyticsPath, validAnalyticsLabel } from "@/lib/analytics-consent";

export async function POST(request: NextRequest) {
  try {
    const raw = await request.text();
    if (raw.length > 8000) return NextResponse.json({ ok: false }, { status: 413 });
    const body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ ok: false }, { status: 400 });
    // Reject measurement without explicit consent before any settings/database read.
    if (body.analyticsConsent !== true) return new NextResponse(null, { status: 204 });
    const event = typeof body.event === "string" ? body.event : "";
    const path = safeAnalyticsPath(body.path);
    if (!isClientAnalyticsEvent(event) || !path || !validAnalyticsLabel(event, body.label)) return NextResponse.json({ ok: false }, { status: 400 });
    if (!isAnalyticsSessionId(body.sessionId)) return new NextResponse(null, { status: 204 });
    if (!process.env.DATABASE_URL) return new NextResponse(null, { status: 204 });
    const settings = await getNotificationSettings();
    if (!settings.trackingEnabled) return new NextResponse(null, { status: 204 });
    let referrer: string | undefined;
    try { const value = request.headers.get("referer"); if (value) referrer = new URL(value).origin; } catch { /* Invalid referrer is omitted. */ }
    await prisma.siteEvent.create({ data: {
      event, path, label: safeAnalyticsLabel(event, typeof body.label === "string" ? body.label : undefined),
      sessionId: body.sessionId,
      referrer, metadata: undefined
    } });
    return new NextResponse(null, { status: 204 });
  } catch { return new NextResponse(null, { status: 204 }); }
}
