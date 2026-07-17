import { Facebook, Instagram, Linkedin } from "lucide-react";
import { getSiteContactSettings } from "@/lib/settings/site-contact-settings";

export async function SocialLinks() {
  const settings = await getSiteContactSettings();
  const links = [
    { label: "Instagram", href: settings.instagram, icon: Instagram },
    { label: "Facebook", href: settings.facebook, icon: Facebook },
    { label: "LinkedIn", href: settings.linkedin, icon: Linkedin }
  ].filter((item) => item.href);
  if (!links.length) return null;
  return <nav aria-label="Réseaux sociaux" className="flex flex-wrap gap-2">{links.map(({ label, href, icon: Icon }) => <a key={label} href={href} target="_blank" rel="noreferrer" data-track="cta_click" data-track-label={`Réseau - ${label}`} className="inline-flex min-h-10 items-center gap-2 rounded-card border border-current/20 px-3 py-2 text-sm font-bold transition hover:border-champagne hover:text-champagne"><Icon size={16} aria-hidden="true" />{label}</a>)}</nav>;
}
