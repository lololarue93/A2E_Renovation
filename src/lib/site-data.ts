import {
  BadgeCheck,
  Building2,
  ClipboardCheck,
  Droplets,
  Hammer,
  Home,
  Leaf,
  Phone,
  PlugZap,
  Ruler,
  ShieldCheck,
  Sparkles,
  Users,
  Wind,
  Wrench
} from "lucide-react";

export const siteSettings = {
  company: "A2E Rénovation",
  president: "Julien CHARRIERE",
  phone: "01 89 40 00 20",
  email: "contact@ags-a2e.com",
  executiveEmail: "julien.c@ags-a2e.com",
  social: "A2Erenovation",
  city: "Ile-de-France",
  region: "Île-de-France",
  tagline: "Fenêtres, isolation & rénovation intérieure : estimez votre projet en ligne",
  description:
    "A2E Rénovation cadre vos travaux poste par poste avec des matériaux lisibles, des packs de pose expliqués et une fourchette indicative avant le rendez-vous technique."
};

export const services = [
  {
    slug: "remplacement-fenetres",
    title: "Fenêtres & menuiseries",
    icon: Home,
    excerpt: "PVC, aluminium, bois, dimensions, oscillo-battant, volets roulants et pack pose adapté au support existant.",
    bullets: ["PVC, alu, bois, baie coulissante", "Pose rénovation ou dépose totale", "Vitrage acoustique et volets"],
    packs: ["Métré menuiserie", "Fourniture", "Dépose / pose", "Réglages et étanchéité"]
  },
  {
    slug: "isolation",
    title: "Isolation & ITE",
    icon: Leaf,
    excerpt: "ITE sous enduit, bardage, isolation intérieure et contraintes d'accès pour un chiffrage au mètre carré.",
    bullets: ["Surface m²", "Enduit, bardage ou intérieur", "Échafaudage et accès"],
    packs: ["Relevé façade", "Préparation support", "Isolant + finition", "Traitement points singuliers"]
  },
  {
    slug: "electricite",
    title: "Électricité",
    icon: PlugZap,
    excerpt: "Réfection complète, mise en sécurité, tableau électrique, prises, éclairages et adaptations techniques.",
    bullets: ["Prises et éclairages", "Circuits dédiés", "Tableau composé"],
    packs: ["Équipements à la carte", "Packs avec quantités", "Tableau séparé", "Essais et repérage"]
  },
  {
    slug: "plomberie",
    title: "Plomberie",
    icon: Droplets,
    excerpt: "Arrivées d'eau, évacuations, raccordements, cuisine, salle d'eau et attentes techniques.",
    bullets: ["Sanitaires à la carte", "Fourniture et pose", "Pack avec quantités"],
    packs: ["Repérage existant", "Alimentations", "Évacuations", "Mise en eau"]
  },
  {
    slug: "renovation-globale",
    title: "Rénovation globale",
    icon: Building2,
    excerpt: "Coordination des lots, rénovation énergétique et travaux complémentaires tout corps d'état.",
    bullets: ["Étude du projet", "Pilotage chantier", "Lots techniques"],
    packs: ["Cadrage TCE", "Planning", "Coordination", "Compte rendu"]
  },
  {
    slug: "pompe-a-chaleur-vmc",
    title: "PAC, VMC & chauffe-eau",
    icon: Wind,
    excerpt: "Solutions de chauffage, ventilation et eau chaude pensées pour améliorer le confort.",
    bullets: ["PAC air/eau", "VMC", "Chauffe-eau thermodynamique"],
    packs: ["Pré-visite", "Dimensionnement", "Installation", "Mise en service"]
  },
  {
    slug: "charpente-couverture",
    title: "Charpente & couverture",
    icon: Hammer,
    excerpt: "Reprises ponctuelles, rénovation de couverture, traitement des accès et points sensibles de toiture.",
    bullets: ["Surface toiture", "Accès", "Reprises charpente"],
    packs: ["Inspection", "Protection chantier", "Couverture", "Finitions"]
  },
  {
    slug: "cuisine-salle-de-bain",
    title: "Cuisine & salle de bain",
    icon: Wrench,
    excerpt: "Pièces techniques avec plomberie, électricité, carrelage, douche italienne et coordination des finitions.",
    bullets: ["Surface", "Plomberie", "Carrelage et finitions"],
    packs: ["Dépose", "Réseaux", "Revêtements", "Pose équipements"]
  }
];

export const trustBadges = [
  { label: "Prix expliqués", icon: Ruler, note: "Quantités, fournitures, options et pose à distinguer" },
  { label: "Métré sur place", icon: Home, note: "Dimensions et contraintes à confirmer avant devis" },
  { label: "Pose et finitions", icon: ClipboardCheck, note: "Un périmètre à préciser pour chaque poste" },
  { label: "Aides à étudier", icon: Leaf, note: "Éligibilité et démarches à vérifier selon le projet" },
  { label: "Documents à vérifier", icon: ShieldCheck, note: "Assurances et qualifications correspondant aux travaux" }
];
export const reasons = [
  "Choix techniques expliqués avant engagement",
  "Postes détaillés : fenêtres, ITE, électricité, plomberie, couverture",
  "Fourchettes expliquées par matériel, pose, options et contraintes",
  "Contact humain après estimation pour affiner sur place",
  "Information aides avec prudence, sans promesse non vérifiée",
  "Coordination chantier sérieuse et traçable"
];

export const realisations = [
  { title: "Remplacement fenêtres PVC maison", city: "Île-de-France", type: "Fenêtres", duration: "2 jours", budget: "8 000 à 14 000 EUR", tags: ["PVC", "Double vitrage", "Confort thermique"] },
  { title: "Fenêtres aluminium + baie vitrée", city: "Aulnay-sous-Bois", type: "Menuiseries", duration: "3 jours", budget: "12 000 à 22 000 EUR", tags: ["Aluminium", "Baie coulissante", "Lumière"] },
  { title: "ITE façade avant/après", city: "Île-de-France", type: "Isolation", duration: "3 semaines", budget: "28 000 à 48 000 EUR", tags: ["ITE", "Enduit", "Performance"] },
  { title: "Rénovation globale maison", city: "Île-de-France", type: "Rénovation globale", duration: "10 semaines", budget: "85 000 à 140 000 EUR", tags: ["TCE", "Isolation", "Chauffage"] },
  { title: "Salle de bain complète", city: "Livry-Gargan", type: "Salle de bain", duration: "2 semaines", budget: "11 000 à 22 000 EUR", tags: ["Douche italienne", "Plomberie", "Carrelage"] },
  { title: "Cuisine rénovée", city: "Villepinte", type: "Cuisine", duration: "3 semaines", budget: "18 000 à 35 000 EUR", tags: ["Cuisine", "Électricité", "Sols"] }
];

export const team = [
  { name: siteSettings.president, role: "Direction A2E", bio: "Votre point d'entrée pour présenter le projet et identifier les interlocuteurs adaptés aux travaux.", specialties: ["Projet", "Échange", "Coordination"] }
];
export const quickStats = [
  { label: "Pré-devis indicatif", value: "À votre rythme", icon: Sparkles },
  { label: "Contact direct", value: siteSettings.phone, icon: Phone },
  { label: "Équipe projet", value: "A2E", icon: Users }
];
