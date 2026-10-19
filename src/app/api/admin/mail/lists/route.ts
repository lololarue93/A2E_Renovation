import { requireAdmin, getRequestActor } from "@/lib/auth/require-admin";
import { listsInputSchema, mailListsView, saveMailLists } from "@/lib/email/mail-store";
import { mailApiError, mailJson, readMailBody } from "@/lib/email/mail-api";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const denied = await requireAdmin(request, "mail:read"); if (denied) return denied;
  try { return mailJson(await mailListsView()); } catch (error) { return mailApiError(error); }
}
export async function PUT(request: Request) {
  const denied = await requireAdmin(request, "mail:send"); if (denied) return denied;
  try {
    const parsed = listsInputSchema.safeParse(await readMailBody(request, 800000));
    if (!parsed.success) return mailJson({ error: "Verifiez les listes, les adresses et la selection de listes equipe pour les notifications." }, 400);
    return mailJson({ ok: true, ...await saveMailLists(parsed.data, await getRequestActor(request)) });
  } catch (error) { return mailApiError(error); }
}
