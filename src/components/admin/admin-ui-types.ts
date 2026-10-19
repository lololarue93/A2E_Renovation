import type { AdminRole } from "@/lib/auth/permissions";

export type AdminUiIdentity = {
  id: string | null;
  email: string;
  name: string;
  role: AdminRole;
  source: "database" | "environment";
  permissions: readonly string[];
};

export type AdminAccessProps = { identity?: AdminUiIdentity; readOnly?: boolean };
export function allows(identity: AdminUiIdentity | undefined, permission: string) {
  return identity?.permissions.includes(permission) ?? false;
}

export class AdminApiError extends Error {
  constructor(message: string, public status: number) { super(message); this.name = "AdminApiError"; }
}

export async function readAdminJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, credentials: "same-origin", cache: "no-store", headers: { ...(init?.body ? { "content-type": "application/json" } : {}), ...init?.headers } });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const fallback = response.status === 401 ? "Votre session a expiré. Reconnectez-vous avant de continuer." : response.status === 403 ? "Votre compte ne dispose pas de ce droit." : response.status === 409 ? "Les données ont changé. Rechargez la version enregistrée avant de reprendre." : "L’opération n’a pas pu être confirmée. Votre saisie est conservée.";
    throw new AdminApiError(typeof body?.error === "string" ? body.error.slice(0, 500) : fallback, response.status);
  }
  if (!body || typeof body !== "object") throw new AdminApiError("La réponse du serveur est illisible. Rechargez les données avant de réessayer.", 502);
  return body as T;
}

export function adminError(cause: unknown) { return cause instanceof Error ? cause.message : "Connexion interrompue. Votre saisie est conservée."; }
export function parisDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "Date indisponible" : date.toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" });
}
