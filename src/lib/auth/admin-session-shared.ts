export const adminCookieName = "a2e_admin_session";
export const adminSessionSeconds = 8 * 60 * 60;

export function adminConfig() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  return email && password && password !== "change-me" ? { email, password } : null;
}

export function adminSessionKey() {
  const config = adminConfig();
  return config ? JSON.stringify(["a2e-admin-v1", process.env.AUTH_SECRET ?? "", config.email, config.password]) : process.env.AUTH_SECRET || null;
}

export type DatabaseSession = { userId: string; version: number; expires: number; nonce: string };
export function databaseSessionParts(token: string | undefined, now = Date.now()) {
  if (!token || !/^v2\.[a-zA-Z0-9_-]{1,1024}\.[a-f0-9]{64}$/.test(token)) return null;
  const [, encoded, signature] = token.split(".");
  try {
    const value = JSON.parse(atob(encoded.replace(/-/g, "+").replace(/_/g, "/"))) as Partial<DatabaseSession>;
    const remaining = Number(value.expires) - Math.floor(now / 1000);
    if (typeof value.userId !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(value.userId) || !Number.isInteger(value.version) || Number(value.version) < 0 || typeof value.nonce !== "string" || !/^[a-f0-9]{32}$/.test(value.nonce) || !Number.isInteger(value.expires) || remaining <= 0 || remaining > adminSessionSeconds + 60) return null;
    return { payload: `v2.${encoded}`, signature, identity: value as DatabaseSession };
  } catch { return null; }
}

export function sessionParts(token: string | undefined, now = Date.now()) {
  if (!token || !/^\d{10}\.[a-f0-9]{32}\.[a-f0-9]{64}$/.test(token)) return null;
  const [expires, nonce, signature] = token.split(".");
  const remaining = Number(expires) - Math.floor(now / 1000);
  return remaining > 0 && remaining <= adminSessionSeconds + 60 ? { payload: `${expires}.${nonce}`, signature } : null;
}

export function basicCredentials(request: Request) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return null;
  try {
    const value = new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(atob(header.slice(6)), char => char.charCodeAt(0)));
    const separator = value.indexOf(":");
    return separator > 0 ? { email: value.slice(0, separator), password: value.slice(separator + 1) } : null;
  } catch { return null; }
}

export function sameAdminOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !!origin && [new URL(request.url).origin, process.env.NEXT_PUBLIC_SITE_URL].includes(origin);
}

export function safeAdminNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f]/.test(value)) return "/admin";
  const url = new URL(value, "https://a2e.invalid");
  return url.origin === "https://a2e.invalid" && (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) && url.pathname !== "/admin/connexion"
    ? `${url.pathname}${url.search}${url.hash}` : "/admin";
}
