"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { CheckCircle2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { customerReviewsSchema, emptyCustomerReviews, type CustomerReview, type CustomerReviewsSettings } from "@/lib/reviews/customer-reviews";

const inputClass = "input min-h-12 w-full";
const actionClass = "inline-flex min-h-12 items-center justify-center gap-2 border border-navy/25 px-4 text-sm font-semibold text-navy disabled:opacity-50";

async function readResponse(response: Response): Promise<CustomerReviewsSettings> {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Les avis sont indisponibles.");
  const parsed = customerReviewsSchema.safeParse(data.settings);
  if (!parsed.success) throw new Error("La reponse des avis est invalide. Votre brouillon est conserve.");
  return parsed.data;
}

export function ReviewManager() {
  const [settings, setSettings] = useState(emptyCustomerReviews);
  const [baseline, setBaseline] = useState<CustomerReviewsSettings | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [removed, setRemoved] = useState<CustomerReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [reloadRequested, setReloadRequested] = useState(false);
  const [deleteRequested, setDeleteRequested] = useState(false);
  const dirty = Boolean(baseline && JSON.stringify(settings) !== JSON.stringify(baseline));
  const review = settings.reviews.find(item => item.id === selectedId);
  const busy = loading || saving;

  async function load() {
    setLoading(true); setError(""); setStatus("");
    try {
      const loaded = await readResponse(await fetch("/api/admin/reviews", { cache: "no-store" }));
      setSettings(loaded); setBaseline(loaded); setRemoved([]); setReloadRequested(false); setDeleteRequested(false);
      setSelectedId(current => loaded.reviews.some(item => item.id === current) ? current : loaded.reviews[0]?.id ?? "");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Chargement impossible. Votre brouillon est conserve."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  function update(patch: Partial<CustomerReview>) {
    setSettings(current => ({ ...current, reviews: current.reviews.map(item => item.id === selectedId ? { ...item, ...patch } : item) }));
    setStatus(""); setReloadRequested(false);
  }
  function create() {
    const id = crypto.randomUUID();
    const next: CustomerReview = { id, author: "", city: "", workType: "", date: "", rating: 0, text: "", sourceUrl: "", consentConfirmed: false, published: false };
    setSettings(current => ({ ...current, reviews: [...current.reviews, next] })); setSelectedId(id); setDeleteRequested(false); setStatus("");
  }
  function remove() {
    if (!review) return;
    setRemoved(current => [...current, review]);
    setSettings(current => ({ ...current, reviews: current.reviews.filter(item => item.id !== review.id) }));
    setSelectedId(""); setDeleteRequested(false); setStatus("");
  }
  function restore(item: CustomerReview) {
    setSettings(current => ({ ...current, reviews: [...current.reviews, item] }));
    setRemoved(current => current.filter(removedItem => removedItem.id !== item.id)); setSelectedId(item.id);
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setError(""); setStatus("");
    const validated = customerReviewsSchema.safeParse(settings);
    if (!validated.success) {
      const issue = validated.error.issues[0];
      const prefix = issue.path[0] === "reviews" && typeof issue.path[1] === "number" ? `Avis ${issue.path[1] + 1} : ` : "";
      setError(`${prefix}${issue.message}`);
      if (typeof issue.path[1] === "number") setSelectedId(settings.reviews[issue.path[1]]?.id ?? selectedId);
      return;
    }
    setSaving(true);
    try {
      const saved = await readResponse(await fetch("/api/admin/reviews", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(validated.data) }));
      const confirmed = await readResponse(await fetch("/api/admin/reviews", { cache: "no-store" }));
      if (JSON.stringify(confirmed) !== JSON.stringify(saved)) throw new Error("La liste a change pendant la verification. Votre brouillon est conserve. Rechargez avant de continuer.");
      setSettings(confirmed); setBaseline(confirmed); setRemoved([]); setReloadRequested(false); setDeleteRequested(false);
      setStatus("Avis enregistres et confirmes apres rechargement. Seuls les avis publies avec accord client sont visibles sur l'accueil.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Enregistrement impossible. Votre brouillon est conserve."); }
    finally { setSaving(false); }
  }

  return <section className="mt-10 border-t border-navy/20 pt-8" aria-labelledby="review-manager-title">
    <div className="flex flex-wrap items-start justify-between gap-4"><div className="max-w-2xl"><p className="eyebrow">Avis clients</p><h2 id="review-manager-title" className="text-2xl font-semibold text-navy">Des retours reels, avec leur accord.</h2><p className="mt-3 text-sm leading-7 text-ink">Recopiez uniquement un avis reel transmis par un client. Utilisez le nom public qu'il a autorise et conservez sa preuve d'accord dans votre dossier client. Aucun avis ni aucune note n'est ajoute automatiquement sur le site.</p></div><div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => dirty ? setReloadRequested(true) : void load()} className={actionClass}><RefreshCw size={17} /> Recharger</button><button type="button" disabled={busy || !baseline || settings.reviews.length >= 100} onClick={create} className={actionClass}><Plus size={17} /> Ajouter un avis</button></div></div>
    {loading && <p role="status" className="mt-4 text-sm text-navy">Chargement des avis...</p>}
    {error && <p role="alert" className="mt-4 border border-red-300 bg-red-50 p-4 text-sm leading-7 text-red-900">{error}</p>}
    {status && <p role="status" className="mt-4 border border-emerald-300 bg-emerald-50 p-4 text-sm leading-7 text-emerald-900">{status}</p>}
    {reloadRequested && <div className="mt-4 border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><p>Le rechargement remplace vos modifications locales par la derniere liste enregistree. Copiez les textes a conserver avant de poursuivre.</p><div className="mt-3 flex flex-wrap gap-3"><button type="button" disabled={busy} onClick={() => void load()} className={actionClass}>Abandonner les modifications et recharger</button><button type="button" onClick={() => setReloadRequested(false)} className={actionClass}>Garder mon brouillon</button></div></div>}
    {!loading && baseline && <form onSubmit={save} className="mt-6">
      <fieldset disabled={busy} className="min-w-0">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,.7fr)_minmax(0,1.3fr)]">
          <div><p className="mb-3 text-sm font-semibold text-navy">Liste a enregistrer · {settings.reviews.length} avis</p><div className="max-h-[35rem] space-y-2 overflow-y-auto">{settings.reviews.map((item, index) => <button key={item.id} type="button" aria-pressed={item.id === selectedId} onClick={() => { setSelectedId(item.id); setDeleteRequested(false); }} className={`min-h-12 w-full border p-4 text-left text-navy ${item.id === selectedId ? "border-navy bg-white" : "border-navy/20 bg-white/60"}`}><span className="block break-words font-semibold">{index + 1}. {item.author || "Nouvel avis a renseigner"}</span><span className="mt-1 block break-words text-sm">{item.city || "Ville a renseigner"} · {item.published && item.consentConfirmed ? "Publication demandee" : "Brouillon"}</span></button>)}</div>{!settings.reviews.length && <p className="border-y border-navy/15 py-5 text-sm leading-7 text-ink">Aucun avis pour le moment. Le bloc des avis reste masque sur l'accueil tant qu'aucun avis autorise n'est publie.</p>}</div>
          {review ? <div className="min-w-0 border border-navy/15 bg-white p-5 sm:p-6"><h3 className="text-lg font-semibold text-navy">Renseigner l'avis recu</h3><div className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2">
            <Field label="Nom public autorise *"><input className={inputClass} required minLength={2} maxLength={100} autoComplete="off" value={review.author} onChange={event => update({ author: event.target.value })} /></Field>
            <Field label="Ville *"><input className={inputClass} required minLength={2} maxLength={100} value={review.city} onChange={event => update({ city: event.target.value })} /></Field>
            <Field label="Type de travaux *"><input className={inputClass} required minLength={2} maxLength={120} value={review.workType} onChange={event => update({ workType: event.target.value })} /></Field>
            <Field label="Date de l'avis *"><input className={inputClass} required type="date" value={review.date} onChange={event => update({ date: event.target.value })} /></Field>
            <Field label="Note donnee par le client *"><select className={inputClass} required value={review.rating || ""} onChange={event => update({ rating: Number(event.target.value) })}><option value="" disabled>Choisir la note recue</option>{[1, 2, 3, 4, 5].map(note => <option key={note} value={note}>{note} / 5</option>)}</select></Field>
            <Field label="Lien source (facultatif)"><input className={inputClass} type="url" maxLength={500} placeholder="https://..." value={review.sourceUrl} onChange={event => update({ sourceUrl: event.target.value })} /></Field>
            <div className="sm:col-span-2"><Field label="Texte exact de l'avis *"><textarea className={`${inputClass} min-h-40`} required minLength={10} maxLength={3000} value={review.text} onChange={event => update({ text: event.target.value })} /></Field></div>
          </div><div className="mt-5 space-y-3 border-t border-navy/15 pt-4"><label className="flex min-h-12 items-center gap-3 text-sm leading-6 text-navy"><input type="checkbox" className="h-5 w-5 shrink-0" checked={review.consentConfirmed} onChange={event => update({ consentConfirmed: event.target.checked, ...(!event.target.checked ? { published: false } : {}) })} /><span>Je confirme l'accord du client pour publier ce nom, cette note et ce texte.</span></label><label className="flex min-h-12 items-center gap-3 text-sm leading-6 text-navy"><input type="checkbox" className="h-5 w-5 shrink-0" checked={review.published} disabled={!review.consentConfirmed} onChange={event => update({ published: event.target.checked })} /><span>Publier cet avis sur l'accueil apres enregistrement</span></label></div>
            <button type="button" className="mt-5 inline-flex min-h-12 items-center gap-2 px-3 text-sm font-semibold text-red-900 underline underline-offset-4" onClick={() => setDeleteRequested(true)}><Trash2 size={17} /> Preparer la suppression</button>
            {deleteRequested && <div className="mt-3 border border-red-200 bg-red-50 p-4 text-sm text-red-900"><p>Retirer cet avis de la liste ? La suppression sera appliquee uniquement avec le bouton « Enregistrer les avis ».</p><div className="mt-3 flex flex-wrap gap-3"><button type="button" onClick={remove} className={actionClass}>Retirer de la liste</button><button type="button" onClick={() => setDeleteRequested(false)} className={actionClass}>Annuler</button></div></div>}
          </div> : <div className="flex min-h-40 items-center border border-dashed border-navy/25 p-6 text-sm leading-7 text-ink">Selectionnez un avis ou ajoutez un retour client pour le preparer.</div>}
        </div>
        {removed.length > 0 && <div className="mt-5 border border-red-200 bg-red-50 p-4 text-sm text-red-900"><h3 className="font-semibold">Suppressions a confirmer en enregistrant : {removed.length}</h3><ul className="mt-2 divide-y divide-red-200">{removed.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-2"><span>{item.author || "Avis sans nom"} · {item.city || "Ville non renseignee"}</span><button type="button" onClick={() => restore(item)} className="min-h-11 font-semibold underline underline-offset-4">Annuler la suppression</button></li>)}</ul></div>}
        <div className="mt-6 border-t border-navy/20 pt-5"><p className="text-sm leading-7 text-ink">{dirty ? "Modifications locales non enregistrees. Relisez les textes, les accords, les publications et les suppressions avant de sauvegarder." : "La liste correspond a la derniere version chargee."}</p><button type="submit" disabled={!dirty || busy} className="mt-4 inline-flex min-h-12 items-center gap-2 bg-navy px-5 text-sm font-semibold text-white disabled:opacity-50"><CheckCircle2 size={17} /> {saving ? "Enregistrement et verification..." : "Enregistrer les avis"}</button></div>
      </fieldset>
    </form>}
  </section>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid min-w-0 gap-2 text-sm font-semibold text-navy">{label}{children}</label>;
}
