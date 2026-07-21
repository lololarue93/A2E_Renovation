# A2E Renovation - Recapitulatif de livraison

Date : 21 juillet 2026

Ce document resume les evolutions realisees depuis le debut de la journee, avec des mots simples pour presenter la version au client.

## 1. Experience du visiteur

- Page d'accueil allegee : une accroche claire, les expertises principales et une entree vers la calculette.
- Les contenus detaillees restent disponibles dans des pages dediees pour eviter de surcharger la premiere page.
- Titres modernises avec une police plus contemporaine et plus lisible.
- Parcours plus oriente conversion : estimation rapide, estimation detaillee et prise de contact.
- Zone d'intervention harmonisee sur toute l'Ile-de-France, avec une attention particuliere aux departements 77, 93 et 95.
- Les estimations affichent une fourchette basse, centrale et haute pour rassurer sans presenter un prix ferme avant visite technique.

## 2. Simulateur et pre-devis

- Plusieurs postes peuvent etre combines dans une seule estimation : par exemple fenetres + ITE, ou electricite + plomberie.
- Les fenetres peuvent etre detaillees par ouvrant : fenetre, porte-fenetre, baie vitree et porte d'entree.
- Prise en compte des dimensions, du materiau PVC ou aluminium, de l'ouverture, de la pose et des volets motorises.
- Les postes electricite et plomberie proposent plusieurs equipements au lieu d'un seul format moyen.
- Les options ajoutees sont visibles avant le formulaire et avant le telechargement du PDF.
- Les montants sont recalcules cote serveur pour eviter qu'une modification du navigateur ne fausse le resultat.
- Un seul dossier peut produire un PDF complet avec plusieurs corps d'etat.

## 3. Prix et catalogue administrable

- Les prix bas, moyens et hauts sont modifiables depuis l'administration.
- Possibilite d'ajouter une nouvelle ligne de catalogue, par exemple accessoire, rideau, equipement ou option de pose.
- Chaque ligne peut recevoir un libelle, une unite, une reference materiel, une description et une TVA indicative.
- Les descriptions peuvent expliquer le contenu du pack et les materiaux habituellement proposes.
- Les prix et options sont relus depuis la base afin de rester conserves apres deconnexion ou redemarrage.
- Une migration Prisma a ete ajoutee pour les references, descriptions et taux de TVA des lignes de prix.

## 4. Realisations, photos et videos

- Les medias peuvent etre associes a une realisation existante depuis une liste claire.
- Une realisation peut etre modifiee : titre, zone, type de travaux, description, duree, budget, tags et visibilite.
- Les images volumineuses sont compressees dans le navigateur avant envoi pour reduire le temps d'attente.
- Les medias publies sont rechargees cote public sans attendre un ancien cache.
- Les fichiers sont conserves dans un volume Docker persistant.
- Les actions d'ajout, modification et suppression restent tracees dans le journal administrateur.

## 5. Notifications et suivi equipe

- Nouveau menu de configuration des notifications dans l'administration.
- Plusieurs destinataires peuvent etre ajoutes, un par ligne.
- Canaux disponibles : Brevo API, OVH SMTP, Gmail SMTP ou autre serveur SMTP.
- Evenements activables separement : nouveau lead, PDF genere, media publie, alerte securite/maintenance, Telegram et suivi des visites.
- Le PDF peut etre envoye avec ses informations et sa piece jointe detaillee.
- Les adresses sont conservees dans la base ; les cles API et mots de passe restent uniquement dans Portainer.

## 6. Fiabilite, securite et production

- Rejet propre des requetes JSON invalides ou trop volumineuses.
- Correction d'un en-tete Basic Auth malforme qui pouvait provoquer une erreur serveur.
- Ajout d'en-tetes HTTP de protection pour la production.
- Routes d'administration, de prix et de realisations forcees en lecture dynamique afin d'eviter les valeurs anciennes.
- Build Next.js et verification TypeScript valides apres les corrections.
- Deploiement prevu via image Docker, GitHub Container Registry, Portainer et Nginx Proxy Manager.

## 7. Mise en ligne de cette version

1. Attendre la fin du build GitHub Actions.
2. Dans Portainer, ouvrir la stack A2E.
3. Choisir la mise a jour de la stack avec recuperation de la nouvelle image.
4. Activer le redeploiement et attendre que `a2e-web` repasse healthy.
5. Ouvrir `/admin`, enregistrer les prix et les notifications, puis tester un lead.
6. Verifier le PDF, la reception email et l'affichage d'une realisation publique.

## Message client

Cette version rend le site plus clair, plus rassurant et plus utile pour un futur client. La calculette donne une premiere enveloppe de budget, le pre-devis explique mieux les postes, et l'equipe peut suivre les demandes depuis l'administration. Les montants restent indicatifs et doivent etre confirmes apres metrage et visite technique.
