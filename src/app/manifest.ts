import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "A2E Rénovation",
    short_name: "A2E",
    description: "Estimez vos travaux de rénovation en Île-de-France.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f5f7",
    theme_color: "#071a3a",
    icons: [{ src: "/branding/a2e-logo.jpeg", sizes: "192x192", type: "image/jpeg", purpose: "any maskable" }]
  };
}
