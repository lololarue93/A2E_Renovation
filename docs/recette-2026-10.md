# Recette locale - 19 octobre 2026

Perimetre : code du dossier `A2E`, preview Next locale et PostgreSQL de recette
isole. Les doubles de test, le vrai HTTP/SQL et Lighthouse sont identifies
separement. Ce document ne certifie ni la production, ni les services externes.

## Preuves disponibles

| Controle | Resultat observe | Preuve / limite |
| --- | --- | --- |
| Suites fonctionnelles | 20 suites executees ensemble avec succes apres migration Next 15 ; nouveau controle SMTP et journal | `scripts/verify-project.mjs` ; sortie locale `docs/preview-tests/final-functional-checks.log` |
| Dependances | Audit des dependances de production : 0 avis connu au 19/10 ; typage complet et lint passes | [Versions, sources et avis des outils de developpement](dependances-2026-10.md) |
| Schema PostgreSQL | 7 migrations appliquees en recette locale | Dossiers `prisma/migrations/` ; n'atteste pas le schema du NAS |
| HTTP + vraie base | Passe finale : 8 controles passes, import du catalogue compris, nettoyage confirme et aucun email envoye | `docs/preview-tests/release-http-ee3e6eb2-7876-4d99-a7b8-864c6c8e2af0.json` |
| Catalogue 77 | Relecture/import de recette ; 80 descriptions/references, prix au centime relu | `release-http-bf06a74b-52be-4902-9acf-2e59b9925cef.json` dans le meme dossier ; aucune validation economique A2E deduite |
| Galerie fictive | 3 exemples crees en recette, puis 0 cree / 3 preserves au second import ; SQL autorite | Retour du pilote de session ; test `verify-demo-projects` : 6 WebP 1200 x 800, roles, couverture, etiquettes et gardes |
| CRM de demonstration | Trois exemples presents ; seconde execution : 0 creation, 3 preserves ; modifications conservees | `scripts/import-local-demo-prospects.ts`, [dossiers et echeances](prospects-fictifs-recette.md) ; note initiale et trace d'import par dossier, note de recette ajoutee dans le navigateur pour Melun |
| Avis | Aucun avis fictif ; protection, validation et version de configuration testees | `scripts/verify-reviews.ts` ; aucun avis reel ni accord client collecte par la recette |
| Lighthouse accueil mobile | Performance finale 98 ; accessibilite, bonnes pratiques et SEO 100 ; LCP 2,3 s, CLS 0 | `.lighthouse/final-mobile.report.json` ; rapport valide sans erreur runtime, puis echec de nettoyage temporaire Windows dans le CLI |
| Lighthouse accueil desktop | Performance, accessibilite, bonnes pratiques et SEO 100 ; LCP 0,6 s, CLS 0 | `.lighthouse/final-desktop.report.json`, CLI termine avec succes |

Les preuves de `docs/preview-tests` et `.lighthouse` sont locales et ignorees
par Git. Les conserver dans le dossier de livraison prive si elles sont utiles
a l'operateur. Aucun identifiant ni secret ne doit accompagner ce transfert.

## Ce que couvrent les tests

- Calculs multi-postes, quantites, detail fourniture/pose, cotations, TVA, remise
  et PDF ; bootstrap preservant les donnees existantes.
- Admin, connexion/deconnexion, refus sans session, Origin invalide, exports,
  sauvegarde et relecture, erreurs API, conflits CRM et d'avis.
- Contact, consentement analytics, conversion serveur, entonnoir KPI,
  galerie, import des trois projets, uploads et mise en page PDF.

Les sept controles HTTP/SQL portent sur : isolation des notifications,
session et Origin, base locale gardee, modification/relecture d'un prix au
centime, transactions/conflits CRM, recalcul serveur de quatre prises et PDF
de deux pages, puis deconnexion. Les demandes de test sont nettoyees.
`emailSent=false` est attendu dans cette recette ; aucun envoi reel n'est prouve.

La base de recette est separee de la production. Les trois prospects fictifs
sont intitules `EXEMPLE - Maison Melun`, `Meaux` et `Fontainebleau` ; l'import
utilise des adresses reservees `.example.test`, aucun telephone et aucun
consentement de contact. Il ne cree ni notification ni evenement d'acquisition.
Son garde limite l'import explicite a la base QA locale en loopback. Les
compteurs CRM de recette peuvent contenir ces exemples, pas les KPI d'acquisition.

Les maisons illustrees a Melun, Meaux et Fontainebleau sont des scenarios,
pas des chantiers A2E : six images generees par l'outil integre, puis WebP,
aucun avis, budget, delai ou gain invente. L'import par defaut cree des
brouillons ; `--publish-demo` agit seulement lors de la creation. Une base
configuree conserve l'autorite : aucun fallback ne republie un brouillon masque.

Les scores Lighthouse proviennent d'une mesure locale par profil, avec
contextes de donnees differents avant/apres. Ils ne permettent pas d'attribuer
le gain a une seule modification ni de predire le reseau du NAS. Les quatre
rapports sont complets, sans erreur d'execution Lighthouse ; certaines sorties
CLI ont echoue ensuite au nettoyage temporaire Windows. Le diagnostic sur le
nom accessible du CTA est corrige en utilisant le texte visible du lien.

## Derniere passe avant livraison

```powershell
node scripts/verify-project.mjs
pnpm run lint
pnpm run build
```

La derniere passe doit suivre l'integration de tous les lots. Ne pas transformer
un resultat anterieur en validation du dernier etat du code.

- [x] Confirmer l'import et la relecture des trois prospects locaux ; tester
  une modification, une echeance et une nouvelle execution sans ecrasement.
- [x] Rejouer HTTP/PostgreSQL sur la preview finale avec notifications isolees.
- [x] Controler dans Chromium les largeurs 375, 768, 1024 et 1440, le clavier,
  la comparaison et le diaporama, le calcul de quatre prises, la connexion et
  la sauvegarde/relecture d'un suivi CRM et d'une realisation. Les tests
  automatises couvrent aussi contact, panier multi-postes et PDF.
- [ ] Faire valider les prix et references dates par A2E avant tout import
  entreprise. Ni le releve 77 ni les fixtures ne sont un bordereau negocie.
- [ ] Obtenir la validation GitHub de cette revision et construire/tester
  l'image Docker ; un workflow present n'est pas une execution CI reussie.
- [ ] Publier uniquement apres l'action autorisee sur main ; relever le tag
  `sha-<commit-complet>` puis suivre la procedure Portainer, sans seed global.
- [ ] Sur NAS : sauvegarde, restauration vers nouveaux volumes, migrations,
  healthcheck, HTTPS/proxy, uploads et donnees apres redemarrage.
- [ ] Configurer le compte expediteur et ses credentials en prive ; verifier
  un vrai message recu et son PDF avant d'annoncer les notifications pretes.
- [ ] Refaire Lighthouse sur le site final et conserver URL, date, profils
  et rapports. Aucun score local ne remplace ce controle externe.

Suivi des decisions et navigation : [PILOTAGE.md](PILOTAGE.md).
