import { NextRequest, NextResponse } from "next/server";
import { getRequestIdentity } from "@/lib/auth/identity";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const user = await getRequestIdentity(request);
  return NextResponse.json(user ? { user } : { error: "Authentification requise." }, { status: user ? 200 : 401, headers: { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie, Authorization" } });
}
