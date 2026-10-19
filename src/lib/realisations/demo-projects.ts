import type { GalleryManifest } from "./gallery";

// Private provenance: displayed in the authenticated editor, never in public copy.
export const demoProjectNotice = "Projet fictif - images generees. Ce n'est pas un chantier A2E.";

type DemoPhoto = { id: string; kind: "image"; url: string; title: string; alt: string };
type DemoProject = { id: string; title: string; city: string; type: string; description: string; duration: string; budget: string; tags: string[]; active: false; media: DemoPhoto[]; photos: []; galleryManifest: GalleryManifest };

const photo = (city: string, label: string, state: "avant" | "apres", description: string): DemoPhoto => ({
  id: `demo-media-77-${city}-${state}`,
  kind: "image",
  url: `/branding/realisations-demo/${city}-${state}.webp`,
  title: `${label} - ${state === "avant" ? "avant envisage" : "apres projete"}`,
  alt: `Inspiration de renovation : ${description}`
});

function project(city: string, fields: Omit<DemoProject, "id" | "duration" | "budget" | "active" | "media" | "photos" | "galleryManifest">, before: string, after: string): DemoProject {
  const media = [photo(city, fields.title, "avant", before), photo(city, fields.title, "apres", after)];
  return {
    ...fields, id: `demo-realisation-77-${city}`, duration: "", budget: "", active: false, media, photos: [],
    galleryManifest: { version: 1, order: media.map(asset => asset.id), roles: { [media[0].id]: "before", [media[1].id]: "after" }, coverId: media[1].id, comparisonConfirmed: true }
  };
}

// One source for the inspiration collection and the explicit, draft-only import.
export const demoProjects: DemoProject[] = [
  project("melun", {
    title: "Maison en pierre : retrouver la lumiere", city: "Melun (77)", type: "Renovation interieure",
    description: "Une intention pour une maison en pierre : reveler le mur existant, eclaircir les enduits et apporter la chaleur d'un parquet chene. La poutre et les ouvertures guident l'amenagement. Supports, humidite et reseaux sont a etudier avant de concretiser ce projet chez vous.",
    tags: ["Maison en pierre", "Sejour", "Lumiere", "Chene"]
  }, "sejour d'une maison en pierre, carrelage brun et enduits a reprendre, avant envisage", "meme sejour, mur en pierre, enduits clairs et parquet chene, apres projete"),
  project("meaux", {
    title: "Pavillon des annees 80 : repenser la cuisine", city: "Meaux (77)", type: "Cuisine et sejour",
    description: "Repenser une cuisine en L autour de facades claires, de touches de chene et d'un sol mineral. L'implantation accompagne les ouvertures sur le jardin et relie cuisine et sejour. Raccordements, electricite et ventilation sont a verifier pour adapter cette idee a votre maison.",
    tags: ["Pavillon", "Cuisine", "Agencement", "Sol mineral"]
  }, "cuisine en L, meubles bois et sol terre cuite, avant envisage", "meme cuisine en L, facades claires, meubles hauts chene et sol mineral, apres projete"),
  project("fontainebleau", {
    title: "Maison : transformer la salle de bain", city: "Fontainebleau (77)", type: "Salle de bain",
    description: "Imaginer une salle d'eau plus ouverte avec une douche vitree, un meuble en chene et des revetements clairs. La fenetre reste au coeur de la composition. Evacuations, etancheite, ventilation et supports determineront les choix techniques de votre projet.",
    tags: ["Maison", "Douche", "Chene", "Revetements clairs"]
  }, "salle de bain avec baignoire et carrelage peche, avant envisage", "meme salle de bain, douche vitree, meuble chene et carrelage clair, apres projete")
];

export const isGeneratedDemoProject = (id: string) => demoProjects.some(item => item.id === id);
