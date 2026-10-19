import { NextResponse } from "next/server";
import { sameCredential } from "./admin-session";
import { adminConfig, adminSessionKey, basicCredentials, sameAdminOrigin } from "./admin-session-shared";
import { getRequestIdentity } from "./identity";
import { hasPermission, permissionForRequest, type Permission } from "./permissions";
export { getRequestActor, getRequestIdentity, getServerIdentity } from "./identity";

/** Defense in depth: API routes remain protected outside Next middleware. */
export async function requireAdmin(request: Request, permission?: Permission): Promise<NextResponse | null> {
  const headers = { "Cache-Control": "no-store" };
  const identity = await getRequestIdentity(request);
  if (!identity) {
    if (!adminConfig() && !(process.env.DATABASE_URL && adminSessionKey())) return NextResponse.json({ error: "Acces admin non configure. Renseignez les identifiants sur le serveur." }, { status: 503, headers });
    return NextResponse.json({ error: "Authentification admin requise" }, { status: 401, headers: { ...headers, "WWW-Authenticate": 'Basic realm="A2E Equipe", charset="UTF-8"' } });
  }
  const basic = basicCredentials(request), config = adminConfig();
  const basicRecovery = !!(basic && config && sameCredential(basic.email, config.email) && sameCredential(basic.password, config.password));
  if (!basicRecovery && !["GET", "HEAD", "OPTIONS"].includes(request.method) && !sameAdminOrigin(request)) return NextResponse.json({ error: "Origine de la requete refusee" }, { status: 403, headers });
  const needed = permission ?? permissionForRequest(request);
  if (needed ? !hasPermission(identity.role, needed) : identity.role !== "admin") return NextResponse.json({ error: "Votre compte ne permet pas cette action." }, { status: 403, headers });
  return null;
}
