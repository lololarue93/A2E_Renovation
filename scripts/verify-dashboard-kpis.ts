import assert from "node:assert/strict";
import { dashboardPeriod, parisDayKey, summarizeDashboardEvents, type DashboardEvent } from "../src/lib/admin/dashboard-metrics";

const period = dashboardPeriod(new Date("2026-10-06T12:00:00Z"));
const event = (name: string, sessionId: string | null, second: number, label?: string, path = "/simulateur"): DashboardEvent => ({ event: name, sessionId, label, path, createdAt: new Date(`2026-10-06T10:00:${String(second).padStart(2, "0")}Z`) });
const events = [
  event("page_view", "a", 1), event("page_view", "a", 2), event("quote_started", "a", 3), event("quote_started", "a", 6), event("quote_step_viewed", "a", 5, "budget"), event("quote_step_viewed", "a", 6, "budget"), event("quote_step_viewed", "a", 7, "contact"), event("lead_submitted", "a", 8, "simulateur"), event("lead_submitted", "a", 9, "simulateur"),
  event("gallery_opened", "a", 2, "published"), event("gallery_opened", "a", 3, "published"), event("gallery_comparison_used", "a", 4, "published"), event("gallery_estimate_clicked", "a", 5, "published"),
  event("page_view", "b", 1), event("quote_started", "b", 2), event("quote_step_viewed", "b", 3, "contact"), event("quote_step_viewed", "b", 4, "budget"), event("lead_submitted", "b", 5, "simulateur"),
  event("quote_started", "c", 1), event("quote_step_viewed", "c", 2, "budget"), event("quote_step_viewed", "c", 3, "contact"), event("lead_submitted", "c", 4, "simulateur"), event("page_view", "c", 10), event("quote_started", "c", 11), event("quote_step_viewed", "c", 12, "budget"), event("quote_step_viewed", "c", 13, "contact"), event("lead_submitted", "c", 14, "simulateur"),
  event("page_view", "direct", 1, undefined, "/contact"), event("lead_submitted", "direct", 2, "contact", "/contact"), event("gallery_opened", "direct", 2, "inspiration"), event("gallery_estimate_clicked", "direct", 3, "inspiration"),
  event("page_view", "card-only", 1, undefined, "/realisations"), event("gallery_estimate_clicked", "card-only", 2, "published"), event("quote_started", "card-only", 3),
  event("quote_started", "isolated", 2), event("quote_step_viewed", "isolated", 3, "budget"), event("quote_step_viewed", "isolated", 4, "contact"), event("lead_submitted", "isolated", 5, "simulateur"),
  event("page_view", null, 20), event("lead_submitted", null, 30), event("gallery_opened", "a", 40, "private-label"), event("page_view", "admin", 1, undefined, "/admin"),
  { ...event("page_view", "past", 1), createdAt: new Date("2026-09-06T10:00:00Z") }
];
const metrics = summarizeDashboardEvents(events.reverse(), period.keys);
assert.deepEqual(metrics.funnel.map((stage) => stage.count), [5, 4, 3, 2, 2], "Ordre strict, deduplication et chemin ulterieur valide apres un evenement premature");
assert.equal(metrics.funnel[1].rate, 80); assert.equal(metrics.funnel[4].rate, 100);
assert.equal(metrics.directContactSessions, 1); assert.equal(metrics.submissionsOutsideFunnel, 2);
assert.equal(metrics.unidentified, 2); assert.equal(metrics.invalidLabels, 1);
assert.deepEqual(metrics.gallery.map((row) => [row.openedSessions, row.comparedSessions, row.estimateClickSessions, row.startedAfterClickSessions]), [[1, 1, 2, 2], [1, 0, 1, 0]], "Clic de carte sans ouverture inclus ; clic sans demarrage distinct ; un nouveau demarrage apres clic est trouve");
assert.equal(metrics.acquisition[29].sessions, 5); assert.equal(metrics.acquisition[29].registered, 2);
assert.equal(metrics.counts.page_view, 7, "Evenements admin et hors periode exclus, doublons et absence de session gardes dans le diagnostic brut");
const empty = summarizeDashboardEvents([], period.keys);
assert.ok(empty.funnel.every((stage) => stage.rate === null)); assert.ok(empty.acquisition.every((point) => point.sessions === 0));
const atParisMidnight = { ...event("page_view", "boundary", 1), createdAt: new Date("2026-10-05T22:00:00Z") };
assert.equal(parisDayKey(atParisMidnight.createdAt), "2026-10-06"); assert.equal(summarizeDashboardEvents([atParisMidnight], period.keys).acquisition[29].sessions, 1);
console.log("PASS : cinq etapes ordonnees, doublons, contacts directs, attribution galerie, periode de Paris et denominateurs absents. Fixtures explicites ; aucune base ni donnee de production.");
