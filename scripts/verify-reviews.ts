import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/db/prisma";
import { customerReviewsKey, customerReviewsSchema, emptyCustomerReviews, publishedCustomerReviews, type CustomerReview, type CustomerReviewsSettings } from "../src/lib/reviews/customer-reviews";
import { getPublicCustomerReviews } from "../src/lib/reviews/customer-review-store";
import { CustomerReviews } from "../src/components/marketing/CustomerReviews";
import { GET, PUT } from "../src/app/api/admin/reviews/route";

// Fixtures explicitement fictives : ce script ne contient aucun temoignage client.
const fixture: CustomerReview = { id: "test-review-1", author: "Double de test", city: "Ville de test", workType: "Travaux de test", date: "2026-01-15", rating: 3, text: "Texte fictif uniquement pour verifier la gestion des avis en test.", sourceUrl: "", consentConfirmed: false, published: false };
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

async function main() {
  const valid = { schemaVersion: 1 as const, version: 0, reviews: [fixture] };
  assert.equal(customerReviewsSchema.safeParse(valid).success, true);
  for (const patch of [{ published: true }, { rating: 0 }, { rating: 6 }, { rating: 2.5 }, { text: "court" }, { author: "" }, { date: "2026-02-30" }, { date: "date" }, { sourceUrl: "javascript:alert(1)" }, { sourceUrl: "https://user:password@example.test" }]) {
    assert.equal(customerReviewsSchema.safeParse({ ...valid, reviews: [{ ...fixture, ...patch }] }).success, false, `Valeur refusee : ${Object.keys(patch).join(", ")}`);
  }
  assert.equal(customerReviewsSchema.safeParse({ ...valid, reviews: [fixture, fixture] }).success, false, "Identifiants dupliques refuses");
  assert.equal(customerReviewsSchema.safeParse({ ...valid, schemaVersion: 2 }).success, false);
  assert.equal(customerReviewsSchema.safeParse({ ...valid, version: -1 }).success, false);
  assert.equal(customerReviewsSchema.safeParse({ ...valid, reviews: Array.from({ length: 101 }, (_, index) => ({ ...fixture, id: `test-${index}` })) }).success, false);
  assert.equal(customerReviewsSchema.safeParse({ ...valid, extra: "unexpected" }).success, false);
  assert.deepEqual(publishedCustomerReviews({ ...valid, reviews: [fixture, { ...fixture, id: "not-consented", published: true }, { ...fixture, id: "visible-old", published: true, consentConfirmed: true, date: "2025-01-01" }, { ...fixture, id: "visible-new", published: true, consentConfirmed: true }] }).map(review => review.id), ["visible-new", "visible-old"], "Filtre public : publication et accord obligatoires, ordre de date");

  const original = { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD, database: process.env.DATABASE_URL, findUnique: prisma.siteSettings.findUnique, transaction: prisma.$transaction };
  let stored: unknown = null;
  let reads = 0; let writes = 0; let failRead = false; let failWrite = false; let failAudit = false;
  let conflictCode = ""; let interfereAfterCommit = false;
  const audits: unknown[] = [];
  const auth = `Basic ${Buffer.from("admin@example.test:reviews-only-test").toString("base64")}`;
  const request = (method = "GET", body?: unknown, authenticated = true) => new NextRequest("http://localhost/api/admin/reviews", { method, headers: { "content-type": "application/json", ...(authenticated ? { authorization: auth } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const findValue = async (args: { where: { key: string } }) => { reads++; assert.equal(args.where.key, customerReviewsKey); return stored === null ? null : { value: clone(stored) }; };
  const tx = {
    siteSettings: {
      findUnique: findValue,
      upsert: async (args: { where: { key: string }; create: { key: string; value: unknown }; update: { value: unknown } }) => {
        if (failWrite) throw new Error("Double : ecriture indisponible");
        assert.equal(args.where.key, customerReviewsKey); assert.equal(args.create.key, customerReviewsKey); assert.deepEqual(args.create.value, args.update.value);
        stored = clone(args.update.value); writes++; return { value: clone(stored) };
      }
    },
    auditLog: { create: async (args: unknown) => { if (failAudit) throw new Error("Double : audit indisponible"); audits.push(clone(args)); return args; } }
  };
  try {
    process.env.ADMIN_EMAIL = "admin@example.test"; process.env.ADMIN_PASSWORD = "reviews-only-test";
    process.env.DATABASE_URL = "postgresql://test-unused.invalid/reviews";
    // Doubles explicites : aucune methode Prisma du test ne contacte PostgreSQL.
    prisma.siteSettings.findUnique = (async (args: { where: { key: string } }) => { if (failRead) throw new Error("Double : lecture indisponible"); return findValue(args); }) as unknown as typeof prisma.siteSettings.findUnique;
    prisma.$transaction = (async (operation: (client: typeof tx) => Promise<unknown>, options: { isolationLevel: string }) => {
      assert.equal(options.isolationLevel, "Serializable", "Les ecritures demandent une isolation serialisable");
      if (conflictCode) throw Object.assign(new Error("Double : conflit base"), { code: conflictCode });
      const previous = stored === null ? null : clone(stored); const previousAudits = audits.length;
      try {
        const result = await operation(tx);
        if (interfereAfterCommit && stored) stored = { ...(stored as CustomerReviewsSettings), version: (stored as CustomerReviewsSettings).version + 1 };
        return result;
      } catch (error) { stored = previous; audits.splice(previousAudits); throw error; }
    }) as unknown as typeof prisma.$transaction;

    for (const [handler, method] of [[GET, "GET"], [PUT, "PUT"]] as const) assert.equal((await handler(request(method, undefined, false))).status, 401);
    assert.equal(reads, 0, "Acces refuse avant lecture"); assert.equal(writes, 0, "Acces refuse avant ecriture");
    delete process.env.ADMIN_PASSWORD;
    assert.equal((await PUT(request("PUT", valid))).status, 503, "Configuration auth manquante refusee");
    assert.equal(writes, 0); process.env.ADMIN_PASSWORD = "reviews-only-test";
    const empty = await GET(request()); assert.equal(empty.status, 200); assert.equal(empty.headers.get("cache-control"), "no-store");
    assert.deepEqual((await empty.json()).settings, emptyCustomerReviews());
    assert.equal(await CustomerReviews(), null, "Aucune section d'avis sans avis publie");

    for (const body of [null, { ...valid, reviews: [{ ...fixture, published: true }] }, { ...valid, reviews: [{ ...fixture, rating: 0 }] }, { ...valid, reviews: [{ ...fixture, sourceUrl: "data:text/html,code" }] }]) assert.equal((await PUT(request("PUT", body))).status, 400);
    assert.equal(writes, 0, "Valeurs invalides refusees avant transaction");
    const created = await PUT(request("PUT", valid)); assert.equal(created.status, 200); const createdSettings = (await created.json()).settings as CustomerReviewsSettings;
    assert.equal(createdSettings.version, 1); assert.deepEqual((await (await GET(request())).json()).settings, createdSettings, "Brouillon cree et relu sans perte");
    assert.deepEqual(await getPublicCustomerReviews(), [], "Un brouillon reste invisible");
    assert.equal(await CustomerReviews(), null);
    assert.equal((await PUT(request("PUT", valid))).status, 409, "Ancienne version refusee");
    assert.equal(writes, 1, "Un conflit ne touche pas la liste");

    const publishing = { ...createdSettings, reviews: [{ ...fixture, author: "<script>Double de test</script>", text: "<script>Texte de test uniquement</script>", published: true, consentConfirmed: true, sourceUrl: "https://example.test/review" }] };
    const published = await PUT(request("PUT", publishing)); assert.equal(published.status, 200);
    let current = (await published.json()).settings as CustomerReviewsSettings;
    assert.equal(current.version, 2); assert.deepEqual(await getPublicCustomerReviews(), current.reviews, "Le public lit la meme source persistante");
    const markup = renderToStaticMarkup(await CustomerReviews());
    assert.ok(markup.includes("customer-reviews-title")); assert.ok(markup.includes("&lt;script&gt;")); assert.ok(!markup.includes("<script>"), "Les textes publics sont echappes");
    assert.ok(markup.includes('rel="noopener noreferrer"')); assert.match(markup, /datetime="2026-01-15"/i); assert.ok(markup.includes("3 / 5"));
    assert.deepEqual((audits[1] as { data: { payload: unknown } }).data.payload, { version: 2, count: 1, published: 1 }, "Le journal ne duplique ni texte ni nom client");
    const unpublished = await PUT(request("PUT", { ...current, reviews: [{ ...current.reviews[0], published: false, consentConfirmed: false }] })); assert.equal(unpublished.status, 200);
    current = (await unpublished.json()).settings; assert.deepEqual(await getPublicCustomerReviews(), [], "Le retrait du consentement retire l'avis du public");
    const beforeFailure = clone(stored);
    failWrite = true; assert.equal((await PUT(request("PUT", current))).status, 503); failWrite = false; assert.deepEqual(stored, beforeFailure);
    failAudit = true; assert.equal((await PUT(request("PUT", { ...current, reviews: [] }))).status, 503); failAudit = false; assert.deepEqual(stored, beforeFailure, "Audit et liste sont atomiques dans le double transactionnel");
    for (const code of ["P2034", "P2002"]) { conflictCode = code; assert.equal((await PUT(request("PUT", current))).status, 409); } conflictCode = "";
    failRead = true; assert.equal((await GET(request())).status, 503); assert.deepEqual(await getPublicCustomerReviews(), []); assert.equal(await CustomerReviews(), null);
    assert.equal((await PUT(request("PUT", current))).status, 503, "Sans relecture, aucun succes annonce apres ecriture"); failRead = false;
    current = (await (await GET(request())).json()).settings;
    interfereAfterCommit = true; assert.equal((await PUT(request("PUT", current))).status, 409, "Une ecriture concurrente pendant la relecture est signalee"); interfereAfterCommit = false;
    current = (await (await GET(request())).json()).settings;
    const deleted = await PUT(request("PUT", { ...current, reviews: [] })); assert.equal(deleted.status, 200);
    assert.deepEqual((await (await GET(request())).json()).settings.reviews, [], "Suppression explicite sauvegardee et relue"); assert.equal(await CustomerReviews(), null);
    stored = { schemaVersion: 999, version: 0, reviews: [] }; const invalidStored = clone(stored);
    assert.equal((await GET(request())).status, 503); assert.equal((await PUT(request("PUT", emptyCustomerReviews()))).status, 503); assert.deepEqual(stored, invalidStored, "Une configuration invalide n'est jamais ecrasee par defaut");
    assert.deepEqual(await getPublicCustomerReviews(), []);
    delete process.env.DATABASE_URL; const readsBeforeNoDatabase = reads; assert.deepEqual(await getPublicCustomerReviews(), []); assert.equal(reads, readsBeforeNoDatabase);
  } finally {
    prisma.siteSettings.findUnique = original.findUnique; prisma.$transaction = original.transaction;
    for (const [key, value] of [["ADMIN_EMAIL", original.email], ["ADMIN_PASSWORD", original.password], ["DATABASE_URL", original.database]] as const) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    await prisma.$disconnect();
  }
  console.log("PASS : avis valides, accord obligatoire, source publique unique, liste vide masquee, HTML echappe, auth refusee, sauvegarde/relecture, versions concurrentes, suppression, rollback et erreurs API. Doubles explicites en memoire ; aucun avis reel, email ni acces a une base.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
