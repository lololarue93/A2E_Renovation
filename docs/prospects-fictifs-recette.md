# Trois prospects fictifs pour la recette locale

`scripts/import-local-demo-prospects.ts` ajoute trois dossiers a la base canonique `Lead`, avec une note interne et une trace d'import par dossier. Les noms commencent par `EXEMPLE`, les emails utilisent le domaine reserve `prospects.example.test`, les telephones sont vides et `consent` reste `false` a la creation.

| Dossier | Identifiant stable | Statut initial | Action initiale |
| --- | --- | --- | --- |
| EXEMPLE — Maison Melun | `crm-77000000-0000-4000-8000-000000000001` | A rappeler | Rappel fictif en retard de deux jours |
| EXEMPLE — Maison Meaux | `crm-77000000-0000-4000-8000-000000000002` | Visite a planifier | Dates de visite fictive a proposer aujourd'hui |
| EXEMPLE — Maison Fontainebleau | `crm-77000000-0000-4000-8000-000000000003` | Devis a preparer | Cotation de demonstration dans trois jours |

Les echeances sont calculees en jours de Paris lors de la premiere creation. Une nouvelle execution conserve chaque dossier deja present, y compris ses modifications, ses dates, son consentement et son historique. Elle ne remet pas les echeances a jour et ne recree pas les notes.

Depuis la racine du depot, sous PowerShell :

```powershell
$env:A2E_LOCAL_RECIPE = 'true'
node node_modules/tsx/dist/cli.mjs scripts/import-local-demo-prospects.ts --import
```

Le script lit les identifiants prives dans `.env.local`, sans les afficher. Il refuse toute base hors boucle locale, tout port autre que `55432` et tout nom de base ne commencant pas par `a2e_qa_`. L'opt-in et `--import` sont tous deux obligatoires.

L'import est transactionnel et ne modifie aucun dossier existant. Il n'appelle aucun endpoint HTTP, fournisseur email, webhook externe ou service de relance ; il ne cree ni estimation, ni evenement analytics. Il laisse les trois exemples en recette pour les parcourir dans `/admin#pipeline`. Aucun service n'est demarre ou redemarre par ce script.
