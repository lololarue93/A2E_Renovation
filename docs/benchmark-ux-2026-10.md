# Benchmark UX renovation - octobre 2026

Observation des pages publiques : **19 octobre 2026**. Sources primaires uniquement.
Objectif : rendre l'offre A2E, la premiere estimation et la prise de contact plus lisibles.
Les promesses concurrentes ci-dessous sont celles de leurs sites, sans audit de leur execution.
Aucun prix, avis chiffre, taux de conversion ou certificat concurrent n'est repris pour A2E.

## Methode et limites

Lecture des accueils, pages d'entree et destinations de CTA. Aucun formulaire n'a ete soumis.
Les pages Little Worker et Renovation Man en JavaScript ne livrent pas le contenu de leur
questionnaire a l'extraction web : leurs etapes, erreurs, resultats et performances restent non verifies.
Le rendu tactile, les menus mobiles et les temps de chargement concurrents n'ont pas ete testes.
Les conclusions mobiles sont des criteres de QA A2E, pas des scores attribues aux concurrents.
Les observations ne prouvent ni la qualite des travaux ni les assurances ou qualifications affichees.

## Comparatif des parcours publics

| Site et sources consultees | Estimation / contact | Confiance / projets | Implication pour A2E |
| --- | --- | --- | --- |
| [hemea - accueil](https://www.hemea.com/fr), [devis travaux](https://www.hemea.com/fr/devis-travaux), [Paris](https://www.hemea.com/fr/renovation/appartement/paris) | Entree projet ; distinction entre etude du besoin, consultation des artisans et suivi. La page devis annonce une estimation en ligne. | L'accueil explique le role du courtier et presente des projets avec ville, surface et enveloppe ; garanties et securisation des paiements sont mises en avant par hemea. | Expliquer qui reprend le dossier et quelle validation technique suit l'estimation. Documenter les projets reels ; aucune garantie de courtage a copier sans service A2E equivalent. |
| [Little Worker - accueil](https://www.littleworker.fr/), [estimation](https://projets.littleworker.fr/faconne/estimation), [Paris](https://www.littleworker.fr/renovation-appartement-paris/) | CTA explicite d'estimation repete ; parcours public : fourchette, visite, devis, conception, travaux. Questionnaire non inspectable ici. | Projets nommes avec ville et surface ; niveaux d'accompagnement distingues ; equipe et lien vers les avis. | Garder un libelle d'action stable et annoncer une fourchette avant visite. Pour chaque projet publie, montrer le perimetre reel et l'accompagnement fourni. |
| [IZI by EDF - accueil](https://www.izi-by-edf-renov.fr/), [contact](https://www.izi-by-edf-renov.fr/contact) | Entrees par travaux. La methode separe pre-devis, visite de faisabilite et devis ajuste. Contact organise par motif avec coordonnees et demande de rappel. | Conseillers presentes, lien vers avis et explication du parcours. L'obtention d'aides est annoncee sous condition d'eligibilite. | Afficher le service attendu apres envoi ; maintenir telephone et formulaire accessibles. Distinguer simulation de budget et eligibilite aux aides. Ne pas reprendre les engagements EDF. |
| [Renovation Man - accueil](https://www.renovationman.com/), [questionnaire](https://survey.renovationman.com/survey), [Paris](https://www.renovationman.com/devis-travaux/paris/) | Deux intentions visibles : renover et ameliorer le DPE. Estimation gratuite proposee ; questionnaire non inspectable ici. | Equipe nommee, lien realisations, avis externes et etapes d'accompagnement ; l'IDF figure dans les territoires affiches. | Un CTA principal pour le budget, une voie humaine pour les questions. Eviter d'ajouter deux simulateurs concurrents ; les travaux energetiques peuvent rester des postes du meme dossier. |

## Lecture croisee et decisions A2E

Les quatre sites associent le parcours numerique a un interlocuteur humain. Little Worker et
IZI explicitent la difference entre premiere estimation et validation sur place. Cette separation
renforce la comprehension ; elle ne justifie pas une promesse de devis ferme automatique A2E.

Les accueils utilisent des projets, des personnes et une methode pour rendre le service concret.
Pour A2E, une photo d'inspiration peut expliquer une ambiance mais ne prouve pas un chantier.
Conserver les etiquettes d'inspiration et publier les vrais projets avec autorisation, localisation
non precise, travaux et photos utiles. Les avis, certifications, delais et volumes demandent une preuve.

L'architecture observee confirme la pertinence de pages services, galerie, equipe et contact distinctes.
L'accueil A2E peut rester bref : offre IDF, estimation indicative, preuve disponible, contact humain.
La repetition d'un CTA ne garantit pas la conversion ; mesurer son usage avec les evenements reels
et consentis avant de conclure a un gain.

## Cinq priorites verifiables

| Priorite | Action | Verification attendue |
| --- | --- | --- |
| P1 - action comprise | En-tete : remplacer le vague "Mon projet" par "Estimer mes travaux", abrege "Estimer" sur petit ecran avec nom accessible complet. | Depuis chaque page marketing, le lien nomme l'action et ouvre `/simulateur`. A 320/375/768/1024/1440 px, aucun chevauchement ni defilement horizontal. |
| P1 - navigation accessible | Fermer le menu mobile apres navigation et avec Echap ; rendre le focus au bouton avec Echap ; exposer la page courante. | Ouvrir au clavier, tabuler vers un lien, Echap : menu ferme et bouton focalise. Reouvrir puis suivre le CTA : menu ferme sur la destination. `aria-expanded` et `aria-current` coherents. |
| P1 - estimation explicable | Garder tous les postes, un recapitulatif lisible et la reserve de visite avant le PDF. | Panier ITE + fenetres : retour arriere, modification, total et PDF coherents. Aucun montant ferme ou aide automatiquement deduite sans verification. |
| P2 - preuve inspectable | Completer les projets reels par travaux, ville et visuels autorises ; separer les inspirations. | Relecture galerie et fiche projet : origine comprise, texte alternatif utile, aucun chantier fictif ou certificat non documente. |
| P2 - vitesse mesuree | Mesurer mobile/desktop apres construction de production ; garder dimensions d'images stables, hero prioritaire et autres medias differes. | Rapport Lighthouse archive avec URL, date et profil ; QA a connexion limitee, sans saut de mise en page ni blocage du CTA. Comparaison avant/apres sur le meme profil, sans score invente. |

## Corrections locales et controles

Cette mission modifie seulement `src/components/marketing/SiteHeader.tsx` : libelle du CTA
et comportement accessible du menu. Aucun changement de prix, simulateur, admin ou donnees.
Les classes et la source admin du telephone sont conservees. Aucun nouveau paquet n'est ajoute.
ESLint cible sur le composant et `git diff --check` passes ; aucun build ni serveur lance dans ce lot.
La recette navigateur des cinq largeurs, les calculs/PDF et les mesures de production relevent
de la QA integree : la revue statique de ce lot ne les declare pas valides.
