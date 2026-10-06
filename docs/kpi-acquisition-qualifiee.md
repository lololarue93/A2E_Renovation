# A2E — Mesurer les demandes utiles et piloter les prochaines actions

Définitions de la version du 6 octobre 2026. Ce document décrit des calculs implémentés et des fixtures de vérification. Il ne constitue pas un relevé d'activité : aucune donnée réelle du NAS n'a été consultée et aucune performance commerciale n'est annoncée.

## Décision et priorité

La priorité est d'obtenir des demandes exploitables, puis de préparer une visite et un devis. Le tableau pose trois questions : quelles demandes sont enregistrées, où le parcours consenti s'arrête-t-il, quels dossiers nécessitent une action ? La galerie est un levier à observer, pas un résultat commercial à elle seule.

Les indicateurs principaux sont les **demandes web enregistrées**, les **dossiers à contacter** et la **progression ordonnée du simulateur**. Les échéances du jour/en retard et les erreurs de notification servent à décider quoi traiter. Aucune cible, hausse attendue, moyenne de marché ou taux « idéal » n'est inventé.

Un enregistrement n'est pas automatiquement un devis qualifié. L'équipe doit vérifier le besoin, le lieu d'intervention, les coordonnées disponibles, les contraintes et la prochaine action. `maturityScore` est une aide au dossier, pas une preuve de qualification commerciale. La version actuelle ne possède pas de date de qualification structurée : elle ne calcule donc pas de taux de demandes qualifiées ni de délai de qualification. Une mesure future devra définir explicitement ce statut, son responsable et sa date.

## Deux populations séparées

| Population | Source / grain | Périmètre | Utilisation |
| --- | --- | --- | --- |
| CRM universel | Une ligne `Lead` | Toutes sources et tous accords de contact, y compris prospects saisis manuellement | Total, nouveaux dossiers, statuts, échéances, derniers dossiers. Un prospect sans accord de contact ne disparaît pas du pilotage interne. |
| Demandes web enregistrées | Une ligne `Lead` | `sourceLead` courant commence par `website`, `consent = true`, création dans la période | Dossiers classés comme demande du site, indépendants de l'accord de mesure. L'ancien `website` est inclus. |
| Parcours mesuré | Une `SiteEvent.sessionId` avec `page_view` | Accord explicite pour les événements actuels, hors admin, dans la période | Entonnoir et galerie. Une session correspond à un navigateur et un onglet ; elle n'identifie pas une personne unique. |

Le consentement de formulaire autorise le suivi du projet. Le choix de mesure est distinct. Refus, absence de choix, retrait, expiration ou stockage bloqué : aucun événement de navigateur ni nouvel identifiant de mesure ; le formulaire peut toujours enregistrer sa demande. Les conversions serveur exigent elles aussi `analyticsConsent === true` et un identifiant opaque valide. Elles ne transmettent ni identifiant de dossier, nom, coordonnées, type libre de travaux, montant ni revenu.

L'origine d'un dossier peut être corrigée dans le CRM : cette correction modifie les répartitions et le compteur de demandes web selon la valeur courante, même si le dossier a été créé auparavant. Ce classement éditable n'est pas une attribution publicitaire ni une source de création immuable.

Le serveur reçoit une déclaration de choix, pas une preuve indépendante de la préférence du navigateur. L'API publique peut recevoir des événements fabriqués : elle minimise et valide le format mais ne transforme pas ces événements en vérité CRM. Le compteur `Lead` reste la référence d'enregistrement. Les anciens événements ne prouvent pas rétrospectivement un consentement conforme ; leur historique doit être audité avant toute comparaison.

## Temps, unités et calculs

La période comporte 30 jours calendaires à Paris, aujourd'hui inclus et **partiel**. Les requêtes emploient `[minuit du premier jour, minuit de demain[` en UTC, avec les changements d'heure de `Europe/Paris`. La capture de date est partagée par la période et les échéances du tableau.

| Indicateur | Calcul / unité | Dénominateur ou limite | Action possible |
| --- | --- | --- | --- |
| Demandes web enregistrées | Nombre de `Lead` web avec accord de contact créés sur 30 jours | Une ligne, pas une personne dédupliquée ; répétitions de formulaire possibles | Qualifier les demandes et préparer le premier échange. |
| Nouveaux dossiers et total CRM | Nombre de `Lead` sur 30 jours / toutes périodes, toutes sources | Les prospects manuels sont inclus ; ne pas nommer ce total « demandes du site » | Vérifier le volume réel à organiser. |
| À contacter | Statut courant `nouveau` ou `a_rappeler`, toutes périodes et sources | Instantané ; pas un temps de réponse ni une cohorte | Ouvrir le pipeline, noter l'échange et la prochaine action. |
| Visites et devis à préparer | `visite_a_planifier` ou `devis_a_preparer`, toutes périodes | Statuts renseignés par l'équipe | Organiser les rendez-vous et le chiffrage. |
| Actions aujourd'hui | `nextActionAt >= minuit Paris` et `< minuit demain`, statut actif | Toutes sources ; hors `signe`, `gagne`, `perdu` | Consulter `/admin?due=today#pipeline`. |
| Actions en retard | `nextActionAt < minuit Paris`, statut actif | Sans date : exclu de ce compteur, visible dans le filtre « sans échéance » du CRM | Consulter `/admin?due=overdue#pipeline` et replanifier. |
| Notifications en échec | Journaux `notification.leadCreated`, `notification.pdfGenerated`, `notification.contactCreated`, statut `failed`, créés sur 30 jours | Nombre de tentatives, pas dossiers uniques ni mails effectivement reçus | Inspecter le journal et le canal dans les réglages. |

`pending` est une tentative en attente, pouvant rester bloquée après une interruption ; il ne prouve pas qu'un envoi avance ni qu'une relance automatique aura lieu. `sent` signifie accepté par le fournisseur. `skipped` correspond notamment à une notification désactivée ou à un canal non configuré. Ces journaux concernent l'alerte à l'équipe ; le CRM n'envoie pas automatiquement de relance aux prospects.

## Entonnoir de cinq étapes

Dans chaque session, les événements sont triés par date de stockage. Pour chaque étape, le calcul cherche le **premier événement à la même date ou après l'étape précédente**. Il peut retrouver un événement ultérieur valide si une action prématurée existait ; les doublons n'augmentent pas les effectifs. Les cinq événements doivent être présents dans la période.

| Étape | Événement / label | Sens métier |
| --- | --- | --- |
| Sessions mesurées | `page_view` | Base de la cohorte observée. |
| Simulateur démarré | `quote_started` | Premier choix ou saisie utile, pas simple clic de navigation. |
| Budget consulté | `quote_step_viewed`, `budget` | L'étape de budget du simulateur est affichée. Cela ne prouve pas la lecture attentive ni l'acceptation du budget. |
| Étape contact | `quote_step_viewed`, `contact` | Le formulaire final est affiché, sans collecte de ses champs dans l'audience. |
| Demande enregistrée | `lead_submitted`, `simulateur`, créé uniquement par le serveur | Le dossier et son estimation recalculée ont été sauvegardés. Ce n'est ni un devis signé ni un paiement. |

Les taux sont `sessions atteignant l'étape / sessions de l'étape précédente × 100`. Le dénominateur apparaît dans le calcul ; sans dénominateur, le taux est indisponible (`—`). Tant qu'aucun `quote_step_viewed` n'est observé, les taux à partir du budget restent indisponibles plutôt que d'attribuer l'absence historique à un abandon.

Les contacts directs sont comptés séparément (`lead_submitted`, `contact`). Ils restent dans les demandes CRM et ne sont pas forcés dans le simulateur. Les sessions avec demande mais sans les cinq étapes sont présentées comme hors parcours complet ; ce total peut inclure les contacts directs. Les événements anciens sans session ne sont jamais attribués à une session.

Les étapes budget/contact sont introduites dans cette version. Un parcours historique sans ces événements, une visite commencée avant la période, une requête bloquée ou une arrivée réseau hors ordre peut sous-estimer l'entonnoir. Deux dates de stockage égales sont considérées compatibles. Aucun temps de remplissage ni abandon causal n'est déduit des seules dates d'arrivée. Les sessions n'ont pas de fenêtre d'inactivité de 30 minutes : l'identifiant dure jusqu'à la fermeture de l'onglet ou au retrait du choix.

La courbe quotidienne compte des sessions distinctes par jour pour les pages vues et, séparément, les sessions dont le parcours complet aboutit ce jour-là. Une session peut voir le site plusieurs jours ; la somme de la première série ne vaut donc pas nécessairement la base unique sur 30 jours. Le graphique n'utilise jamais les lignes CRM pour calculer un taux de cohorte.

## Galerie : preuve, intérêt et entrée dans le calcul

Les seuls labels acceptés sont `published` (chantiers publiés) et `inspiration`. Aucun nom de chantier, client, ville, référence ou titre libre n'est transmis.

| Mesure | Événements ordonnés dans une session avec page vue |
| --- | --- |
| Ouvert | `gallery_opened` après la page vue |
| Comparé | `gallery_comparison_used` après l'ouverture de cette catégorie |
| Vers le calcul | `gallery_estimate_clicked` après la page vue, depuis une carte ou le lecteur de cette catégorie |
| Calcul démarré | `quote_started` après le clic vers le calcul de cette catégorie |

Ouverture/comparaison et clic sont des usages parallèles, pas une suite obligatoire. Un lien de carte peut mener directement au calcul sans ouvrir le lecteur : il est bien compté et peut faire dépasser les clics du nombre d'ouvertures. Un clic ne prouve pas le démarrage. Chaque colonne compte une session une fois par catégorie ; une session visitant les deux catégories est présente dans les deux lignes. Ces lignes ne doivent pas être additionnées pour produire des visiteurs uniques. La relation temporelle ne prouve pas que la galerie a causé une conversion.

## Contrat d'instrumentation et minimisation

Événements clients autorisés : `page_view`, `cta_click`, `phone_click`, `quote_started`, `quote_step_viewed`, `pdf_downloaded`, `gallery_opened`, `gallery_comparison_used`, `gallery_estimate_clicked`. `lead_submitted` n'est pas accepté par l'API de mesure client.

`quote_step_viewed` accepte uniquement `selection`, `details`, `budget`, `contact`. Les trois événements de galerie acceptent uniquement `published` / `inspiration`. Les autres labels sont ramenés à des catégories fixes, même si un appelant fournit un nom ou une référence. Les familles de routes publiques sont autorisées explicitement ; les slugs `services`/`local` sont ramenés à leur famille, sans paramètres ni fragments. Les métadonnées fournies par le navigateur sont ignorées et l'URL référente est réduite à son origine. Aucun champ d'adresse IP ou de données personnelles n'est ajouté à `SiteEvent` par ce dispositif ; les journaux du serveur/hébergeur sont un périmètre distinct.

L'identifiant accepté est un UUID v4 ou le format de secours opaque du tracker. L'API limite le corps à 8 000 caractères, vérifie l'accord avant lecture de réglages ou écriture en base, vérifie événement/label/route, puis applique le réglage global `trackingEnabled`. Une session invalide n'est pas enregistrée. Cette limite de corps n'est pas un anti-robot ni une limite de débit par adresse IP.

La préférence date de six mois calendaires et peut être retirée via les préférences du footer. L'admin ne crée aucun événement. Aucun mécanisme d'exemption ou certification réglementaire n'est revendiqué.

## Référence, cadence et vérification

Revue quotidienne : rappels et erreurs de notification. Revue hebdomadaire : étapes et galerie. Avant de fixer une cible, vérifier plusieurs semaines complètes et stables depuis cette instrumentation, séparer les changements de définition et examiner des dossiers avec l'équipe. Le ratio de sessions consenties ne représente pas tout le trafic : la propension à accepter peut introduire un biais. Un refus est une absence de mesure, pas une activité observée à zéro.

Si la base ou une requête du tableau échoue, les compteurs sont masqués au profit d'un état indisponible ; aucune valeur de démonstration n'est substituée. Cette version ne fournit pas de séries historiques des statuts, chiffre d'affaires, attribution publicitaire, taux de signature de cohorte ou suivi des refus.

Sources inspectables : `src/app/admin/page.tsx`, `src/lib/admin/dashboard-metrics.ts`, `src/lib/admin/crm.ts`, `src/lib/analytics-consent.ts`, `src/components/analytics/AnalyticsTracker.tsx`, `src/app/api/analytics/route.ts`, `src/app/api/leads/route.ts`, `src/app/api/contact/route.ts`.

- `scripts/verify-dashboard-kpis.ts` : ordre des cinq étapes, doublons, événement prématuré suivi d'un valide, contacts directs, attribution de galerie, hors période/admin, journée de Paris et dénominateurs absents.
- `scripts/verify-analytics-consent.ts` : choix, retrait, expiration, stockage bloqué, admin, labels fermés, routes minimisées, métadonnées ignorées, faux événements serveur refusés et limite de corps.
- `scripts/verify-contact.ts` et `scripts/verify-lead-analytics.ts` : accord analytics distinct, dossier conservé sans mesure, identifiant opaque, conversion sans données personnelles, suivi désactivé et panne analytics tolérée. Le second vérifie aussi le recalcul serveur et le montant sauvegardé malgré des prix client falsifiés.
- `scripts/verify-admin.ts` : contrôles admin et changements d'heure de Paris ; les anciens agrégats bruts restent disponibles comme diagnostics de compatibilité, sans alimenter le nouvel entonnoir.

Ces scripts utilisent des fixtures et des doubles en mémoire, sans base de production ni envoi externe. Ils passent localement ; la migration CRM, les écritures PostgreSQL réelles et le rendu connecté restent à vérifier dans la stack de test puis sur le NAS après sauvegarde. Aucune migration analytics n'est requise ; la migration CRM additive `20261006223000_lead_crm_followup` est obligatoire pour les compteurs d'échéances.
