"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight, Images, Pause, Play, SlidersHorizontal, X } from "lucide-react";
import { track } from "@/components/analytics/AnalyticsTracker";
import type { GalleryAsset, GalleryComparison, GalleryProject } from "@/lib/realisations/gallery";
import styles from "./ProjectGallery.module.css";

export type { GalleryProject } from "@/lib/realisations/gallery";
const sourceLabel = (project: GalleryProject) => project.inspiration ? "inspiration" : "published";
const roleLabel = (role?: string) => role === "before" ? "Avant travaux" : role === "after" ? "Après travaux" : "Détail du projet";

function GalleryImage({ asset, card = false }: { asset: GalleryAsset; card?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className={styles.unavailable} role="img" aria-label={`Visuel indisponible : ${asset.alt}`}><Images size={30} strokeWidth={1} /><span>Ce visuel ne peut pas être chargé.</span></div>;
  return <Image src={asset.url} alt={asset.alt} fill unoptimized={asset.url.endsWith(".svg")} sizes={card ? "(max-width: 767px) 100vw, 50vw" : "100vw"} className={card ? styles.coverImage : styles.viewerImage} onError={() => setFailed(true)} />;
}

function BeforeAfter({ pair, onUse }: { pair: GalleryComparison; onUse: () => void }) {
  const [position, setPosition] = useState(50);
  const used = useRef(false);
  const sliderId = useId();
  const beforeLabel = pair.beforeLabel ?? "Avant";
  const afterLabel = pair.afterLabel ?? "Après";
  const change = (value: number) => { setPosition(value); if (!used.current) { used.current = true; onUse(); } };
  const drag = (event: PointerEvent<HTMLDivElement>) => { const bounds = event.currentTarget.getBoundingClientRect(); change(Math.round(Math.min(100, Math.max(0, (event.clientX - bounds.left) / bounds.width * 100)))); };
  return <div className={styles.comparison}>
    <div className={styles.comparisonStage} onPointerDown={event => { if (event.button !== 0) return; event.currentTarget.setPointerCapture(event.pointerId); drag(event); }} onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) drag(event); }} onPointerUp={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}>
      <GalleryImage key={pair.after.url} asset={pair.after} />
      <div className={styles.beforeLayer} style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}><GalleryImage key={pair.before.url} asset={pair.before} /></div>
      <div className={styles.divider} style={{ left: `${position}%` }} aria-hidden="true"><span><ChevronLeft size={16} /><ChevronRight size={16} /></span></div>
      <span className={styles.beforeLabel}>{beforeLabel}</span><span className={styles.afterLabel}>{afterLabel}</span>
    </div>
    <div className={styles.sliderControls}><label htmlFor={sliderId}>Comparer les deux vues</label><input id={sliderId} type="range" min="0" max="100" step="1" value={position} aria-label={`Part visible : ${beforeLabel}`} aria-valuetext={`${position} % ${beforeLabel}, ${100 - position} % ${afterLabel}`} onChange={event => change(Number(event.target.value))} /><p>Glissez sur l’image, déplacez le curseur ou utilisez les flèches du clavier.</p></div>
  </div>;
}

export function ProjectGallery({ projects, preview = false }: { projects: GalleryProject[]; preview?: boolean }) {
  const [filter, setFilter] = useState("Tout");
  const [source, setSource] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<GalleryProject | null>(null);
  const [photo, setPhoto] = useState(0);
  const [view, setView] = useState<"gallery" | "comparison">("gallery");
  const [pairIndex, setPairIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const touchStart = useRef<number | null>(null);
  const usable = projects.filter(project => project.assets.length > 0);
  const categories = useMemo(() => ["Tout", ...Array.from(new Set(projects.map(project => project.type)))], [projects]);
  const shown = usable.filter(project => (source === "all" || (source === "published" ? !project.inspiration : project.inspiration)) && (filter === "Tout" || project.type === filter) && [project.title, project.city, project.type, ...project.tags].join(" ").toLocaleLowerCase("fr").includes(query.toLocaleLowerCase("fr")));
  const asset = selected?.assets[photo];
  const pair = selected?.comparisons?.[pairIndex];
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => { setReducedMotion(preference.matches); if (preference.matches) setPlaying(false); };
    sync(); preference.addEventListener("change", sync);
    return () => preference.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    if (!selected || !dialog.current) return;
    if (!dialog.current.open) dialog.current.showModal();
    const previousOverflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [selected]);
  useEffect(() => {
    if (!playing || reducedMotion || !selected || selected.assets.length < 2 || view !== "gallery" || asset?.kind === "video") return;
    const interval = window.setInterval(() => setPhoto(index => (index + 1) % selected.assets.length), 5000);
    const visibility = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener("visibilitychange", visibility);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", visibility); };
  }, [playing, reducedMotion, selected, view, asset?.kind]);
  function open(project: GalleryProject, trigger: HTMLElement) { opener.current = trigger; setSelected(project); setPhoto(0); setPairIndex(0); setPlaying(false); setView(project.comparisons?.length ? "comparison" : "gallery"); track("gallery_opened", sourceLabel(project)); }
  function close() { dialog.current?.close(); }
  function didClose() { setSelected(null); setPlaying(false); opener.current?.focus(); }
  function advance(direction: number) { if (!selected?.assets.length) return; setPlaying(false); setPhoto(index => (index + direction + selected.assets.length) % selected.assets.length); }
  function keyboard(event: KeyboardEvent<HTMLDialogElement>) {
    if (view !== "gallery" || event.target instanceof HTMLInputElement || event.target instanceof HTMLVideoElement) return;
    if (event.key === "ArrowLeft") { event.preventDefault(); advance(-1); }
    if (event.key === "ArrowRight") { event.preventDefault(); advance(1); }
  }
  return <div className={styles.root}>
    {!preview && <><div className={styles.toolbar}><div className={styles.sourceFilters} aria-label="Choisir les contenus">{[{ key: "all", label: "Tous les visuels" }, { key: "published", label: "Chantiers publiés" }, { key: "inspiration", label: "Inspirations & démonstration" }].map(item => <button key={item.key} type="button" aria-pressed={source === item.key} onClick={() => setSource(item.key)}>{item.label}</button>)}</div><label><span className="sr-only">Rechercher un projet</span><input className="input" placeholder="Une matière, un lieu, une idée…" value={query} onChange={event => setQuery(event.target.value)} /></label></div>
    <div className={styles.categories} aria-label="Filtrer par expertise">{categories.map(category => <button key={category} type="button" aria-pressed={filter === category} onClick={() => setFilter(category)}>{category}</button>)}</div>
    {!usable.some(project => !project.inspiration) && <p className={styles.note}>Les photos de chantiers A2E seront présentées ici après publication par l’équipe. Les visuels ci-dessous sont des inspirations ou une démonstration illustrée.</p>}
    <p className={styles.resultCount} aria-live="polite">{shown.length} projet{shown.length > 1 ? "s" : ""} à explorer</p></>}
    <div className={styles.grid}>{shown.map(project => { const cover = project.assets.find(item => item.cover) ?? project.assets[0]; return <article className={styles.card} key={project.id}>
      <button className={styles.cardImage} type="button" onClick={event => open(project, event.currentTarget)} aria-label={`Explorer ${project.title}`}>{cover.kind === "video" ? <video src={cover.url} className={styles.coverImage} muted playsInline preload="metadata" aria-label={cover.alt} /> : <GalleryImage key={cover.url} asset={cover} card />}<span className={styles.badge}>{project.inspiration ? project.id === "demonstration-room" ? "Démonstration illustrée" : "Inspiration" : project.published === false ? "Aperçu du brouillon" : "Chantier publié"}</span><span className={styles.explore}>{project.comparisons?.length ? <><SlidersHorizontal size={16} /> {project.id === "demonstration-room" ? "Avant / projet" : "Avant / après"}</> : <><Images size={16} /> {project.assets.length} visuel{project.assets.length > 1 ? "s" : ""}</>}<ArrowUpRight size={17} /></span></button>
      <div className={styles.metadata}><span>{project.type}</span><span>{project.city}</span></div><h2>{project.title}</h2><p>{project.description}</p>{!project.inspiration && (project.duration || project.budget) && <p className={styles.projectFacts}>{project.duration}{project.duration && project.budget ? " · " : ""}{project.budget}</p>}<Link href="/simulateur" className="button-text" onClick={() => track("gallery_estimate_clicked", sourceLabel(project))}>Imaginer mon projet <ArrowUpRight size={16} /></Link>
    </article>; })}</div>
    {!shown.length && <div className={styles.empty}><Images size={30} strokeWidth={1} /><p>Aucun projet pour ces critères.</p><button type="button" onClick={() => { setFilter("Tout"); setSource("all"); setQuery(""); }}>Voir tous les visuels</button></div>}
    <dialog className={styles.dialog} ref={dialog} onClose={didClose} onKeyDown={keyboard} onClick={event => { if (event.target === dialog.current) close(); }} aria-labelledby="gallery-dialog-title" aria-describedby="gallery-dialog-description">
      {selected && <div className={styles.dialogContent}><header className={styles.dialogHeader}><div><p className={styles.dialogSource}>{selected.inspiration ? selected.id === "demonstration-room" ? "Exemple illustré · pas un chantier A2E" : "Visuel d’inspiration · pas un chantier A2E" : `${selected.type} · ${selected.city}`}</p><h2 id="gallery-dialog-title">{selected.title}</h2></div><button type="button" onClick={close} aria-label="Fermer la galerie" autoFocus><X size={22} /></button></header>
      {!!selected.comparisons?.length && <div className={styles.viewTabs}><button type="button" aria-pressed={view === "comparison"} onClick={() => { setView("comparison"); setPlaying(false); }}><SlidersHorizontal size={17} /> {selected.id === "demonstration-room" ? "Comparer le projet" : "Avant / après"}</button><button type="button" aria-pressed={view === "gallery"} onClick={() => setView("gallery")}><Images size={17} /> Tous les visuels</button></div>}
      {view === "comparison" && pair ? <><BeforeAfter key={`${selected.id}-${pairIndex}`} pair={pair} onUse={() => track("gallery_comparison_used", sourceLabel(selected))} />{selected.comparisons && selected.comparisons.length > 1 && <div className={styles.pairChoices}>{selected.comparisons.map((comparison, index) => <button key={index} type="button" aria-pressed={pairIndex === index} onClick={() => setPairIndex(index)}>{comparison.label}</button>)}</div>}</> : <><div className={styles.stage} onTouchStart={event => { touchStart.current = event.touches[0]?.clientX ?? null; }} onTouchEnd={event => { const end = event.changedTouches[0]?.clientX; if (touchStart.current !== null && end !== undefined && Math.abs(end - touchStart.current) > 60 && asset?.kind !== "video") advance(end > touchStart.current ? -1 : 1); touchStart.current = null; }}>{asset?.kind === "video" ? <video key={asset.url} src={asset.url} controls playsInline preload="metadata" className={styles.viewerVideo} /> : asset ? <GalleryImage key={asset.url} asset={asset} /> : null}</div>
      <div className={styles.slideControls}><button type="button" aria-label="Visuel précédent" disabled={selected.assets.length < 2} onClick={() => advance(-1)}><ChevronLeft size={22} /></button><p aria-live={playing ? "off" : "polite"}>{photo + 1} / {selected.assets.length}<span>{selected.id === "demonstration-room" ? asset?.role === "before" ? "État initial" : "Projet imaginé" : roleLabel(asset?.role)}</span></p><button type="button" aria-label="Visuel suivant" disabled={selected.assets.length < 2} onClick={() => advance(1)}><ChevronRight size={22} /></button>{selected.assets.length > 1 && !reducedMotion && asset?.kind !== "video" && <button type="button" className={styles.autoplay} aria-pressed={playing} onClick={() => setPlaying(current => !current)}>{playing ? <Pause size={17} /> : <Play size={17} />}{playing ? "Pause" : "Diaporama"}</button>}</div>
      <div className={styles.thumbnails} aria-label="Choisir un visuel">{selected.assets.map((thumbnail, index) => <button key={`${thumbnail.url}-${index}`} type="button" aria-label={`Visuel ${index + 1} : ${thumbnail.alt}`} aria-pressed={photo === index} onClick={() => { setPhoto(index); setPlaying(false); }}>{thumbnail.kind === "video" ? <span><Play size={20} />Vidéo</span> : <GalleryImage key={thumbnail.url} asset={thumbnail} card />}<span className={styles.thumbnailNumber}>{index + 1}</span></button>)}</div></>}
      <footer className={styles.dialogFooter}><p id="gallery-dialog-description">{selected.description}</p><Link href="/simulateur" onClick={() => { track("gallery_estimate_clicked", sourceLabel(selected)); close(); }}>Composer mon estimation <ArrowUpRight size={17} /></Link></footer></div>}
    </dialog>
  </div>;
}
