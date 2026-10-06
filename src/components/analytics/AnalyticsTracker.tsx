"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AnalyticsPreferences } from "./AnalyticsPreferences";
import { ANALYTICS_CONSENT_EVENT, ANALYTICS_CONSENT_KEY, ANALYTICS_SESSION_KEY, clearAnalyticsSession, hasAnalyticsConsent, isAnalyticsSessionId, isClientAnalyticsEvent, safeAnalyticsLabel, safeAnalyticsPath, validAnalyticsLabel } from "@/lib/analytics-consent";

export function getSessionId(): string | undefined {
  if (typeof window === "undefined" || window.location.pathname.startsWith("/admin") || !hasAnalyticsConsent()) { clearAnalyticsSession(); return undefined; }
  try {
    const current = window.sessionStorage.getItem(ANALYTICS_SESSION_KEY);
    if (isAnalyticsSessionId(current)) return current;
    const value = typeof globalThis.crypto?.randomUUID === "function" ? globalThis.crypto.randomUUID() : `a2e-${Date.now()}-${Math.random().toString(36).slice(2, 12).padEnd(10, "0")}`;
    window.sessionStorage.setItem(ANALYTICS_SESSION_KEY, value);
    return value;
  } catch { return undefined; }
}

export function track(event: string, label?: string) {
  if (typeof window === "undefined" || window.location.pathname.startsWith("/admin") || !hasAnalyticsConsent()) { clearAnalyticsSession(); return; }
  if (!isClientAnalyticsEvent(event) || !validAnalyticsLabel(event, label)) return;
  try {
    const path = safeAnalyticsPath(window.location.pathname), sessionId = getSessionId();
    if (!path || !sessionId) return;
    const payload = JSON.stringify({ event, label: safeAnalyticsLabel(event, label), path, sessionId, analyticsConsent: true });
    if (navigator.sendBeacon && navigator.sendBeacon("/api/analytics", new Blob([payload], { type: "application/json" }))) return;
    void fetch("/api/analytics", { method: "POST", headers: { "content-type": "application/json" }, body: payload, keepalive: true }).catch(() => undefined);
  } catch { /* Optional measurement must not affect the public journey. */ }
}

export function AnalyticsTracker() {
  const pathname = usePathname();
  useEffect(() => {
    let listening = false;
    let pageTracked = false;
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-track]") : null;
      if (target) track(target.dataset.track ?? "cta_click", target.dataset.trackLabel);
    };
    const sync = () => {
      const permitted = !pathname.startsWith("/admin") && hasAnalyticsConsent();
      if (permitted && !listening) { document.addEventListener("click", onClick, { passive: true }); listening = true; }
      if (!permitted) { if (listening) document.removeEventListener("click", onClick); listening = false; pageTracked = false; clearAnalyticsSession(); }
      else if (!pageTracked) { pageTracked = true; track("page_view"); }
    };
    const storage = (event: StorageEvent) => { if (event.key === ANALYTICS_CONSENT_KEY || event.key === null) sync(); };
    sync(); window.addEventListener(ANALYTICS_CONSENT_EVENT, sync); window.addEventListener("storage", storage);
    const expiryCheck = window.setInterval(sync, 60000);
    return () => { document.removeEventListener("click", onClick); window.removeEventListener(ANALYTICS_CONSENT_EVENT, sync); window.removeEventListener("storage", storage); window.clearInterval(expiryCheck); };
  }, [pathname]);
  return <AnalyticsPreferences />;
}
