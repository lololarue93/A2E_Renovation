import type { GalleryManifest } from "./gallery";

export const demoProjectNotice = "Projet fictif - images generees. Ce n'est pas un chantier A2E.";

type DemoPhoto = { id: string; kind: "image"; url: string; title: string; alt: string };
type DemoProject = { id: string; title: string; city: string; type: string; description: string; duration: string; budget: string; tags: string[]; active: false; media: DemoPhoto[]; photos: []; galleryManifest: GalleryManifest };

const photo = (city: string, label: string, state: "avant" | "apres", description: string): DemoPhoto => ({
  id: `demo-media-77-${city}-${state}`,
  kind: "image",
  url: `/branding/realisations-demo/${city}-${state}.webp`,
  title: `${label} - ${state === "avant" ? "etat initial imagine" : "projet imagine"} (image generee)`,
  alt: `Image generee, projet fictif : ${description}`
});

function project(city: string, fields: Omit<DemoProject, "id" | "duration" | "budget" | "active" | "media" | "photos" | "galleryManifest">, before: string, after: string): DemoProject {
  const media = [photo(city, fields.title, "avant", before), photo(city, fields.title, "apres", after)];
  return {
    ...fields, id: `demo-realisation-77-${city}`, duration: "", budget: "", active: false, media, photos: [],
    galleryManifest: { version: 1, order: media.map(asset => asset.id), roles: { [media[0].id]: "before", [media[1].id]: "after" }, coverId: media[1].id, comparisonConfirmed: true }
  };
}

// One source for the local preview and the explicit, draft-only admin import.
export const demoProjects: DemoProject[] = [
  project("melun", {
    title: "Maison en pierre : retrouver la lumiere", city: "Melun (77)", type: "Renovation interieure",
    description: `${demoProjectNotice} Scenario d'une maison en pierre : nettoyer et rejointoyer le mur existant, reprendre les enduits et renouveler le sol. La poutre, les volumes et les ouvertures sont conserves. Les vues montrent une intention de renovation ; les supports, l'humidite et les reseaux resteraient a diagnostiquer sur place.`,
    tags: ["Maison en pierre", "Sejour", "Projet fictif", "Images generees"]
  }, "sejour d'une maison en pierre a Melun, carrelage brun et enduits fatigues, avant imagine", "meme sejour, mur en pierre conserve, enduits clairs et parquet chene, apres imagine"),
  project("meaux", {
    title: "Pavillon des annees 80 : repenser la cuisine", city: "Meaux (77)", type: "Cuisine et sejour",
    description: `${demoProjectNotice} Scenario d'un pavillon des annees 80 : remplacer la cuisine en L, harmoniser le carrelage et les peintures, adapter les raccordements aux nouveaux equipements. L'implantation generale et les ouvertures vers le jardin restent identiques. Electricite, ventilation et plomberie seraient verifies avant tout devis.`,
    tags: ["Pavillon", "Cuisine", "Projet fictif", "Images generees"]
  }, "cuisine en L d'un pavillon a Meaux, meubles bois anciens et sol terre cuite, avant imagine", "meme cuisine en L, facades claires, meubles hauts chene et sol mineral, apres imagine"),
  project("fontainebleau", {
    title: "Maison : transformer la salle de bain", city: "Fontainebleau (77)", type: "Salle de bain",
    description: `${demoProjectNotice} Scenario d'une salle de bain de maison : remplacer la baignoire par une douche, renouveler le meuble vasque, le chauffage et les revetements. Les murs et la fenetre restent en place. La faisabilite dependrait des evacuations, de l'etancheite, de la ventilation et de l'etat du support.`,
    tags: ["Maison", "Douche", "Projet fictif", "Images generees"]
  }, "salle de bain de maison a Fontainebleau avec baignoire et carrelage peche, avant imagine", "meme salle de bain, douche et paroi vitree, meuble chene et carrelage clair, apres imagine")
];

export const isGeneratedDemoProject = (id: string) => demoProjects.some(item => item.id === id);
