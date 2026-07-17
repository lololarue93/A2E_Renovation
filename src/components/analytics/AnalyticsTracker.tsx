"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function getSessionId() {
  const key = "a2e-session-id";
  try {
    const current = window.sessionStorage.getItem(key);
    if (current) return current;
  } catch {
    // Private browsing modes can disable sessionStorage.
  }
  const value = typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : `a2e-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Analytics must never prevent the site from rendering.
  }
  return value;
}

function track(event: string, label?: string) {
  try {
    const payload = JSON.stringify({ event, label, path: window.location.pathname, sessionId: getSessionId() });
    if (navigator.sendBeacon) {
      const accepted = navigator.sendBeacon("/api/analytics", new Blob([payload], { type: "application/json" }));
      if (accepted) return;
    }
    void fetch("/api/analytics", { method: "POST", headers: { "content-type": "application/json" }, body: payload, keepalive: true }).catch(() => undefined);
  } catch {
    // Tracking is optional and must remain isolated from the user journey.
  }
}

export function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    track("page_view");
  }, [pathname]);

  useEffect(() => {
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
