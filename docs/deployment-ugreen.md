# Deploiement A2E sur UGreen / Portainer

Pour une installation existante, commencer par
[la migration premium](migration-docker-premium.md). Portainer tire l'image
construite sur GitHub Actions : il ne reconstruit pas le site.

## Architecture

- `postgres` : major 16, image par defaut `postgres:16.15-alpine3.23`.
- `migrate` : `prisma migrate deploy`, puis bootstrap qui cree seulement les
  donnees absentes et preserve les prix, reglages et utilisateurs existants.
- `media-init` : adapte les permissions de l'ancien volume uploads a UID/GID 1000.
- `web` : utilisateur `node`, Node `22.23.3-bookworm-slim`, pnpm `9.15.4`.
- Les cles historiques de volumes `a2e_postgres` / `a2e_media`, le port 3000 et les
  conteneurs `a2e-postgres` / `a2e-web` sont conserves.
- Nginx Proxy Manager, ses certificats et n8n restent dans leurs stacks existantes.

`migrate` et `media-init` en **Exited (0)** sont normaux. `postgres` et `web`
doivent etre **healthy**. `/api/health` verifie SQL et l'ecriture dans uploads.
Ne pas lancer `prisma:seed` en production : le seed historique remplace des
donnees. Le bootstrap ne cree aucune realisation ou preuve de demonstration.

Cette version exige la migration Prisma
`20261006180000_price_item_centimes` avant le demarrage du web. Elle convertit
`PriceItem.low`, `mid` et `high` en PostgreSQL `DOUBLE PRECISION` / Prisma `Float`,
en conservant les valeurs entieres existantes. Les prix unitaires acceptent
ensuite deux decimales, notamment 17,50 EUR. Le service `migrate` l'applique via
`prisma migrate deploy` ; ne pas lancer le nouveau web seul sur l'ancien schema.
Une image ancienne dont le client Prisma attend `Int` ne doit pas acceder a cette
base modifiee. Le retour a cette ancienne version passe par la sauvegarde
**anterieure** a la migration, restauree dans de nouveaux volumes.

## Installation neuve

1. Apres un push autorise sur `main`, attendre le succes du workflow
   **Build and publish A2E image**, puis copier
   son `A2E_IMAGE_TAG=sha-<commit-complet>` depuis le resume.
2. Portainer, environnement **Docker Standalone** :
   **Stacks > Add stack > Git repository**.
3. Depot `https://github.com/lololarue93/A2E.git`, reference `refs/heads/main`,
   Compose path `docker-compose.yml`, nom de stack durable (par exemple `a2e`).
4. Ajouter les variables de `.env.example`. Remplacer tous les placeholders.
   Les secrets restent dans Portainer ; ne pas committer de `.env`.
5. Si GHCR est prive, configurer ce registre dans Portainer avec un jeton autorise
   a lire le package, puis le selectionner pour la stack.
6. Deployer, verifier les quatre services, le domaine HTTPS, l'admin, un prix
   modifie apres rechargement, un upload et un PDF.

La stack vise Docker Standalone avec Docker Compose v2 et un Portainer compatible
avec `service_completed_successfully`. Elle n'est pas un manifeste Swarm.

## Variables

| Variable | Utilisation |
| --- | --- |
| `A2E_IMAGE_TAG` | Tag exact GHCR `sha-<40 caracteres du commit>` ; obligatoire |
| `POSTGRES_IMAGE` | Major 16 ; garder l'image observee lors de la premiere migration |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Identifiants existants ; changer Compose ne change pas un cluster deja initialise |
| `DATABASE_URL` | Connexion Prisma via `postgres:5432`, meme base/utilisateur/mot de passe |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Acces admin ; mot de passe d'au moins 12 caracteres |
| `AUTH_SECRET` | Secret aleatoire prive et durable |
| `NEXT_PUBLIC_SITE_URL` | Origine HTTPS publique, par defaut `https://a2e.ddns.net` |
| `A2E_PORT`, `A2E_BIND_ADDRESS` | Port NAS et adresse d'ecoute ; defauts `3000` / `0.0.0.0` |
| `GOOGLE_SITE_VERIFICATION` | Search Console facultatif |
| `BREVO_*`, `SMTP_*`, `TELEGRAM_*` | Notifications facultatives |
| `A2E_POSTGRES_VOLUME`, `A2E_MEDIA_VOLUME` | Noms exacts, uniquement avec l'override externe |

```text
postgresql://a2e:MOT_DE_PASSE_ENCODE@postgres:5432/a2e_renovation?schema=public
```

Encoder les caracteres reserves du mot de passe dans `DATABASE_URL`, conserver
le mot de passe brut dans `POSTGRES_PASSWORD`. Garder le meme domaine dans
Portainer et la variable GitHub de depot `NEXT_PUBLIC_SITE_URL`. Le champ
`site_url` du lancement manuel permet de tester une autre origine sans publier.
Pour deployer un changement de domaine, modifier la variable de depot puis
attendre le build et la publication du prochain push autorise sur `main`.

## Nginx Proxy Manager

Garder le Proxy Host existant s'il fonctionne. Sinon : domaine public reel,
scheme `http`, destination IP LAN actuelle du NAS, port `A2E_PORT`, Websockets
active ; certificat Let's Encrypt et **Force SSL**. Le DNS et la box doivent
joindre le NAS sur 80/443. PostgreSQL reste interne. Avec deux stacks distinctes,
ne remplacer l'IP LAN par `web` que si un reseau Docker partage est configure.

Les uploads sont servis dynamiquement avec controle de chemin et support des
plages video : une nouvelle image ne necessite pas de redemarrage. Adapter la
limite de taille du proxy si necessaire pour les medias autorises.

## Verification locale / CI

Sur un hote avec Docker et Bash, depuis la racine du depot :

```bash
A2E_SMOKE_TEST=1 bash scripts/docker/smoke.sh
```

Ce script utilise des conteneurs `a2e-test-*`, des volumes et un projet isoles,
des identifiants factices et `127.0.0.1:3100`. Il verifie migrations, readiness,
permissions, medias ajoutes apres demarrage et plages, refus admin, prix modifies
et medias apres redemarrage, bootstrap sans ecrasement, sauvegarde et restauration
vers des volumes neufs. Il soumet aussi un dossier avec des montants client
falsifies, controle le recalcul et la persistance SQL, puis telecharge deux fois
le PDF sauvegarde. Les credentials de notification sont neutralises et les
tentatives journalisees doivent rester uniques par evenement et dossier ; aucun
email externe n'est attendu. Les conteneurs sont retires, les volumes de test restent
pour inspection (prefixe affiche). Leur suppression est manuelle.

La precision est controlee par un PUT admin a **17,50 / 27,50 / 37,50**, une
relecture GET admin/publique et une nouvelle relecture apres migration et
redemarrage. La copie restauree doit conserver les trois montants, la migration
appliquee, le dossier et ses lignes, ainsi que les octets du media verifies par
SHA256. Ce scenario SQL est prepare pour CI ; il n'a pas ete execute sur Windows.

Les tarifs historiques restent preserves. Examiner et importer seulement les
lignes validees par A2E ; le benchmark ne remplace pas un tarif fournisseur reel.
Pour une cotation, harmoniser d'abord les prix dans une meme base HT ou TTC, puis
choisir cette base dans le document. Les taux de TVA se verifient par ligne.
La remise de la cotation, a 0 % par defaut, est appliquee une seule fois aux lignes
et le net est conserve ; elle ne se cumule pas automatiquement avec un reglage
commercial du simulateur public.

GitHub Actions est configure pour executer cette verification sur les pushes de
toutes les branches et les PR vers `main`. La connexion GHCR et la publication
sont reservees a un push sur `main`, apres succes des controles. Une execution
manuelle valide l'image sans la publier. `latest` reste publie pour compatibilite ;
la production utilise le tag SHA complet indique dans le resume du workflow.

Les tests Docker n'ont pas ete executes sur le poste de refonte, depourvu de
moteur. Attendre leur resultat CI ou les executer sur un hote de test avant de
deployer la stack. Une configuration CI presente dans le depot ne prouve pas
qu'un workflow a deja reussi sur GitHub.

## References

Ordre de demarrage : [Docker Compose](https://docs.docker.com/compose/how-tos/startup-order/).
Versions de base relevees dans les fichiers officiels
[Node 22](https://github.com/nodejs/docker-node/blob/main/22/bookworm-slim/Dockerfile) et
[PostgreSQL 16](https://github.com/docker-library/postgres/blob/master/16/alpine3.23/Dockerfile).
Chemins Compose additionnels :
[Portainer](https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work).
