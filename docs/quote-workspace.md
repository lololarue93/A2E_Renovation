# Atelier de cotation et catalogue A2E

## Parcours

- `/admin/prix` : lire, rechercher, ajouter et modifier le catalogue central ; importer ou exporter un fichier CSV.
- `/admin/cotations` : composer plusieurs prestations, saisir le client, ajuster quantites, prix et TVA, sauvegarder, restaurer et produire un PDF imprimable.
- `/admin/cotations?lead=<id>` : ouvrir depuis le suivi client ; les coordonnees et la ville du dossier sont reprises via l'API admin protegee. Les prestations restent a composer pour eviter de transformer silencieusement un ancien montant global en prix unitaire.
- Un poste catalogue copie les valeurs au moment de son ajout. Une modification ulterieure du catalogue ne change pas silencieusement un document deja prepare. Un prix modifie dans une cotation devient un prix personnalise pour ce document.
- Les dimensions s'appliquent uniquement aux surfaces : largeur en metres x hauteur en metres x nombre de surfaces. Aucun coefficient dimensionnel cache n'est applique aux autres unites.

## Montants et remise

La base fiscale est **a confirmer** par defaut : le catalogue historique ne precisait pas HT ou TTC. L'operateur peut choisir HT ou TTC. La TVA est calculee par ligne, avec son taux indicatif, apres remise. Les taux restent a verifier selon l'eligibilite du client et des travaux.

La remise est facultative, a 0 % par defaut, comprise entre 0 et 15 %. Un motif d'au moins trois caracteres est obligatoire lorsqu'elle est positive. Elle est appliquee une seule fois a chaque ligne avec arrondi aux centimes. Le total avant remise, la reduction et le total net restent visibles dans le PDF et le CSV. Elle ne se cumule pas automatiquement avec la configuration commerciale du simulateur public.

Les documents sont des cotations indicatives, non contractuelles. Les aides ne sont pas deduites ; les supports, metres, acces et references doivent etre confirmes lors de la visite technique. Le statut « Remis au client » est une qualification manuelle, pas une preuve d'envoi automatique.

## Persistance et migration

- Brouillon en cours : `localStorage`, cle `a2e.professional-quote.v1`, sur le navigateur utilise. Les informations du client restent donc sur cet appareil ; exporter le JSON ou enregistrer en base pour conserver une copie.
- Documents enregistres : PostgreSQL, table Prisma `PricingSettings`, cle `quote.<uuid>`, JSON version 1 valide cote serveur. Les anciennes sauvegardes sans champ remise restent lisibles avec une remise de 0 %.
- La liste presente les 100 cotations les plus recemment modifiees. Les fichiers JSON permettent aussi de restaurer un document exporte.
- Les cotations utilisent une table existante. Le catalogue au centime exige la migration `20261006180000_price_item_centimes` (low/mid/high vers Float). Une sauvegarde/restauration PostgreSQL inclut le catalogue, les cotations et le journal d'audit. Un volume navigateur ne remplace pas cette sauvegarde.
- Toute sauvegarde admin relit le document ou le catalogue depuis l'API avant d'afficher la confirmation de persistance.

## Format CSV catalogue

Exporter le catalogue donne le modele : `key;label;category;unit;low;mid;high;vatRate;reference;description`.

UTF-8 avec BOM, point-virgule pour Excel francais ; l'import accepte aussi la virgule comme separateur. Les champs contenant des guillemets, des separateurs ou des retours ligne sont proteges. Les cellules susceptibles d'etre interpretees comme formules sont neutralisees a l'export et restaurees a l'import.

La previsualisation valide toutes les lignes avant l'application. L'import revalide cote serveur puis utilise une transaction : les cles existantes sont modifiees, les nouvelles ajoutees. Il ne supprime ni ne reactive une ligne existante desactivee. Limites : 500 lignes, 500 Ko, cles minuscules/chiffres/underscores, categories et unites connues, `0 <= low <= mid <= high`, TVA 5,5/10/20 %. Les montants catalogue conservent les centimes (deux decimales). Appliquer la migration des colonnes de prix vers Float avant de sauvegarder ou importer un nouveau tarif avec centimes.

## API et autorisation

| Route | Fonction |
| --- | --- |
| `GET /api/admin/pricing` | Catalogue actif et indication de source (base ou demonstration sans base configuree) |
| `POST /api/admin/pricing` | Ajouter un tarif |
| `PUT /api/admin/pricing` | Modifier un tarif par cle |
| `POST /api/admin/pricing/import` | Importer un CSV atomiquement |
| `GET /api/admin/cotations` | Lister les cotations |
| `GET /api/admin/cotations?id=<uuid>` | Relire une cotation |
| `PUT /api/admin/cotations` | Valider et enregistrer un document |
| `POST /api/admin/cotations/export` | Recalculer et produire le PDF |

Les routes appliquent `requireAdmin` en complement du middleware. `ADMIN_EMAIL` et `ADMIN_PASSWORD` doivent etre definis ; le mot de passe d'exemple `change-me` est refuse. Sans base configuree ou lorsque celle-ci est indisponible, une sauvegarde retourne une erreur explicite et le brouillon local reste disponible. Le PDF peut etre genere sans stockage de cotation ; il utilise les lignes validees, jamais les totaux envoyes par le navigateur.

## Verification

Commandes disponibles sans modification des scripts package :

```powershell
node node_modules/tsx/dist/cli.mjs scripts/verify-quotations.ts
node node_modules/tsx/dist/cli.mjs scripts/verify-estimates.ts
node node_modules/tsx/dist/cli.mjs scripts/verify-admin-auth.ts
node node_modules/tsx/dist/cli.mjs scripts/verify-pdf-layout.ts
node node_modules/typescript/bin/tsc --noEmit
```

Les tests cotations couvrent quantites, metre, cumul multi-postes, duplication, suppression, centimes, TVA HT/TTC, remise appliquee une seule fois, validation, CSV reversible, refus d'acces admin et PDF multipage. La recette avec une base PostgreSQL doit verifier : modification d'un tarif, relecture, import, sauvegarde et ouverture d'une cotation, erreur API, puis ouverture apres redemarrage Docker.
