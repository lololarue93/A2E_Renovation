import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { validateQuote } from "@/lib/pricing/quote-workspace";
import { generateWorkspaceQuote } from "@/lib/pdf/generate-workspace-quote";
import { defaultSiteContactSettings, getSiteContactSettings } from "@/lib/settings/site-contact-settings";

export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  if (Number(request.headers.get("content-length")) > 512_000) return NextResponse.json({ error: "Document trop volumineux" }, { status: 413 });
  let quote;
  try {
    quote = validateQuote(await request.json());
    if (!quote.lines.length) throw new Error("Ajoutez au moins un poste avant de generer le PDF.");
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Document invalide" }, { status: 400 }); }
  try {
    const contact = process.env.DATABASE_URL ? await getSiteContactSettings() : defaultSiteContactSettings;
    const bytes = await generateWorkspaceQuote(quote, contact.phone);
    const filename = quote.number.replace(/[^a-zA-Z0-9_-]/g, "_");
    return new NextResponse(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}.pdf"`, "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Le PDF n'a pas pu etre genere. Le brouillon et les exports restent disponibles." }, { status: 500 }); }
}
