# Pilotage A2E - 19 octobre 2026

Depot actif : dossier `A2E`. Objectif : une vitrine lisible, une estimation
indicative explicable, puis un dossier suivi par l'equipe. Le site ne delivre
pas de devis ferme avant metre et validation technique.

La [recette d'octobre](recette-2026-10.md) detaille les preuves locales.
La [PR #8](https://github.com/lololarue93/A2E_Renovation/pull/8) est integree a
`main` au commit `31a6122327f4086e61fcacb12ed065dc9fdb7489` :
[Validate](https://github.com/lololarue93/A2E_Renovation/actions/runs/39234532570)
et [Docker](https://github.com/lololarue93/A2E_Renovation/actions/runs/39234532630)
ont reussi, y compris la restauration sur volumes de recette neufs.
L'image `ghcr.io/lololarue93/a2e-renovation:sha-31a6122327f4086e61fcacb12ed065dc9fdb7489`
est publiee (digest
`sha256:9ecdfb86bfbae79fa2e95e536dd3585d62146a37af550c583d8dfaa2f991e7b9`).
Pour un correctif ulterieur, relever le tag de son propre workflow Docker reussi.
Le deploiement NAS et la reception d'un email reel restent a effectuer.

## Etat et prochaines decisions

| Priorite | Perimetre | Etat local | Prochaine action / responsable |
| --- | --- | --- | --- |
| P0 | Prix, panier, PDF et persistence SQL | Calculs proteges et recette HTTP PostgreSQL passes ; 7 migrations appliquees sur la base de recette | Operateur : sauvegarde et restauration de test, migrations et relecture sur la stack cible avant ouverture |
| P0 | Acces admin | Formulaire de connexion, cookie signe, controles API et Origin verifies localement | Operateur : secrets prives, HTTPS, domaine et deconnexion a verifier derriere le proxy reel |
| P0 | Dependances du serveur | Next 15.5.28, transport email corrige ; audit de production sans avis connu au 19/10 | Mainteneur : conserver les controles et suivre les avis des outils de developpement dans [le bilan](dependances-2026-10.md) |
| P0 | Livraison Docker / GitHub | Main livre via PR #8 ; Validate et Docker reussis ; image SHA publiee et restauration de recette verifiee | Operateur : sauvegarder puis mettre a jour la stack Portainer existante avec le tag publie choisi, verifier sante et conservation des donnees |
| P1 | Vitrine et calculette | Accueil, CTA, navigation et estimation express presents ; mobile/desktop inspectes durant la recette | A2E : relire textes, telephone et offre ; QA : confirmer le parcours final sur les tailles cibles |
| P1 | Catalogue 77 | 80 references, dont 25 detaillees ; 15 descriptifs/references revus au 19/10/2026 | A2E : valider materiel, quantites, fourniture/pose, couts, HT/TTC et TVA avant import entreprise |
| P1 | CRM | Dossiers, saisie manuelle, statuts, historique, echeances et conflits de version verifies ; trois prospects EXEMPLE presents en recette, import repete sans ecrasement | A2E : essayer les files en retard / aujourd'hui / a venir ; aucun client ni relance automatique |
| P1 | Realisations | 3 maisons fictives, 6 photos generees avant/apres et import idempotent verifies | A2E : revoir les exemples, puis fournir les vrais chantiers autorises ; publication de demonstration opt-in |
| P1 | Avis | Gestion admin et source unique ; aucun avis ou compteur fictif | A2E : recueillir textes reels et accords avant publication |
| P1 | Notifications email | Transport SMTP/Brevo et journal implementes ; tests sans envoi externe | A2E + operateur : fournir un compte expediteur, configurer en prive et prouver la reception |
| P1 | KPI | Evenements consentis, parcours ordonne, CRM et notifications distingues | A2E : lire periode et sources ; operateur : verifier les premiers evenements reels apres mise en ligne |

## Navigation admin

1. Ouvrir `/admin/connexion`, utiliser le compte admin configure sur le serveur.
   `/admin` redirige vers cette page en l'absence de session.
2. **Activite & conversions** (`/admin#overview`) : periode, parcours mesure,
   dossiers a traiter et echeances. La recette et ses exemples ne sont pas de
   l'activite commerciale reelle.
3. **Dossiers clients** (`/admin#pipeline`) : rechercher un dossier, filtrer,
   saisir un prospect, renseigner statut et prochaine action, consigner un
   echange. Enregistrer et recharger ; un conflit 409 demande une relecture.
4. **Catalogue de prix** (`/admin#pricing`, `/admin/prix`) : exporter avant
   import, inspecter l'apercu CSV, enregistrer puis relire. **Nouvelle cotation**
   (`/admin/cotations`) prepare les lignes, TVA, remise motivee et PDF.
5. **Realisations & avis** (`/admin#gallery`) : fiche, medias, roles avant/apres,
   couverture, apercu et publication. Les trois exemples restent explicitement
   fictifs, meme apres edition. Publier un avis seulement avec accord confirme.
6. **Site & notifications** (`/admin#settings`) : coordonnees, liens sociaux,
   destinataires et fournisseur d'envoi. Les credentials restent hors du site.
7. **Journal & exports** (`/admin#audit`) : verifier les changements et les
   tentatives de notification. Termine par **Se deconnecter** sur un poste partage.

Chaque sauvegarde doit etre confirmee apres relecture. Si une API echoue, garder
la saisie, corriger la cause et recharger les donnees avant une nouvelle edition.

## Connexion, donnees et emails

- Le formulaire utilise `POST /api/auth/admin` ; `DELETE` ferme la session.
  Cookie `a2e_admin_session` signe, duree 8 heures, `HttpOnly`, `SameSite=Strict`,
  `Secure` sur le domaine HTTPS. Les mutations de session exigent un Origin
  correspondant a l'origine du site ; `NEXT_PUBLIC_SITE_URL` doit etre exact.
- Les API admin appliquent aussi leur autorisation cote serveur. Les variables
  `ADMIN_EMAIL`, `ADMIN_PASSWORD` et `AUTH_SECRET` sont privees ; aucun exemple
  de credentials reels ne doit entrer dans Git, les captures ou les logs.
- Le CRM manuel ne contacte personne. Un echange consigne n'est pas une preuve
  d'appel ou d'email envoye. Les autorisations de contact et de mesure sont distinctes.
- Pour les notifications : utiliser le SMTP professionnel existant (`SMTP_HOST`,
  `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`) ou un compte Brevo
  avec expediteur autorise (`BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, nom facultatif).
  Configurer les destinataires dans l'admin, puis tester avec accord explicite.
- L'offre Brevo Gratuit annonce 300 envois par jour au 19/10/2026, selon ses
  conditions et avec marquage Brevo. Un compte et des credentials restent
  necessaires ; aucune boite email n'a ete creee ou connectee ici.
  [Source officielle Brevo](https://help.brevo.com/hc/fr/articles/208580669-FAQ-Quels-sont-les-limites-de-l-offre-Gratuit).
- Un statut accepte par le fournisseur ne prouve pas la reception. Verifier
  boite destinataire, courrier indesirable et piece jointe. Une panne d'email
  ne doit pas empecher l'enregistrement du dossier ni le telechargement du PDF.

## Documents operateur

Mise a jour Portainer : suivre la [procedure de migration](migration-docker-premium.md).
Dans la stack existante, utiliser Git `main` / `docker-compose.yml`, ou reporter
le dernier Compose dans l'editeur. Garder noms de stack/volumes, PostgreSQL major
16 et secrets existants ; ajouter `AUTH_SECRET` s'il manque. Apres sauvegarde,
renseigner le tag SHA publie puis redeployer avec pull. Attendre `migrate` et
`media-init` en `Exited (0)`, puis le web `healthy`. Sous maintenance, revoir puis
importer uniquement les 25 nouvelles references detaillees avant de rouvrir le
simulateur. Ne pas lancer le seed ni ecraser le catalogue entreprise avec les
80 references de recette. Les exemples de prospects, projets et images ne sont
pas importes automatiquement sur le NAS.

- [Prix et limites du releve 77](catalogue-77-2026-10.md) ; [cotations](quote-workspace.md).
- [CRM](crm-prospection.md) ; [KPI](admin-operations-and-kpis.md).
- [Photos et import explicite des exemples](guide-photos-chantiers.md) ; [avis](customer-reviews.md).
- [Migration, sauvegarde et restauration](migration-docker-premium.md) ; [Portainer](deployment-ugreen.md).

Les anciennes documentations peuvent decrire une session anterieure sans SQL
local. La recette datee ci-dessus est la reference pour les preuves du 19/10.
