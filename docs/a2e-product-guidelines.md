# A2E Renovation - Cahier produit et QA

Ce document transforme les retours de l'equipe en criteres de conception, de calcul et de validation. Il complete `AGENTS.md`.

## Vision d'experience

Le visiteur doit comprendre en quelques secondes :

- A2E intervient dans toute l'Ile-de-France.
- Les travaux sont etudies par poste et peuvent etre combines.
- Le simulateur donne une fourchette indicative expliquee.
- Un humain reprend le dossier apres le PDF.

La homepage doit etre une page d'accroche, pas un catalogue de toutes les fonctionnalites. Le menu conduit vers des pages distinctes : services, realisations, simulateur, equipe, aides, contact.

## Architecture du simulateur cible

### Etape 1 - Projet

Type de bien, surface, ville/code postal, occupation, niveau d'urgence et acces chantier.

### Etape 2 - Postes

Un projet peut contenir plusieurs postes. Le composant doit maintenir une liste `items[]`, par exemple :

```text
[
  { category: "insulation", ... },
  { category: "windows", ... },
  { category: "electricity", ... }
]
```

Chaque item porte ses propres quantites et options. Le total est la somme des lignes, puis des coefficients documentes. Une categorie choisie ne doit jamais effacer une autre categorie.

### Etape 3 - Detail par poste

- Fenetres : type d'ouvrant, largeur, hauteur, quantite, PVC/alu/bois, vitrage, oscillo-battant, baie, porte-fenetre, porte d'entree, volets et pose.
- ITE : surface facade, isolant, finition, echafaudage, acces, soubassement et points singuliers.
- Electricite : surface, niveau de renovation, tableau, prises, eclairages, lignes specialisees, reseau et borne.
- Plomberie : douches, baignoires, lavabos/vasques, WC, evier, chauffe-eau, points d'eau et evacuations.
- Cuisine/salle de bain : renovation partielle ou complete, depose, meubles/equipements, reseaux, carrelage et finitions.
- PAC/VMC : surface, isolation, consommation, energie actuelle, emetteurs, temperature cible, eau chaude, puissance estimee et contraintes de pose.
- Couverture/charpente : surface, pente, acces, type de couverture, isolation, reprises et evacuation.

### Etape 4 - Controle et resultat

Avant contact et PDF, afficher un recapitulatif complet. Toute modification de quantite doit mettre a jour la fourchette sans rechargement de page. Les lignes doivent rester lisibles sur mobile.

## Criteres de prix

Une ligne de prix doit expliquer ce qu'elle contient. Exemple : fourniture, pose, depose, reglages, finitions, marque ou equivalent et exclusion. Les marques sont des exemples de gamme, jamais une garantie de disponibilite.

Chaque estimation doit rappeler :

- prix indicatifs, hors validation technique ;
- metrage et contraintes a confirmer ;
- TVA et aides non deduites si elles ne sont pas verifiees ;
- validite commerciale du PDF ;
- avantage de signature conditionnel, sans baisse artificielle du prix de reference.

## Admin et persistence

Pour chaque champ editable :

1. Le formulaire charge la valeur depuis l'API.
2. La validation empeche une valeur incoherente.
3. La sauvegarde retourne la valeur enregistree.
4. Un rechargement confirme la persistence.
5. Le front public lit la meme source de verite.

Un bouton qui affiche seulement "Enregistre" sans verification de rechargement est considere incomplet.

## Plan de tests fonctionnels

### Simulateur

- Ouvrir avec une fenetre par defaut et une quantite non nulle.
- Ajouter deux fenetres, une baie et une porte d'entree.
- Ajouter ITE puis fenetres sans perdre les choix.
- Modifier une quantite de 0 a 1 puis 1 a 4.
- Supprimer un poste et verifier le total.
- Revenir en arriere puis avancer sans perte.
- Telecharger un PDF combine et verifier toutes les lignes.
- Envoyer un lead avec consentement et sans consentement.

### Admin

- Modifier un prix bas, central et haut.
- Refuser `low > mid`, quantite negative et URL sociale invalide.
- Recharger la page et confirmer la valeur.
- Remplacer le logo et verifier header, footer, favicon et Open Graph.
- Activer/desactiver le tracking et verifier le comportement.

### Production

- Tester `http://IP:3000` et le domaine HTTPS.
- Verifier le healthcheck et les logs `a2e-web`.
- Appliquer les migrations sans modifier les donnees existantes.
- Pull de la nouvelle image GHCR et recreation du conteneur.
- Verifier le PDF, les analytics et les liens sociaux depuis un navigateur externe.

## Revue de code

Une revue doit commencer par les risques : perte de donnees, calcul faux, champ non sauvegarde, regression mobile, fuite de secret, erreur silencieuse ou endpoint admin non protege. Le resume visuel vient apres les risques. Toute correction doit inclure le test qui aurait detecte le probleme.

## Priorites de la prochaine iteration

1. Corriger la sauvegarde des prix dans l'admin et afficher l'erreur API exacte lorsque l'ecriture echoue.
2. Ajouter une gestion admin complete du logo : upload, apercu, remplacement, fallback et validation du format.
3. Refondre le simulateur en panier multi-postes avec ITE + fenetres dans le meme dossier.
4. Corriger la quantite initiale des fenetres et couvrir les cas zero, un, plusieurs et suppression.
5. Revoir la matrice de prix avec des petits chantiers realistes, des lignes de pose distinctes et des fourchettes controlees.
6. Remplacer les titres decoratifs par une typographie sans-serif contemporaine, puis verifier le rendu mobile.
7. Simplifier la homepage en page d'accroche et conserver les pages detaillees pour les services et les realisations.
