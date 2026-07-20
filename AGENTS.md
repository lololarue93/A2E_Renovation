# A2E Renovation - Instructions de developpement

## Objectif produit

A2E Renovation est un site de renovation en Ile-de-France qui doit transformer une visite en demande qualifiee. Le parcours prioritaire est :

1. Comprendre rapidement les travaux proposes.
2. Composer un projet avec plusieurs postes.
3. Voir une fourchette basse, centrale et haute justifiee.
4. Recevoir un pre-devis PDF lisible et demander un contact humain.

Le site doit rester premium, clair, rassurant et rapide. Il ne doit jamais promettre un devis ferme avant metrage et visite technique.

## Regles incontournables

- Lire `docs/a2e-product-guidelines.md` avant toute evolution fonctionnelle ou visuelle.
- Conserver l'ASCII dans les nouveaux fichiers lorsque cela est possible. Respecter l'encodage existant lors des corrections.
- Ne jamais inventer une statistique, un prix fournisseur, une certification RGE ou une aide publique.
- Toute nouvelle donnee editable par l'entreprise doit avoir une source de verite admin ou un fichier de configuration documente.
- Ne pas enfouir les prix, le logo, le telephone, les reseaux sociaux ou les destinataires email dans plusieurs composants.
- Toute migration Prisma doit etre ajoutee dans `prisma/migrations`, testee avec `prisma migrate deploy`, puis documentee.
- Ne jamais utiliser `prisma migrate dev` dans le conteneur de production.
- Ne jamais exposer de secret dans Git, le navigateur, un PDF public ou un log.
- Une erreur de notification ne doit jamais empecher le telechargement local d'un PDF.
- Les KPI doivent venir de `SiteEvent` ou de donnees effectivement stockees. Aucun compteur fictif ou statique.

## Priorites fonctionnelles actuelles

### Simulateur

- Le projet est un panier multi-postes, pas un choix exclusif de categorie.
- Permettre d'ajouter, modifier, dupliquer et supprimer plusieurs postes : ITE + fenetres + electricite, etc.
- Conserver les choix lors du retour entre etapes et apres une erreur de validation.
- Pour les fenetres, la quantite initiale doit etre une valeur valide et visible, jamais un `0` implicite bloque. Distinguer fenetre, porte-fenetre, baie vitree, porte d'entree 5 points, volet, vitrage et pose.
- Chaque poste doit proposer des sous-options pertinentes et une action explicite `Ajouter un poste`.
- Le total doit se recalculer immediatement apres chaque ajout, suppression ou changement de quantite.
- Afficher les lignes retenues avant le PDF : libelle, unite, quantite, hypothese materiau, pack de pose, fourchette basse/centrale/haute.
- Signaler les contraintes qui necessitent une visite : metrage, acces, support, raccordements, structure, puissance, evacuation.
- Une estimation combinee doit produire un seul numero de dossier et un seul PDF avec toutes les lignes.

### Prix

- La matrice prix doit etre centralisee dans `src/lib/pricing/price-data.ts` et editable depuis l'admin.
- Chaque ligne doit avoir une unite, une fourchette, une description, une reference ou gamme indicative et une hypothese de pose.
- Les montants doivent etre controles par des tests de coherence : `low <= mid <= high`, quantite positive, unite compatible avec le poste.
- Les fourchettes doivent rester competitives et explicables. Ne pas gonfler automatiquement un petit chantier par un forfait disproportionne.
- Les options et la pose doivent etre des lignes separees afin d'expliquer le prix et de permettre les upsells.
- Toute modification admin doit afficher son resultat, gerer les erreurs API et confirmer la persistance apres rechargement.

### Admin

- Les formulaires admin doivent avoir les etats chargement, succes, erreur et confirmation apres rechargement.
- Les prix, le logo, les medias, le telephone, les reseaux sociaux et les notifications doivent etre modifiables sans edition de code lorsque le besoin est metier.
- Si un fichier logo est remplace, conserver un apercu, un texte alternatif, les dimensions et un fallback stable.
- Les roles a prevoir : admin, auditeur, operateur. Ne pas declarer un role fonctionnel tant que l'autorisation n'est pas appliquee cote serveur.
- Le dashboard doit distinguer visites, visiteurs uniques, demarrages simulateur, leads consentis, PDF telecharges et conversions.
- Les courbes doivent indiquer la periode, la source et le fuseau horaire.

### Design et contenu

- Utiliser une typographie sans-serif contemporaine et lisible pour les titres et le corps. Eviter les polices serif decoratives ou "a bouclettes".
- La page d'accueil doit etre une accroche courte avec un CTA simulateur et un CTA telephone. Les services, realisations, equipe, aides et contact restent des pages navigables.
- Ne pas transformer chaque bloc en carte flottante. Privilegier des sections pleines largeur et des listes scannables.
- Le logo A2E doit etre present dans l'en-tete, le footer, le favicon et les apercus de partage.
- Les apercus de partage doivent utiliser `NEXT_PUBLIC_SITE_URL` en production et une image Open Graph reelle dans `public/branding`.
- Toute image doit avoir un texte alternatif utile, une taille stable et un comportement responsive.

## Procedure obligatoire avant livraison

1. Lire les fichiers et les donnees existantes avant de modifier.
2. Implementer la source de verite et l'interface ensemble.
3. Ajouter ou mettre a jour la migration si le schema change.
4. Tester les calculs unitaires et les cas multi-postes.
5. Tester l'admin : sauvegarde, rechargement, erreur API, acces non autorise.
6. Tester le PDF : lignes, totaux, logo, date, validite, conditions et telechargement local.
7. Tester les analytics : page view, clic CTA, simulateur, lead et stockage en base.
8. Executer `pnpm install --frozen-lockfile`, `pnpm exec prisma generate` et `pnpm run build`.
9. Verifier le rendu mobile et desktop dans Chrome, Edge et Safari ou un equivalent disponible.
10. Verifier les logs Docker, le healthcheck, les migrations et le pull de l'image GHCR.
11. Committer avec un message precis et indiquer les etapes Portainer necessaires.

## Deploiement de reference

- GitHub Actions construit `ghcr.io/lololarue93/a2e-renovation:latest`.
- Portainer doit faire `Pull latest images` et recreer les conteneurs apres un nouveau build.
- Executer `pnpm exec prisma migrate deploy` seulement lorsqu'une nouvelle migration doit etre appliquee.
- Executer `pnpm run prisma:seed` seulement pour initialiser ou resynchroniser les donnees de demonstration.
- Verifier ensuite le site IP local, le proxy Nginx, HTTPS, le dashboard admin et le telechargement PDF.
