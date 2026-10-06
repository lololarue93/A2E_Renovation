# A2E - Gestion commerciale et indicateurs

## Decision a soutenir

Le pilotage sert a transformer les demandes consenties en visites, puis en devis. Le nombre de pages vues ne suffit pas a mesurer ce resultat. La revue conseillee est hebdomadaire pour le parcours web, et quotidienne pour les dossiers a reprendre et les erreurs de notification.

Deux mesures principales sont retenues : les nouveaux dossiers consentis en base sur 30 jours et le nombre de dossiers consentis encore `nouveau` ou `a_rappeler`. Le statut `signe`/`gagne` complete le suivi commercial, mais il s'agit d'un etat renseigne par l'equipe, pas d'un chiffre d'affaires encaisse.

## Definitions effectivement implementees

La periode d'acquisition est constituee des 30 jours calendaires incluant aujourd'hui en `Europe/Paris`. Aujourd'hui est donc un jour partiel. Les bornes PostgreSQL sont `[minuit du premier jour, minuit de demain[`, converties en UTC avec les changements d'heure. Les ecrans ne remplacent pas une panne de base par des compteurs a zero.

| Mesure | Source et grain | Calcul | Decision utile / limite |
| --- | --- | --- | --- |
| Pages vues | `SiteEvent`, evenement `page_view`, hors chemins `/admin` | Nombre d'evenements sur la periode | Mesurer le volume suivi ; plusieurs pages d'une session comptent plusieurs fois. |
| Sessions identifiees | `SiteEvent.sessionId`, avec au moins une page vue | Identifiants distincts sur la periode | Fournir le denominateur des taux ; un navigateur/onglet ne represente pas une personne unique. |
| Entrees simulateur | `SiteEvent`, evenement `quote_started` | Nombre d'evenements sur la periode | Verifier que les visiteurs commencent effectivement a saisir. Les anciens evenements peuvent correspondre aux anciennes definitions de clic CTA. |
| Dossiers consentis | `Lead`, `consent = true`, `createdAt` | Nombre de lignes sur la periode | Mesurer les demandes effectivement sauvegardees ; ne depend pas de la presence d'un evenement analytics. |
| PDF telecharges | `SiteEvent`, evenement `pdf_downloaded` | Nombre d'evenements sur la periode | Mesurer l'usage du document. Le navigateur doit avoir recu le fichier ; la sauvegarde finale sur disque n'est pas observable par le site. |
| Taux d'entree simulateur | Sessions avec page vue, puis `quote_started` | Sessions entrantes / sessions avec page vue | Distinguer navigation et engagement. Une session compte une fois. |
| Taux de demande suivie | Sessions avec page vue, puis `lead_submitted` | Sessions avec demande / sessions avec page vue | Estimer l'engagement du trafic suivi, sans inclure les dossiers non instrumentes. |
| Simulateur vers demande | Sessions avec page vue, puis `quote_started`, puis `lead_submitted` | Sessions avec demande apres entree / sessions entrantes | Inspecter le passage au contact ; les parcours commences avant la periode ne sont pas attribues. |
| Pipeline commercial | `Lead`, `consent = true`, statut courant | Comptage par statut, toutes periodes | Organiser les relances ; la repartition est un instantane, pas une conversion de cohorte. |
| Notifications automatiques | `WebhookEvent`, noms `notification.leadCreated` / `notification.pdfGenerated` / `notification.contactCreated` | Comptage par `status`, selon la date de creation du journal sur la periode | Identifier `failed`, `pending`, `skipped`, `sent`. `sent` signifie accepte par le fournisseur, sans preuve de reception en boite. |
| Realisations reelles publiees | `Realisation`, `active = true`, hors identifiants `demo-realisation-*` | Nombre de fiches actives | Encourager une preuve chantier reelle ; un exemple de demonstration n'est pas une reference client. |

Les taux sont absents (`--`) lorsque le denominateur est nul. Le nombre d'evenements sans identifiant de session est affiche. Le suivi peut etre desactive et les anciens dossiers peuvent ne pas avoir de session : les taux portent donc sur le trafic mesure, et ne remplacent pas le nombre de dossiers stockes. Aucune personne unique, recette, certification ou score de performance n'est deduit de ces donnees.

La mesure du navigateur requiert un accord explicite. Sans accord, avec un refus ou apres expiration, aucune requete de mesure ni nouvel identifiant de session n'est cree. La preference et sa date restent dans `localStorage` pendant six mois calendaires ; l'identifiant n'existe dans `sessionStorage` qu'apres acceptation et est supprime au retrait. Le bouton de preferences du footer permet de changer le choix. Accepter et refuser ont la meme visibilite ; la banniere ne bloque pas le site et n'apparait pas dans l'admin.

Les visites, demarrages, clics et telechargements des visiteurs qui refusent sont absents des mesures, pas observes a zero. Les taux ne representent donc pas la totalite des visiteurs et peuvent comporter un biais de selection. Un dossier de contact reste enregistre au titre du suivi du projet meme si le client refuse la mesure d'audience : sa creation operationnelle peut etre journalisee sans identifiant de session, et reste exclue des taux de parcours par session. Les labels d'audience ne contiennent ni coordonnees, nom de client ou numero de dossier ; le referent est limite a son origine. L'API verifie l'accord explicite avant toute lecture ou ecriture en base pour les evenements navigateur.

Cette mise en oeuvre ne declare aucune exemption, certification ou validation CNIL. Reference officielle consultee : [Cookies : solutions pour les outils de mesure d'audience](https://www.cnil.fr/fr/cookies-solutions-pour-les-outils-de-mesure-daudience).

La courbe quotidienne des leads utilise `SiteEvent.lead_submitted`. Le compteur de dossiers utilise `Lead.consent`. Ces deux sources peuvent differer a cause du tracking, de l'ancien historique et des definitions ; elles sont nommees distinctement. Les volumes pages/simulateur/dossiers/PDF ne constituent pas un entonnoir de cohorte. Les trois taux de session utilisent au contraire l'identifiant et l'ordre des evenements.

## Actions et garde-fous

Les recommandations automatiques ont des declencheurs observes, sans seuil de conversion invente : erreur de notification, dossier nouveau/a rappeler, aucune page vue mesuree, aucune entree simulateur malgre des pages vues, aucune demande consentie malgre des entrees, absence de realisation reelle publiee. Elles proposent une verification, sans attribuer une cause certaine a un volume nul.

Il n'existe pas encore de cible chifffee validee. Une cible pourra etre definie apres plusieurs semaines de donnees stables et verification de l'instrumentation. Il faudra comparer des periodes completes, isoler les changements de definition et suivre la qualite des dossiers, pas seulement augmenter les clics.

Les garde-fous operationnels sont le consentement avant contact, la relecture apres sauvegarde, le refus d'une modification de statut devenue obsolete, les erreurs de livraison visibles et l'absence de compteur fictif pendant une indisponibilite.

## Gestion des dossiers et contenus

- `/admin#pipeline` : recherche, filtres de statut et de consentement, pages de 20 dossiers, estimation detaillee, suivi et notes internes.
- Les statuts restent dans `Lead.status`. Les notes sont des entrees `AuditLog` d'action `lead.note_added`, sans migration de schema. L'ecriture statut/note/journal est une transaction. Une ancienne valeur de statut retourne HTTP 409 sans ecraser la valeur courante.
- `/admin#gallery` : creation d'une fiche en brouillon, modification, publication puis association aux medias. Les brouillons sont disponibles dans le selecteur admin de medias.
- `/admin#settings` : un a vingt destinataires, telephone et liens sociaux. Les valeurs invalides sont refusees, les deux reglages et leur journal sont ecrits atomiquement. Une remise de 0 % reste 0 %.
- Les formulaires relisent les API apres sauvegarde. Une relecture non confirmee reste une erreur explicite. Les destinataires multiples et les tags conservent la saisie brute jusqu'a l'enregistrement.
- `/admin#audit` : journal sensible, exports, compteurs des notifications et healthcheck. Les mots de passe restent dans les variables Docker.

L'acces aux endpoints dossiers, realisations, medias et reglages applique `requireAdmin` cote serveur en plus du middleware. Des identifiants absents ou le mot de passe initial `change-me` refusent l'acces. Aucun role auditeur/operateur n'est presente comme fonctionnel : cette version utilise l'identifiant admin configure.

## Verification

`node node_modules/tsx/dist/cli.mjs scripts/verify-admin.ts` verifie les refus d'acces, la validation, les conflits CRM, statut et note apres relecture, creation/publication d'une fiche, sauvegarde et relecture des destinataires multiples, 0 %, URL invalide, erreurs 503, calculs de sessions et changements d'heure de Paris.

Ces tests emploient un double de stockage en memoire. Ils n'envoient aucun email et ne contactent aucune base de production. La verification PostgreSQL/Docker et les parcours navigateur restent des controles d'integration a effectuer avec une base de test, puis avec la stack deployee.

Le formulaire `/contact` conserve nom, telephone, email, type de travaux, ville et message avec accord explicite. Il cree un `Lead` et son `Project.details.message`, sans budget ni estimation artificielle. Le message est consultable dans le dossier CRM. Sa notification utilise les memes destinataires et le transport valide, avec le journal `notification.contactCreated` et une seule tentative par dossier. `scripts/verify-contact.ts` couvre ce parcours, les erreurs, le consentement et l'echappement HTML, sans envoi externe.

`scripts/verify-analytics-consent.ts` verifie l'absence de requete et d'identifiant avant accord et apres retrait, l'expiration de six mois, la suppression des anciens identifiants, l'exclusion admin, la minimisation des labels, la protection de l'API avant acces en base et le reglage global desactive. Les requetes reseau et le stockage sont doubles pour le test ; aucune requete externe n'est envoyee.

Fichiers sources : `src/app/admin/page.tsx`, `src/lib/admin/dashboard-metrics.ts`, `src/lib/admin/lead-status.ts`, `src/app/api/admin/leads/route.ts`, `src/app/api/admin/realisations/route.ts`, `src/app/api/admin/settings/route.ts` et les composants `src/components/admin`.
