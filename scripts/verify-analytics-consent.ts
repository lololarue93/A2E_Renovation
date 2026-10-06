import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/db/prisma";
import { POST } from "../src/app/api/analytics/route";
import { getSessionId, track } from "../src/components/analytics/AnalyticsTracker";
import { ANALYTICS_CONSENT_KEY, ANALYTICS_SESSION_KEY, analyticsPreferenceExpiresAt, parseAnalyticsPreference, setAnalyticsPreference } from "../src/lib/analytics-consent";

class MemoryStorage {
  values = new Map<string, string>(); writes = 0; blocked = false;
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { if (this.blocked) throw new Error("Blocked storage"); this.writes += 1; this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}
class BrowserDouble extends EventTarget { localStorage = new MemoryStorage(); sessionStorage = new MemoryStorage(); location = { pathname: "/" }; }

async function main() {
  assert.equal(analyticsPreferenceExpiresAt(new Date("2026-08-31T12:00:00Z")).toISOString(), "2027-02-28T12:00:00.000Z", "Six mois calendaires sans debordement du mois");
  const choice = JSON.stringify({ choice: "accepted", decidedAt: "2026-01-06T10:00:00.000Z" });
  assert.equal(parseAnalyticsPreference(choice, new Date("2026-07-06T09:59:59Z"))?.choice, "accepted");
  assert.equal(parseAnalyticsPreference(choice, new Date("2026-07-06T10:00:00Z")), null, "L'expiration ne se prolonge pas automatiquement");
  for (const invalid of [null, "invalid", "{}", JSON.stringify({ choice: "accepted", decidedAt: "invalide" }), JSON.stringify({ choice: "accepted", decidedAt: "2099-01-01" })]) assert.equal(parseAnalyticsPreference(invalid), null);
  const browser = new BrowserDouble();
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window"), navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator"), originalFetch = globalThis.fetch;
  const beacons: Blob[] = []; let requests = 0;
  try {
    Object.defineProperty(globalThis, "window", { configurable: true, value: browser });
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: { sendBeacon: (_url: string, body: Blob) => { beacons.push(body); return true; } } });
    globalThis.fetch = (async () => { requests += 1; return new Response(null, { status: 204 }); }) as typeof fetch;
    browser.sessionStorage.values.set(ANALYTICS_SESSION_KEY, "legacy-id");
    assert.equal(getSessionId(), undefined); track("page_view");
    assert.equal(browser.sessionStorage.values.has(ANALYTICS_SESSION_KEY), false, "L'ancien identifiant est supprime sans accord");
    assert.equal(browser.sessionStorage.writes, 0); assert.equal(beacons.length, 0); assert.equal(requests, 0);
    assert.equal(setAnalyticsPreference("refused"), true); track("quote_started"); assert.equal(getSessionId(), undefined); assert.equal(beacons.length, 0);
    const preference = JSON.parse(browser.localStorage.getItem(ANALYTICS_CONSENT_KEY)!);
    assert.deepEqual(Object.keys(preference).sort(), ["choice", "decidedAt"], "Seule la preference et sa date sont conservees durablement");
    assert.equal(setAnalyticsPreference("accepted"), true);
    const id = getSessionId(); assert.ok(id); assert.equal(getSessionId(), id); assert.equal(browser.sessionStorage.writes, 1);
    track("page_view"); track("pdf_downloaded", "A2E-CLIENT-PRIVATE-000001"); track("cta_click", "Client Prive client@example.test 0100000000");
    assert.equal(beacons.length, 3);
    const payloads = await Promise.all(beacons.map(async (body) => JSON.parse(await body.text())));
    assert.equal(payloads[0].analyticsConsent, true); assert.equal(payloads[0].sessionId, id);
    assert.equal(payloads[1].label, "Pre-devis telecharge"); assert.equal(payloads[2].label, "Navigation vers projet");
    assert.ok(!JSON.stringify(payloads).includes("CLIENT-PRIVATE")); assert.ok(!JSON.stringify(payloads).includes("client@example.test"));
    setAnalyticsPreference("refused"); track("phone_click"); assert.equal(getSessionId(), undefined); assert.equal(beacons.length, 3);
    setAnalyticsPreference("accepted"); browser.localStorage.blocked = true;
    assert.equal(setAnalyticsPreference("refused"), false); assert.equal(getSessionId(), undefined); track("page_view"); assert.equal(beacons.length, 3, "Un retrait bloque localement reste effectif sur la page");
    browser.localStorage.blocked = false; setAnalyticsPreference("accepted"); browser.location.pathname = "/admin";
    assert.equal(getSessionId(), undefined); track("page_view"); assert.equal(beacons.length, 3);
  } finally {
    if (windowDescriptor) Object.defineProperty(globalThis, "window", windowDescriptor); else Reflect.deleteProperty(globalThis, "window");
    if (navigatorDescriptor) Object.defineProperty(globalThis, "navigator", navigatorDescriptor); else Reflect.deleteProperty(globalThis, "navigator");
    globalThis.fetch = originalFetch;
  }

  const databaseUrl = process.env.DATABASE_URL, settingsRead = prisma.siteSettings.findUnique, eventCreate = prisma.siteEvent.create;
  let reads = 0, writes = 0; let recorded: Record<string, unknown> = {}; let enabled = true;
  const request = (body: unknown) => new NextRequest("http://localhost/api/analytics", { method: "POST", headers: { "content-type": "application/json", referer: "https://example.test/contact?email=client@example.test" }, body: JSON.stringify(body) });
  try {
    process.env.DATABASE_URL = "postgresql://test-only.invalid/test";
    prisma.siteSettings.findUnique = (async () => { reads += 1; return { value: { trackingEnabled: enabled } }; }) as unknown as typeof prisma.siteSettings.findUnique;
    prisma.siteEvent.create = (async (input: { data: Record<string, unknown> }) => { writes += 1; recorded = input.data; return input.data; }) as unknown as typeof prisma.siteEvent.create;
    for (const body of [{ event: "page_view", path: "/" }, { event: "page_view", analyticsConsent: false }, { event: "page_view", analyticsConsent: "true" }]) assert.equal((await POST(request(body))).status, 204);
    assert.equal(reads, 0); assert.equal(writes, 0, "Sans accord explicite, aucune lecture ou ecriture en base");
    assert.equal((await POST(request({ analyticsConsent: true, event: "page_view", path: "/admin" }))).status, 400); assert.equal(reads, 0);
    assert.equal((await POST(request({ analyticsConsent: true, event: "page_view", path: "/contact?email=prive" }))).status, 400); assert.equal(reads, 0);
    assert.equal((await POST(request({ analyticsConsent: true, event: "pdf_downloaded", path: "/simulateur", sessionId: "test-session", label: "client@example.test", metadata: { private: "private" } }))).status, 204);
    assert.equal(writes, 1); assert.equal(recorded.label, "Pre-devis telecharge"); assert.equal(recorded.referrer, "https://example.test"); assert.equal(recorded.metadata, undefined);
    enabled = false; await POST(request({ analyticsConsent: true, event: "page_view", path: "/" })); assert.equal(writes, 1);
  } finally {
    prisma.siteSettings.findUnique = settingsRead; prisma.siteEvent.create = eventCreate;
    if (databaseUrl === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = databaseUrl;
    await prisma.$disconnect();
  }
  console.log("PASS : choix explicite, expiration6mois, aucun identifiant/requete avant accord ou apres retrait, absence admin, labels minimises, API gardee avant DB et suivi desactive. Aucune requete externe.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
