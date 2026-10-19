import Link from "next/link";
import { redirect } from "next/navigation";
import { QuoteWorkspace } from "@/components/admin/QuoteWorkspace";
import { AdminPermissionPanel } from "@/components/admin/AdminPermissionPanel";
import { getAdminPageIdentity } from "@/lib/admin/page-identity";
import { hasPermission } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";
export default async function QuotesPage() {
  const identity = await getAdminPageIdentity();
  if (!identity) redirect("/admin/connexion?next=%2Fadmin%2Fcotations");
  if (!hasPermission(identity.role, "quotes:read")) redirect("/admin");
  return <main className="min-h-screen bg-pearl py-8 sm:py-12"><div className="container"><div className="flex flex-wrap items-center justify-between gap-3"><Link href="/admin" className="text-sm font-semibold text-ink/60">Retour au pilotage</Link>{hasPermission(identity.role, "pricing:read") && <Link href="/admin/prix" className="text-sm font-semibold text-navy underline underline-offset-4">Consulter le catalogue de prix</Link>}</div><div className="mt-7"><p className="text-xs font-semibold uppercase tracking-[.2em] text-champagne">A2E / Atelier de cotation</p><h1 className="mt-3 text-3xl font-semibold tracking-tight text-navy sm:text-4xl">Du metre au chiffrage.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-ink/65">Composez vos postes, ajustez les hypotheses et preparez un document lisible pour votre client. Vos cotations restent indicatives jusqu'a la visite technique.</p></div><AdminPermissionPanel editable={hasPermission(identity.role, "quotes:write")}><QuoteWorkspace /></AdminPermissionPanel></div></main>;
}
