# Migration Docker premium A2E

Ce dossier prepare la mise a jour de l'installation NAS UGreen / Portainer /
Nginx Proxy Manager connue dans le depot. Aucun acces au NAS, push GitHub ou
deploiement distant n'a ete effectue. Verifier les noms de volumes, les donnees,
la version Docker/Portainer et le domaine reel sur le NAS.

## 1. Relever l'installation

Depuis une copie du depot dans le terminal SSH du NAS :

```bash
bash scripts/docker/preflight.sh
```

Ce script en lecture seule affiche images/IDs, volumes, version SQL, tables et
sante, sans imprimer les variables d'environnement. Conserver aussi le nom de
stack Portainer, son Compose actuel et une copie privee des variables/secrets.
`A2E_WEB_CONTAINER` / `A2E_DB_CONTAINER` adaptent les noms de conteneurs.

Garder **le meme nom de stack** et les cles `a2e_postgres` / `a2e_media` : Compose
prefixe les volumes par ce nom. Une nouvelle stack sans rattachement explicite
pourrait initialiser une base vide. Si des bind mounts sont detectes, conserver
leurs chemins et adapter une procedure verifiee ; les scripts fournis refusent
de traiter ces chemins comme des volumes nommes. Si PostgreSQL n'est pas au major
16, preparer une migration adaptee avant de poursuivre.

## 2. Sauvegarder avant de redeployer

Verifier l'espace libre. `/volume2/docker/a2e/backups` est un chemin propose a
adapter au NAS. Arreter tout autre outil qui ecrit dans la base ou les medias.
Le script arrete le web pendant le dump et l'archive pour prendre une copie
coherente ; les secrets Portainer ne sont pas exportes.

Pour le premier passage depuis `latest`, inclure les images exactes et maintenir
le site arrete jusqu'au redeploiement :

```bash
A2E_BACKUP_ROOT=/volume2/docker/a2e/backups \
BACKUP_INCLUDE_IMAGES=1 BACKUP_KEEP_WEB_STOPPED=1 \
bash scripts/docker/backup.sh
```

Le dossier horodate contient `database.dump`, `media.tar.gz`, `manifest.txt`,
`SHA256SUMS`, `COMPLETE` et ici `images.tar.gz`. Le dump est liste avec pg_restore,
l'archive media est lue et les checksums sont controles avant le marqueur COMPLETE.
Un echec ne laisse pas de marqueur valide et tente de redemarrer le web.
Copier ce dossier prive sur un second support. Pour une sauvegarde habituelle
avec redemarrage automatique, omettre `BACKUP_KEEP_WEB_STOPPED=1`.

Une sauvegarde est qualifiee apres un essai de restauration vers des volumes
neufs. Format custom et restauration : documentations officielles
[pg_dump](https://www.postgresql.org/docs/16/app-pgdump.html) et
[pg_restore](https://www.postgresql.org/docs/16/app-pgrestore.html).

## 3. Mettre a jour la stack existante

1. Apres validation et push autorise sur `main` vers GitHub, attendre le workflow Docker
   reussi. Il construit et teste l'image avant publication. Relever le tag SHA
   complet dans son resume ; cette livraison locale ne pousse pas le depot.
2. Dans la stack existante, renseigner `A2E_IMAGE_TAG=sha-<commit-complet>`.
3. Renseigner `POSTGRES_IMAGE` avec l'image major 16 observee au preflight. Garder
   cette image pendant la premiere migration fonctionnelle ; programmer une mise
   a jour de patch distincte, sauvegardee et testee. Ne pas passer au major 17/18.
4. Garder les identifiants SQL et `DATABASE_URL` existants. Configurer un mot de
   passe admin d'au moins 12 caracteres. Conserver le nom de stack et le chemin
   `docker-compose.yml`.
5. Stack Git : **Pull and redeploy**. Stack editeur : **Update the stack** avec
   **Re-pull image / Pull latest images**, selon la version de Portainer. Le pull
   tire le tag precise ; ne pas utiliser `latest` pour selectionner une version.
6. Attendre `migrate` et `media-init` en **Exited (0)**, puis SQL et web healthy.

Le passage par `migrate` est **obligatoire pour cette version**. La migration
`20261006180000_price_item_centimes` convertit les trois prix unitaires
`PriceItem.low`, `mid`, `high` de l'ancien type entier vers `DOUBLE PRECISION`
(Prisma `Float`). Les valeurs anciennes sont preservees, sans recalibration
automatique. Les nouvelles saisies/imports valides acceptent deux decimales.
Prevoir la maintenance pendant ce changement de schema et conserver la sauvegarde
prise avant son application. Ne pas demarrer seulement l'image web en sautant le
service de migration.

Le migrator applique `prisma migrate deploy`, puis cree seulement les donnees
absentes. Les prix personnalises et reglages existants sont preserves. Le seed
historique remplace des donnees : **ne pas lancer `prisma:seed` en production**.
Ne jamais lancer `prisma migrate dev` en production. `media-init` change seulement
les droits du volume uploads pour l'utilisateur node 1000, sans effacer de fichier.

Si le migrator echoue, garder la maintenance, examiner ses logs et corriger la
connexion ou la migration ; ne pas forcer `prisma migrate resolve` avant de
comprendre l'etat SQL. Le web attend le succes des deux services de preparation.

## 4. Valider le NAS

1. `/api/health` renvoie 200, `checks.database=true` et `checks.media=true`.
2. Tester l'IP LAN sur le port 3000, puis le domaine HTTPS via le proxy.
3. Verifier le refus sans authentification de l'admin et des API admin.
4. Verifier un ancien contact, un prix personnalise et un media connus : le
   catalogue par defaut ne prouve pas que l'ancienne base est rattachee.
5. Modifier un prix avec centimes (par exemple 17,50 / 27,50 / 37,50), sauvegarder
   et recharger ; calculer une estimation multi-postes et verifier les lignes,
   fourchettes et PDF. Utiliser une ligne de recette ou revenir ensuite au tarif
   metier valide, sans modifier durablement un tarif client pour la verification.
6. Ajouter une photo, la voir immediatement dans la galerie, puis retrouver prix
   et photo apres redemarrage du seul web.
7. Tester un contact consenti et les notifications configurees ; le telechargement
   PDF doit rester disponible si une notification echoue.

Conserver images, sauvegardes et volumes historiques jusqu'a acceptation metier.
Verifier les logs et l'espace disque. Aucune commande ne nettoie les volumes.

Le catalogue existant est l'autorite en base : le bootstrap ne remplace pas ses
montants par le benchmark. Revoir les references, inclusions et base fiscale des
anciennes lignes avant un import metier. Dans la cotation, choisir HT ou TTC apres
avoir harmonise tous les prix saisis ; une source nationale HT et une source IDF
TTC ne s'additionnent pas directement. Verifier le taux de TVA de chaque ligne.
La remise est propre a cette cotation, facultative et appliquee une seule fois ;
les totaux avant remise, net, HT, TVA et TTC suivent la base choisie. Aucune remise
globale de configuration n'est cumulee silencieusement avec cette remise.

## 5. Restaurer / changer de NAS avec de nouveaux volumes

Sur le Docker cible, verifier le dossier sauvegarde et, si necessaire, importer
les images exactes :

```bash
cd /volume2/docker/a2e/backups/DOSSIER_HORODATE
sha256sum -c SHA256SUMS
docker image load --input images.tar.gz
```

L'import peut remettre les anciens tags de l'archive ; verifier leurs references.
Le script utilise les IDs d'images du manifeste, pas un nouveau latest. Saisir le
mot de passe sans l'ajouter a l'historique, puis revenir a la racine du depot :

```bash
read -rs -p 'Mot de passe PostgreSQL de la copie : ' RESTORE_POSTGRES_PASSWORD
printf '\n'
export RESTORE_POSTGRES_PASSWORD
bash scripts/docker/restore-new-volumes.sh \
  /volume2/docker/a2e/backups/DOSSIER_HORODATE \
  a2e_restore_postgres_20261006 a2e_restore_media_20261006
unset RESTORE_POSTGRES_PASSWORD
```

Choisir deux noms neufs. Le script refuse tout volume existant, verifie les
checksums, initialise SQL sans port public, restaure dans une transaction, extrait
les medias sur le second volume neuf et retire le conteneur temporaire. Les volumes
source restent intacts ; les nouveaux volumes restent disponibles si un echec
necessite une investigation. Utiliser une archive de confiance du site.

Stack Git Portainer : Compose path `docker-compose.yml`, puis
`docker-compose.external-volumes.yml` dans **Additional paths**, et variables :

```text
A2E_POSTGRES_VOLUME=a2e_restore_postgres_20261006
A2E_MEDIA_VOLUME=a2e_restore_media_20261006
```

L'override rend les volumes externes : s'ils manquent, Compose echoue au lieu
de creer une base vide. Pour une stack editeur, reporter `external: true` et
`name: ${...}` dans le bloc volumes du Compose avant redeploiement. Ne pas mettre
plusieurs fichiers dans le champ Compose path.

Configurer la base/l'utilisateur depuis le manifeste et le mot de passe prive
choisi, dans `POSTGRES_PASSWORD` et `DATABASE_URL`. Meme NAS : les noms fixes de
conteneurs imposent une seule stack A2E active ; un site de recette simultane
demande des noms et ports distincts comme l'override de verification local.

Alternative en terminal, avec un `.env` prive correct :

```bash
docker compose -p NOM_DE_STACK_EXISTANT \
  -f docker-compose.yml -f docker-compose.external-volumes.yml up -d
```

Ne changer le proxy/DNS qu'apres validation. Sauvegarder separement Nginx Proxy
Manager et ses certificats avant leur propre migration ; ils ne sont pas inclus
dans l'archive A2E. Les stacks n8n/Ollama/Qdrant ne sont pas modifiees ici.
Les identifiants exposes precedemment doivent etre changes dans leurs stacks.

## 6. Retour arriere

- Interface defectueuse et image compatible avec les prix `Float` : conserver une sauvegarde actuelle,
  arreter le web, remettre le dernier `A2E_IMAGE_TAG` SHA connu et redeployer les
  memes volumes. Les migrations appliquees restent en base : migrator ne les
  annule pas. Verifier la compatibilite de l'ancien code avant cette option.
- Image historique avec un client Prisma `PriceItem` en `Int` : **ne pas la
  redemarrer sur la base convertie en Float**, meme si les prix affiches semblent
  entiers. Restaurer la sauvegarde **avant** `20261006180000_price_item_centimes`
  sur deux volumes neufs et utiliser l'image/Compose de ce meme instant. Ne pas
  reconvertir les colonnes en `Int` sur les volumes actifs : cela perdrait les
  centimes et les nouvelles donnees ne seraient pas reconciliees.
- Schema incompatible ou incertain : sauvegarder l'etat actuel, restaurer la
  sauvegarde avant migration sur deux volumes **neufs**, puis rattacher ces copies
  et l'image du meme instant. Garder les volumes d'origine.
- Legacy seulement `latest` : utiliser les images archivees et leur ID/digest,
  ainsi que le Compose original et ses variables privees. L'ancien latest tire
  depuis GHCR n'est pas une garantie de retrouver la version ; l'image legacy
  ne contient pas necessairement le nouveau bootstrap/migrator.

Une restauration revient a l'instant sauvegarde. Rapprocher les leads, cotations
et medias ajoutes depuis avant une bascule qui les rendrait indisponibles. Aucun
script ne retrograde le schema en place ou n'efface ces nouvelles donnees.

## Verification de la livraison locale

Le test `node node_modules/tsx/dist/cli.mjs scripts/verify-uploads.ts` a reussi
localement : lecture et HEAD, types autorises, cache, plages video, fichiers
absents, traversee de chemin et sortie par lien symbolique/jonction. Les quatre
scripts Bash ont passe une verification de syntaxe. Ces controles ne remplacent
pas le demarrage de la stack et une restauration sur un moteur Docker.

Le poste Windows de refonte ne fournit ni CLI/moteur Docker ni distribution WSL.
La construction d'image, le healthcheck reel, la restauration SQL et la
persistance Docker ne peuvent donc pas etre declares testes ici. Le script
isole `scripts/docker/smoke.sh` et le passage CI avant publication sont fournis ;
ils doivent reussir sur un hote Docker. Le parcours NAS, le pull GHCR, Portainer,
HTTPS et les ressources du NAS restent a constater dans votre infrastructure.

Le smoke Docker fourni exerce un POST de demande sur PostgreSQL, verifie que les
montants falsifies du client sont remplaces par le catalogue serveur et que le
dossier et ses lignes sont stockes, puis parse les deux telechargements du meme
PDF avec `pdf-lib`. Le test neutralise les secrets de notification et controle
les tentatives uniques. Il s'agit d'un scenario prepare pour CI/hote de test,
pas d'une execution declaree reussie localement.

Il controle egalement le PUT admin a 17,50 / 27,50 / 37,50, les relectures GET
admin/publiques, la conservation apres rerun du migrator et restart, puis les
valeurs exactes dans la base restauree. Le controle de restauration verifie le
type `double precision`, la migration terminee, l'estimation et ses lignes ainsi
que le SHA256 des octets du media restaure. Cette verification utilise seulement
les conteneurs/volumes de test neufs ; elle n'autorise aucune ecriture SQL sur
l'installation NAS existante.

Pour une nouvelle configuration, `leadCreated` est actif et `pdfGenerated` est
inactif : le telechargement habituel n'envoie pas un second email. Les preferences
deja explicitement enregistrees sont conservees ; activer les deux evenements
peut produire deux notifications distinctes, chacune limitee a une tentative par
dossier. Une tentative `failed` ou `pending` n'est pas automatiquement relancee
apres correction des credentials Brevo/SMTP. Verifier le journal et organiser une
reprise manuelle appropriee si necessaire ; aucun bouton/API de retry automatique
n'est presente comme disponible dans cette livraison.
