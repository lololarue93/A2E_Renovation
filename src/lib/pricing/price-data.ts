export type ProjectType = "windows" | "insulation" | "electricity" | "plumbing" | "global" | "hvac" | "kitchen_bath" | "roofing" | "other";

export type PriceItem = {
  key: string;
  category: ProjectType;
  label: string;
  unit: "unit" | "m2" | "forfait" | "point";
  low: number;
  mid: number;
  high: number;
  reference?: string;
  description?: string;
  vatRate?: number;
};

// Base public demo prices: standard supply + installation assumptions, before the regional/access coefficient.
// They are deliberately editable from the admin price list.
export const priceItems: PriceItem[] = [
  { key: "window_pvc", category: "windows", label: "Fenêtre PVC double vitrage standard", unit: "unit", low: 400, mid: 550, high: 750 },
  { key: "window_alu", category: "windows", label: "Fenêtre aluminium standard", unit: "unit", low: 650, mid: 900, high: 1250 },
  { key: "window_wood", category: "windows", label: "Fenêtre bois", unit: "unit", low: 750, mid: 1100, high: 1550 },
  { key: "sliding_alu", category: "windows", label: "Baie coulissante aluminium", unit: "unit", low: 1800, mid: 2400, high: 3200 },
  { key: "bay_pvc", category: "windows", label: "Baie vitrée PVC", unit: "unit", low: 1600, mid: 2300, high: 3500 },
  { key: "door_window_pvc", category: "windows", label: "Porte-fenêtre PVC", unit: "unit", low: 700, mid: 950, high: 1350 },
  { key: "entry_door_pvc", category: "windows", label: "Porte d'entrée PVC serrure 5 points", unit: "unit", low: 1500, mid: 2200, high: 3200 },
  { key: "entry_door_alu", category: "windows", label: "Porte d'entrée aluminium serrure 5 points", unit: "unit", low: 2200, mid: 3200, high: 4800 },
  { key: "shutter_manual", category: "windows", label: "Volet roulant manuel", unit: "unit", low: 300, mid: 450, high: 650 },
  { key: "shutter_motor", category: "windows", label: "Volet roulant motorisé radio type Somfy", unit: "unit", low: 450, mid: 650, high: 900 },
  { key: "pose_renovation", category: "windows", label: "Pack pose rénovation, réglages et étanchéité", unit: "unit", low: 120, mid: 180, high: 280 },
  { key: "pose_total", category: "windows", label: "Dépose totale et reprises périphériques", unit: "unit", low: 250, mid: 400, high: 600 },
  { key: "oscillo_battant", category: "windows", label: "Option oscillo-battant", unit: "unit", low: 60, mid: 100, high: 180 },
  { key: "acoustic", category: "windows", label: "Vitrage acoustique renforcé", unit: "unit", low: 100, mid: 180, high: 300 },
  { key: "oversize_joinery", category: "windows", label: "Grande dimension et manutention", unit: "unit", low: 100, mid: 200, high: 400 },

  { key: "ite_pse", category: "insulation", label: "ITE sous enduit PSE", unit: "m2", low: 110, mid: 150, high: 210 },
  { key: "ite_rockwool", category: "insulation", label: "ITE laine de roche", unit: "m2", low: 140, mid: 190, high: 260 },
  { key: "ite_cladding", category: "insulation", label: "ITE bardage", unit: "m2", low: 170, mid: 240, high: 330 },
  { key: "inside_wall", category: "insulation", label: "Isolation intérieure des murs", unit: "m2", low: 40, mid: 65, high: 100 },
  { key: "scaffold_simple", category: "insulation", label: "Échafaudage façade simple", unit: "m2", low: 15, mid: 28, high: 45 },

  { key: "electric_full", category: "electricity", label: "Réfection électrique complète", unit: "m2", low: 80, mid: 115, high: 165 },
  { key: "electric_partial", category: "electricity", label: "Mise en sécurité / rénovation partielle", unit: "m2", low: 40, mid: 65, high: 95 },
  { key: "electric_panel", category: "electricity", label: "Tableau électrique avec protections", unit: "forfait", low: 650, mid: 1100, high: 1900 },
  { key: "electric_point", category: "electricity", label: "Prise ou éclairage supplémentaire", unit: "point", low: 70, mid: 110, high: 180 },
  { key: "electric_cooktop", category: "electricity", label: "Ligne spécialisée plaque ou four", unit: "point", low: 180, mid: 300, high: 480 },
  { key: "electric_ev", category: "electricity", label: "Prise renforcée ou borne véhicule", unit: "point", low: 450, mid: 850, high: 1500 },
  { key: "electric_network", category: "electricity", label: "Prise réseau ou baie de communication", unit: "point", low: 120, mid: 190, high: 300 },

  { key: "plumbing_point", category: "plumbing", label: "Point eau chaude, froide et évacuation", unit: "point", low: 180, mid: 320, high: 550 },
  { key: "plumbing_distribution", category: "plumbing", label: "Distribution plomberie cuisine / salle d'eau", unit: "forfait", low: 600, mid: 1200, high: 2400 },
  { key: "water_heater_connection", category: "plumbing", label: "Raccordement chauffe-eau / attente technique", unit: "forfait", low: 300, mid: 600, high: 1100 },
  { key: "plumbing_shower", category: "plumbing", label: "Douche complète à alimenter", unit: "point", low: 500, mid: 850, high: 1450 },
  { key: "plumbing_bath", category: "plumbing", label: "Baignoire complète à alimenter", unit: "point", low: 600, mid: 1000, high: 1700 },
  { key: "plumbing_basin", category: "plumbing", label: "Lavabo ou vasque", unit: "point", low: 300, mid: 550, high: 900 },
  { key: "plumbing_wc", category: "plumbing", label: "WC", unit: "point", low: 300, mid: 550, high: 900 },
  { key: "plumbing_sink", category: "plumbing", label: "Évier cuisine", unit: "point", low: 350, mid: 650, high: 1050 },

  { key: "global_light", category: "global", label: "Rénovation légère", unit: "m2", low: 220, mid: 380, high: 650 },
  { key: "global_medium", category: "global", label: "Rénovation intermédiaire", unit: "m2", low: 550, mid: 850, high: 1200 },
  { key: "global_full", category: "global", label: "Rénovation complète", unit: "m2", low: 900, mid: 1250, high: 1800 },
  { key: "coordination", category: "global", label: "Coordination chantier TCE", unit: "forfait", low: 600, mid: 1200, high: 2800 },

  { key: "vmc_simple", category: "hvac", label: "VMC simple flux", unit: "forfait", low: 750, mid: 1200, high: 2100 },
  { key: "vmc_hygro", category: "hvac", label: "VMC hygroréglable", unit: "forfait", low: 1200, mid: 1900, high: 3000 },
  { key: "vmc_double", category: "hvac", label: "VMC double flux", unit: "forfait", low: 3500, mid: 6000, high: 10000 },
  { key: "pac_air_water", category: "hvac", label: "PAC air/eau", unit: "forfait", low: 8000, mid: 11500, high: 16500 },
  { key: "water_heater", category: "hvac", label: "Chauffe-eau thermodynamique", unit: "forfait", low: 2200, mid: 3300, high: 5000 },

  { key: "kitchen", category: "kitchen_bath", label: "Cuisine standard", unit: "m2", low: 700, mid: 1100, high: 1700 },
  { key: "bathroom", category: "kitchen_bath", label: "Salle de bain standard", unit: "m2", low: 750, mid: 1200, high: 1900 },
  { key: "italian_shower", category: "kitchen_bath", label: "Douche italienne", unit: "forfait", low: 1800, mid: 3000, high: 5500 },

  { key: "roof_repair", category: "roofing", label: "Reprise couverture ponctuelle", unit: "m2", low: 75, mid: 130, high: 220 },
  { key: "roof_renovation", category: "roofing", label: "Rénovation couverture complète", unit: "m2", low: 160, mid: 250, high: 380 },
  { key: "framework_repair", category: "roofing", label: "Reprise charpente ponctuelle", unit: "forfait", low: 1000, mid: 2400, high: 5500 }
];

priceItems.push(
  { key: "pac_air_air", category: "hvac", label: "PAC air/air dimension logement compact", unit: "forfait", low: 5000, mid: 7500, high: 10500, reference: "Daikin Perfera / Mitsubishi MSZ / équivalent", description: "Pour logement compact et besoin de chauffage modéré, après étude des volumes." },
  { key: "pac_air_water_large", category: "hvac", label: "PAC air/eau dimension maison grande surface", unit: "forfait", low: 10000, mid: 14000, high: 20000, reference: "Atlantic Alféa / Daikin Altherma / équivalent", description: "Dimensionnement à confirmer selon déperditions, émetteurs et eau chaude." }
);

export const pricingCoefficients = {
  region: { default: 1, ileDeFrance: 1.1, paris: 1.18 },
  access: { simple: 1, medium: 1.08, difficult: 1.18 },
  finish: { economy: 0.9, standard: 1, premium: 1.25 },
  urgency: { info: 1, normal: 1, fast: 1.1, urgent: 1.2 }
};

export const minimumIntervention = 900;
