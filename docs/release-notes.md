# A2E Renovation - Notes de version

Ce document est mis a jour a chaque livraison. La section la plus recente doit etre reprise dans le message client, puis completee avec le lien de version et la date de mise en ligne.

## Version en preparation - Accroche, fiabilite et securite

### Ajustements visibles

- Page d'accueil allegee : accroche, acces rapides par expertise et calculette express.
- Simulateur complet conserve sur sa page dediee pour composer un dossier plus precis.
- Titres modernises avec une typographie sans-serif plus contemporaine.
- Libelles de realisations de demonstration harmonises sur l'ile-de-France.

### Fiabilite et production

- Les montants du lead et du PDF sont recalcules cote serveur a partir des choix transmis.
- Les requetes JSON invalides ou trop volumineuses sont refusees proprement.
- Un en-tete d'autorisation Basic malforme ne provoque plus d'erreur serveur.
- Ajout d'en-tetes HTTP de protection de base pour la production.

### Audit expert a poursuivre

- Verifier le parcours multi-postes dans le simulateur complet, notamment ITE + fenetres.
- Televerser au moins une photo et une video depuis l'admin pour alimenter la galerie publique.
- Confirmer la persistance des prix, des medias et des leads apres redemarrage Docker.

## Version en preparation - Medias et realisations

### Nouveautes visibles pour le client

- Nouvelle bibliotheque photo et video dans l'espace admin.
- Association obligatoire d'un media a une fiche realisation depuis une liste de projets.
- Ajout d'un titre et d'un texte alternatif pour chaque photo ou video.
- Apercus regroupes par realisation sur la page publique.
- Prise en charge des images JPEG, PNG, WebP et des videos MP4/WebM.
- Possibilite de modifier ou supprimer un media depuis l'administration.
- Nouvelle fiche de modification des realisations : titre, zone, type de travaux, description, duree, budget, tags et visibilite.
- Les modifications des fiches admin sont reprises automatiquement sur le site public.
- Les realisations de demonstration restent disponibles comme base de travail meme si le seed n'a pas encore ete lance.

### Corrections techniques

- Le selecteur d'association media n'est plus vide lorsque les donnees de demonstration ne sont pas encore en base.
- Une realisation de demonstration est creee automatiquement au premier rattachement d'un media.
- Les medias sont conserves dans le volume Docker persistant `a2e_media`.
- Les actions d'upload, modification et suppression restent tracees dans le journal admin.

### Verification a effectuer avant publication

- Televerser une photo et une video sur deux realisations differentes.
- Modifier le titre et la description d'une realisation, puis recharger la page publique.
- Supprimer un media et verifier qu'il disparait du site.
- Redemarrer le conteneur et verifier que les medias sont toujours presents.
- Tester le rendu sur mobile et desktop.

## Historique

### Version precedente - Fondations admin et estimation

- Dashboard admin avec leads, pipeline, exports CSV/PDF, SEO et journal d'audit.
- Suivi des visites, clics, demarrages simulateur et leads consentis.
- PDF de pre-devis avec lignes detaillees, fourchettes et feuille de route.
- Notifications Brevo API et alertes Telegram configurables.
- QR code telephone et liens sociaux administrables.
- Deploiement Docker/GHCR/Portainer documente.
