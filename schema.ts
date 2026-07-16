import { siteSettings } from "@/lib/site-data";

export function localBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: siteSettings.company,
    telephone: siteSettings.phone,
    email: siteSettings.email,
    areaServed: ["Sevran", "Seine-Saint-Denis", "Île-de-France"],
    serviceType: ["Rénovation énergétique", "Remplacement de fenêtres", "Isolation", "Rénovation globale"]
  };
}
