import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getNotificationSettings } from "@/lib/settings/notification-settings";

const allowedEvents = new Set(["page_view", "cta_click", "phone_click", "quote_started", "lead_submitted"]);

export async function POST(request: NextRequest) {
  try {
    const settings = await getNotificationSettings();
    if (!settings.trackingEnabled) return new NextResponse(null, { status: 204 });
    const body = await request.json();
    const event = typeof body.event === "string" ? body.event : "";
    const path = typeof body.path === "string" ? body.path.slice(0, 240) : "/";
    if (!allowedEvents.has(event)) return NextResponse.json({ ok: false }, { status: 400 });
    await prisma.siteEvent.create({
      data: {
        event,
        path,
        label: typeof body.label === "string" ? body.label.slice(0, 120) : undefined,
        sessionId: typeof body.sessionId === "string" ? body.sessionId.slice(0, 80) : undefined,
        referrer: request.headers.get("referer")?.slice(0, 500) ?? undefined,
        metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : undefined
      }
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[analytics] event rejected", error);
    return new NextResponse(null, { status: 204 });
  }
}
