import { getSiteContactSettings } from "@/lib/settings/site-contact-settings";

export async function PhoneQrCard() {
  const { phone } = await getSiteContactSettings();
  const tel = phone.replace(/[^+\d]/g, "");
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`tel:${tel}`)}`;
  return <div className="a2e-card flex items-center gap-4 bg-white p-4">
    {/* The QR provider is external and dynamic, so Next Image optimization is not applicable here. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={qrUrl} alt={`QR code pour appeler le ${phone}`} width="112" height="112" loading="lazy" className="h-28 w-28 rounded-card border border-ink/10" />
    <div><p className="text-xs font-black uppercase tracking-[.14em] text-champagne">Appel direct</p><p className="mt-1 font-black text-navy">{phone}</p><p className="mt-1 text-sm leading-5 text-ink/65">Scannez pour appeler A2E depuis votre téléphone.</p><a href={`tel:${tel}`} data-track="phone_click" data-track-label="QR - Appeler A2E" className="mt-3 inline-flex min-h-10 items-center rounded-card bg-navy px-3 py-2 text-sm font-black text-white">Appeler A2E</a></div>
  </div>;
}
