import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ ok: true, service: "a2e-web", timestamp: new Date().toISOString() });
}
