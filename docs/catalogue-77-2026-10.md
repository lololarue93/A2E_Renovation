# Catalogue 77 : reperes publics et hypotheses de chiffrage

Consultation web : 19 octobre 2026. Perimetre prioritaire : Seine-et-Marne, puis IDF et materiel national livrable sous conditions.
Ce releve documente des observations ponctuelles, pas une moyenne BTP du departement ni un tarif fournisseur negocie A2E.
La date de consultation ne vaut pas date de publication, de mise a jour ou de validite commerciale de la source.
Plusieurs pages sont indexees ; sans panier local, devis et disponibilite confirmes, leur prix ne garantit pas un achat actuel en 77.

## Ce qui est actif dans le code

- Source des valeurs de demonstration : `src/lib/pricing/price-data.ts`, 80 references dont 25 detaillees.
- Quinze descriptifs/references ont ete revus pour expliciter fournitures, pose, liaisons, exclusions et comparabilite.
- Aucun montant bas/central/haut n'a ete modifie : les reperes trouves ne valident pas exactement les memes perimetres.
- Les 25 lignes detaillees et les six ancres qui decrivent explicitement un scenario TTC 20 % portent ce taux dans les fichiers de reference. Correction du 19/10 : `ite_pse`, `ite_rockwool`, `ite_graphite`, `ite_wood`, `pac_air_water` et `electric_full` exportaient auparavant 10 % par defaut malgre leur descriptif. Montants inchanges ; aucun changement du defaut historique des autres lignes. Ce scenario ne determine pas la TVA du chantier du client.
- L'apercu local a recu les 80 references par import explicite de recette. Les montants entreprise en base restent la source active : cette correction des fichiers ne change aucun prix ni taux deja enregistre et ne lance aucun import automatique ou seed sur le NAS. Relire aussi les taux des anciennes lignes dans l'admin.

## Nature de la base chargee

Catalogue de depart A2E : hypotheses internes de perimetre, fourchettes et gammes,
avec quelques ancres recoupees dans le benchmark IDF et les comparaisons 77 ci-dessous.
Aucune base Batiprix/BatiChiffrage, facture A2E ou grille fournisseur negociee
n'a ete importee. Les 80 references ne sont donc pas 80 prix observes ou valides
par des devis locaux. La peinture fait partie du benchmark, mais aucun poste
peinture dedie n'est encore present dans le catalogue.

Avant devis, adapter reference exacte, achat net, temps de pose, deplacement,
frais, marge et TVA. L'administration et les imports CSV restent la source
operationnelle ; les reperes publics ne remplacent pas ces donnees entreprise.

## Observations primaires

Les liens ci-dessous pointent vers les professionnels, le fabricant ou le distributeur qui affichent leur propre offre.
HT et TTC restent distincts ; un prix de fourniture ne permet pas de deduire une main-d'oeuvre par soustraction.

| Source | Observation consultee | Base, perimetre et limite |
| --- | --- | --- |
| [S1 - SION ELEC, Coulommiers 77120](https://www.sionelec.fr/tarifs/) | Point existant 90-150 ; point neuf cable 110-185 ; tableau complet 1 500-3 500 EUR | HT, materiel standard et main-d'oeuvre. Longueur non indiquee. Deplacement generalement inclus pour chantier planifie selon leur FAQ. Pas prix A2E. |
| [S2 - Trixy, grille plomberie](https://trixy.pro/nos-tarifs-de-depannage-de-plomberie/) | Meuble vasque 370 ; evier 249 ; WC classique 480 EUR | HT, materiel et deplacement exclus. Zone 77 annoncee : deplacement courant 75 HT, urgence 100 HT ; creation de point eau sur devis. Depannage/remplacement, pas renovation globale. |
| [S3 - LEXMAN 88918273, 1 rangee](https://www.leroymerlin.fr/produits/tableau-electrique-pre-equipe-et-precable-lexman-1-rangee-13-modules-88918273.html) | 89,90 EUR, 3 disjoncteurs et un differentiel dans la composition | Materiel grand public TTC, pose/porte exclues. Ne correspond pas aux 4 circuits proposes par A2E. |
| [S4 - LEXMAN 88918275, 2 rangees](https://www.leroymerlin.fr/produits/tableau-electrique-pre-equipe-et-precable-lexman-2-rangees-26-modules-t2-88918275.html) | 199 EUR, 8 disjoncteurs et 2 differentiels | Materiel TTC, sans pose ni porte. Verifier calibres, disponibilite et prix magasin. 26 modules ne signifie pas 26 circuits. |
| [S5 - LEXMAN 88918277, 3 rangees](https://www.leroymerlin.fr/produits/tableau-electrique-pre-equipe-et-precable-lexman-3-rangees-39-modules-t4-88918277.html) | 270 EUR ; 11 disjoncteurs enumeres, 3 differentiels | Materiel TTC, pose/porte exclues. Ne correspond pas aux 12 circuits proposes par A2E. |
| [S6 - Legrand Drivia 0 930 55](https://www.legrand.fr/catalogue/tableau-electrique/tableau-electrique-equipe-special-pour-logement-t1-ou-t2) | 528,94 EUR conseille TTC | Fabricant, tableau 2 rangees equipe. Prix conseille et gamme distincte du LEXMAN ; pas proposition d'approvisionnement A2E. |
| [S7 - Pack Livea / LM 98333050](https://www.leroymerlin.fr/produits/pack-douche-complet-paroi-walk-in-120x200-chrome-colonne-grohe-eurosmart-2-jets-receveur-marbre-coule-blanc-120x90-98333050.html) | 620,40 EUR TTC en promotion, 1 019,90 barre ; livraison affichee des 69,90 EUR | Vendeur tiers Livea, exclusivite web, receveur 120x90, paroi 120x200 et colonne Grohe. Sans pose. Le precedent releve a 729,90 n'est pas reutilise comme prix courant. |
| [S8 - LM pose cabine de douche](https://www.leroymerlin.fr/services/tous-nos-services-autour-de-douche/pose-et-installation-de-cabine-de-douche.html) | 569 EUR affiches | TVA reduite sous conditions et localisation ; produit/livraison exclus. Cabine sur attentes existantes ; receveur encastre/coffrage exclus. Ne decrit pas la pose du pack S7. |
| [S9 - LM WC SENSEA Easy 81989263](https://www.leroymerlin.fr/produits/pack-wc-a-poser-sortie-universel-ouvert-easy-sureleve-sensea-81989263.html) | 229 EUR TTC affiches | Fourniture seule ; resultat indexe ancien. Montant et stock a reconfirmer en magasin avant devis. |
| [S10 - LM pose WC](https://www.leroymerlin.fr/services/tous-nos-services-autour-du-wc/pose-et-installation-de-wc-a-poser-ou-broyeur.html) | 249 EUR affiches | TVA reduite sous conditions/localisation, WC exclu. Depose et raccordement sans modification des reseaux. |
| [S11 - LM pose evier/robinet](https://www.leroymerlin.fr/services/tous-nos-services-autour-de-evier-et-robinet-de-cuisine/changer-un-evier-et-son-robinet.html) | 229 EUR affiches | TVA reduite sous conditions/localisation. Comprend certaines adaptations de plan bois ; plus large que notre exclusion de modification du plan. |

L'implantation locale de l'enseigne est verifiable a [Lognes 77185](https://www.leroymerlin.fr/magasins/lognes.html) et [Meaux / Chauconin-Neufmontiers 77124](https://www.leroymerlin.fr/magasins/meaux.html).
Elle ne prouve ni le stock de chaque reference, ni l'application des prix web ou des forfaits de pose a ces magasins.
La [page LM de pose meuble vasque](https://www.leroymerlin.fr/services/tous-nos-services-autour-des-meubles-de-salle-de-bains/faire-poser-un-meuble-de-salle-de-bains/) consultee ne permet plus de retrouver 289,01 EUR : ce chiffre historique est retire du descriptif actif.

## Lecture des quinze lignes revues

Chaque montant ci-dessous est l'hypothese A2E existante TTC 20 %, bas / central / haut ; il ne recopie pas automatiquement la source.

| Cle | EUR / unite | Statut de comparaison |
| --- | --- | --- |
| `electric_socket_replace` | 55 / 75 / 100 par point | S1 plus eleve et perimetre non identique ; temps/deplacement a valider. |
| `electric_socket_new` | 85 / 115 / 155 par point | S1 sans limite de longueur ; notre liaison 5 m est une hypothese interne. |
| `electric_light_point` | 85 / 115 / 160 par point | Hypothese DCL/liaison 5 m ; luminaire et commande supplementaire exclus. |
| `electric_dedicated_circuit` | 180 / 280 / 420 par circuit | Hypothese liaison 10 m + protection, usage a nommer ; appareil exclu. |
| `electric_panel_1r4c_supply` | 130 / 200 / 320 par tableau | S3 n'a que 3 disjoncteurs ; ne valide pas notre composition 4 circuits. |
| `electric_panel_2r8c_supply` | 200 / 350 / 550 par tableau | S4/S6 : deux reperes de gamme, sans garantie fournisseur. |
| `electric_panel_3r12c_supply` | 300 / 500 / 750 par tableau | S5 n'a que 11 disjoncteurs ; 12e circuit a composer et chiffrer. |
| `electric_panel_install` | 300 / 450 / 650 par intervention | Pose seule interne ; S1 tableau complet ne la valide pas. |
| `plumbing_water_point_v2` | 320 / 550 / 800 par point | Hypothese 3 m ; S2 sur devis. Ancien repere indirect non reconduit. |
| `plumbing_shower_supply` | 700 / 1 000 / 1 400 par ensemble | S7 ponctuel ; transport et reference exacte a deviser. |
| `plumbing_shower_install` | 620 / 750 / 1 000 par ensemble | S8 concerne une cabine ; pose du dispositif reel a etudier. |
| `plumbing_basin_install` | 320 / 400 / 550 par meuble | S2 hors materiel et deplacement ; aucun alignement TTC automatique. |
| `plumbing_wc_supply` | 200 / 250 / 350 par WC | S9 materiel seul, actualite locale a reconfirmer. |
| `plumbing_wc_install` | 280 / 350 / 500 par WC | S2/S10 non identiques ; deplacement et reseaux a preciser. |
| `plumbing_sink_install` | 250 / 350 / 500 par evier | S2 distingue robinet ; S11 peut inclure adaptation du plan. |

## Detail requis pour un chiffrage exploitable

1. Identifier l'appareil et sa reference : prise, luminaire client, plaque, four, WC, receveur, vasque, etc.
2. Separer fourniture de l'appareil, consommables, depose, pose, essais et evacuation ; noter ce qui est deja inclus.
3. Pour chaque circuit : usage, origine, longueur reelle, cheminement, protection et reserve du tableau.
4. Pour chaque liaison plomberie : nombre d'alimentations, materiau, longueur, diametre, pente et reseau existant.
5. Relever percements, supports, saignees, etancheite, reprises et finitions ; ne pas les supposer gratuits.
6. Indiquer explicitement transport, deplacement, stationnement et dechets quand ils s'appliquent, sans les ajouter deux fois.
7. Les seuils 3/5/10 m sont des perimetres proposes, pas des longueurs garanties par les professionnels cites.
8. Le catalogue accepte unite, point, m2 et forfait, pas metre lineaire : inscrire le metre dans le descriptif et faire chiffrer le hors-perimetre avant devis.
9. Aucun forfait de piece ne remplace ce detail : les packs restent la somme des lignes, sans ajouter un forfait reseau couvrant les memes liaisons.

Exemple arithmetique de comparaison uniquement : S2 meuble vasque 370 HT + deplacement courant 77 de 75 HT = 445 HT hors materiel, soit 534 TTC au scenario 20 %.
Ce calcul n'est ni le prix A2E, ni une determination du taux applicable ; le prix TTC a 10 % de la source ne doit pas recevoir de nouveau 20 % de TVA.
Autre controle : S1 point neuf 110-185 HT donne 132-222 TTC au scenario 20 %, sans prouver une prestation limitee a 5 m.

## Import de prix et documents

- L'admin accepte des CSV de 500 lignes et 500 Ko maximum, avec apercu avant application ; l'import cree/met a jour sans suppression.
- L'apercu permet maintenant de lire toutes les lignes et leurs descriptifs, references, unites et TVA.
- La relecture apres import compare tous les champs du catalogue, au lieu des seuls trois montants.
- Un PDF/devis fournisseur n'est pas analyse automatiquement : reporter les lignes verifiees dans le CSV exporte, conserver le document source et dater la reference.
- Sauvegarder l'export entreprise avant import, comparer les cles existantes et valider les prix avec A2E.
- `prix-detail-a-la-carte-2026.csv` contient les 25 lignes detaillees ; meme ce fichier remplace toute cle deja presente et exige une revue.
- `prix-references-2026.csv` contient les 80 valeurs de demonstration ; ce n'est pas une mise a jour aveugle du catalogue entreprise.

## Reproduction et limites

```powershell
node node_modules/tsx/dist/cli.mjs scripts/export-reference-prices.ts
node node_modules/tsx/dist/cli.mjs scripts/verify-detailed-pricing.ts
node node_modules/tsx/dist/cli.mjs scripts/verify-estimates.ts
```

L'export valide et relit les deux CSV sans perte de prix, unite, description, reference ou taux de TVA.
Restent a obtenir : bordereau fournisseur date, remise professionnelle, cout horaire A2E, temps terrain, frais de deplacement, stock local et devis comparables.
Ce releve cible electricite et sanitaires ; menuiseries, ITE, toiture, cuisine et PAC ne sont pas declares actualises pour le 77 par cette revue.
