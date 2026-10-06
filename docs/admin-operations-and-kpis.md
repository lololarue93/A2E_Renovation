# A2E — Gestion commerciale et indicateurs

## Pilotage des demandes et des prospects

Le tableau sert à préparer des échanges, des visites et des devis. Les demandes web enregistrées sont distinguées des prospects saisis manuellement et du parcours mesuré après accord. Le CRM rassemble tous les dossiers, toutes sources et tous accords de contact ; les demandes du formulaire exigent toujours l'accord pour être recontacté.

Les définitions, unités, sources, dénominateurs et limites de la version du 6 octobre 2026 sont détaillés dans [kpi-acquisition-qualifiee.md](kpi-acquisition-qualifiee.md). Cette documentation ne rapporte aucune activité réelle du NAS.

Le tableau présente des demandes web sur 30 jours, les dossiers à contacter, les visites/devis à préparer, les échéances du jour et en retard, les erreurs de notification, puis un parcours de cinq étapes : session mesurée → simulateur démarré → budget consulté → étape contact → demande enregistrée. L'entonnoir compte des sessions distinctes dans l'ordre ; il ne mélange pas le total CRM et les événements d'audience.

La période comprend 30 jours calendaires à Paris, aujourd'hui partiel. Les statuts et échéances CRM portent sur toutes les périodes et sources. Un ratio sans dénominateur est indisponible et une panne de base masque les compteurs. Aucun objectif, montant de revenu, certification ou taux de qualification n'est déduit automatiquement de ces données.

Les étapes budget/contact et l'activité galerie sont nouvellement instrumentées. Les anciennes visites peuvent manquer ces événements ; elles ne doivent pas être présentées comme des abandons certains. Les sessions sont propres au navigateur et à l'onglet, pas des personnes uniques. Les contacts directs restent dans le CRM et sont distingués du parcours simulateur.

L'accord de mesure est distinct de l'accord de contact. Sans accord de mesure, après refus, retrait ou expiration, aucun nouvel événement de navigateur ni identifiant de session n'est créé. Les conversions serveur requièrent aussi un accord explicite et une session opaque valide, sans identifiant de dossier ni données personnelles dans `SiteEvent`. Le dossier CRM reste sauvegardé. La préférence peut être changée dans le footer ; elle expire après six mois calendaires.

Les actions du jour et en retard utilisent `Lead.nextActionAt`, les minuits à Paris et les statuts actifs. Les dossiers signés, gagnés ou perdus sont exclus des échéances. Le tableau renvoie aux filtres du CRM et à la saisie manuelle. Aucun message de relance aux clients n'est envoyé automatiquement.

Le journal des notifications distingue accepté par le fournisseur, échec, non envoyé et en attente. Une tentative en attente peut rester bloquée après une interruption ; aucune relance automatique n'est promise. Un envoi accepté ne prouve pas la réception en boîte.

Cette mise en œuvre ne déclare aucune exemption, certification ou validation CNIL. Référence officielle déjà consultée : [Cookies : solutions pour les outils de mesure d'audience](https://www.cnil.fr/fr/cookies-solutions-pour-les-outils-de-mesure-daudience).

## Gestion des dossiers et contenus

- `/admin#pipeline` : recherche, filtres de statut et de consentement, pages de 20 dossiers, estimation detaillee, suivi et notes internes.
- Les statuts restent dans `Lead.status`. Le suivi CRM ajoute la prochaine action, sa date et l'historique `LeadActivity`, avec contrôle de version du dossier et journal des changements. Une version devenue obsolète retourne HTTP 409 sans écraser les données courantes. La migration additive `20261006223000_lead_crm_followup` est obligatoire avant cette version du tableau ; les anciennes notes restent inspectables dans le journal.
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

`scripts/verify-dashboard-kpis.ts` couvre le nouvel entonnoir ordonné, la déduplication, les contacts directs, l'attribution temporelle de galerie et l'exclusion des événements hors période/admin. `scripts/verify-lead-analytics.ts` vérifie l'accord de mesure distinct et le recalcul des prix côté serveur avant conservation. Les fixtures ne remplacent pas un contrôle PostgreSQL réel.

Fichiers sources : `src/app/admin/page.tsx`, `src/lib/admin/dashboard-metrics.ts`, `src/lib/admin/lead-status.ts`, `src/app/api/admin/leads/route.ts`, `src/app/api/admin/realisations/route.ts`, `src/app/api/admin/settings/route.ts` et les composants `src/components/admin`.
