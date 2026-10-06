"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDownToLine, Copy, FileText, FolderOpen, Plus, Save, Search, Trash2 } from "lucide-react";
import type { PriceItem } from "@/lib/pricing/price-data";
import { categoryLabels, unitLabels } from "@/lib/pricing/catalog-transfer";
import { calculateQuote, exportQuoteCsv, lineFromCatalog, lineQuantity, newQuote, quoteBasisLabels, quoteStatusLabels, validateQuote, type QuoteDraft, type QuoteLine } from "@/lib/pricing/quote-workspace";
import { downloadFile } from "@/lib/download-file";

const LOCAL_KEY = "a2e.professional-quote.v1";
const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-navy/15 px-4 py-2 text-sm font-semibold text-navy transition hover:bg-navy/5 disabled:cursor-wait disabled:opacity-50";
const euro = (amount: number) => amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
type SavedQuote = Pick<QuoteDraft, "id" | "number" | "client" | "title" | "status" | "basis"> & { total: number; updatedAt: string };

export function QuoteWorkspace() {
  const [quote, setQuote] = useState<QuoteDraft | null>(null);
  const [catalog, setCatalog] = useState<PriceItem[]>([]);
  const [source, setSource] = useState("");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogCategory, setCatalogCategory] = useState("");
  const [showCatalog, setShowCatalog] = useState(false);
  const [saved, setSaved] = useState<SavedQuote[]>([]);
  const [savedError, setSavedError] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("Composez votre premiere cotation depuis le catalogue ou ajoutez un poste libre.");
  const [error, setError] = useState(false);
  const [localError, setLocalError] = useState("");
  const [lastSaved, setLastSaved] = useState("");
  const importFile = useRef<HTMLInputElement>(null);
  const notice = (text: string, failed = false) => { setMessage(text); setError(failed); };

  async function refreshSaved() {
    try {
      const response = await fetch("/api/admin/cotations", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Cotations indisponibles.");
      setSaved(data.quotes); setSavedError("");
    } catch (reason) { setSavedError(reason instanceof Error ? reason.message : "Cotations indisponibles."); }
  }
  useEffect(() => {
    let draft = newQuote();
    try { const previous = localStorage.getItem(LOCAL_KEY); if (previous) { draft = validateQuote(JSON.parse(previous)); notice("Votre brouillon local a ete restaure. Enregistrez-le en base pour le retrouver sur un autre appareil."); } }
    catch { notice("Le precedent brouillon est illisible. Vous pouvez restaurer une sauvegarde JSON.", true); }
    setQuote(draft);
    const leadId = new URLSearchParams(window.location.search).get("lead");
    if (leadId) {
      fetch(`/api/admin/leads?id=${encodeURIComponent(leadId)}&consent=all`, { cache: "no-store" }).then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Dossier client indisponible.");
        const lead = data.leads?.[0];
        if (!lead) throw new Error("Le dossier client n'a pas ete retrouve.");
        if (draft.lines.length && !window.confirm("Ouvrir une nouvelle cotation pour ce dossier client ? Le brouillon local en cours sera remplace.")) return;
        const city = lead.project?.city ?? lead.city ?? "";
        const prepared = validateQuote({ ...newQuote(), title: `Projet ${lead.typeProjet} - ${city}`.slice(0, 160), client: lead.name, email: lead.email, phone: lead.phone, address: [lead.project?.postalCode, city].filter(Boolean).join(" ") });
        setQuote(prepared); setLastSaved("");
        notice(`Coordonnees de ${prepared.client} reprises depuis le dossier. Ajoutez les prestations de la cotation.`);
      }).catch((reason) => notice(reason instanceof Error ? reason.message : "Dossier client indisponible", true));
    }
    fetch("/api/admin/pricing", { cache: "no-store" }).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Catalogue indisponible."); setCatalog(data.items); setSource(data.source); }).catch((reason) => notice(reason.message, true));
    refreshSaved();
  }, []);
  useEffect(() => {
    if (!quote) return;
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(quote)); setLocalError(""); }
    catch { setLocalError("La sauvegarde locale est indisponible. Enregistrez en base ou exportez un JSON avant de quitter."); }
  }, [quote]);

  function change<K extends keyof QuoteDraft>(field: K, value: QuoteDraft[K]) { setQuote((current) => current ? { ...current, [field]: value } : current); }
  function changeLine(id: string, patch: Partial<QuoteLine>) { setQuote((current) => current ? { ...current, lines: current.lines.map((line) => line.id === id ? { ...line, ...patch } : line) } : current); }
  function addLine(item?: PriceItem) {
    if (!quote || quote.lines.length >= 150) { notice("La cotation est limitee a 150 lignes.", true); return; }
    change("lines", [...quote.lines, lineFromCatalog(item)]);
    notice(item ? `${item.label} ajoute au document.` : "Poste libre ajoute. Renseignez le contenu et vos hypotheses de prix.");
  }
  function replaceDraft(next: QuoteDraft, prompt: string) {
    if (quote?.lines.length && JSON.stringify(quote) !== lastSaved && !window.confirm(prompt)) return false;
    setQuote(next); setLastSaved(""); return true;
  }
  async function openSaved(id: string) {
    setBusy("open");
    try {
      const response = await fetch(`/api/admin/cotations?id=${encodeURIComponent(id)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Impossible d'ouvrir cette cotation.");
      const loaded = validateQuote(data.quote);
      if (replaceDraft(loaded, "Remplacer le brouillon en cours ? Exportez-le ou enregistrez-le si vous souhaitez le conserver.")) { setLastSaved(JSON.stringify(loaded)); notice(`Cotation ${loaded.number} chargee depuis la base.`); }
    } catch (reason) { notice(reason instanceof Error ? reason.message : "Chargement impossible", true); }
    finally { setBusy(""); }
  }
  async function save() {
    setBusy("save");
    try {
      const validated = validateQuote(quote);
      const response = await fetch("/api/admin/cotations", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(validated) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Enregistrement impossible.");
      const reloaded = await fetch(`/api/admin/cotations?id=${validated.id}`, { cache: "no-store" });
      const persisted = await reloaded.json();
      if (!reloaded.ok || JSON.stringify(validateQuote(persisted.quote)) !== JSON.stringify(validated)) throw new Error("La relecture du document ne confirme pas la sauvegarde. Votre brouillon local est conserve.");
      setQuote(validated); setLastSaved(JSON.stringify(validated)); notice(`Cotation ${validated.number} enregistree et relue en base.`);
      await refreshSaved();
    } catch (reason) { notice(reason instanceof Error ? reason.message : "Erreur de sauvegarde", true); }
    finally { setBusy(""); }
  }
  async function pdf() {
    setBusy("pdf");
    try {
      const validated = validateQuote(quote);
      const response = await fetch("/api/admin/cotations/export", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(validated) });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error ?? "Generation impossible."); }
      downloadFile(await response.blob(), `${validated.number.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`, "application/pdf");
      notice("PDF genere avec les montants recalcules sur le serveur. Vous pouvez l'imprimer ou le transmettre apres verification.");
    } catch (reason) { notice(reason instanceof Error ? reason.message : "PDF indisponible", true); }
    finally { setBusy(""); }
  }
  function exportDraft(format: "json" | "csv") {
    try {
      const validated = validateQuote(quote);
      downloadFile(format === "json" ? JSON.stringify(validated, null, 2) : exportQuoteCsv(validated), `${validated.number.replace(/[^a-zA-Z0-9_-]/g, "_")}.${format}`, format === "json" ? "application/json" : "text/csv;charset=utf-8");
      notice(format === "json" ? "Sauvegarde JSON exportee. Ce fichier permet de restaurer votre cotation." : "Lignes, hypotheses et totaux exportes en CSV.");
    } catch (reason) { notice(reason instanceof Error ? reason.message : "Export impossible", true); }
  }
  async function importDraft(file?: File) {
    if (!file) return;
    try {
      if (file.size > 512_000) throw new Error("Le fichier depasse 500 Ko.");
      const imported = validateQuote(JSON.parse(await file.text()));
      if (replaceDraft(imported, "Remplacer le brouillon en cours par cette sauvegarde ?")) notice(`Sauvegarde ${imported.number} restauree. Enregistrez-la pour la conserver en base.`);
    } catch (reason) { notice(reason instanceof Error ? reason.message : "Sauvegarde invalide", true); }
    if (importFile.current) importFile.current.value = "";
  }
  if (!quote) return <div className="mt-8 rounded-xl bg-white p-8 text-sm text-ink/60" role="status">Chargement de l'atelier...</div>;
  const result = calculateQuote(quote);
  const validity = (() => { try { validateQuote(quote); return ""; } catch (reason) { return reason instanceof Error ? reason.message : "Document invalide"; } })();
  const visibleCatalog = catalog.filter((item) => (!catalogCategory || item.category === catalogCategory) && `${item.label} ${item.key}`.toLowerCase().includes(catalogSearch.toLowerCase()));
  const dirty = JSON.stringify(quote) !== lastSaved;

  return <div className="mt-8">
    <div className="flex flex-wrap items-center justify-between gap-4 border-y border-navy/10 py-4"><div className="flex flex-wrap items-center gap-3"><span className="inline-flex items-center gap-2 text-sm font-semibold text-navy"><FileText size={17} />{quote.number}</span><span className="rounded-full bg-white px-3 py-1 text-xs text-ink/60">{dirty ? "Brouillon modifie" : "Enregistre en base"}</span></div><div className="flex flex-wrap gap-2"><button type="button" className={button} onClick={() => { const fresh = newQuote(); if (replaceDraft(fresh, "Demarrer une nouvelle cotation ? Le brouillon non enregistre sera remplace.")) notice("Nouvelle cotation creee."); }}><Plus size={16} />Nouvelle cotation</button><button type="button" className={`${button} bg-navy text-white hover:bg-navy/90`} disabled={!!busy || !!validity} onClick={save}><Save size={16} />{busy === "save" ? "Enregistrement..." : "Enregistrer"}</button></div></div>
    <p role={error ? "alert" : "status"} className={`mt-4 rounded-lg px-4 py-3 text-sm ${error ? "bg-red-50 text-red-800" : "bg-white text-navy"}`}>{message}</p>
    {!!localError && <p role="alert" className="mt-3 text-sm text-red-800">{localError}</p>}
    {!!validity && <p role="alert" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">{validity}</p>}
    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_310px]">
      <div className="min-w-0">
        <section className="rounded-xl border border-navy/10 bg-white p-5 sm:p-6"><div className="mb-5 flex items-center justify-between gap-3"><h2 className="font-semibold text-navy">01 / Le dossier</h2><select aria-label="Statut de la cotation" value={quote.status} onChange={(event) => change("status", event.target.value as QuoteDraft["status"])} className="input max-w-[170px] text-sm">{Object.entries(quoteStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Intitule du projet"><input maxLength={160} className="input" value={quote.title} onChange={(event) => change("title", event.target.value)} /></Field><Field label="Numero du document"><input maxLength={60} className="input" value={quote.number} onChange={(event) => change("number", event.target.value)} /></Field><Field label="Client ou entreprise"><input maxLength={160} autoComplete="off" className="input" placeholder="Nom du client" value={quote.client} onChange={(event) => change("client", event.target.value)} /></Field><Field label="Adresse du chantier"><input maxLength={300} autoComplete="off" className="input" placeholder="Adresse, code postal, ville" value={quote.address} onChange={(event) => change("address", event.target.value)} /></Field><Field label="Email"><input type="email" autoComplete="off" className="input" value={quote.email} onChange={(event) => change("email", event.target.value)} /></Field><Field label="Telephone"><input type="tel" maxLength={40} autoComplete="off" className="input" value={quote.phone} onChange={(event) => change("phone", event.target.value)} /></Field></div><details className="mt-5 border-t border-navy/10 pt-4"><summary className="cursor-pointer text-sm font-semibold text-ink/65">Date, validite et base fiscale</summary><div className="mt-4 grid gap-4 sm:grid-cols-3"><Field label="Date du document"><input type="date" className="input" value={quote.date} onChange={(event) => change("date", event.target.value)} /></Field><Field label="Validite (jours)"><input type="number" min="1" max="365" step="1" className="input" value={quote.validityDays} onChange={(event) => change("validityDays", Number(event.target.value))} /></Field><Field label="Base des prix saisis"><select className="input" value={quote.basis} onChange={(event) => change("basis", event.target.value as QuoteDraft["basis"])}>{Object.entries(quoteBasisLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field></div></details></section>
        <section className="mt-5 rounded-xl border border-navy/10 bg-white"><div className="flex flex-wrap items-center justify-between gap-4 border-b border-navy/10 p-5 sm:p-6"><div><h2 className="font-semibold text-navy">02 / Les postes de travaux</h2><p className="mt-1 text-xs text-ink/55">{quote.lines.length} lignes / quantites et prix unitaires modifiables</p></div><div className="flex flex-wrap gap-2"><button type="button" className={button} onClick={() => setShowCatalog(!showCatalog)}><Plus size={16} />Depuis le catalogue</button><button type="button" className={button} onClick={() => addLine()}>Poste libre</button></div></div>
          {showCatalog && <div className="border-b border-navy/10 bg-pearl p-5"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-navy">Choisir une prestation</h3><button type="button" className="min-h-11 px-2 text-xs font-semibold text-ink/60" onClick={() => setShowCatalog(false)}>Fermer</button></div>{source === "demo" && <p className="mb-3 text-xs leading-5 text-ink/65">Catalogue de demonstration : montants indicatifs a verifier avant toute remise au client.</p>}<div className="grid gap-2 sm:grid-cols-[1fr_190px]"><label className="relative"><Search size={16} className="absolute left-3 top-3.5 text-ink/40" /><input className="input pl-10" aria-label="Rechercher une prestation" placeholder="Rechercher une prestation..." value={catalogSearch} onChange={(event) => setCatalogSearch(event.target.value)} /></label><select aria-label="Corps d'etat" className="input" value={catalogCategory} onChange={(event) => setCatalogCategory(event.target.value)}><option value="">Tous les corps d'etat</option>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div className="mt-3 max-h-72 overflow-y-auto divide-y divide-navy/10">{visibleCatalog.map((item) => <button type="button" key={item.key} onClick={() => addLine(item)} className="flex min-h-14 w-full items-center justify-between gap-3 py-3 text-left hover:text-champagne"><span className="text-sm font-medium text-navy">{item.label}<small className="mt-1 block font-normal text-ink/55">{categoryLabels[item.category]} / {unitLabels[item.unit]}</small></span><span className="flex shrink-0 items-center gap-3 text-sm font-semibold text-navy">{euro(item.mid)}<Plus size={16} /></span></button>)}{!visibleCatalog.length && <p className="py-5 text-sm text-ink/55">Aucune prestation. Vous pouvez ajouter un poste libre.</p>}</div></div>}
          {!quote.lines.length && <div className="px-5 py-12 text-center"><FileText size={30} className="mx-auto text-champagne" /><h3 className="mt-4 font-semibold text-navy">Votre projet commence par un poste.</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink/55">Menuiseries, isolation, electricite, finitions... Combinez les prestations dans un meme document.</p><button type="button" onClick={() => setShowCatalog(true)} className={`${button} mt-5`}><Plus size={16} />Choisir une prestation</button></div>}
          <div className="divide-y divide-navy/10">{quote.lines.map((line, index) => <article key={line.id} className="p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pearl text-xs font-semibold text-champagne">{String(index + 1).padStart(2, "0")}</span><p className="text-xs text-ink/55">{line.source === "catalog" ? `Catalogue / ${line.key}` : "Prix personnalises pour cette cotation"}</p></div><div className="flex shrink-0"><button type="button" title="Dupliquer le poste" aria-label={`Dupliquer ${line.label}`} className="flex h-11 w-11 items-center justify-center text-ink/55 hover:text-navy" disabled={quote.lines.length >= 150} onClick={() => change("lines", [...quote.lines.slice(0, index + 1), { ...line, id: crypto.randomUUID() }, ...quote.lines.slice(index + 1)])}><Copy size={16} /></button><button type="button" title="Supprimer le poste" aria-label={`Supprimer ${line.label}`} className="flex h-11 w-11 items-center justify-center text-ink/55 hover:text-red-700" onClick={() => change("lines", quote.lines.filter((item) => item.id !== line.id))}><Trash2 size={16} /></button></div></div><input aria-label={`Libelle du poste ${index + 1}`} maxLength={160} className="input mt-2 font-semibold text-navy" value={line.label} onChange={(event) => changeLine(line.id, { label: event.target.value })} /><div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5"><Field label="Quantite"><input type="number" min="0.001" max="1000000" step="any" className="input tabular-nums" value={line.quantity} onChange={(event) => changeLine(line.id, { quantity: Number(event.target.value) })} /></Field><Field label="Unite"><select className="input" value={line.unit} onChange={(event) => changeLine(line.id, { unit: event.target.value as QuoteLine["unit"], useDimensions: false })}>{Object.entries(unitLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>{(["low", "mid", "high"] as const).map((field, scenarioIndex) => <Field key={field} label={`PU ${["bas", "central", "haut"][scenarioIndex]} (EUR)`}><input type="number" min="0" max="10000000" step="0.01" className="input tabular-nums" value={line[field]} onChange={(event) => changeLine(line.id, { [field]: Number(event.target.value), source: "custom" })} /></Field>)}</div>
            <details className="mt-4"><summary className="cursor-pointer text-xs font-semibold text-ink/60">Metre, description, gamme et TVA</summary><div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="Contenu et exclusions"><textarea maxLength={500} className="input min-h-20" value={line.description} onChange={(event) => changeLine(line.id, { description: event.target.value })} placeholder="Fourniture, pose, depose, finitions..." /></Field><div className="grid gap-3"><Field label="Reference indicative"><input maxLength={160} className="input" value={line.reference} onChange={(event) => changeLine(line.id, { reference: event.target.value })} /></Field><Field label="TVA indicative (eligibilite a confirmer)"><select className="input" value={line.vatRate} onChange={(event) => changeLine(line.id, { vatRate: Number(event.target.value) as QuoteLine["vatRate"] })}><option value="5.5">5,5 %</option><option value="10">10 %</option><option value="20">20 %</option></select></Field></div></div>{line.unit === "m2" && <div className="mt-4"><label className="flex min-h-11 items-center gap-3 text-sm text-ink/65"><input type="checkbox" checked={line.useDimensions} onChange={(event) => changeLine(line.id, { useDimensions: event.target.checked })} />Calculer la surface : largeur x hauteur x quantite</label>{line.useDimensions && <div className="mt-2 grid grid-cols-2 gap-3"><Field label="Largeur (m)"><input type="number" min="0.001" step="any" className="input" value={line.width} onChange={(event) => changeLine(line.id, { width: Number(event.target.value) })} /></Field><Field label="Hauteur (m)"><input type="number" min="0.001" step="any" className="input" value={line.height} onChange={(event) => changeLine(line.id, { height: Number(event.target.value) })} /></Field></div>}</div>}</details>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-pearl px-4 py-3"><span className="text-xs text-ink/60">{lineQuantity(line).toLocaleString("fr-FR", { maximumFractionDigits: 4 })} {unitLabels[line.unit]} / total du poste avant remise</span><div className="flex flex-wrap gap-4 text-xs tabular-nums text-navy"><span>Bas {euro(result.lines[index].amounts.low)}</span><strong>Central {euro(result.lines[index].amounts.mid)}</strong><span>Haut {euro(result.lines[index].amounts.high)}</span></div></div></article>)}</div>
        </section>
        <section className="mt-5 rounded-xl border border-navy/10 bg-white p-5 sm:p-6"><h2 className="font-semibold text-navy">03 / La remise commerciale</h2><p className="mt-2 text-xs leading-5 text-ink/55">Facultative, appliquee une seule fois aux montants saisis. Le prix avant remise reste visible dans le document.</p><div className="mt-4 grid gap-4 sm:grid-cols-[150px_1fr]"><Field label="Remise (0 a 15 %)"><input type="number" min="0" max="15" step="0.1" className="input" value={quote.discountPercent} onChange={(event) => change("discountPercent", Number(event.target.value))} /></Field><Field label={quote.discountPercent > 0 ? "Motif de la remise (obligatoire)" : "Motif commercial (facultatif)"}><input maxLength={300} className="input" value={quote.discountReason} onChange={(event) => change("discountReason", event.target.value)} placeholder="Ex. regroupement des lots, geste commercial valide..." /></Field></div>{quote.discountPercent > 0 && <p className="mt-4 text-sm font-semibold text-navy">Remise centrale : {euro(result.discount.mid)} / montant net : {euro(result.totals.mid)} {quote.basis === "unspecified" ? "(base a confirmer)" : quote.basis.toUpperCase()}</p>}</section><section className="mt-5 rounded-xl border border-navy/10 bg-white p-5 sm:p-6"><h2 className="font-semibold text-navy">04 / Les hypotheses</h2><Field label="Reserves et points a confirmer"><textarea maxLength={2000} className="input mt-3 min-h-28" value={quote.notes} onChange={(event) => change("notes", event.target.value)} /></Field><p className="mt-3 text-xs leading-5 text-ink/55">Le PDF inclut la date, la validite, le detail des lignes et la mention non contractuelle. Les aides ne sont pas deduites automatiquement.</p></section>
      </div>
      <aside className="space-y-5"><section className="rounded-xl bg-navy p-6 text-white xl:sticky xl:top-24"><p className="text-xs font-semibold uppercase tracking-[.18em] text-champagne">Synthese du document</p><h2 className="mt-5 text-sm text-white/65">Scenario central {quote.discountPercent > 0 ? "apres remise " : ""}{quote.basis === "ht" ? "HT" : quote.basis === "ttc" ? "TTC" : "(base a confirmer)"}</h2><p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{euro(result.totals.mid)}</p>{quote.discountPercent > 0 && <dl className="mt-3 space-y-2 text-xs text-white/65"><div className="flex justify-between"><dt>Avant remise</dt><dd>{euro(result.subtotal.mid)}</dd></div><div className="flex justify-between"><dt>Remise {quote.discountPercent} %</dt><dd>-{euro(result.discount.mid)}</dd></div></dl>}<div className="mt-6 flex justify-between border-y border-white/15 py-4 text-sm"><div><p className="text-xs text-white/55">Hypothese basse</p><p className="mt-1 font-medium tabular-nums">{euro(result.totals.low)}</p></div><div className="text-right"><p className="text-xs text-white/55">Hypothese haute</p><p className="mt-1 font-medium tabular-nums">{euro(result.totals.high)}</p></div></div><label className="mt-4 block text-xs text-white/65">Base des prix saisis<select value={quote.basis} onChange={(event) => change("basis", event.target.value as QuoteDraft["basis"])} className="mt-2 min-h-11 w-full rounded-lg border border-white/20 bg-white px-3 text-sm text-navy">{Object.entries(quoteBasisLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{quote.basis === "unspecified" ? <p className="mt-3 text-xs leading-5 text-white/65">Confirmez la base HT ou TTC avant remise au client. Aucune TVA n'est ajoutee ou deduite pour le moment.</p> : <dl className="mt-4 space-y-2 text-xs"><div className="flex justify-between"><dt>Total central HT</dt><dd>{euro(result.ht.mid)}</dd></div><div className="flex justify-between text-white/65"><dt>TVA indicative</dt><dd>{euro(result.tax.mid)}</dd></div><div className="flex justify-between font-semibold"><dt>Total central TTC</dt><dd>{euro(result.ttc.mid)}</dd></div></dl>}<button type="button" className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-champagne px-4 py-3 text-sm font-semibold text-navy disabled:opacity-50" onClick={pdf} disabled={!!busy || !!validity || !quote.lines.length}><FileText size={17} />{busy === "pdf" ? "Generation du PDF..." : "Generer le PDF imprimable"}</button><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" disabled={!!validity} onClick={() => exportDraft("csv")} className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/20 text-xs font-semibold"><ArrowDownToLine size={14} />CSV</button><button type="button" disabled={!!validity} onClick={() => exportDraft("json")} className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/20 text-xs font-semibold"><ArrowDownToLine size={14} />JSON</button></div><button type="button" className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 text-xs text-white/65" onClick={() => importFile.current?.click()}><FolderOpen size={14} />Restaurer une sauvegarde JSON</button><input ref={importFile} type="file" accept=".json,application/json" className="hidden" aria-label="Restaurer une cotation JSON" onChange={(event) => importDraft(event.target.files?.[0])} /><p className="mt-3 text-xs leading-5 text-white/45">Brouillon local conserve sur cet appareil. L'enregistrement en base permet la reprise apres migration Docker. Le statut est mis a jour manuellement.</p></section>
      </aside>
    </div>
    <section className="mt-6 rounded-xl border border-navy/10 bg-white p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-navy">Cotations enregistrees</h2><p className="mt-1 text-xs text-ink/55">Les 100 documents les plus recents, stockes dans votre base.</p></div><button type="button" className={button} onClick={refreshSaved}><FolderOpen size={16} />Actualiser</button></div>{savedError && <p className="mt-4 text-sm text-ink/60" role="status">{savedError}</p>}<div className="mt-4 divide-y divide-navy/10">{saved.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-semibold text-navy">{item.title}</p><p className="mt-1 text-xs text-ink/55">{item.number} / {item.client || "Client a renseigner"} / {quoteStatusLabels[item.status]} / {new Date(item.updatedAt).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}</p></div><div className="flex items-center gap-4"><div className="text-right"><p className="text-sm font-semibold tabular-nums text-navy">{euro(item.total)}</p><p className="text-xs text-ink/55">{quoteBasisLabels[item.basis]}</p></div><button type="button" className={button} disabled={!!busy} onClick={() => openSaved(item.id)}>Ouvrir</button></div></div>)}</div>{!saved.length && !savedError && <p className="mt-4 text-sm text-ink/55">Enregistrez votre premiere cotation pour la retrouver ici.</p>}</section>
  </div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-1.5 text-xs font-medium text-ink/65">{label}{children}</label>; }
