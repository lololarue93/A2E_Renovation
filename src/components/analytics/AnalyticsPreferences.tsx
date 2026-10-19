"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ANALYTICS_CONSENT_EVENT, ANALYTICS_PREFERENCES_EVENT, readAnalyticsPreference, setAnalyticsPreference } from "@/lib/analytics-consent";

export function AnalyticsPreferences() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (pathname.startsWith("/admin")) { setVisible(false); return; }
    const sync = () => setVisible(!readAnalyticsPreference());
    const open = () => { setError(""); setVisible(true); };
    sync(); window.addEventListener(ANALYTICS_CONSENT_EVENT, sync); window.addEventListener(ANALYTICS_PREFERENCES_EVENT, open);
    return () => { window.removeEventListener(ANALYTICS_CONSENT_EVENT, sync); window.removeEventListener(ANALYTICS_PREFERENCES_EVENT, open); };
  }, [pathname]);
  function choose(choice: "accepted" | "refused") {
    if (setAnalyticsPreference(choice)) { setVisible(false); setError(""); }
    else { setVisible(true); setError("Votre navigateur ne peut pas conserver ce choix. La mesure reste desactivee."); }
  }
  if (!visible || pathname.startsWith("/admin")) return null;
  return <section aria-label="Preference de mesure d'audience" className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-4xl border border-navy/20 bg-white p-4 shadow-lg sm:p-5"><div className="grid items-center gap-4 lg:grid-cols-[1fr_auto]"><div><p className="font-semibold text-navy">Autoriser la mesure de votre visite ?</p><p className="mt-1 text-xs leading-6 text-ink/75">Avec votre accord, A2E mesure les pages et les actions pour ameliorer le parcours. Votre choix est conserve 6 mois et peut etre modifie en bas de page. <Link href="/politique-confidentialite" className="underline">En savoir plus</Link>.</p></div><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => choose("refused")} className="min-h-11 border border-navy bg-white px-4 text-sm font-semibold text-navy">Refuser</button><button type="button" onClick={() => choose("accepted")} className="min-h-11 border border-navy bg-white px-4 text-sm font-semibold text-navy">Accepter</button></div></div>{error && <p className="mt-2 text-xs text-ink/70" role="status">{error}</p>}</section>;
}

export function AnalyticsPreferenceButton() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  return <button type="button" onClick={() => window.dispatchEvent(new Event(ANALYTICS_PREFERENCES_EVENT))} className="inline-flex min-h-11 items-center text-xs underline">Preferences de mesure d'audience</button>;
}
