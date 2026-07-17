import { siteSettings } from "@/lib/site-data";

export function localBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: siteSettings.company,
    telephone: siteSettings.phone,
    email: siteSettings.email,
    areaServed: [
      "Ile-de-France",
      "Paris (75)",
      "Seine-et-Marne (77)",
      "Yvelines (78)",
      "Essonne (91)",
      "Hauts-de-Seine (92)",
      "Seine-Saint-Denis (93)",
      "Val-de-Marne (94)",
      "Val-d'Oise (95)"
    ],
    serviceType: ["Renovation energetique", "Remplacement de fenetres", "Isolation", "Renovation globale"]
  };
}
