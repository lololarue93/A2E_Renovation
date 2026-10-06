export const ANALYTICS_CONSENT_KEY = "a2e-analytics-consent";
export const ANALYTICS_SESSION_KEY = "a2e-session-id";
export const ANALYTICS_CONSENT_EVENT = "a2e:analytics-consent-changed";
export const ANALYTICS_PREFERENCES_EVENT = "a2e:analytics-preferences-open";
export type AnalyticsPreference = { choice: "accepted" | "refused"; decidedAt: string };
let blockedForCurrentPage = false;

export function analyticsPreferenceExpiresAt(decidedAt: Date) {
  const expiry = new Date(decidedAt);
  const day = expiry.getUTCDate();
  expiry.setUTCDate(1); expiry.setUTCMonth(expiry.getUTCMonth() + 6);
  const lastDay = new Date(Date.UTC(expiry.getUTCFullYear(), expiry.getUTCMonth() + 1, 0)).getUTCDate();
  expiry.setUTCDate(Math.min(day, lastDay));
  return expiry;
}

export function parseAnalyticsPreference(raw: string | null, now = new Date()): AnalyticsPreference | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object" || !["accepted", "refused"].includes(value.choice) || typeof value.decidedAt !== "string") return null;
    const decidedAt = new Date(value.decidedAt);
    if (!Number.isFinite(decidedAt.getTime()) || decidedAt > now || analyticsPreferenceExpiresAt(decidedAt) <= now) return null;
    return { choice: value.choice, decidedAt: decidedAt.toISOString() };
  } catch { return null; }
}

export function clearAnalyticsSession() {
  if (typeof window === "undefined") return;
  try { window.sessionStorage.removeItem(ANALYTICS_SESSION_KEY); } catch { /* Storage can be disabled. */ }
}

export function readAnalyticsPreference(now = new Date()) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
    const preference = parseAnalyticsPreference(raw, now);
    if (!preference) { if (raw) window.localStorage.removeItem(ANALYTICS_CONSENT_KEY); clearAnalyticsSession(); }
    return preference;
  } catch { clearAnalyticsSession(); return null; }
}

export function setAnalyticsPreference(choice: AnalyticsPreference["choice"], now = new Date()) {
  if (typeof window === "undefined") return false;
  if (choice === "refused") { blockedForCurrentPage = true; clearAnalyticsSession(); }
  let saved = false;
  try { window.localStorage.setItem(ANALYTICS_CONSENT_KEY, JSON.stringify({ choice, decidedAt: now.toISOString() })); saved = true; blockedForCurrentPage = choice !== "accepted"; }
  catch { blockedForCurrentPage = true; clearAnalyticsSession(); }
  window.dispatchEvent(new Event(ANALYTICS_CONSENT_EVENT));
  return saved;
}

export function hasAnalyticsConsent() { return !blockedForCurrentPage && readAnalyticsPreference()?.choice === "accepted"; }

export const CLIENT_ANALYTICS_EVENTS = ["page_view", "cta_click", "phone_click", "quote_started", "quote_step_viewed", "pdf_downloaded", "gallery_opened", "gallery_comparison_used", "gallery_estimate_clicked"] as const;
export type ClientAnalyticsEvent = typeof CLIENT_ANALYTICS_EVENTS[number];
export function isClientAnalyticsEvent(event: string): event is ClientAnalyticsEvent { return (CLIENT_ANALYTICS_EVENTS as readonly string[]).includes(event); }
export function isAnalyticsSessionId(value: unknown): value is string {
  return typeof value === "string" && (/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) || /^a2e-\d{13}-[a-z0-9]{10}$/.test(value));
}

// Store route families, never query strings, project references or dynamic identifiers.
export function safeAnalyticsPath(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 240 || value.includes("?") || value.includes("#")) return undefined;
  if (["/", "/tarifs", "/realisations", "/politique-confidentialite", "/aides", "/services", "/mentions-legales", "/simulateur", "/contact", "/equipe", "/local"].includes(value)) return value;
  if (/^\/services\/[a-z0-9-]+\/?$/.test(value)) return "/services";
  if (/^\/local\/[a-z0-9-]+\/?$/.test(value)) return "/local";
  return undefined;
}

export function validAnalyticsLabel(event: string, label: unknown) {
  if (event === "quote_step_viewed") return typeof label === "string" && ["selection", "details", "budget", "contact"].includes(label);
  if (event.startsWith("gallery_")) return label === "published" || label === "inspiration";
  return true;
}

export function safeAnalyticsLabel(event: string, label?: string) {
  if (event === "quote_step_viewed" || event.startsWith("gallery_")) return validAnalyticsLabel(event, label) ? label : undefined;
  if (event === "lead_submitted") return label === "contact" ? "contact" : "simulateur";
  if (event === "page_view") return undefined;
  if (event === "phone_click") return "Appel A2E";
  if (event === "quote_started") return "Premier choix simulateur";
  if (event === "pdf_downloaded") return "Pre-devis telecharge";
  if (event === "cta_click") {
    if (/^R[eé]seau - (Instagram|Facebook|LinkedIn)$/.test(label ?? "")) return label;
    if (label?.startsWith("Tarif - ")) return "Tarifs vers simulateur";
    if (label?.startsWith("Expertise - ")) return "Expertise vers simulateur";
    if (label === "Contact - Email") return "Contact email";
    return "Navigation vers projet";
  }
  return undefined;
}
