import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { adminSessionKey, adminSessionSeconds, sessionParts } from "./admin-session-shared";

export function sameCredential(actual: string, expected: string) {
  const left = Buffer.from(actual), right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createAdminSession(now = Date.now()) {
  const key = adminSessionKey();
  if (!key) throw new Error("Admin not configured");
  const payload = `${Math.floor(now / 1000) + adminSessionSeconds}.${randomBytes(16).toString("hex")}`;
  return `${payload}.${createHmac("sha256", key).update(payload).digest("hex")}`;
}

export function validAdminSession(token: string | undefined, now = Date.now()) {
  const key = adminSessionKey(), parts = sessionParts(token, now);
  return !!key && !!parts && sameCredential(parts.signature, createHmac("sha256", key).update(parts.payload).digest("hex"));
}

export function requestAdminSession(request: Request) {
  return request.headers.get("cookie")?.split(";").map(value => value.trim()).find(value => value.startsWith("a2e_admin_session="))?.slice("a2e_admin_session=".length);
}
