import type { ReactNode } from "react";

export function AdminPermissionPanel({ children, editable }: { children: ReactNode; editable: boolean }) {
  if (editable) return <>{children}</>;
  return <div><p role="status" className="mb-4 rounded-lg border border-navy/15 bg-white px-4 py-3 text-sm text-ink/70">Votre compte dispose d’un accès en lecture seule à cette rubrique.</p><fieldset disabled className="min-w-0"><legend className="sr-only">Contenu en lecture seule</legend>{children}</fieldset></div>;
}
