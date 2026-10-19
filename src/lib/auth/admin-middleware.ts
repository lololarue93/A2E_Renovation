import { NextRequest, NextResponse } from "next/server";
import { adminConfig, adminCookieName, adminSessionKey, basicCredentials, sessionParts, databaseSessionParts } from "./admin-session-shared";

async function validSession(request: NextRequest) {
  const token = request.cookies.get(adminCookieName)?.value;
  const parts = sessionParts(token) || databaseSessionParts(token), secret = adminSessionKey();
  if (!parts || !secret) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const signature = Uint8Array.from(parts.signature.match(/../g)!, byte => parseInt(byte, 16));
  return crypto.subtle.verify("HMAC", key, signature, new TextEncoder().encode(parts.payload));
}

export async function adminMiddleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/admin/connexion") return NextResponse.next();
  const config = adminConfig();
  if (!config && !adminSessionKey()) return new NextResponse("Acces administrateur indisponible. Configurez les identifiants dans Portainer.", { status: 503, headers: { "Cache-Control": "no-store" } });
  const basic = basicCredentials(request);
  if ((basic && config && basic.email === config.email && basic.password === config.password) || await validSession(request)) {
    const response = NextResponse.next(); response.headers.set("Cache-Control", "no-store"); return response;
  }
  if (request.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ error: "Authentification admin requise" }, { status: 401, headers: { "WWW-Authenticate": 'Basic realm="A2E Equipe", charset="UTF-8"', "Cache-Control": "no-store" } });
  const target = new URL("/admin/connexion", request.url);
  target.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  const response = NextResponse.redirect(target);
  response.headers.set("Cache-Control", "no-store"); return response;
}
