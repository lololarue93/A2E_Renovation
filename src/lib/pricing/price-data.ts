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

// Demonstration defaults, observed 2026-10-06; selected scopes reviewed 2026-10-19.
// Public observations and differences from these hypotheses: docs/catalogue-77-2026-10.md.
// Only documented anchors below are market-backed; none is a negotiated A2E supplier price.
// Admin database prices are authoritative and are never overwritten by production bootstrap.
const initialItems: PriceItem[] = [
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

initialItems.push(
  { key: "pac_air_air", category: "hvac", label: "PAC air/air dimension logement compact", unit: "forfait", low: 5000, mid: 7500, high: 10500, reference: "Daikin Perfera / Mitsubishi MSZ / équivalent", description: "Pour logement compact et besoin de chauffage modéré, après étude des volumes." },
  { key: "pac_air_water_large", category: "hvac", label: "PAC air/eau dimension maison grande surface", unit: "forfait", low: 10000, mid: 14000, high: 20000, reference: "Atlantic Alféa / Daikin Altherma / équivalent", description: "Dimensionnement à confirmer selon déperditions, émetteurs et eau chaude." }
);

initialItems.push(
 { key: "ite_graphite", category: "insulation", label: "ITE PSE graphité sous enduit", unit: "m2", low: 130, mid: 150, high: 170 },
 { key: "ite_wood", category: "insulation", label: "ITE fibre de bois sous enduit", unit: "m2", low: 160, mid: 190, high: 220 },
 { key: "door_window_alu", category: "windows", label: "Porte-fenêtre aluminium, fourniture", unit: "unit", low: 1000, mid: 1450, high: 2000 }
);

// New detailed keys are separate from historical tariffs. Never overwrite a live
// company's prices to activate them: review/import missing keys in the admin.
const detailedItems: PriceItem[] = [
 {key:"electric_socket_replace",category:"electricity",label:"Remplacement d’une prise existante",unit:"point",low:55,mid:75,high:100,reference:"Prise 2P+T standard · remplacement",description:"Remplacement sur boîte et conducteurs existants compatibles, avec essais. Fourniture standard et pose incluses ; nouvelle liaison, tableau et peinture exclus. Hypothèse TTC 20 % à confirmer après contrôle du support, de la compatibilité et du déplacement."},
 {key:"electric_socket_new",category:"electricity",label:"Prise standard · fourniture et pose",unit:"point",low:85,mid:115,high:155,reference:"Prise 2P+T · liaison indicative à dimensionner",description:"Prise 2P+T standard, câble, consommables et pose pour une liaison indicative jusqu’à 5 m sur circuit existant compatible. Circuit dédié, tableau et peinture exclus. Hypothèse TTC 20 % à confirmer ; cheminement et longueur réelle à relever avant devis."},
 {key:"electric_light_point",category:"electricity",label:"Point lumineux avec DCL · hors luminaire",unit:"point",low:85,mid:115,high:160,reference:"Hypothèse A2E pour le 77 · périmètre revu 19/10/2026",description:"Un point DCL, liaison jusqu’à 5 m et pose sur circuit existant compatible. Luminaire, pose du luminaire, commande supplémentaire, tableau et peinture exclus. Quantifier la commande séparément si nécessaire ; ne pas compter deux fois la même liaison. Hypothèse TTC 20 % sans prix public local strictement comparable, longueur et cheminement à valider."},
 {key:"electric_luminaire_install",category:"electricity",label:"Pose d’un luminaire fourni par le client",unit:"unit",low:45,mid:70,high:110,description:"Fixation et raccordement d’un luminaire courant fourni par le client sur sortie existante. Création de point, lustre lourd, grande hauteur et matériel exclus. Hypothèse de démonstration TTC scénario 20 %, à valider avec A2E."},
 {key:"electric_dedicated_circuit",category:"electricity",label:"Circuit dédié · alimentation et protection",unit:"point",low:180,mid:280,high:420,reference:"Hypothèse A2E pour le 77 · périmètre revu 19/10/2026",description:"Un seul circuit pour un appareil identifié : câble/gaine jusqu’à 10 m, protection adaptée, raccordement et essais dans tableau compatible avec réserve. Appareil, nouveau tableau, terre à reprendre et finitions exclus. Indiquer usage, longueur réelle et cheminement ; un circuit ne couvre pas plusieurs appareils indépendants. Hypothèse TTC 20 % non validée par fournisseur, sans forfait de pièce ajouté."},
 {key:"electric_network_point",category:"electricity",label:"Point réseau RJ45 · liaison courte",unit:"point",low:100,mid:160,high:250,description:"Une prise RJ45 et liaison jusqu’à 10 m, pose courante. Baie de communication, équipement actif et reprises lourdes exclus. Base indicative TTC scénario 20 %, catégorie de câble et cheminement à confirmer."},
 {key:"electric_panel_1r4c_supply",category:"electricity",label:"Tableau 1 rangée · 4 circuits · fourniture",unit:"unit",low:130,mid:200,high:320,reference:"Coffret 1 rangée · protections à dimensionner",description:"Fourniture indicative d’un coffret 1 rangée avec composition cible de 4 disjoncteurs/circuits et différentiels à dimensionner selon l’installation. Pose, porte et création de circuits exclues. Hypothèse TTC 20 % à confirmer par devis fournisseur ; compatibilité et conformité à vérifier sur place."},
 {key:"electric_panel_2r8c_supply",category:"electricity",label:"Tableau 2 rangées · 8 circuits · fourniture",unit:"unit",low:200,mid:350,high:550,reference:"Coffret 2 rangées · protections à dimensionner",description:"Fourniture indicative d’un coffret 2 rangées avec composition cible de 8 disjoncteurs/circuits et différentiels à dimensionner selon l’installation. Pose, porte et nouvelles liaisons exclues. Hypothèse TTC 20 % à confirmer par devis fournisseur ; compatibilité et conformité à vérifier."},
 {key:"electric_panel_3r12c_supply",category:"electricity",label:"Tableau 3 rangées · 12 circuits · fourniture",unit:"unit",low:300,mid:500,high:750,reference:"Coffret 3 rangées · protections à dimensionner",description:"Fourniture indicative d’un coffret 3 rangées avec composition cible de 12 disjoncteurs/circuits et différentiels à dimensionner selon l’installation. Pose, porte et création de circuits exclues. Hypothèse TTC 20 % à confirmer par devis fournisseur ; capacité, compatibilité et conformité à vérifier."},
 {key:"electric_panel_install",category:"electricity",label:"Remplacement du tableau · pose et essais",unit:"forfait",low:300,mid:450,high:650,reference:"Pose du tableau fourni séparément · essais",description:"Dépose de l’ancien tableau, pose du tableau fourni séparément, repérage et raccordement des circuits existants, puis essais. Réfection des circuits, mise à niveau de la terre, branchement et Consuel exclus. Hypothèse de pose seule TTC 20 % à confirmer après diagnostic et inventaire des circuits."},
 {key:"plumbing_water_point_v2",category:"plumbing",label:"Création courte d’un point d’eau et évacuation",unit:"point",low:320,mid:550,high:800,reference:"Point d’eau court · métrage à confirmer",description:"Création d’un point d’eau et d’une évacuation sur une longueur indicative jusqu’à 3 m, avec tubes, raccords, pose et essais sur réseaux accessibles compatibles. Appareil sanitaire, meuble, pompe de relevage et reprises lourdes exclus. Ne pas cumuler avec une distribution couvrant le même parcours. Hypothèse TTC 20 % à valider ; diamètres, pente, alimentations et longueur à relever."},
 {key:"plumbing_distribution_v2",category:"plumbing",label:"Distribution eau et évacuations · choix explicite",unit:"forfait",low:1250,mid:1750,high:2250,description:"Reprise du réseau d’une pièce, eau froide/chaude et évacuations, hors sanitaires. Repère Rivet Création IDF 1 030–1 860 € HT ; scénario 20 % arrondi ici. Métré et parcours à définir. Ne pas cumuler avec points courts couvrant ce même réseau."},
 {key:"plumbing_shower_supply",category:"plumbing",label:"Douche standard · fourniture",unit:"unit",low:700,mid:1000,high:1400,reference:"Ensemble douche standard · modèle à sélectionner",description:"Fourniture indicative d’un receveur, d’une paroi et d’une colonne de gamme standard. Pose, carrelage, création de réseau et livraison exclus. Hypothèse TTC 20 % à confirmer selon dimensions, matériaux, modèle et disponibilité ; référence à sélectionner avant devis."},
 {key:"plumbing_shower_install",category:"plumbing",label:"Douche standard · dépose, pose et raccordement",unit:"unit",low:620,mid:750,high:1000,reference:"Pose d’ensemble douche · configuration à confirmer",description:"Dépose courante et pose de l’ensemble douche avec raccordement aux attentes existantes compatibles. Fourniture, réseau neuf, receveur encastré, coffrage, étanchéité technique et carrelage exclus. Hypothèse TTC 20 % à confirmer après choix du dispositif, contrôle des attentes et visite."},
 {key:"plumbing_basin_supply",category:"plumbing",label:"Meuble simple vasque et mitigeur · fourniture",unit:"unit",low:250,mid:400,high:650,description:"Meuble simple 60 cm, vasque et mitigeur standards, hors pose et réseau. Repère retail Mob-In/Conforama ensemble Hopp 60 cm 299 € TTC. Fourchette indicative TTC 20 % ; miroir et modèle exact à confirmer, pas prix fournisseur négocié."},
 {key:"plumbing_basin_install",category:"plumbing",label:"Meuble vasque · dépose, pose et raccordement",unit:"unit",low:320,mid:400,high:550,reference:"Pose meuble vasque · attentes existantes",description:"Dépose courante, fixation et raccordement d’un meuble vasque sur attentes existantes compatibles. Meuble, réseau neuf et reprises exclus. Évacuation de l’ancien meuble et déplacement à préciser. Hypothèse TTC 20 % à confirmer après contrôle du support et des raccordements."},
 {key:"plumbing_wc_supply",category:"plumbing",label:"WC à poser standard · fourniture",unit:"unit",low:200,mid:250,high:350,reference:"Matériel SENSEA Easy 81989263 · page consultée 19/10/2026",description:"WC à poser avec réservoir, mécanisme et abattant, hors pose. Page LM SENSEA Easy surélevé 81989263 : 229 EUR TTC affichés ; stock et prix magasin 77 à reconfirmer, page indexée ancienne. Hypothèse de gamme TTC 20 %, sans engagement fournisseur. Suspendu, broyeur, bâti-support et modification d’évacuation exclus."},
 {key:"plumbing_wc_install",category:"plumbing",label:"WC à poser · dépose, pose et raccordement",unit:"unit",low:280,mid:350,high:500,reference:"Pose WC · raccordement existant",description:"Dépose d’un WC à poser, raccordement sur attente existante sans déplacement du point et évacuation courante. WC et modification du réseau exclus. Déplacement à préciser. Hypothèse TTC 20 % à confirmer après contrôle de l’évacuation et des raccordements."},
 {key:"plumbing_bath_supply",category:"plumbing",label:"Baignoire et robinetterie standard · fourniture",unit:"unit",low:250,mid:450,high:750,description:"Baignoire acrylique standard, vidage et robinetterie courante, hors pose et réseau. Repère LM Access Design 170 × 70 cm 139 € pour la baignoire seule ; accessoires non inclus dans ce repère. Hypothèse d’ensemble TTC 20 % à valider."},
 {key:"plumbing_bath_install",category:"plumbing",label:"Baignoire · dépose, pose et raccordement",unit:"unit",low:450,mid:650,high:950,description:"Dépose courante, calage et raccordement sur attentes compatibles. Fourniture, création réseau, habillage et carrelage exclus. Hypothèse de démonstration TTC scénario 20 %, main-d’œuvre à confirmer par visite ; pas tarif professionnel observé."},
 {key:"plumbing_sink_supply",category:"plumbing",label:"Évier et mitigeur standard · fourniture",unit:"unit",low:150,mid:280,high:500,description:"Évier et mitigeur standards, hors meuble, plan de travail, pose et réseau. Hypothèse de gamme de démonstration TTC 20 %, référence et prix fournisseur à confirmer avant devis."},
 {key:"plumbing_sink_install",category:"plumbing",label:"Évier · dépose, pose et raccordement",unit:"unit",low:250,mid:350,high:500,reference:"Pose évier · attentes existantes",description:"Dépose courante, pose et raccordement d’un évier sur attentes existantes compatibles. Évier, mitigeur, modification du plan ou du réseau exclus. Réemploi du robinet, consommables et déplacement à préciser. Hypothèse TTC 20 % à confirmer après contrôle du plan et des raccordements."},
 {key:"plumbing_removal_only",category:"plumbing",label:"Dépose seule d’un sanitaire · sans repose",unit:"unit",low:100,mid:160,high:250,description:"Dépose et évacuation courante d’un appareil qui n’est pas repris par une ligne de pose. Ne pas ajouter pour les sanitaires dont la pose comprend déjà la dépose. Hypothèse de démonstration TTC 20 %, accès et traitement des déchets à confirmer."},
 {key:"bathroom_floor_finish",category:"kitchen_bath",label:"Sol salle de bain · finition standard",unit:"m2",low:80,mid:115,high:160,description:"Fourniture et pose de carrelage standard sur support préparé, surface réelle déclarée. Sanitaires, plomberie, électricité, démolition lourde et reprise structurelle exclus. Hypothèse de démonstration TTC 20 %, produit et préparation à valider."},
 {key:"bathroom_wall_finish",category:"kitchen_bath",label:"Murs salle de bain · faïence standard",unit:"m2",low:75,mid:110,high:150,description:"Fourniture et pose de faïence standard sur support préparé, surface réelle déclarée. Sanitaires, réseau, démolition lourde et étanchéité technique de douche italienne exclus. Hypothèse de démonstration TTC 20 %, produit et supports à valider."}
].map(item => ({...item, vatRate:20, reference:item.reference ?? "Repère public / hypothèse A2E · à valider"})) as PriceItem[];
export const detailedPriceKeys: readonly string[] = detailedItems.map(item=>item.key);
initialItems.push(...detailedItems);

// Complete descriptions survive CSV exports and production initialization.
// HT source conversion below is a displayed 20% scenario, not a determination of client VAT.
const calibrated: Record<string, Partial<PriceItem>> = {
 ite_pse: {low:120,mid:140,high:160,reference:"ITE sous enduit · PSE blanc à sélectionner",description:"PSE blanc indicatif, épaisseur 120–200 mm sous enduit, fourniture et pose. Hypothèse de prix TTC 20 % à confirmer ; support, tableaux, appuis, accès et échafaudage à vérifier avant devis."},
 ite_rockwool: {low:140,mid:160,high:180,reference:"ITE sous enduit · laine minérale à sélectionner",description:"Laine de roche indicative, épaisseur 120–200 mm sous enduit, fourniture et pose. Hypothèse TTC 20 % à confirmer ; épaisseur, résistance thermique, adaptations de façade et points singuliers à valider."},
 ite_graphite: {reference:"ITE sous enduit · PSE graphité à sélectionner",description:"PSE graphité indicatif, épaisseur 100–160 mm sous enduit, fourniture et pose. Hypothèse TTC 20 % à confirmer ; ne se cumule pas avec un autre isolant sur la même façade. Contraintes et résistance thermique à valider."},
 ite_wood: {reference:"ITE sous enduit · fibre de bois à sélectionner",description:"Fibre de bois indicative, épaisseur 120–200 mm sous enduit, fourniture et pose. Hypothèse TTC 20 % à confirmer ; référence, résistance thermique, fixation, reprises et points singuliers à valider après visite."},
 pac_air_water: {low:10000,mid:13000,high:16000,reference:"PAC air/eau · modèle et puissance à dimensionner",description:"Fourniture et installation d’une PAC air/eau, avant aides. Hypothèse TTC 20 % à confirmer ; dimensionnement selon déperditions, émetteurs, eau chaude, alimentation et dépose à vérifier. Aucune marque ni puissance garantie."},
 electric_full: {low:108,mid:144,high:180,label:"Réfection électrique, hors tableau et points additionnels",reference:"Réseaux et appareillage standard · tableau séparé",description:"Réseaux et appareillage standard, hors tableau et points additionnels listés séparément. Hypothèse indicative TTC 20 % à confirmer ; métré, circuits, protections et périmètre à vérifier."},
 window_alu: {label:"Fenêtre aluminium, fourniture indicative",reference:"Menuiserie aluminium · gamme à sélectionner",description:"Fourniture indicative d’une fenêtre aluminium double vitrage, hors pose et options chiffrées séparément. Hypothèse à confirmer par devis fournisseur ; dimensions, finition, vitrage et performance à sélectionner."},
 window_pvc: {label:"Fenêtre PVC double vitrage, fourniture indicative",description:"Fourniture PVC blanc et double vitrage standard, hors pose, dépose et options. Base de démonstration A2E ; aucun tarif fournisseur négocié confirmé. Référence, performance Uw et vitrage à sélectionner avant devis."},
 window_wood: {label:"Fenêtre bois, fourniture indicative",description:"Fourniture bois double vitrage, essence et finition à préciser. Pose et dépose séparées. Base de démonstration A2E à valider par devis fournisseur ; aucune référence imposée."},
 sliding_alu: {label:"Baie coulissante aluminium, fourniture indicative",reference:"Baie coulissante aluminium · gamme à sélectionner",description:"Fourniture indicative d’une baie coulissante aluminium, hors pose et manutention chiffrées séparément. Hypothèse à confirmer par devis fournisseur ; dimensions, vitrage, seuil et disponibilité à valider."},
 pose_renovation: {description:"Pose sur dormant existant sain, calage, fixation, réglages et étanchéité courante. Fourniture de l'ouvrant exclue. Reprises, accès spécial et évacuation à préciser. Hypothèse de démonstration A2E, à confirmer."},
 pose_total: {description:"Dépose du dormant existant, pose, réglages et reprises périphériques courantes. Fourniture de l'ouvrant exclue. Maçonnerie importante, peinture complète et accès spécial à chiffrer après visite."},
 scaffold_simple: {description:"Supplément d'échafaudage uniquement si absent du forfait ITE retenu. Montage, surface et durée à confirmer. Ne pas cumuler avec une prestation qui comprend déjà cet accès."},
 electric_panel: {description:"Tableau et protections, implantation et nombre de circuits à confirmer. Ligne séparée du lot réseau. Référence, calibres, Consuel et modifications de branchement à préciser."},
 plumbing_distribution: {description:"Distribution eau chaude/froide et évacuations courantes, hors sanitaires chiffrés séparément. Parcours, diamètres, encastrement, percements et reprises à relever ; éviter le cumul avec un forfait déjà complet."}
};
const scope: Record<ProjectType,string> = {
 windows:"Fourniture ou accessoire selon libellé, pose seulement sur les lignes de pose. Dimensions, finition, vitrage et performance à confirmer.",
 insulation:"Prestation d'isolation selon libellé. Surface de paroi réelle ; support, épaisseur, finition et inclusions à confirmer avant devis.",
 electricity:"Matériel et interventions électriques selon libellé. Nombre de circuits, protections et compatibilité existante à confirmer.",
 plumbing:"Point ou équipement suivant libellé. Gamme sanitaire, raccordements, évacuation et reprises à confirmer ; matériel exact à sélectionner.",
 global:"Budget de rénovation par surface habitable. Dépose, réseaux et finitions à préciser avec A2E. Peut recouvrir des lots détaillés ajoutés au panier : vérifier les doublons avant devis.",
 hvac:"Équipement, raccordements courants et mise en service suivant libellé. Dimensionnement, modèle, eau chaude et adaptations à confirmer.",
 kitchen_bath:"Budget par surface de pièce : réseaux, équipement standard et finitions à définir. Dépose, meubles, carrelage et références à confirmer ; éviter le cumul avec lots plomberie/électricité couvrant les mêmes travaux.",
 roofing:"Couverture ou charpente suivant libellé. Surface réelle, support, matériau, accès, protection et évacuation à préciser après visite.",
 other:"Périmètre à définir lors d'un échange avec A2E."
};
export const priceItems: PriceItem[] = initialItems.map(item=>({
 ...item,
 reference:item.reference ?? "Gamme et référence à choisir avec A2E",
 description:item.description ?? scope[item.category] + " Base indicative de démonstration, à valider avec les fournisseurs. TVA à confirmer.",
 ...calibrated[item.key]
}));

export const pricingCoefficients = {
  region: { default: 1, ileDeFrance: 1, paris: 1 },
  access: { simple: 1, medium: 1.08, difficult: 1.18 },
  finish: { economy: 0.9, standard: 1, premium: 1.25 },
  urgency: { info: 1, normal: 1, fast: 1.1, urgent: 1.2 }
};

export const minimumIntervention = 900;
