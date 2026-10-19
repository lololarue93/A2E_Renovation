export const adminRoles = ["admin", "associate", "secretary", "auditor"] as const;
export type AdminRole = typeof adminRoles[number];
export const roleLabels: Record<AdminRole, string> = { admin: "Administrateur", associate: "Associé", secretary: "Secrétariat", auditor: "Auditeur" };
export const permissions = ["dashboard:read", "crm:read", "crm:write", "quotes:read", "quotes:write", "pricing:read", "pricing:write", "gallery:read", "gallery:write", "reviews:read", "reviews:write", "settings:read", "settings:write", "connectors:manage", "users:manage", "audit:read", "mail:read", "mail:send", "mail:manage"] as const;
export type Permission = typeof permissions[number];
const reads: Permission[] = ["dashboard:read", "crm:read", "quotes:read", "pricing:read", "gallery:read", "reviews:read", "audit:read", "mail:read"];
const grants: Record<AdminRole, readonly Permission[]> = {
  admin: permissions,
  associate: [...reads, "crm:write", "quotes:write", "pricing:write", "gallery:write", "reviews:write", "mail:send"],
  secretary: [...reads, "crm:write", "quotes:write", "gallery:write", "mail:send"],
  auditor: reads
};
export function isAdminRole(value: unknown): value is AdminRole { return typeof value === "string" && adminRoles.includes(value as AdminRole); }
export function hasPermission(role: AdminRole, permission: Permission) { return !!grants[role]?.includes(permission); }
export function permissionsFor(role: AdminRole): Permission[] { return [...grants[role]]; }
/** Unknown resources are denied to non-administrators instead of silently granting a new endpoint. */
export function permissionForRequest(request: Request): Permission | null {
  const path = new URL(request.url).pathname;
  const write = !["GET", "HEAD", "OPTIONS"].includes(request.method);
  if (/^\/api\/admin\/users(?:\/|$)/.test(path)) return "users:manage";
  if (/^\/api\/admin\/settings(?:\/|$)/.test(path)) return write ? "settings:write" : "settings:read";
  if (/^\/api\/admin\/notifications(?:\/|$)/.test(path)) return "mail:read";
  if (/^\/api\/admin\/pricing(?:\/|$)/.test(path)) return write ? "pricing:write" : "pricing:read";
  if (path === "/api/admin/cotations/export") return "quotes:read";
  if (/^\/api\/admin\/cotations(?:\/|$)/.test(path)) return write ? "quotes:write" : "quotes:read";
  if (/^\/api\/admin\/(leads|export\/leads)(?:\/|$)/.test(path)) return write ? "crm:write" : "crm:read";
  if (/^\/api\/admin\/(realisations|media)(?:\/|$)/.test(path)) return write ? "gallery:write" : "gallery:read";
  if (/^\/api\/admin\/reviews(?:\/|$)/.test(path)) return write ? "reviews:write" : "reviews:read";
  if (path === "/api/admin/export/report") return "audit:read";
  return null;
}
