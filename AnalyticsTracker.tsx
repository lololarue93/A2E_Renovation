"use client";

import { useEffect } from "react";

function getSessionId() {
  const key = "a2e-session-id";
  const current = window.sessionStorage.getItem(key);
  if (current) return current;
  const value = crypto.randomUUID();
  window.sessionStorage.setItem(key, value);
  return value;
}

function track(event: string, label?: string) {
  const payload = JSON.stringify({ event, label, path: window.location.pathname, sessionId: getSessionId() });
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/analytics", new Blob([payload], { type: "application/json" }));
    return;
  }
  void fetch("/api/analytics", { method: "POST", headers: { "content-type": "application/json" }, body: payload, keepalive: true });
}

export function AnalyticsTracker() {
  useEffect(() => {
    track("page_view");
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-track]") : null;
      if (!target) return;
      track(target.dataset.track ?? "cta_click", target.dataset.trackLabel ?? target.textContent?.trim().slice(0, 120));
    };
    document.addEventListener("click", onClick, { passive: true });
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}
