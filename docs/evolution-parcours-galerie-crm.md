# A2E - Parcours, prix a la carte et suivi commercial

Version locale du 6 octobre 2026, construite sur la refonte precedente. Aucune base du NAS n'a ete consultee et aucun email client n'a ete envoye.

## Parcours et prix

Le simulateur comporte quatre etapes : travaux, precisions, budget et PDF. Plusieurs metiers peuvent partager un dossier. Le budget se recalcule pendant la saisie, les choix restent disponibles au retour et un brouillon existant ne se fait pas remplacer silencieusement par la calculette express.

L'electricite propose des prises neuves ou remplacees, des points lumineux, la pose de luminaires fournis, des circuits dedies et des points reseau. Les packs affichent leurs quantites cibles. Le tableau est facultatif et compose par rangees/circuits, avec fourniture et pose separees. Aucun forfait au m2 n'est ajoute dans ces nouveaux modes.

Les sanitaires distinguent fourniture et pose. Le pack comprend une douche, un meuble simple vasque et un WC. La distribution est une option explicite. Le pack salle de bain ajoute les sols et murs sur les surfaces saisies ; une combinaison qui recouvre les memes sanitaires est refusee.

Les bases de simulation sont centralisees dans `src/lib/pricing/price-data.ts`, documentees et exportables. Elles restent a valider avec A2E, ses fournisseurs et les conditions du chantier. La comparaison d'un produit vendu seul avec une intervention installee doit garder leurs perimetres et bases fiscales distincts.

Les anciennes cles servent toujours aux anciens dossiers et a l'admin. La vitrine affiche leurs successeurs detailles seulement lorsque toutes les references necessaires sont chargees (`public-catalog.ts`). Les reperes electriques globaux au m2 restent dans une rubrique historique distincte. Le bootstrap Docker preserve les prix deja personnalises et exclut les 25 nouvelles references detaillees de demonstration : elles necessitent une revue puis un import admin explicite.

## Galerie et gestion

La galerie dispose d'un lecteur plein ecran, de vignettes, d'un diaporama commandable et d'une comparaison avant/apres. Les commandes au clavier, la pause, Escape et le retour du focus ont ete controles dans le navigateur disponible.

Le flux admin comporte la fiche, les medias ordonnes, la couverture, les roles avant/apres, l'apercu enregistre puis la publication. Une comparaison exige une confirmation explicite de la meme piece. Les illustrations de demonstration et inspirations restent identifiees ; elles ne sont pas presentees comme des chantiers A2E.

Details : [galerie-publication.md](galerie-publication.md).

## Prospection et mesure

Le CRM utilise les memes `Lead` que les demandes du site. Il ajoute les prospects manuels, les origines, une prochaine action datee, les filtres aujourd'hui/en retard et l'historique des notes, appels, emails et visites declares. Les modifications sont versionnees et relues avant confirmation ; les nouvelles tentatives de creation sont idempotentes.

Les rappels sont des actions de gestion. Les liens telephone/email ouvrent l'application de l'operateur ; aucun email de relance n'est envoye automatiquement par le CRM. Les notifications de nouvelles demandes vers les boites de l'equipe restent configurees dans les reglages existants.

Le dashboard distingue les demandes web enregistrees, tous les dossiers CRM, les echeances et le parcours des sessions ayant accepte la mesure. L'entonnoir respecte l'ordre des etapes et ne confond pas une session avec une personne. Une base indisponible masque les chiffres ; aucun compteur fictif n'est substitue.

Details : [crm-prospection.md](crm-prospection.md) et [kpi-acquisition-qualifiee.md](kpi-acquisition-qualifiee.md).

## Validation et migration

Les tests fonctionnels emploient des doubles de stockage explicites : ils verifient les calculs, les autorisations, les sauvegardes/relectures, les conflits, les erreurs API et le consentement sans contacter la production. Des captures du dashboard ont utilise des fixtures portant un bandeau de demonstration. Elles ne constituent pas des resultats commerciaux.

L'aperçu public a ete controle sur telephone (375 px) et ordinateur (1440 px) dans le navigateur integre disponible. Le curseur de galerie, le diaporama, les erreurs de quantite et le budget express ont ete verifies. Les captures sont conservees localement dans `docs/preview-tests`.

Le parcours de production local accueil -> quatre prises -> personnaliser -> choix explicite du brouillon -> precisions est verifie. Sans tableau, il affiche 340-620 EUR ; avec un tableau 2 rangees/8 circuits, il ajoute une fourniture 200-550 EUR et une pose 300-650 EUR, soit 840-1 820 EUR pour les trois lignes retenues. Le recapitulatif mobile ne deborde pas horizontalement. Le catalogue public presente ces nouvelles references et replie les anciens reperes electriques au m2. Ce sont des scenarios de demonstration, sans acces a une base entreprise.

La migration additive `20261006223000_lead_crm_followup` cree les champs de suivi et `LeadActivity`, sans remplacer les dossiers existants. Prisma generate/validate, TypeScript et lint passent. L'installation gelee et le build de production passent. Les controles de parcours, tarifs detailles, cotations, CRM, galerie, KPI, consentement, autorisations, exports et fichiers passent sur leurs fixtures. Le bootstrap est aussi teste : il preserve les prix existants et n'active pas les 25 propositions detaillees.

Le PDF detaille comporte huit lignes sanitaires/finitions sur trois pages. Les controles de mise en page des PDF longs et des cotations passent ; 22 pages ont ete extraites et rendues sans alerte de debordement. Les pages du PDF detaille ont aussi ete inspectees. Le workflow CI ajoute un PostgreSQL de test et execute `prisma migrate deploy` avant les controles ; ce workflow n'a pas ete execute depuis cet environnement.

PostgreSQL, Docker et l'acces au NAS restent absents ici. Les ecritures reelles, le deploy de migration, les logs/healthchecks du conteneur, les volumes et la livraison email restent a verifier sur la stack de test puis sur le NAS.

Pour Portainer : suivre [migration-docker-premium.md](migration-docker-premium.md), sauvegarder la base et les medias. Revoir les 25 lignes de `prix-detail-a-la-carte-2026.csv` et ajuster montants/perimetres/references/TVA. Ne pas importer les 80 lignes de demonstration sur un catalogue existant : cela remplacerait ses montants.

Publier l'image du commit valide, utiliser son tag SHA et recreer la stack avec ses volumes existants, sous maintenance publique. Le service `migrate` applique les migrations puis le bootstrap additif avant le service web. Depuis l'admin de cette nouvelle image, importer seulement les 25 lignes revues et confirmer leur relecture, puis tester avant de rouvrir le trafic. Ne pas reutiliser l'ancien client Prisma apres la migration des types de prix. Sans les references detaillees importees, le nouveau calcul indique un tarif indisponible ; il ne remplace pas les donnees entreprise par les prix locaux. Verifier les dossiers existants, une sauvegarde admin/relecture, une cotation PDF et la notification de test. Ne pas lancer le seed de demonstration sur la production.
