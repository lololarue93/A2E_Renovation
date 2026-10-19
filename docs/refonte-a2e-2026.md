# Refonte A2E et livraison 2026

La nouvelle mouture relie la vitrine, le budget et le traitement commercial. Le visiteur peut explorer les prix et aides sans transmettre de coordonnees, composer ses travaux, puis demander un dossier ou un echange. L'administration reprend les quantites, les messages, les statuts et les prochaines actions.

## Design et parcours

La direction visuelle associe ivoire, vert profond, grandes images et typographie sans empattement. Le menu mobile donne acces aux memes pages que le bureau. Les inspirations restent identifiees et ne constituent pas une preuve de chantier A2E.

La calculette conserve les choix sur l'appareil et additionne les lignes affichees. Chaque lot possede sa surface ; les menuiseries acceptent dimensions, materiaux, duplication, suppression, pose et options. Les variantes PAC et isolants sont explicites. Une configuration invalide ou un tarif manquant affiche une demande de correction.

Le forfait global au m2 s'applique lorsque ce lot est seul. Combine a des lots detailles, le calcul retient ces lots et une coordination ; les autres travaux ne sont pas inclus. Les forfaits cuisine/salle de bain et leurs lots techniques peuvent encore se recouvrir selon le perimetre : ce point doit etre verifie lors du devis.

## Prix et conditions

Le benchmark compare huit professionnels avec leur unite, fiscalite, fournitures, pose et limites. Les ancres ITE et PAC documentees sont distinguees des hypotheses A2E sans tarif fournisseur confirme. Le point central d'une fourchette n'est pas une moyenne statistique du marche.

Le fichier prix-references-2026.csv contient le nouveau catalogue pour revue et import admin. Il ne remplace pas automatiquement les prix de production. Les champs description/reference conservent les hypotheses ; l'operateur doit confirmer la base HT/TTC, le taux, les performances et les couts reels avant cotation ferme. Les prix historiques conserves peuvent rester sur une base fiscale indefinie.

L'atelier conserve les cotations dans PostgreSQL, propose une base HT/TTC explicitement choisie, des materiels/references, quantites et metres, puis recalcule la TVA et la remise. La remise est nulle par defaut et requiert un motif lorsqu'elle est positive. Les exports presentent avant remise, reduction et net.

La migration PriceItem Int vers Float accepte les prix a deux decimales. Les calculs financiers de cotation arrondissent au centime ; les fourchettes publiques sont affichees a l'euro. Il faut appliquer la migration avant toute sauvegarde de prix avec centimes.

## Aides sans engagement

L'explorateur situe le foyer dans les plafonds IDF 2026. Les forfaits et taux sont des references soumises aux conditions du logement, des travaux et du dossier. Aucune aide n'est deduite automatiquement et aucun droit n'est garanti.

Pour 2027, seules les evolutions reglementaires publiees sont presentees. Les revenus saisis restent dans la page. Les sources et leur date de verification sont accessibles sur /aides. A2E doit fournir son propre justificatif RGE correspondant au metier et a la periode avant toute affirmation de certification.

## Administration et emails

Le CRM enregistre statut et note avec audit. Le contact simple conserve le message sans fabriquer un budget. Les reglages prennent une ou plusieurs boites de destination et confirment leur relecture apres sauvegarde. Les secrets du prestataire restent dans les variables du serveur.

Une nouvelle demande de simulation envoie par defaut une seule alerte, avec le PDF lorsque sa generation reussit. L'alerte supplementaire au telechargement est desactivee pour les nouvelles installations ; les choix deja enregistres sont conserves. Les envois sont journalises en attente, envoyes, echoues ou ignores. Un echec n'efface pas le dossier et ne bloque pas le PDF. Les erreurs necessitent actuellement une reprise manuelle ; aucun mecanisme de relance n'est annonce.

La galerie permet de creer un brouillon, ajouter des medias et publier le projet. Les uploads sont servis immediatement, avec controles de chemin et lecture video par plages. La generation automatique de visuels a partir d'un brief reste une evolution : le site n'inclut aucun appel IA facture ni integration fournisseur configuree.

## KPI et decisions commerciales

Les compteurs viennent de SiteEvent, Lead et des journaux stockes. Le tableau distingue pages vues, sessions mesurees, demarrages, demandes consenties et telechargements. Les taux suivent l'ordre des actions dans une session et excluent les identifiants absents. La periode couvre 30 jours calendaires en Europe/Paris, avec les changements d'heure testes.

La navigation est mesuree seulement apres accord du visiteur ; le refus reduit la population observable. Les recommandations portent sur les dossiers a rappeler, les envois en echec et les etapes sans activite mesuree. Elles ne prouvent pas une cause commerciale. Les donnees historiques du NAS n'etant pas connectees a cet apercu, aucun taux reel de conversion A2E n'est affirme.

Pour piloter la suite, comparer les clics vers la calculette, le premier changement, le passage au contact et le traitement CRM. Avant de promettre une remise ou un delai de rappel, verifier la marge et la capacite reelle. Conserver la meme definition et periode lors des comparaisons.

## Verification et passage sur Docker

Le build Next.js, TypeScript, ESLint et les scripts de calcul, cotation, admin, authentification, exports, contact, analytics et medias sont verifies localement. Les tests de stockage utilisent des doubles, sans email reel. Les PDF sont generes, extraits et rendus ; la recette couvre plusieurs pages, textes longs, montants importants, totaux et remise.

Le navigateur Chromium disponible couvre les tailles 375, 414, 768, 1024 et 1440 pixels. Les preuves locales sont dans docs/preview-tests. L'apercu utilise un catalogue de demonstration et presente les erreurs de base comme une indisponibilite, sans faux succes.

Docker n'est pas disponible sur cet environnement Windows. La compilation d'image, prisma migrate deploy sur PostgreSQL, l'envoi SMTP/Brevo et la restauration du NAS doivent etre verifies dans le smoke GitHub et sur la copie cible. Le workflow teste les branches et PR avant une publication reservee aux push sur main.

La procedure Docker conserve les volumes existants, sauvegarde SQL et medias, utilise un tag de commit, applique la migration puis initialise uniquement les entrees absentes. Le retour a une ancienne application Int exige la sauvegarde anterieure a la migration. Les informations legales, les destinataires definitifs, l'acces NAS et les references fournisseurs A2E restent a renseigner pour la publication.

## Documents associes

- [Analyse de marche](benchmark-marche-idf-2026.md)
- [Cotations et catalogue](quote-workspace.md)
- [Administration et KPI](admin-operations-and-kpis.md)
- [Migration Docker](migration-docker-premium.md)
- [Procedure Portainer](deployment-ugreen.md)
- [Recommandations CNIL sur la mesure d'audience](https://www.cnil.fr/fr/cookies-solutions-pour-les-outils-de-mesure-daudience)
