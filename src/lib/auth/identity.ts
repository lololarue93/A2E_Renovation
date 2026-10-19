import { prisma } from "@/lib/db/prisma";
import { adminConfig, adminSessionKey, basicCredentials } from "./admin-session-shared";
import { requestAdminSession, validAdminSession, readDatabaseSession, sameCredential } from "./admin-session";
import { isAdminRole, permissionsFor, type AdminRole, type Permission } from "./permissions";
export type AdminIdentity = { id: string | null; email: string; name: string; role: AdminRole; source: "database" | "environment"; permissions: Permission[] };
export function environmentIdentity(): AdminIdentity | null {
  const config = adminConfig();
  return config ? { id: null, email: config.email, name: "Compte principal", role: "admin", source: "environment", permissions: permissionsFor("admin") } : null;
}
export async function getServerIdentity(token: string | undefined): Promise<AdminIdentity | null> {
  const session = readDatabaseSession(token);
  if (session) {
    if (!process.env.DATABASE_URL) return null;
    try {
      const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, email: true, name: true, role: true, active: true, sessionVersion: true } });
      if (!user || !user.active || user.sessionVersion !== session.version || !isAdminRole(user.role)) return null;
      return { id: user.id, email: user.email, name: user.name || user.email, role: user.role, source: "database", permissions: permissionsFor(user.role) };
    } catch { return null; }
  }
  return validAdminSession(token) ? environmentIdentity() : null;
}
const requestIdentities = new WeakMap<Request, { key: string | null; value: Promise<AdminIdentity | null> }>();
export function getRequestIdentity(request: Request): Promise<AdminIdentity | null> {
  const key = adminSessionKey(), cached = requestIdentities.get(request); if (cached && cached.key === key) return cached.value;
  const resolve = async () => {
    const basic = basicCredentials(request), config = adminConfig();
    if (basic && config && sameCredential(basic.email, config.email) && sameCredential(basic.password, config.password)) return environmentIdentity();
    return getServerIdentity(requestAdminSession(request));
  };
  const pending = resolve(); requestIdentities.set(request, { key, value: pending }); return pending;
}
export async function getRequestActor(request: Request) { return (await getRequestIdentity(request))?.email ?? null; }
