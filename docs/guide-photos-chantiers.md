# Photos des chantiers et exemples 77

Les trois maisons de Melun, Meaux et Fontainebleau sont des projets fictifs.
Leurs six images ont ete generees avec l'outil integre `image_gen.imagegen`,
puis converties en WebP 1200 x 800 (sans retouche creative). Elles illustrent
des intentions et ne constituent jamais des references de chantiers A2E.
Aucun budget, delai, avis client ou gain energetique n'est attribue a ces exemples.

Source unique : `src/lib/realisations/demo-projects.ts`. Prompts et provenance :
`docs/realisations-demo-prompts.json`. Images : `public/branding/realisations-demo/`.
Les badges et la description rappellent leur nature fictive, meme si une fiche
de demonstration est modifiee dans l'admin.

## Import explicite dans l'admin

Sans `DATABASE_URL`, la galerie utilise ces trois exemples pour l'apercu local.
Des qu'une base est configuree, seules ses fiches actives sont publiques :
un brouillon masque dans l'admin ne reapparait pas depuis le catalogue statique.
Le bootstrap et le seed habituels ne sont pas modifies par cet import.

Verifier d'abord les six fichiers sans ecriture :

```powershell
pnpm exec tsx scripts/import-demo-projects.ts --dry-run
```

Importer dans la base locale ou de recette deja configuree, en brouillons :

```powershell
$env:A2E_IMPORT_DEMO_PROJECTS = "confirm-fictional-drafts"
pnpm exec tsx scripts/import-demo-projects.ts
```

Pour creer les trois exemples directement visibles comme inspirations,
ajouter `--publish-demo` lors du premier import. Ce drapeau ne publie jamais
une fiche deja existante. Une reexecution conserve toutes les modifications,
les medias, l'ordre et l'etat publie/brouillon. Seuls les trois IDs
`demo-realisation-77-melun`, `demo-realisation-77-meaux` et
`demo-realisation-77-fontainebleau` sont concernes. L'import est transactionnel.

Dans l'admin, verifier la presence des trois fiches, leurs deux images,
les roles Avant/Apres, la couverture et l'apercu du curseur. Modifier un titre,
enregistrer et recharger. Publier ou masquer une fiche, puis recharger la galerie
publique pour confirmer que la base reste l'autorite.

## Premier ajout via Portainer (opt-in)

Apres deploiement de l'image contenant ces fichiers, l'operateur peut executer
cette commande ponctuelle dans la console du conteneur web si ces exemples
sont souhaites. L'image contient le script, `src/lib` et le runtime `tsx` ;
ce script utilise des imports relatifs et ne depend pas des alias du tsconfig.

```sh
A2E_IMPORT_DEMO_PROJECTS=confirm-fictional-drafts A2E_ALLOW_DEMO_IMPORT=1 node node_modules/tsx/dist/cli.mjs scripts/import-demo-projects.ts --publish-demo
```

Omettre `--publish-demo` pour creer des brouillons a revoir avant publication.
Ne pas lancer le seed global : cet import ne doit pas resynchroniser les prix,
les utilisateurs ou d'autres donnees. Ne jamais ajouter ces variables au
bootstrap automatique. Verifier les etiquettes de demonstration sur le site.

## Prises de vue pour remplacer les exemples

- Photographier un chantier reel uniquement avec l'autorisation du proprietaire
  et du photographe ; archiver l'accord pour les supports de diffusion retenus.
  Retirer personnes, adresse exacte, plaques et documents identifiants du cadre.
- Marquer la position de l'appareil et sa hauteur, utiliser la meme focale,
  orientation et distance avant et apres. Conserver les ouvertures dans le cadre,
  des verticales droites et une lumiere comparable. Eviter le tres grand angle.
- Pour chaque piece : une vue large depuis un angle fixe, une contre-vue,
  deux details de finition et, si utile, une vue des reseaux avant fermeture.
  Dans le sejour, cadrer pierre/poutre/menuiseries ; dans la cuisine, cadrer
  implantation/raccordements/sol ; dans la salle d'eau, cadrer douche/vasque/joints.
- Legender les travaux effectivement executes : type de maison, commune,
  probleme initial, lots traites, materiaux et limites de la prestation.
  N'afficher surface, duree, budget ou resultat que s'ils sont documentes.
- Creer une nouvelle fiche de chantier reel dans l'admin, charger les photos,
  renseigner leurs textes alternatifs, definir la couverture et les roles,
  confirmer l'avant/apres apres controle du meme point de vue, puis publier.
  Masquer ensuite l'exemple fictif correspondant. Garder les IDs de demonstration
  preserves permet de conserver leur signalement explicite.
