import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/uploads/"] },
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://a2e-renovation.local"}/sitemap.xml`
  };
}
