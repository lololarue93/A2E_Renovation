# Galerie et publication des realisations

## Donnees et presentation

Le site public lit uniquement les fiches `Realisation.active = true` et leurs medias lies. Les brouillons sont absents de la galerie. Les anciennes fiches dont l'identifiant commence par `demo-realisation-` restent marquees comme inspirations ; aucun avant/apres de chantier n'est deduit de ces exemples.

La demonstration illustree utilise `/branding/demo-piece-avant.svg` et `/branding/demo-piece-apres.svg`, deux dessins d'une meme geometrie fictive. Ses libelles sont `Etat initial` et `Projet imagine`, avec la mention `pas un chantier A2E`. Les autres images d'inspiration ne sont pas associees en fausse comparaison.

Un lecteur plein ecran natif `dialog` propose Escape, retour du focus au bouton d'ouverture, fleches precedent/suivant, miniatures, compteur, gestes tactiles et videos a commandes explicites. Le diaporama demarre sur demande, peut etre mis en pause, s'arrete lors d'une navigation manuelle et n'est pas propose avec `prefers-reduced-motion`. Le curseur de comparaison se manipule au toucher, a la souris ou avec les fleches du clavier sur le champ range. Les medias indisponibles affichent un etat lisible.

## Source de verite sans migration

Le schema media existant est conserve. `MediaAsset` porte fichier/titre/texte alternatif/fiche, et `RealisationPhoto` conserve les anciennes paires avant/apres explicites. Le classement additionnel est un manifeste JSON dans `SiteSettings`, cle `gallery:<realisationId>` :

```json
{
  "version": 1,
  "order": ["asset-id-1", "asset-id-2"],
  "roles": { "asset-id-1": "before", "asset-id-2": "after" },
  "coverId": "asset-id-2",
  "comparisonConfirmed": true
}
```

Le helper `src/lib/realisations/gallery.ts` valide et normalise ce manifeste pour l'admin et le public : identifiants lies a la fiche uniquement, ordre deduplique, nouveaux medias ajoutes, une photo Avant et une photo Apres maximum, couverture image, videos dans Galerie. Sans couverture explicite valide, la premiere image est choisie.

Une nouvelle comparaison exige deux images distinctes et la confirmation courte qu'elles montrent le meme espace. Changer une photo Avant/Apres invalide cette confirmation. L'ordre et la couverture ne la modifient pas. Les anciennes paires explicitement enregistrees dans `RealisationPhoto` restent affichables. Aucune transformation n'est inferee d'images independantes.

## Flux admin

1. Creer une fiche en brouillon : titre, ville/zone, type et description factuelle ; duree/budget facultatifs.
2. Ajouter les photos ou videos : role Avant, Apres ou Galerie, titre, description d'accessibilite ; classement et couverture modifiables sans saisie d'identifiants.
3. Ouvrir l'apercu des donnees enregistrees, avec le meme lecteur que le site.
4. Publier. L'API exige au moins une photo ; le statut est relu apres sauvegarde.

Les medias d'une fiche deja publiee sont visibles dans la galerie apres chaque modification enregistree. Supprimer sa derniere photo est refuse : ajouter une photo ou repasser la fiche en brouillon. Les erreurs et confirmations apres rechargement restent explicites. Les fichiers acceptes sont JPEG/PNG/WebP/MP4/WebM, 50 Mo maximum ; les grandes images sont optimisees avant l'envoi.

Les brouillons sont caches dans la navigation publique, mais les fichiers envoyes restent des URLs statiques sous `/uploads/realisations`. Ce n'est pas un coffre de fichiers confidentiels. Le volume Docker de medias doit rester monte et sauvegarde selon le guide de migration.

## Integrite et mesures

Les routes admin appliquent `requireAdmin`. Metadata, ordre et historique sont ecrits dans une transaction Serializable. Un echec de stockage apres ecriture de fichier retire ce fichier ; une erreur de base retourne un message sans exposer de donnees techniques sensibles. Les actions `media.uploaded`, `media.updated`, `media.deleted`, `realisation.created` et `realisation.updated` sont journalisees.

Les evenements facultatifs `gallery_opened`, `gallery_comparison_used`, `gallery_estimate_clicked` ont uniquement les labels fixes `published` ou `inspiration`. Ils passent par le suivi avec consentement et ne contiennent ni nom, ni identifiant de chantier, ni coordonnees.

## Verification

`node node_modules/tsx/dist/cli.mjs scripts/verify-gallery.ts` controle les roles uniques, l'ordre/couverture, la confirmation explicite, les photos historiques, les demonstrations non attribuees a A2E, les relectures API, le refus d'acces avant toute lecture, la publication sans photo refusee, la protection de la derniere image publiee et les erreurs de base.

Le stockage est double en memoire. Aucun fichier ni email n'est envoye. TypeScript et lint ont ete verifies. Les tests navigateur sont a effectuer pour le curseur, le focus/echappement du dialog, le diaporama et les ecrans mobile/desktop ; les verifications PostgreSQL/Docker sont distinctes.
