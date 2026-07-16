import type { MetadataRoute } from "next";
import { services } from "@/lib/site-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://a2e-renovation.local";
  const paths = ["", "/simulateur", "/realisations", "/equipe", "/aides", "/contact", "/mentions-legales", "/politique-confidentialite"];
  return [
    ...paths.map((path) => ({ url: `${base}${path}`, lastModified: new Date() })),
    ...services.map((service) => ({ url: `${base}/services/${service.slug}`, lastModified: new Date() })),
    ...["renovation-energetique-sevran", "remplacement-fenetres-sevran", "isolation-thermique-exterieure-seine-saint-denis", "renovation-globale-ile-de-france", "renovation-maison-seine-saint-denis"].map((slug) => ({ url: `${base}/local/${slug}`, lastModified: new Date() }))
  ];
}
