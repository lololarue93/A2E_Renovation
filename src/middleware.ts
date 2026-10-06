import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password === "change-me") {
    return new NextResponse("Acces administrateur indisponible. Configurez les identifiants dans Portainer.", { status: 503 });
  }
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Basic ")) {
    try {
      const decoded = new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(atob(authorization.slice(6)), (character) => character.charCodeAt(0)));
      const separator = decoded.indexOf(":");
      if (separator > 0 && decoded.slice(0, separator) === email && decoded.slice(separator + 1) === password) return NextResponse.next();
    } catch { /* Invalid credentials remain an authentication failure. */ }
  }
  return new NextResponse("Authentification A2E requise", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="A2E Equipe", charset="UTF-8"', "Cache-Control": "no-store" } });
}
export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
