export function SectionHeading({ eyebrow, title, text, inverse = false }: { eyebrow: string; title: string; text?: string; inverse?: boolean }) {
  return (
    <div className="mb-10 max-w-3xl">
      <div className="gold-line mb-4" />
      <p className="text-sm font-black uppercase tracking-[.16em] text-champagne">{eyebrow}</p>
      <h2 className={`mt-3 text-3xl font-black leading-tight md:text-4xl ${inverse ? "text-white" : "text-navy"}`}>{title}</h2>
      {text ? <p className={`mt-4 max-w-2xl text-base leading-7 ${inverse ? "text-white/72" : "text-ink/68"}`}>{text}</p> : null}
    </div>
  );
}
