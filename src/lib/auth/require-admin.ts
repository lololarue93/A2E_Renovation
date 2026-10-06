import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

function matches(actual: string, expected: string) {
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Defense in depth: API routes remain protected outside Next middleware. */
export function requireAdmin(request: Request): NextResponse | null {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password === "change-me") {
    return NextResponse.json({ error: "Acces admin non configure. Renseignez les identifiants sur le serveur." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Basic ")) {
    try {
      const credentials = Buffer.from(authorization.slice(6), "base64").toString("utf8");
      const separator = credentials.indexOf(":");
      if (separator > 0 && matches(credentials.slice(0, separator), email) && matches(credentials.slice(separator + 1), password)) return null;
    } catch {
      // Invalid credentials use the same response as absent credentials.
    }
  }
  return NextResponse.json({ error: "Authentification admin requise" }, { status: 401, headers: { "WWW-Authenticate": 'Basic realm="A2E Equipe", charset="UTF-8"', "Cache-Control": "no-store" } });
}
