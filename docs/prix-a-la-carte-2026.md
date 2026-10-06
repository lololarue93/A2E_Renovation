# Chiffrage par quantites : electricite, plomberie et salle de bain

Releve du 6 octobre 2026. Les 25 nouvelles references sont des propositions de demonstration A2E, avec des perimetres precis. Elles ne sont ni des tarifs fournisseurs negocies, ni une moyenne statistique du marche francilien. Les ecarts de gamme, l'acces, la longueur des liaisons et les supports doivent etre verifies avant devis.

## Activation sans ecraser le catalogue entreprise

`src/lib/pricing/price-data.ts` exporte `detailedPriceKeys`, les 25 nouvelles cles. La demonstration locale les utilise. Le bootstrap de production les exclut de l'initialisation automatique : une entreprise ne doit pas publier des propositions non revues comme ses propres tarifs.

1. Exporter et sauvegarder le catalogue existant depuis `/admin` avant modification.
2. Relire uniquement `docs/prix-detail-a-la-carte-2026.csv` : fournitures, temps de pose, inclusions, exclusions et taux de TVA de scenario. Faire valider les prix par A2E et ses fournisseurs ; ajuster chaque ligne necessaire.
3. Suivre [migration-docker-premium.md](migration-docker-premium.md) : maintenir l'acces public en maintenance, appliquer les migrations et demarrer la nouvelle image sur les volumes existants. Ne pas reutiliser un ancien client Prisma apres la conversion des types de prix.
4. Depuis la gestion des prix de cette nouvelle image, importer ce fichier de 25 lignes. L'import met a jour ou cree les seules cles presentes et ne supprime aucune autre reference. Si une de ces nouvelles cles existe deja, son contenu sera remplace par la ligne importee : la comparer avec l'export prealable.
5. Recharger l'admin puis le simulateur et tester une prise, un tableau compose et un pack sanitaire. Confirmer la lecture depuis la base et les totaux avant de rouvrir l'acces public.

Ne pas importer le fichier complet `prix-references-2026.csv` en production pour cette activation : ses 80 references comprennent des prix historiques de demonstration et pourraient remplacer des tarifs existants. Ne pas lancer `prisma:seed` pour une mise a jour de prix en production. Aucune nouvelle migration Prisma n'est necessaire pour ces modes, stockes dans le JSON du projet.

Si les nouvelles references sont absentes du catalogue actif, le moteur refuse leur chiffrage. Il n'utilise pas les prix de demonstration en remplacement d'une ligne entreprise manquante. Les anciens dossiers continuent a fonctionner avec leurs cles historiques.

Reproduction des deux exports et verification aller-retour :

```powershell
node node_modules/tsx/dist/cli.mjs scripts/export-reference-prices.ts
```

## Regles de calcul

Les champs de mode sont optionnels. Leur absence conserve le calcul historique ; aucune transformation silencieuse des anciens dossiers n'est appliquee.

| Domaine | Modes | Contenu chiffre |
| --- | --- | --- |
| Electricite | `electricalMode: items` | Prises, points DCL, luminaires fournis, circuits dedies et RJ45, aux quantites saisies. Aucun m2 ni tableau automatique. |
| Electricite | `electricalMode: pack` | `room` : 4 prises + 1 point lumineux + 1 circuit dedie ; `apartment` : 12 prises + 5 points lumineux + 3 circuits dedies. Les tableaux et luminaires decoratifs sont exclus. |
| Tableau | `electricalPanel` | `none`, `1r4c`, `2r8c`, `3r12c`. Une ligne fourniture et une ligne pose. 1 rangee/4 circuits est un exemple de subdivision ou extension, pas la garantie d'un tableau principal conforme. |
| Plomberie | `plumbingMode: items` | Chaque sanitaire affiche une fourniture et une pose sur attentes existantes. Un point d'eau court est une prestation reseau sans appareil. |
| Plomberie | `plumbingMode: bathroom_pack` | 1 douche standard + 1 meuble simple vasque + 1 WC a poser ; six lignes fourniture/pose. Ni distribution complete, ni finitions automatiques. |
| Salle de bain | `bathroomMode: standard_pack` | Les trois sanitaires ci-dessus. Sol et murs s'ajoutent uniquement si `bathroomFloorArea` et/ou `bathroomWallArea` sont saisis. Reseau neuf, electricite et douche italienne exclus. |
| Salle de bain | `bathroomMode: finishes` | Sol et murs aux surfaces reelles seulement ; permet d'ajouter un lot plomberie distinct. |
| Historique | `legacy` ou champ absent | Les anciennes cles et leur calcul au catalogue courant sont conserves, avec un avertissement de perimetre. |

Un pack remplace les elements a la carte conserves dans le brouillon : ils ne s'ajoutent pas au pack. Le passage entre modes garde les valeurs pour les reutiliser. Un pack salle de bain et un lot plomberie couvrant les memes sanitaires sont refuses. Les points courts ne se cumulent pas avec la distribution complete, y compris via `customItems`. Les anciennes cles equivalentes et les options deja incluses ne peuvent pas contourner ces regles. La depose courante figure dans les lignes de pose ; une depose seule concerne un appareil distinct, sans repose.

Les coefficients d'acces et de delai sont appliques une seule fois aux lignes. Les totaux sont leur somme. Une cuisine nouvelle exige une surface propre a la piece dans `surfaces.kitchen_bath` ; elle ne reprend pas la surface du logement.

## Sources primaires et limites

Les prix de materiel grand public sont distincts des tarifs poses. Ils ne constituent pas une proposition d'approvisionnement A2E. Les fourchettes internes sont des hypotheses arrondies autour de reperes ponctuels ; elles ne doivent pas etre presentees comme les fourchettes publiees par les sources.

| Repere public observe | Base et perimetre | Usage dans les hypotheses |
| --- | --- | --- |
| [Leroy Merlin LEXMAN 2 rangees / 26 modules](https://www.leroymerlin.fr/produits/tableau-electrique-pre-equipe-et-precable-lexman-2-rangees-26-modules-t2-88918275.html) : 199 EUR | Materiel seul, 8 disjoncteurs, 2 differentiels ; porte et pose exclues. 26 modules ne signifie pas 26 circuits. | Ancrage d'une gamme de fourniture 2 rangees/8 circuits. |
| [Legrand tableau equipe T1/T2](https://www.legrand.fr/catalogue/tableau-electrique/tableau-electrique-equipe-special-pour-logement-t1-ou-t2) : 528,94 EUR | Prix conseille TTC, materiel seul. | Contrepoint de gamme ; aucun prix fournisseur garanti. |
| [JLC Renovation, electricite Paris](https://www.jlc-renov.com/guides/renovation-electrique-paris) : 900–2 000 EUR pour remplacement 2 rangees ; points apparents 55–100 EUR, encastres en cloison 70–130 EUR | TVA non precisee ; perimetre plus large qu'un coffret seul. | Controle de plausibilite, sans conversion HT/TTC. La pose du tableau et les liaisons limites restent des hypotheses A2E a valider. |
| [Leroy Merlin pose WC](https://www.leroymerlin.fr/services/tous-nos-services-autour-du-wc/pose-et-installation-de-wc-a-poser-ou-broyeur.html) : 249 EUR | Sous conditions et eligibilite TVA reduite, localisation variable ; depose, raccordement sur existant et evacuation courante ; WC exclu. | Point d'ancrage de la pose, sans reseau neuf. |
| [Leroy Merlin pose meuble salle de bains](https://www.leroymerlin.fr/services/tous-nos-services-autour-des-meubles-de-salle-de-bains/faire-poser-un-meuble-de-salle-de-bains/) : a partir de 289,01 EUR | Pose sous conditions ; produit et travaux supplementaires a verifier. | Repere de main-d'oeuvre seulement. |
| [Leroy Merlin pose cabine de douche](https://www.leroymerlin.fr/services/tous-nos-services-autour-de-douche/pose-et-installation-de-cabine-de-douche.html) : 569 EUR | TVA reduite sous conditions, raccordement existant ; depose courante incluse ; produit exclu. | Controle de plausibilite de la pose standard. Une cabine et un receveur/paroi ne sont pas des perimetres identiques : le devis doit preciser le dispositif. |
| [Leroy Merlin pose evier et robinet](https://www.leroymerlin.fr/services/tous-nos-services-autour-de-evier-et-robinet-de-cuisine/changer-un-evier-et-son-robinet.html) : 229 EUR | TVA reduite sous conditions ; depose et raccordement existant ; produit exclu. | Point d'ancrage de pose, hors reseau neuf et plan a modifier. |
| [Sensea Easy WC a poser](https://www.leroymerlin.fr/produits/salle-de-bains/wc/wc-a-poser/pack-wc-a-poser-sortie-universel-ouvert-easy-sureleve-sensea-81989263.html) : 229 EUR | Produit grand public seul, sans pose. | Fourniture WC standard, modele a choisir. |
| [Mob-In Hopp 60 cm, Conforama](https://www.conforama.fr/cuisine-salle-de-bain/meuble-de-salle-de-bain/salle-de-bain-pretes-a-emporter/meuble-hopp-60cm-chene-vasque-carree-blanche-et-robinet-mtc-2730/p/Z46768788) : 299 EUR | Meuble, vasque et robinet, sans pose. | Fourniture simple vasque ; miroir et adaptations a definir. |
| [Pack douche Livea / Leroy Merlin](https://www.leroymerlin.fr/produits/pack-douche-complet-paroi-walk-in-120x200-chrome-colonne-grohe-eurosmart-2-jets-receveur-marbre-coule-blanc-120x90-98333050.html) : 729,90 EUR promotion, 1 019,90 EUR reference affichee | Receveur, paroi et colonne, materiel seul, vendeur tiers Livea. | Promotion ponctuelle, pas prix permanent ni reference imposee. |
| [Baignoire Sensea Access Design 170 x 70 cm](https://www.leroymerlin.fr/produits/baignoire-rectangulaire-l-170x-l-70-cm-blanc-sensea-access-design-69157886.html) : 139 EUR | Baignoire seule, accessoires et pose exclus. | Ancrage du produit seul ; ensemble et main-d'oeuvre non observes, a valider. |
| [Rivet Creation, Paris / Rueil-Malmaison](https://www.groupe-rivet.com/plomberie-renovation/) : 1 030–1 860 EUR HT | Reseau eau froide/chaude et evacuations, fournitures comprises sauf mention contraire. | Distribution proposee 1 250/1 750/2 250 EUR au scenario TTC 20 %, arrondie ; metrage et perimetre a confirmer. |
| [Plombier autour de moi, creation point eau/evacuation](https://www.plombier-autourdemoi.fr/blog/prix-arrivee-eau-evacuation-machine-a-laver) : environ 300–800 EUR TTC | Installation simple proche du reseau, selon resultat indexe de la page ; ouverture complete indisponible au releve. | Repere moins robuste : la proposition de point court doit etre revue avec A2E, pas publiee comme tarif observe de l'entreprise. |

Les prix nouveaux sont libelles au scenario TTC 20 % pour rendre leur base comparable ; ce taux de demonstration ne determine pas le taux legal du client. Une source a TVA reduite n'est pas transposee au client automatiquement. Exemple de controle purement arithmetique : 249 / 1,10 x 1,20 = 271,64 EUR dans un scenario passant de 10 % a 20 %. Il ne faut pas ajouter de nouveau la TVA a un montant deja TTC. L'admin doit verifier la base et le taux applicables avant devis.

Les references `electric_luminaire_install`, `electric_network_point`, les variantes 1/3 rangees, `plumbing_bath_install`, `plumbing_sink_supply`, `plumbing_removal_only` et les finitions sol/mur restent des hypotheses A2E non validees par un tarif strictement comparable. Les liaisons 5 m / 10 m et le point d'eau 3 m definissent un perimetre propose, pas une longueur observee chez ces fournisseurs. Ces limites doivent etre revues par l'equipe terrain. Aucun forfait de piece complet n'est invente : les packs sont la somme des lignes effectivement retenues.

## Verification reproductible

```powershell
node node_modules/tsx/dist/cli.mjs scripts/verify-estimator-flow.ts
node node_modules/tsx/dist/cli.mjs scripts/verify-detailed-pricing.ts
node node_modules/tsx/dist/cli.mjs scripts/verify-estimates.ts
node node_modules/tsx/dist/cli.mjs scripts/verify-quotations.ts
node node_modules/typescript/bin/tsc --noEmit
```

Le test detaille genere uniquement un PDF local `docs/preview-tests/estimate-detailed.pdf` et son JSON, sans base de production ni notification. Il contient six lignes sanitaires fourniture/pose, 4,5 m2 de sol et 12 m2 de murs. Les tests couvrent panier vide, points/tableau, packs sans double compte, options historiques, prix admin au centime, surfaces independantes, heritage et aller-retour CSV. La mise en page du PDF doit aussi etre inspectee lors de la QA visuelle commune.
