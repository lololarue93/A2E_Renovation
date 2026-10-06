# CRM de prospection A2E

## Source canonique

La table `Lead` reste la base unique des dossiers : demandes du simulateur (`website-simulator`), contact (`website-contact`) et saisies manuelles. Une saisie manuelle ne cree ni estimation, ni evenement d'acquisition, ni email automatique. Il n'existe pas de table parallele de contacts ni de synchronisation vers un service externe.

Le nom ou l'entreprise et un email ou telephone sont obligatoires. La ville, le budget et l'autorisation de contact peuvent rester non renseignes ; l'autorisation est fausse par defaut. Les sources manuelles proposees sont `manual`, `telephone`, `recommandation`, `reseau`, `salon`, `partenaire`. L'origine d'une demande web reste identifiable. Un dossier represente un projet : les coordonnees ne servent pas a fusionner automatiquement plusieurs demandes de la meme personne.

## Schema et migration

Migration additive : `prisma/migrations/20261006223000_lead_crm_followup/migration.sql`.

- `Lead.company` : entreprise facultative.
- `Lead.nextAction` et `Lead.nextActionAt` : une action courante et son echeance requetable en base. Les deux sont renseignes ensemble ou effaces ensemble.
- `Lead.crmVersion` : entier initialise a zero, incremente par le suivi admin. Il sert a refuser une edition obsolete meme lorsque le statut n'a pas change.
- `LeadActivity` : historique interne append-only (`note`, `call`, `email`, `visit`), date de l'echange, date de saisie et acteur admin.
- Index `Lead(status, nextActionAt)`, `Lead(sourceLead)` et `LeadActivity(leadId, occurredAt)`.

Les anciens leads gardent leurs valeurs et recoivent `crmVersion = 0`. Les anciennes notes `AuditLog` restent lisibles : aucune reprise destructive n'est necessaire. Aucun endpoint de suppression de prospect ou d'activite n'est ajoute.

`prisma generate` et `prisma validate` ont ete verifies localement. PostgreSQL et Docker ne sont pas disponibles localement : `prisma migrate deploy` n'a donc pas ete execute ici. Le workflow de validation contient un PostgreSQL de test et une etape `prisma migrate deploy`; seul un resultat CI reussi pourra confirmer cette integration. Avant ouverture de la nouvelle interface dans la stack deployee, appliquer la migration avec `pnpm exec prisma migrate deploy` selon le guide Docker. Ne pas employer `migrate dev` en production.

## Utilisation

- `/admin#pipeline` : base complete, recherche nom/entreprise/coordonnees/ville/travaux, filtres origine, statut, autorisation et echeance, pages de vingt dossiers.
- `/admin?create=prospect#pipeline` : ouvre la saisie manuelle.
- `/admin?due=overdue#pipeline` : actions en retard.
- `/admin?due=today#pipeline` : actions du jour.
- `/admin?lead=<id>#pipeline` : ouvre un dossier precis.

Sur mobile, le dossier selectionne remplace la liste. Le retour a la file conserve les filtres. Le dossier permet de modifier les coordonnees, le statut, la prochaine action et de declarer un echange passe. `Action realisee` consigne une note et efface l'action courante ; ce bouton attend que les autres modifications soient enregistrees. Les anciens comptes rendus sont conserves.

Les liens telephone et email n'apparaissent que lorsque l'autorisation de contact est confirmee. Ils ouvrent l'application de l'operateur ; ils n'envoient rien et ne declarent pas un appel ou un email comme effectue. Un email declare dans l'historique n'est pas une preuve technique d'envoi ou de reception. Cette version n'implemente ni relance automatique, ni calendrier externe, ni attribution multi-operateur, ni politique automatisee de conservation. Les roles restent ceux effectivement proteges par l'authentification admin existante.

## Echeances et compteurs

`src/lib/admin/crm.ts` expose `crmDueWindow(now)` et `crmDueWhere(filter, now)` pour le dashboard et l'API. Les jours sont ceux de `Europe/Paris`, avec bornes UTC correctes lors des changements d'heure.

Les statuts ouverts sont `nouveau`, `a_rappeler`, `visite_a_planifier`, `devis_a_preparer`, `devis_envoye`. Les dossiers signes, gagnes ou perdus restent consultables mais sont exclus de la file de prospection.

- En retard : date strictement avant minuit de Paris aujourd'hui.
- Aujourd'hui : date comprise entre minuit d'aujourd'hui inclus et minuit de demain exclu.
- A venir : date a partir de minuit de demain.
- Action a definir : aucune date, parmi les statuts ouverts.

Les trois compteurs du CRM tiennent compte de la recherche et du filtre d'autorisation. Ils portent sur toutes les origines et tous les statuts ouverts ; leur perimetre est indique sous les compteurs. Les filtres origine/statut/echeance filtrent la liste. Les compteurs operationnels du dashboard concernent la base canonique et ne sont pas des conversions d'acquisition. Une panne retourne HTTP 503 et affiche `--`, sans fabriquer un volume nul.

## Sauvegarde et conflits

Chaque ecriture est protegee par `requireAdmin` cote serveur, validee, transactionnelle et journalisee. Le navigateur relit le dossier avant d'afficher un succes ; il controle les coordonnees, le statut, l'action, la revision et la presence de l'activite creee. Une erreur garde la saisie. Un rechargement du dossier peut conserver les modifications a verifier avant nouvelle sauvegarde.

La creation manuelle utilise un identifiant de requete UUID stable, donnant un identifiant canonique `crm-<UUID>`. Une nouvelle tentative identique retourne le meme dossier et n'ajoute pas de note initiale. L'empreinte SHA-256 du contenu initial est conservee dans `AuditLog`, action `lead.manual_created`. Reutiliser la requete avec un contenu modifie retourne HTTP 409 et l'identifiant du dossier existant. L'interface propose de reprendre cette nouvelle saisie dans ce dossier via une modification versionnee, sans duplication ni effacement silencieux.

Les modifications du formulaire utilisent `expectedVersion` et `previousStatus`. Une revision ou un statut obsolete retourne HTTP 409 avant toute note ou activite. Les anciens appels statut/note restent compatibles ; les nouvelles editions de coordonnees/actions/activites exigent une version. L'API ne declenche ni notification ni evenement analytics pour ces donnees commerciales.

Les cent derniers echanges du dossier sont charges, avec les anciennes notes disponibles. Les dates declarees sont affichees en jours de Paris ; elles ne constituent pas une capture automatique des conversations.

## Verification

`node node_modules/tsx/dist/cli.mjs scripts/verify-crm.ts` couvre : autorisation avant lecture, creation idempotente, reprise modifiee refusee sans doublon, nom/entreprise, email ou telephone, consentement, dates Paris et DST, relecture, historique note/appel/email/visite, edition des coordonnees, conflits de version, filtres origines/relances/statuts et erreurs 503.

Le test emploie une base en memoire et interdit les appels reseau externes. Il n'envoie aucun email, n'ecrit aucun fichier media et ne contacte pas la base de production. `scripts/verify-admin.ts` conserve les controles de compatibilite de l'ancien suivi. Les parcours navigateur et le deploy de migration PostgreSQL restent des validations d'integration.
