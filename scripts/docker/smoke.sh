#!/usr/bin/env bash
set -Eeuo pipefail

# Disposable verification deployment. It cannot reuse the production container names.
[[ ${A2E_SMOKE_TEST:-0} == 1 ]] || { printf 'Set A2E_SMOKE_TEST=1 to run the isolated Docker verification stack.\n' >&2; exit 1; }
command -v docker >/dev/null
docker info >/dev/null
for name in a2e-test-web a2e-test-postgres; do
  if docker inspect "$name" >/dev/null 2>&1; then printf 'Existing test container %s must be reviewed first.\n' "$name" >&2; exit 1; fi
done
project="a2e-verification-$(date -u +%Y%m%d%H%M%S)-$$"
export A2E_IMAGE_TAG=local A2E_PORT=${A2E_TEST_PORT:-3100} A2E_BIND_ADDRESS=127.0.0.1
export POSTGRES_DB=a2e_renovation POSTGRES_USER=a2e POSTGRES_PASSWORD=a2e-smoke-private-password
export DATABASE_URL='postgresql://a2e:a2e-smoke-private-password@postgres:5432/a2e_renovation?schema=public'
export NEXT_PUBLIC_SITE_URL="http://127.0.0.1:$A2E_PORT" ADMIN_EMAIL=smoke@example.invalid
export ADMIN_PASSWORD=a2e-smoke-admin-password AUTH_SECRET=a2e-smoke-auth-secret-not-for-production
# Do not inherit real notification credentials from a workstation .env.
export BREVO_API_KEY= BREVO_SENDER_EMAIL= SMTP_USER= SMTP_PASSWORD= TELEGRAM_BOT_TOKEN= TELEGRAM_CHAT_ID=
export TELEGRAM_LEADS_ENABLED=false
compose=(docker compose -p "$project" -f docker-compose.yml -f docker-compose.local.yml)
restore_verifier=
cleanup() {
  result=$?
  trap - EXIT
  if [[ -n $restore_verifier ]]; then docker rm -f "$restore_verifier" >/dev/null 2>&1 || true; fi
  "${compose[@]}" down >/dev/null 2>&1 || true
  printf 'Verification volumes retained under prefix %s for inspection; production volumes untouched.\n' "$project"
  exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
if [[ ${A2E_SMOKE_SKIP_BUILD:-0} != 1 ]]; then "${compose[@]}" build web; fi
"${compose[@]}" up -d --wait --wait-timeout 180
"${compose[@]}" exec -T web node <<'NODE'
require('tsx/cjs');
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const { writeFile } = require('node:fs/promises');
const { createHash } = require('node:crypto');
const { detailedPriceKeys } = require('/app/src/lib/pricing/price-data.ts');
const prisma = new PrismaClient();
(async () => {
  assert.equal(await prisma.priceItem.count({ where: { key: { in: detailedPriceKeys } } }), 0, 'Bootstrap must not activate unreviewed detailed rates');
  const price = await prisma.priceItem.findFirst({ orderBy: { key: 'asc' } });
  if (!price) throw new Error('No catalogue initialized');
  const authorization = 'Basic ' + Buffer.from(process.env.ADMIN_EMAIL + ':' + process.env.ADMIN_PASSWORD).toString('base64');
  const edited = { key: price.key, category: price.category, label: price.label, unit: price.unit, low: 17.5, mid: 27.5, high: 37.5, vatRate: price.vatRate, reference: price.reference ?? '', description: price.description ?? '' };
  const mutation = await fetch('http://127.0.0.1:3000/api/admin/pricing', { method: 'PUT', headers: { authorization, 'content-type': 'application/json' }, body: JSON.stringify(edited) });
  if (mutation.status !== 200) throw new Error('Admin centime price update failed; apply the Float migration first');
  const updated = (await mutation.json()).item;
  for (const field of ['low', 'mid', 'high']) if (updated[field] !== edited[field]) throw new Error('Admin update rounded a centime unit price');
  for (const endpoint of ['/api/admin/pricing', '/api/pricing']) {
    const response = await fetch('http://127.0.0.1:3000' + endpoint, { headers: { authorization } });
    if (!response.ok) throw new Error('Updated catalogue reread failed');
    const result = await response.json();
    const reread = (Array.isArray(result) ? result : result.items).find(item => item.key === price.key);
    if (!reread || ['low', 'mid', 'high'].some(field => reread[field] !== edited[field])) throw new Error('Centime unit prices did not survive API reread');
  }
  const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nU8AAAAASUVORK5CYII=', 'base64');
  await writeFile('/app/public/uploads/00000000-0000-4000-8000-000000000001.png', image);
  const response = await fetch('http://127.0.0.1:3000/uploads/00000000-0000-4000-8000-000000000001.png');
  if (!response.ok || Buffer.from(await response.arrayBuffer()).compare(image)) throw new Error('Post-start upload serving failed');
  const range = await fetch('http://127.0.0.1:3000/uploads/00000000-0000-4000-8000-000000000001.png', { headers: { Range: 'bytes=0-7' } });
  if (range.status !== 206 || (await range.arrayBuffer()).byteLength !== 8) throw new Error('Media range request failed');
  const unauthorized = await fetch('http://127.0.0.1:3000/api/admin/pricing');
  if (unauthorized.status !== 401) throw new Error('Admin must refuse unauthorized access');
  await prisma.siteSettings.upsert({ where: { key: 'notifications' }, update: { value: { provider: 'brevo', recipients: ['smoke@example.invalid'], events: { leadCreated: true, pdfGenerated: true, mediaUploaded: false, securityAlert: false }, telegramEnabled: false, trackingEnabled: true, signatureDiscountPercent: 0, signatureWindowDays: 15 } }, create: { key: 'notifications', value: { provider: 'brevo', recipients: ['smoke@example.invalid'], events: { leadCreated: true, pdfGenerated: true, mediaUploaded: false, securityAlert: false }, telegramEnabled: false, trackingEnabled: true, signatureDiscountPercent: 0, signatureWindowDays: 15 } } });
  const payload = { name: 'Docker verification', email: 'client@example.invalid', phone: '0100000000', consent: true, input: { projectType: 'insulation', city: 'Paris', postalCode: '75010', surface: 12, insulationFinish: 'render', insulationMaterial: 'pse', finish: 'standard', urgency: 'normal', access: 'simple' }, result: { low: 1, mid: 1, high: 1, duration: 'forged', complexity: 'simple', maturityScore: 0, lines: [], assumptions: [] } };
  const leadResponse = await fetch('http://127.0.0.1:3000/api/leads', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  if (leadResponse.status !== 200) throw new Error('Real lead endpoint failed');
  const submitted = await leadResponse.json();
  const stored = await prisma.estimate.findUnique({ where: { id: submitted.estimateId }, include: { lead: true, lines: true } });
  const item = await prisma.priceItem.findUnique({ where: { key: 'ite_pse' } });
  if (!stored || !item || stored.mid !== Math.round(item.mid * 12) || stored.mid === 1 || stored.mid !== submitted.result.mid || !stored.lines.length || stored.lead?.name !== payload.name) throw new Error('Server did not recompute and persist the lead estimate');
  const { PDFDocument } = require('pdf-lib');
  for (let attempt = 0; attempt < 2; attempt++) {
    const pdf = await fetch('http://127.0.0.1:3000/api/estimate/pdf?estimateId=' + stored.id);
    if (!pdf.ok || !pdf.headers.get('content-type')?.includes('application/pdf')) throw new Error('Persisted estimate PDF endpoint failed');
    const document = await PDFDocument.load(new Uint8Array(await pdf.arrayBuffer()));
    if (document.getPageCount() < 1) throw new Error('Persisted estimate PDF invalid');
  }
  const notificationAttempts = await prisma.webhookEvent.findMany({ where: { id: { in: ['notification-leadCreated-' + stored.id, 'notification-pdfGenerated-' + stored.id] } } });
  if (notificationAttempts.length !== 2 || notificationAttempts.some(event => event.status !== 'failed')) throw new Error('Notification attempts duplicated or external credentials inherited');
  const crmUrl = 'http://127.0.0.1:3000/api/admin/leads';
  const crmHeaders = { authorization, 'content-type': 'application/json' };
  const crmPayload = { requestId: '00000000-0000-4000-8000-000000000002', contact: { name: '', company: 'Docker CRM verification', email: '', phone: '0100000000', city: 'Paris', typeProjet: 'Isolation', sourceLead: 'manual', budget: null, consent: false }, nextAction: 'Appeler pour cadrer le projet', nextActionDate: '2026-10-06', note: 'Note de verification locale.' };
  for (const method of ['GET', 'POST', 'PATCH']) {
    assert.equal((await fetch(crmUrl, { method })).status, 401, 'CRM must reject unauthorized requests');
  }
  const effectCounts = await Promise.all([prisma.webhookEvent.count(), prisma.siteEvent.count()]);
  const createdCrm = await fetch(crmUrl, { method: 'POST', headers: crmHeaders, body: JSON.stringify(crmPayload) });
  assert.equal(createdCrm.status, 201, 'Real CRM creation or migration failed');
  const crm = (await createdCrm.json()).lead;
  assert.equal((await fetch(crmUrl, { method: 'POST', headers: crmHeaders, body: JSON.stringify(crmPayload) })).status, 200, 'CRM creation must remain idempotent');
  assert.equal((await fetch(crmUrl, { method: 'POST', headers: crmHeaders, body: JSON.stringify({ ...crmPayload, note: 'Changed retry must conflict' }) })).status, 409);
  const crmPatch = { id: crm.id, status: 'a_rappeler', previousStatus: 'nouveau', expectedVersion: 0, nextAction: 'Organiser une visite', nextActionDate: '2026-10-08', activity: { kind: 'call', note: 'Appel declare par operateur.', occurredAt: new Date().toISOString() } };
  assert.equal((await fetch(crmUrl, { method: 'PATCH', headers: crmHeaders, body: JSON.stringify(crmPatch) })).status, 200, 'CRM update failed');
  assert.equal((await fetch(crmUrl, { method: 'PATCH', headers: crmHeaders, body: JSON.stringify(crmPatch) })).status, 409, 'CRM stale version must be rejected');
  const crmReread = await fetch(crmUrl + '?id=' + crm.id + '&consent=all', { headers: crmHeaders });
  assert.equal(crmReread.status, 200);
  const crmResult = await crmReread.json();
  assert.equal(crmResult.total, 1);
  const rereadCrm = crmResult.leads[0];
  assert.equal(rereadCrm.name, crmPayload.contact.company);
  assert.equal(rereadCrm.consent, false);
  assert.equal(rereadCrm.status, 'a_rappeler');
  assert.equal(rereadCrm.crmVersion, 1);
  assert.equal(rereadCrm.nextActionAt, '2026-10-07T22:00:00.000Z');
  assert.equal(rereadCrm.activities.length, 2, 'CRM retry must not duplicate activities');
  assert.ok(rereadCrm.activities.some(activity => activity.kind === 'call' && activity.note === crmPatch.activity.note));
  assert.deepEqual(await Promise.all([prisma.webhookEvent.count(), prisma.siteEvent.count()]), effectCounts, 'Manual CRM must not trigger notifications or analytics');
  await writeFile('/app/public/uploads/a2e-verification.json', JSON.stringify({ price: { key: price.key, low: edited.low, mid: edited.mid, high: edited.high }, detailedPriceKeys, crm: { id: crm.id, status: rereadCrm.status, crmVersion: rereadCrm.crmVersion, activities: rereadCrm.activities.length }, estimate: { id: stored.id, mid: stored.mid, lines: stored.lines.length }, image: { name: '00000000-0000-4000-8000-000000000001.png', sha256: createHash('sha256').update(image).digest('hex') } }));
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
NODE
"${compose[@]}" run --rm --no-deps migrate
"${compose[@]}" restart web
ready=0
for ((attempt=0; attempt<60; attempt++)); do
  if "${compose[@]}" exec -T web node -e "fetch('http://127.0.0.1:3000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))" >/dev/null 2>&1; then ready=1; break; fi
  sleep 1
done
[[ $ready == 1 ]]
"${compose[@]}" exec -T web node <<'NODE'
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const { readFile } = require('node:fs/promises');
const { createHash } = require('node:crypto');
const prisma = new PrismaClient();
(async () => {
  const marker = JSON.parse(await readFile('/app/public/uploads/a2e-verification.json', 'utf8'));
  assert.equal(await prisma.priceItem.count({ where: { key: { in: marker.detailedPriceKeys } } }), 0, 'Restart must preserve manual activation of detailed rates');
  const price = await prisma.priceItem.findUnique({ where: { key: marker.price.key } });
  if (!price || ['low', 'mid', 'high'].some(field => price[field] !== marker.price[field])) throw new Error('Bootstrap or restart changed centime unit prices');
  const authorization = 'Basic ' + Buffer.from(process.env.ADMIN_EMAIL + ':' + process.env.ADMIN_PASSWORD).toString('base64');
  const response = await fetch('http://127.0.0.1:3000/api/admin/pricing', { headers: { authorization } });
  if (!response.ok) throw new Error('Post-restart catalogue reread failed');
  const reread = (await response.json()).items.find(item => item.key === marker.price.key);
  if (!reread || ['low', 'mid', 'high'].some(field => reread[field] !== marker.price[field])) throw new Error('Post-restart API changed centime unit prices');
  const crmResponse = await fetch('http://127.0.0.1:3000/api/admin/leads?id=' + marker.crm.id + '&consent=all', { headers: { authorization } });
  assert.equal(crmResponse.status, 200, 'Post-restart CRM reread failed');
  const crm = (await crmResponse.json()).leads[0];
  assert.equal(crm.status, marker.crm.status);
  assert.equal(crm.crmVersion, marker.crm.crmVersion);
  assert.equal(crm.activities.length, marker.crm.activities);
  const image = await readFile('/app/public/uploads/' + marker.image.name);
  if (createHash('sha256').update(image).digest('hex') !== marker.image.sha256) throw new Error('Media bytes changed after restart');
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
NODE
export A2E_WEB_CONTAINER=a2e-test-web A2E_DB_CONTAINER=a2e-test-postgres
export A2E_BACKUP_ROOT
A2E_BACKUP_ROOT=$(mktemp -d /tmp/a2e-docker-backup-XXXXXX)
bash scripts/docker/backup.sh
backups=("$A2E_BACKUP_ROOT"/*)
[[ ${#backups[@]} == 1 ]]
export RESTORE_POSTGRES_PASSWORD=$POSTGRES_PASSWORD
bash scripts/docker/restore-new-volumes.sh "${backups[0]}" "${project}_restored_postgres" "${project}_restored_media"
database_image=$(docker inspect --format '{{.Image}}' "$A2E_DB_CONTAINER")
web_image=$(docker inspect --format '{{.Image}}' "$A2E_WEB_CONTAINER")
restore_candidate="${project}-restore-check"
if docker inspect "$restore_candidate" >/dev/null 2>&1; then printf 'Unexpected restore verification container exists.\n' >&2; exit 1; fi
restore_verifier=$restore_candidate
docker run -d --name "$restore_verifier" --network none --env POSTGRES_PASSWORD --env POSTGRES_USER --env POSTGRES_DB \
  --mount "type=volume,src=${project}_restored_postgres,dst=/var/lib/postgresql/data" "$database_image" >/dev/null
ready=0
for ((attempt=0; attempt<60; attempt++)); do
  if docker exec "$restore_verifier" sh -ec 'pg_isready -q -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null 2>&1; then ready=1; break; fi
  sleep 1
done
[[ $ready == 1 ]] || { printf 'Restored PostgreSQL did not become ready for content verification.\n' >&2; exit 1; }
docker exec -i "$restore_verifier" sh -ec 'exec psql -X -v ON_ERROR_STOP=1 -At -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <<'SQL' | \
docker run --rm -i --network none --user 1000:1000 --entrypoint node \
  --mount "type=volume,src=${project}_restored_media,dst=/target,readonly" "$web_image" -e '
const assert = require("node:assert/strict");
const fs = require("node:fs");
const crypto = require("node:crypto");
const marker = JSON.parse(fs.readFileSync("/target/a2e-verification.json", "utf8"));
const restored = JSON.parse(fs.readFileSync(0, "utf8"));
for (const field of ["key", "low", "mid", "high"]) assert.equal(restored.price[field], marker.price[field], "Restored price changed: " + field);
assert.equal(restored.priceColumnType, "double precision");
assert.equal(restored.priceMigrationApplied, true);
assert.equal(restored.crmMigrationApplied, true);
assert.equal(restored.prices.filter(item => marker.detailedPriceKeys.includes(item.key)).length, 0, "Unreviewed rates appeared during restore");
const crm = restored.crm.find(item => item.id === marker.crm.id);
assert.ok(crm, "Restored CRM prospect missing");
for (const field of ["status", "crmVersion", "activities"]) assert.equal(crm[field], marker.crm[field], "Restored CRM changed: " + field);
const estimate = restored.estimates.find(item => item.id === marker.estimate.id);
assert.ok(estimate, "Restored lead estimate missing");
assert.equal(estimate.mid, marker.estimate.mid);
assert.equal(estimate.lines, marker.estimate.lines);
const image = fs.readFileSync("/target/" + marker.image.name);
assert.equal(crypto.createHash("sha256").update(image).digest("hex"), marker.image.sha256);
console.log("Restored centime prices, pending rates, CRM activities, migrations, lead estimate and media bytes verified.");
'
SELECT json_build_object(
  'price', (SELECT json_build_object('key', "key", 'low', "low", 'mid', "mid", 'high', "high") FROM "PriceItem" ORDER BY "key" LIMIT 1),
  'prices', (SELECT json_agg(json_build_object('key', "key")) FROM "PriceItem"),
  'crm', (SELECT json_agg(json_build_object('id', l."id", 'status', l."status", 'crmVersion', l."crmVersion", 'activities', (SELECT count(*) FROM "LeadActivity" WHERE "leadId" = l."id"))) FROM "Lead" l WHERE l."sourceLead" = 'manual'),
  'estimates', (SELECT json_agg(json_build_object('id', e."id", 'mid', e."mid", 'lines', (SELECT count(*) FROM "EstimateLine" WHERE "estimateId" = e."id"))) FROM "Estimate" e),
  'priceColumnType', (SELECT data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'PriceItem' AND column_name = 'low'),
  'priceMigrationApplied', EXISTS(SELECT 1 FROM "_prisma_migrations" WHERE migration_name = '20261006180000_price_item_centimes' AND finished_at IS NOT NULL),
  'crmMigrationApplied', EXISTS(SELECT 1 FROM "_prisma_migrations" WHERE migration_name = '20261006223000_lead_crm_followup' AND finished_at IS NOT NULL)
);
SQL
printf 'Docker verification passed: Float/CRM migrations, pending detailed rates, centime admin PUT/GET, CRM create/update/conflict/reload/restart/restore, readiness, permissions, live media bytes, admin rejection, recomputed persisted lead/PDF, notification deduplication and backup.\n'
