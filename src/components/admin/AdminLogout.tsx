"use client";
import { useState } from "react";

export function AdminLogout() {
  const [pending, setPending] = useState(false), [error, setError] = useState(false);
  async function logout() {
    setPending(true); setError(false);
    try {
      const response = await fetch("/api/auth/admin", { method: "DELETE" });
      if (!response.ok) throw new Error();
      window.location.assign("/admin/connexion");
    } catch { setError(true); setPending(false); }
  }
  return <div><button type="button" onClick={logout} disabled={pending} className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4">{pending ? "Déconnexion…" : "Se déconnecter"}</button>{error && <p role="alert" className="text-sm text-red-800">Déconnexion impossible. Réessayez.</p>}</div>;
}
