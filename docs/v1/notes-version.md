# A2E Renovation V1.0.0

Edition fonctionnelle du 19 octobre 2026. Pour le commit et l'image exacts,
consulter la release GitHub et le dernier workflow Docker reussi. Le numero V1
identifie le perimetre produit ; Portainer utilise un tag `sha-<commit-complet>`
publie pour choisir une image precise.

## Parcours et gestion disponibles

- Vitrine responsive, services, prix, galerie et explorateur de possibilites d'aides.
- Calculateur en quatre etapes, multi-postes, quantites, materiels et hypotheses,
  panier relu, recalcul serveur, enregistrement et PDF telechargeable a nouveau.
- Projet sur mesure : description, remarques, contact par email ou telephone,
  rappel demande avec preference, sans prix ou rendez-vous invente.
- Complements libres et demande de rappel a la fin du simulateur. Les travaux
  decrits librement ne modifient pas automatiquement le budget calcule.
- CRM : creation manuelle, recherche, statuts, prochaine action/date Paris,
  notes et echanges declares, conflits de version et relecture apres sauvegarde.
- Catalogue administrable, import/export CSV, apercu avant application, centimes,
  80 hypotheses de reference dont 25 postes detailles a valider par l'entreprise.
- Cotations : postes catalogue ou libres, quantites, base HT/TTC, TVA, remise,
  enregistrement, CSV/JSON et PDF. Le statut est gere manuellement.
- Realisations et medias administrables : fiches, brouillons, publication,
  couverture, ordre, avant/apres, diaporama, images et videos.
- Trois inspirations de renovation illustrees, distinctes des vrais chantiers.
  La provenance des visuels reste disponible dans l'admin et les sources.
- Avis reels, note et accord de publication ; aucun temoignage ajoute fictivement.
- Emails SMTP ou Brevo vers 1 a 20 boites, notifications nouvelle demande/PDF,
  journal des tentatives et acceptations partielles. Secrets dans l'hebergement.
- KPI issus des evenements consentis, des dossiers et des tentatives stockees ;
  periode et source indiquees, CRM distinct du parcours d'audience.
- Exports, journal de modifications, controle de sante, sauvegarde/restauration
  Docker et documentation V1 illustree.

## Limites assumees de cette edition

- Compte admin configure sur le serveur ; aucun gestionnaire de roles multiples.
- Relances CRM organisees par l'equipe, sans campagne email client automatique.
- Pas d'OCR de tarifs, de catalogue fournisseur negocie ou d'IA generative dans
  l'application ; la reprise de PDF fournisseur passe par un CSV verifie.
- Prix, materiels, disponibilites, marge, TVA, aides et qualifications a valider
  selon le dossier. Aucune aide n'est deduite automatiquement du budget.
- Logo, email public et textes de services restent des reglages de maintenance
  dans le code ; telephone et liens sociaux disposent de reglages admin.
- La presence d'une configuration SMTP ne prouve pas la reception d'un email.
- Cible Docker validee : Linux amd64 et PostgreSQL major 16. Le NAS, l'hebergement
  externe, le proxy HTTPS et les emails reels demandent leur propre recette.

## Validation de la livraison

Build, lint et typage ; 20 suites fonctionnelles ; 8 controles HTTP sur une base
PostgreSQL locale isolee ; demande de rappel soumise dans le navigateur et relue
en CRM ; controle de l'affichage mobile et captures des guides. Les donnees de
recette temporaires en base ont ete nettoyees, les reglages email restaures et aucun
email externe envoye. Le pipeline Docker doit verifier persistance et restauration
avant de publier l'image de cette version.

Aucune nouvelle migration SQL n'est ajoutee par les champs libres ou le rappel :
ils utilisent `Project.details`. Lors de la migration depuis l'ancien site,
les migrations deja livrees restent obligatoires et le service `migrate` les
applique. Ne pas executer le seed historique sur les donnees d'entreprise.
