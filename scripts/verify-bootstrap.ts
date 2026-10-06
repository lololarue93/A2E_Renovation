import assert from "node:assert/strict";
import { priceItems, detailedPriceKeys } from "../src/lib/pricing/price-data";

type Row = Record<string, unknown>;
type Upsert = { where: { key: string }; update: Row; create: Row };
type Store = { prices: Map<string, Row>; created: string[]; calls: string[]; complete: () => void };

async function main() {
  const detailed = new Set(detailedPriceKeys);
  assert.equal(detailed.size, 25);
  const initialKeys = priceItems.filter(item => !detailed.has(item.key)).map(item => item.key);
  assert.equal(initialKeys.length, 55);
  // Replace the constructor before loading bootstrap. No real client is instantiated,
  // even when CI has a DATABASE_URL for its separate migration checks.
  const clientPath = require.resolve("@prisma/client");
  const clientExports = require("@prisma/client");
  const clientModule = require.cache[clientPath]!;
  const bootstrapPath = require.resolve("../docker/bootstrap.ts");
  const adminEmail = process.env.ADMIN_EMAIL, adminPassword = process.env.ADMIN_PASSWORD;
  let pending: Store;
  let constructors = 0;
  class MemoryClient {
    store: Store;
    constructor() { this.store = pending; constructors++; }
    user = { findUnique: async () => ({ id: "fixture-existing-admin" }) };
    priceItem = { upsert: async (args: Upsert) => {
      assert.deepEqual(args.update, {}, "Les tarifs entreprise existants ne doivent recevoir aucune modification");
      assert.ok(!detailed.has(args.where.key), "Une nouvelle hypothese detaillee ne doit pas etre activee automatiquement");
      assert.equal(args.where.key, args.create.key);
      this.store.calls.push(args.where.key);
      const existing = this.store.prices.get(args.where.key);
      if (existing) return existing;
      const created = { ...args.create }; this.store.prices.set(args.where.key, created); this.store.created.push(args.where.key); return created;
    } };
    pricingSettings = { upsert: async (args: Upsert) => { assert.deepEqual(args.update, {}, "Les coefficients existants sont preserves"); return { key: args.where.key, value: "fixture-existing-coefficients" }; } };
    siteSettings = { upsert: async (args: Upsert) => { assert.deepEqual(args.update, {}, "Les reglages existants sont preserves"); return { key: args.where.key, value: "fixture-existing-company" }; } };
    $disconnect = async () => { this.store.complete(); };
  }
  async function run(prices: Map<string, Row>) {
    let complete!: () => void;
    const completed = new Promise<void>(resolve => { complete = resolve; });
    const store: Store = { prices, calls: [], created: [], complete }; pending = store;
    delete require.cache[bootstrapPath];
    require(bootstrapPath);
    await completed;
    assert.deepEqual([...store.calls].sort(), [...initialKeys].sort());
    return store;
  }
  try {
    clientModule.exports = { ...clientExports, PrismaClient: MemoryClient };
    process.env.ADMIN_EMAIL = "admin@example.test";
    process.env.ADMIN_PASSWORD = "fixture-only-strong-password";
    const fresh = await run(new Map());
    assert.equal(fresh.created.length, 55); assert.equal(fresh.prices.size, 55);
    assert.ok(detailedPriceKeys.every(key => !fresh.prices.has(key)));

    const companyPrice = { key: "window_pvc", low: 311.25, mid: 477.5, high: 599.75, reference: "Entreprise validee", active: false };
    const secondPrice = { key: "electric_point", low: 175, mid: 215.75, high: 299, description: "Perimetre entreprise existant" };
    const customPrice = { key: "company_custom_fixture", low: 99, mid: 120, high: 150 };
    const reviewedDetail = { key: detailedPriceKeys[0], low: 250, mid: 300, high: 400, active: false };
    const existing = [companyPrice, secondPrice, customPrice, reviewedDetail];
    const prices = new Map(existing.map(item => [item.key, { ...item }]));
    const upgraded = await run(prices);
    assert.equal(upgraded.created.length, 53, "Seuls les tarifs initiaux manquants sont ajoutes");
    for (const item of existing) assert.deepEqual(prices.get(item.key), item, "Prix, reference, origine personnalisee et activation preserves");
    assert.ok(upgraded.created.every(key => !detailed.has(key)));
    const snapshot = [...prices.entries()];
    const repeated = await run(prices);
    assert.equal(repeated.created.length, 0, "Relancer le bootstrap ne recree ni ne modifie les tarifs");
    assert.deepEqual([...prices.entries()], snapshot);
    assert.equal(constructors, 3, "Tous les appels utilisent le client en memoire");
  } finally {
    clientModule.exports = clientExports; delete require.cache[bootstrapPath];
    if (adminEmail === undefined) delete process.env.ADMIN_EMAIL; else process.env.ADMIN_EMAIL = adminEmail;
    if (adminPassword === undefined) delete process.env.ADMIN_PASSWORD; else process.env.ADMIN_PASSWORD = adminPassword;
  }
  console.log("PASS : bootstrap55references, creation seulement manquants, preservation tarifs/reglages/activation,25hypotheses exclues et relance idempotente. Client Prisma double ; aucun acces SQL ou reseau.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
