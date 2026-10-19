import { NextResponse } from "next/server";
import { requestAdminSession, sameCredential, validAdminSession } from "./admin-session";
import { basicCredentials, sameAdminOrigin } from "./admin-session-shared";

/** Defense in depth: API routes remain protected outside Next middleware. */
export function requireAdmin(request: Request): NextResponse | null {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password === "change-me") {
    return NextResponse.json({ error: "Acces admin non configure. Renseignez les identifiants sur le serveur." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (validAdminSession(requestAdminSession(request))) {
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && !sameAdminOrigin(request)) return NextResponse.json({ error: "Origine de la requete refusee" }, { status: 403 });
    return null;
  }
  const basic = basicCredentials(request);
  if (basic && sameCredential(basic.email, email) && sameCredential(basic.password, password)) return null;
  return NextResponse.json({ error: "Authentification admin requise" }, { status: 401, headers: { "WWW-Authenticate": 'Basic realm="A2E Equipe", charset="UTF-8"', "Cache-Control": "no-store" } });
}
