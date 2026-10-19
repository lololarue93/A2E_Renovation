import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { middleware as rootMiddleware } from "../middleware";
import { middleware as sourceMiddleware } from "../src/middleware";
import { requireAdmin } from "../src/lib/auth/require-admin";
import { GET as catalog } from "../src/app/api/admin/pricing/route";
import { GET as quotes } from "../src/app/api/admin/cotations/route";
import { GET as leads } from "../src/app/api/admin/leads/route";

async function main() {
  const previous = { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD, secret: process.env.AUTH_SECRET };
  const request = (authorization?: string) => new NextRequest("http://localhost/api/admin/pricing", { headers: authorization ? { authorization } : {} });
  try {
    delete process.env.ADMIN_EMAIL; delete process.env.ADMIN_PASSWORD; delete process.env.AUTH_SECRET;
    for (const middleware of [rootMiddleware, sourceMiddleware]) assert.equal((await middleware(request())).status, 503);
    process.env.ADMIN_EMAIL = "equipe@example.com";
    process.env.ADMIN_PASSWORD = "mot-de-passe-été-€";
    const unicodeAuth = `Basic ${Buffer.from(`${process.env.ADMIN_EMAIL}:${process.env.ADMIN_PASSWORD}`, "utf8").toString("base64")}`;
    for (const middleware of [rootMiddleware, sourceMiddleware]) {
      assert.equal((await middleware(request(unicodeAuth))).headers.get("x-middleware-next"), "1", "Le mot de passe UTF-8 est reconnu");
      for (const malformed of [undefined, "Basic !!!", "Basic " + Buffer.from("equipe@example.com:incorrect").toString("base64"), "Basic /w=="]) {
        const response = await middleware(request(malformed));
        assert.equal(response.status, 401);
        assert.equal(response.headers.get("www-authenticate"), 'Basic realm="A2E Equipe", charset="UTF-8"');
        assert.equal(response.headers.get("cache-control"), "no-store");
      }
    }
    assert.equal(await requireAdmin(request(unicodeAuth)), null, "L'API accepte les memes caracteres UTF-8");
    assert.equal((await requireAdmin(request()))?.headers.get("www-authenticate"), (await rootMiddleware(request())).headers.get("www-authenticate"));
    for (const endpoint of [catalog, quotes, leads]) assert.equal((await endpoint(request())).status, 401, "Les routes sont protegees sans middleware");
    process.env.ADMIN_PASSWORD = "change-me";
    for (const middleware of [rootMiddleware, sourceMiddleware]) assert.equal((await middleware(request(unicodeAuth))).status, 503);
    assert.equal((await requireAdmin(request(unicodeAuth)))?.status, 503);
    console.log("PASS : identifiants UTF-8, challenge coherent, refus sans configuration, mot de passe exemple, credentials invalides et routes protegees.");
  } finally {
    if (previous.email === undefined) delete process.env.ADMIN_EMAIL; else process.env.ADMIN_EMAIL = previous.email;
    if (previous.password === undefined) delete process.env.ADMIN_PASSWORD; else process.env.ADMIN_PASSWORD = previous.password;
    if (previous.secret === undefined) delete process.env.AUTH_SECRET; else process.env.AUTH_SECRET = previous.secret;
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
