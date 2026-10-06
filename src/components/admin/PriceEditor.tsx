"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Check, ChevronDown, Plus, Search } from "lucide-react";
import type { PriceItem, ProjectType } from "@/lib/pricing/price-data";
import { categoryLabels, exportCatalogCsv, MAX_CATALOG_BYTES, parseCatalogCsv, unitLabels, validatePriceItem } from "@/lib/pricing/catalog-transfer";
import { downloadFile } from "@/lib/download-file";

const empty: PriceItem = { key: "", label: "", category: "other", unit: "forfait", low: 0, mid: 0, high: 0, vatRate: 10, reference: "", description: "" };
const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-navy/15 px-4 py-2 text-sm font-bold text-navy disabled:opacity-50";

export function PriceEditor() {
  const [items, setItems] = useState<PriceItem[]>([]);
  const [newItem, setNewItem] = useState<PriceItem>(empty);
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [source, setSource] = useState("");
  const [message, setMessage] = useState("Chargement du catalogue...");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<string | null>("load");
  const [csv, setCsv] = useState("");
  const [preview, setPreview] = useState<PriceItem[]>([]);
  const inputFile = useRef<HTMLInputElement>(null);
  const notice = (text: string, failed = false) => { setMessage(text); setError(failed); };

  async function load() {
    const response = await fetch(`/api/admin/pricing?refresh=${Date.now()}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Impossible de charger le catalogue.");
    setItems(data.items); setSource(data.source);
    return data.items as PriceItem[];
  }
  useEffect(() => { load().then((loaded) => notice(`${loaded.length} references chargees.`)).catch((reason) => notice(reason.message, true)).finally(() => setBusy(null)); }, []);
  const visible = items.filter((item) => (!category || item.category === category) && `${item.label} ${item.key} ${item.reference ?? ""}`.toLowerCase().includes(search.toLowerCase()));

  function change(key: string, field: keyof PriceItem, value: string) {
    setItems((current) => current.map((item) => item.key === key ? { ...item, [field]: ["low", "mid", "high", "vatRate"].includes(field) ? Number(value) : value } : item));
  }
  async function save(item: PriceItem, create = false) {
    setBusy(item.key || "new");
    try {
      const validated = validatePriceItem(item);
      const response = await fetch("/api/admin/pricing", { method: create ? "POST" : "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(validated) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Enregistrement impossible.");
      const reloaded = await load();
      const persisted = reloaded.find((entry) => entry.key === validated.key);
      if (!persisted || ["label", "unit", "category", "low", "mid", "high", "vatRate", "reference", "description"].some((field) => (persisted[field as keyof PriceItem] ?? "") !== (validated[field as keyof PriceItem] ?? ""))) throw new Error("La relecture ne confirme pas les valeurs. Rechargez le catalogue.");
      if (create) { setNewItem(empty); setShowNew(false); }
      notice(`Enregistre et relu en base : ${validated.label}.`);
    } catch (reason) { notice(reason instanceof Error ? reason.message : "Erreur de sauvegarde", true); }
    finally { setBusy(null); }
  }
  async function pickCsv(file?: File) {
    if (!file) return;
    try {
      if (file.size > MAX_CATALOG_BYTES) throw new Error("Le fichier depasse 500 Ko.");
      const text = await file.text();
      const parsed = parseCatalogCsv(text);
      setCsv(text); setPreview(parsed); notice(`${parsed.length} lignes valides. Verifiez l'apercu puis appliquez l'import.`);
    } catch (reason) { setPreview([]); setCsv(""); notice(reason instanceof Error ? reason.message : "CSV invalide", true); }
    if (inputFile.current) inputFile.current.value = "";
  }
  async function importCsv() {
    setBusy("import");
    try {
      const response = await fetch("/api/admin/pricing/import", { method: "POST", headers: { "content-type": "text/csv; charset=utf-8" }, body: csv });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Import impossible.");
      const reloaded = await load();
      if (preview.some((item) => { const found = reloaded.find((entry) => entry.key === item.key); return !found || found.low !== item.low || found.mid !== item.mid || found.high !== item.high; })) throw new Error("Import execute, mais certaines lignes ne sont pas actives. Verifiez le catalogue en base.");
      setPreview([]); setCsv(""); notice(`Import confirme apres relecture : ${data.created} creations, ${data.updated} mises a jour.`);
    } catch (reason) { notice(reason instanceof Error ? reason.message : "Erreur d'import", true); }
    finally { setBusy(null); }
  }

  return <section className="mt-8 rounded-xl border border-navy/10 bg-white p-5 sm:p-8" id="catalogue-prix">
    <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-champagne">Referentiel entreprise</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-navy">Le catalogue de prix</h2><p className="mt-2 max-w-xl text-sm leading-6 text-ink/65">Une meme source pour le simulateur et vos cotations. Documentez chaque prestation, sa gamme et ses hypotheses de pose.</p></div><div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={!!busy || !items.length} onClick={() => downloadFile(exportCatalogCsv(items), "a2e-catalogue-prix.csv", "text/csv;charset=utf-8")}><ArrowDownToLine size={16} />Exporter CSV</button><button type="button" className={button} disabled={!!busy} onClick={() => inputFile.current?.click()}><ArrowUpFromLine size={16} />Importer CSV</button><button type="button" className={`${button} bg-navy text-white`} onClick={() => setShowNew(!showNew)}><Plus size={16} />Nouvelle reference</button></div></div>
    <input ref={inputFile} type="file" accept=".csv,text/csv" className="hidden" aria-label="Importer un catalogue CSV" onChange={(event) => pickCsv(event.target.files?.[0])} />
    <p role={error ? "alert" : "status"} className={`mt-5 rounded-lg px-4 py-3 text-sm ${error ? "bg-red-50 text-red-800" : "bg-pearl text-navy"}`}>{message}</p>
    {source === "demo" && <p className="mt-3 text-xs leading-5 text-ink/65">Le catalogue affiche les montants indicatifs de demonstration. Ils ne constituent pas des prix fournisseurs verifies. La sauvegarde exige une base configuree.</p>}
    <p className="mt-3 text-xs leading-5 text-ink/55">CSV UTF-8, separateur point-virgule ou virgule, 500 lignes maximum. Les cles existantes sont mises a jour, les nouvelles sont ajoutees. L'import ne supprime aucune reference. Les montants catalogue conservent les centimes (deux decimales). Precisez la base HT/TTC dans chaque cotation.</p>
    {!!preview.length && <div className="mt-5 rounded-lg border border-champagne/40 bg-pearl p-5"><div className="flex flex-wrap justify-between gap-4"><div><h3 className="font-semibold text-navy">Apercu avant import</h3><p className="mt-1 text-sm text-ink/65">{preview.filter((item) => items.some((entry) => entry.key === item.key)).length} references existantes a mettre a jour / {preview.filter((item) => !items.some((entry) => entry.key === item.key)).length} a ajouter</p></div><div className="flex gap-2"><button type="button" className={button} disabled={!!busy} onClick={() => { setPreview([]); setCsv(""); }}>Annuler</button><button type="button" className={`${button} bg-navy text-white`} disabled={!!busy} onClick={importCsv}>{busy === "import" ? "Import en cours..." : "Appliquer l'import"}</button></div></div><ul className="mt-4 divide-y divide-navy/10 text-sm">{preview.slice(0, 6).map((item) => <li key={item.key} className="flex flex-wrap justify-between gap-2 py-2"><span>{item.label}</span><span className="font-semibold text-navy">{item.low} / {item.mid} / {item.high} EUR / {unitLabels[item.unit]}</span></li>)}</ul>{preview.length > 6 && <p className="mt-2 text-xs text-ink/60">Et {preview.length - 6} autres lignes validees.</p>}</div>}
    {showNew && <form onSubmit={(event: FormEvent) => { event.preventDefault(); save(newItem, true); }} className="mt-6 rounded-lg border border-navy/10 bg-pearl p-5"><h3 className="mb-4 font-semibold text-navy">Ajouter une prestation</h3><PriceFields item={newItem} onChange={(field, value) => setNewItem((current) => ({ ...current, [field]: ["low", "mid", "high", "vatRate"].includes(field) ? Number(value) : value }))} newEntry /><button className={`${button} mt-4 bg-navy text-white`} disabled={!!busy}>Creer la reference</button></form>}
    <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_240px]"><label className="relative"><Search className="absolute left-3 top-3.5 text-ink/40" size={17} /><input aria-label="Rechercher une reference" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un poste, une reference..." className="input pl-10" /></label><select aria-label="Filtrer les categories" className="input" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Tous les corps d'etat</option>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
    <div className="mt-5 divide-y divide-navy/10">{visible.map((item) => <details key={item.key} className="group py-4"><summary className="flex cursor-pointer list-none items-center justify-between gap-4"><div><p className="font-semibold text-navy">{item.label}</p><p className="mt-1 text-xs text-ink/55">{categoryLabels[item.category as ProjectType] ?? item.category} / {item.key} / {unitLabels[item.unit]}</p></div><div className="flex items-center gap-4"><span className="hidden text-right text-sm font-semibold tabular-nums text-navy sm:block">{item.low.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / {item.mid.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / {item.high.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR</span><ChevronDown className="shrink-0 text-ink/50 transition group-open:rotate-180" size={18} /></div></summary><div className="mt-5"><PriceFields item={item} onChange={(field, value) => change(item.key, field, value)} /><button type="button" onClick={() => save(item)} disabled={!!busy} className={`${button} mt-4 bg-navy text-white`}><Check size={16} />{busy === item.key ? "Enregistrement..." : "Enregistrer et verifier"}</button></div></details>)}</div>
    {!visible.length && !busy && <p className="py-8 text-center text-sm text-ink/60">Aucune reference ne correspond a cette recherche.</p>}
    <p className="mt-4 text-xs text-ink/45">{visible.length} references affichees sur {items.length}. Bas / central / haut : trois hypotheses, pas une remise commerciale.</p>
  </section>;
}

function PriceFields({ item, onChange, newEntry = false }: { item: PriceItem; onChange: (field: keyof PriceItem, value: string) => void; newEntry?: boolean }) {
  return <div className="grid gap-4"><div className="grid gap-3 md:grid-cols-2">{newEntry && <Field label="Cle unique"><input required pattern="[a-z0-9][a-z0-9_]*" maxLength={80} value={item.key} onChange={(event) => onChange("key", event.target.value)} placeholder="ex. depose_carrelage" className="input" /></Field>}<Field label="Libelle"><input required maxLength={160} value={item.label} onChange={(event) => onChange("label", event.target.value)} className="input" /></Field><Field label="Corps d'etat"><select value={item.category} onChange={(event) => onChange("category", event.target.value)} className="input">{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field></div><div className="grid grid-cols-2 gap-3 lg:grid-cols-5"><Field label="Unite"><select value={item.unit} onChange={(event) => onChange("unit", event.target.value)} className="input">{Object.entries(unitLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>{(["low", "mid", "high"] as const).map((field, index) => <Field key={field} label={`${["Bas", "Central", "Haut"][index]} EUR`}><input type="number" min="0" max="10000000" step="0.01" value={item[field]} onChange={(event) => onChange(field, event.target.value)} className="input tabular-nums" /></Field>)}<Field label="TVA indicative"><select value={item.vatRate ?? 10} onChange={(event) => onChange("vatRate", event.target.value)} className="input"><option value="5.5">5,5 %</option><option value="10">10 %</option><option value="20">20 %</option></select></Field></div><Field label="Reference ou gamme indicative"><input maxLength={160} value={item.reference ?? ""} onChange={(event) => onChange("reference", event.target.value)} className="input" /></Field><Field label="Contenu, pose incluse et exclusions"><textarea maxLength={500} value={item.description ?? ""} onChange={(event) => onChange("description", event.target.value)} className="input min-h-20" placeholder="Fourniture, pose, depose, finitions et exclusions a expliciter..." /></Field></div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-1.5 text-xs font-semibold text-ink/65">{label}{children}</label>; }
