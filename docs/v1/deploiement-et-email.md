# A2E V1 premium - Déploiement et notifications email

Guide d’exploitation vérifié dans le dépôt le 19 octobre 2026. Il décrit le
Compose fourni, ses scripts et les fonctions présentes. Il ne confirme ni une
migration effectuée sur le NAS, ni une connexion SMTP, ni un email effectivement
reçu. Les captures de l’administration sont des aperçus locaux ; elles ne sont
pas une preuve de livraison dans une boîte de messagerie.

## 1. Choisir le lieu d’hébergement

Le site fonctionne sur un NAS compatible Docker ou sur un VPS/serveur Linux
**amd64 (x86-64)** avec Docker Engine et le plugin Docker Compose. L’image publiée
et la recette CI ciblent uniquement `linux/amd64`. ARM/ARM64 n’est pas validé et
demande une construction et une recette adaptées avant utilisation.

Le serveur doit fournir :

- un accès d’administration pour Docker, les volumes et les sauvegardes ;
- un stockage persistant pour PostgreSQL 16 et les médias chargés ;
- de l’espace libre pour l’image, les photos et plusieurs sauvegardes ;
- un accès sortant HTTPS vers GHCR pour tirer l’image et, si choisi, vers Brevo ;
- un accès sortant au serveur SMTP sur 465 ou 587 si ce canal est choisi ;
- un domaine maîtrisé, un DNS dirigé vers la bonne adresse publique et HTTPS ;
- un reverse proxy configuré pour l’origine publique et les en-têtes transmis.

La mémoire, le CPU et le disque sont à dimensionner selon les visites, les médias,
la base et les applications partageant le serveur. Aucun dimensionnement de
charge n’a été mesuré sur le NAS ou sur un VPS cible.

Le paquet fourni est une application Next.js avec serveur Node, API, SQL et
écritures de fichiers. Un hébergement mutualisé limité à PHP/FTP ou à des pages
statiques ne peut pas exécuter cette stack sans adaptation. Un hébergeur géré
compatible Node peut être envisagé après adaptation des migrations, de la base
et du stockage persistant des médias. Node est déjà dans l’image Docker : il
n’est pas nécessaire de l’installer séparément sur l’hôte pour utiliser la stack.
Voir [l’installation officielle de Compose](https://docs.docker.com/compose/install/).

```text
Visiteur -> DNS -> HTTPS / reverse proxy -> web:3000
                                            |
                                            +-> PostgreSQL 16 (reseau Docker prive)
                                            +-> volume medias /app/public/uploads
                                            +-> SMTP externe OU API Brevo
```

La demande sur mesure, le rappel, le simulateur et les aides ne dépendent pas
d’un NAS particulier. Le parcours sur mesure enregistre le besoin et le souhait
de rappel sans inventer de montant. Les disponibilités du client restent un
souhait à confirmer. Les aides sont une évaluation indicative des possibilités,
sans promesse d’éligibilité, de financement ni de règles 2027 non confirmées.

## 2. Identifier exactement la version à déployer

Dépôt : [lololarue93/A2E_Renovation](https://github.com/lololarue93/A2E_Renovation).
Image : `ghcr.io/lololarue93/a2e-renovation`.

Pour la livraison V1, relever le tag `sha-` suivi du commit complet et le digest
dans le **dernier workflow Docker terminé avec succès sur `main`**, après les
étapes de vérification et de publication. Le tag final doit être inscrit dans
la fiche de livraison après ce succès ; aucun SHA provisoire n’est fourni ici.
Un workflow seulement démarré ou une PR compilée ne prouve pas la publication.

Conserver le tag et le digest antérieurs pour le retour arrière. Utiliser le tag
SHA validé dans `A2E_IMAGE_TAG`, plutôt qu’un `latest` susceptible de changer.

### Origine publique : construction et exécution

`NEXT_PUBLIC_SITE_URL` doit désigner la même origine HTTPS lors de la
**construction de l’image** et dans les variables Portainer du service web.
Cela concerne notamment les métadonnées, le sitemap, les liens et l’origine
autorisée pour l’administration. Un changement uniquement au runtime ne refait
pas les pages ou valeurs déjà compilées. Ce fonctionnement est documenté par
[Next.js](https://nextjs.org/docs/app/guides/environment-variables).

Le workflow prend la variable GitHub de dépôt `NEXT_PUBLIC_SITE_URL`, avec un
repli historique `https://a2e.ddns.net`. Avant une livraison sur un autre domaine,
faire construire et publier une image avec la bonne variable, puis utiliser
son tag. Dans le workflow actuel, `workflow_dispatch` accepte `site_url` pour
vérifier une construction, mais **la publication est réservée au push sur
`main`**. Un lancement manuel seul ne publie pas une nouvelle image GHCR.

## 3. Variables à conserver dans Portainer

Ne mettre aucun mot de passe, clé API ou URL de connexion complète dans Git,
une capture, un document public ou le champ des remarques d’un client. Les
secrets sont saisis dans les variables privées de la stack Portainer, pas dans
le formulaire public ni dans l’interface des préférences email A2E. Restreindre
l’accès à Portainer et conserver une copie privée de sa configuration.

| Variables | Usage |
| --- | --- |
| `A2E_IMAGE_TAG` | Tag SHA effectivement publié de la livraison retenue. |
| `POSTGRES_PASSWORD`, `DATABASE_URL` | Obligatoires ; la connexion doit correspondre à la base et à l’utilisateur conservés. Encoder correctement les caractères réservés du mot de passe dans l’URL. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Identifiants du seul administrateur configuré ; mot de passe d’au moins 12 caractères pour le bootstrap. |
| `AUTH_SECRET` | Secret aléatoire privé d’au moins 32 caractères recommandé ; garder une valeur stable entre redéploiements. |
| `NEXT_PUBLIC_SITE_URL` | Origine HTTPS réelle, identique à celle de construction. |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_IMAGE` | Garder les valeurs de l’installation ; rester sur le major PostgreSQL 16. Des valeurs par défaut existent dans le Compose. |
| `A2E_PORT`, `A2E_BIND_ADDRESS` | Port de publication et interface de l’hôte ; adapter au reverse proxy et au réseau. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Canal SMTP, à compléter selon le fournisseur ci-dessous. |
| `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` | Canal Brevo API, alternatif au SMTP. |
| `GOOGLE_SITE_VERIFICATION` | Facultatif, vérification Search Console. |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_LEADS_ENABLED` | Telegram facultatif, en plus de la préférence admin. |
| `A2E_POSTGRES_VOLUME`, `A2E_MEDIA_VOLUME` | Uniquement avec l’override de volumes externes lors d’une restauration ou d’un rattachement explicite. |

`TZ=Europe/Paris` est défini dans le Compose. `A2E_LOCAL_RECIPE` est réservé à
la recette locale : ne pas l’activer sur la stack de production.
`LEAD_NOTIFICATION_EMAIL` figure encore parmi les variables historiques du
Compose, mais **la liste effective des destinataires doit être enregistrée dans
l’admin**. Ne pas compter sur une modification de cette variable pour modifier
une préférence déjà stockée en SQL.

La connexion admin utilise les identifiants d’environnement. La création d’un
`User` par le bootstrap ne constitue pas une gestion de comptes ou de rôles
multiples. La session dure huit heures, avec cookie HttpOnly, SameSite strict et
Secure sur le domaine HTTPS. Un changement d’identifiants ou de secret invalide
les sessions existantes.

## 4. Mettre à jour la stack Git Portainer existante

Cette procédure concerne une **stack créée depuis Git**, sur Docker Standalone.
Conserver son nom, ses adaptations réseau et les volumes actuels. Ne pas créer
une autre stack pour remplacer implicitement l’ancienne base.

1. Relever l’image et le digest actuels, le nom de stack, le major PostgreSQL,
   les ports, le reverse proxy et les noms réels de volumes avec la procédure
   de sauvegarde de la section 7. Si des bind mounts sont utilisés ou si le major
   SQL n’est pas 16, préparer une migration spécifique avant de continuer.
2. Sauvegarder SQL, médias, images historiques et configuration privée.
   Maintenir le site en maintenance pendant la migration et la validation.
3. Dans **Stacks -> stack A2E -> Git settings**, vérifier le dépôt A2E, la branche
   `main` (`refs/heads/main` si nécessaire) et le Compose `docker-compose.yml`.
   Mettre à jour les variables privées en conservant les secrets SQL/admin, puis
   renseigner le tag de livraison vérifié dans `A2E_IMAGE_TAG`.
4. Choisir **Pull and redeploy**, activer le nouveau pull d’image si l’option est
   proposée, puis **confirmer le redéploiement**. L’utilisateur effectue cette
   confirmation dans Portainer ; ce document ne déclenche aucune action à distance.
5. Attendre les vrais états : PostgreSQL healthy, `migrate` en **Exited (0)**,
   `media-init` en **Exited (0)**, puis `web` healthy. Un message de prise en compte
   de Portainer ne prouve pas la fin du déploiement.
6. Garder la maintenance pendant le contrôle des anciens dossiers, médias et prix.
   Revoir les 25 nouvelles références détaillées avant leur import explicite,
   puis tester le simulateur et les PDF avant de rouvrir l’accès public.

Le libellé et la position du bouton varient selon Portainer ; voir la
[procédure officielle de stack Git](https://docs.portainer.io/user/docker/stacks/edit).
Ne pas détacher la stack de Git ni choisir de suppression de volumes pour cette
mise à jour. Une ancienne stack issue de l’éditeur demande la procédure adaptée
du [guide complet de migration](../migration-docker-premium.md), et non un
simple pull du seul conteneur web.

### Si Portainer indique « A2E_IMAGE_TAG missing »

Cette erreur signifie que le Compose attend le tag d’image, mais que la variable
de stack est absente ou vide. Dans la stack A2E existante :

1. ouvrir **Edit stack settings**, puis **Environment variables** ;
2. ajouter une variable dont le nom est exactement `A2E_IMAGE_TAG` ;
3. renseigner comme valeur le **tag SHA publié** relevé dans le workflow Docker
   réussi : le préfixe `sha-` suivi des 40 caractères du commit complet ;
4. conserver toutes les autres variables et cliquer sur **Save settings** ;
5. revenir à **Pull and redeploy**, activer **Re-pull image** si proposé, puis
   confirmer le redéploiement et vérifier les états des conteneurs.

Ne pas saisir le nom complet de l’image à la place du tag, ni un tag provisoire
deviné. La valeur finale V1 doit être relevée après publication. Si la variable
est déjà présente, vérifier qu’elle n’est pas vide et qu’elle figure bien dans
les réglages de cette stack, puis enregistrer avant de relancer le déploiement.

### Ce que font les services de préparation

`migrate` exécute, dans l’image de la livraison :

```bash
pnpm exec prisma migrate deploy && pnpm exec tsx docker/bootstrap.ts
```

Le bootstrap crée seulement les données absentes. Il conserve les prix,
réglages et utilisateurs existants ; les 25 nouveaux tarifs détaillés en sont
exclus. Les 55 références historiques du fichier de départ ne sont pas une
instruction de remplacement de la grille A2E. **Ne lancer ni `prisma:seed` ni
`prisma migrate dev` en production.**

Revoir `docs/prix-detail-a-la-carte-2026.csv` avec les achats, la pose, les
inclusions/exclusions et la TVA A2E, puis importer uniquement les 25 lignes
validées dans l’admin. Garder les anciens prix personnalisés. Ne pas importer le
catalogue complet de 80 lignes de démonstration sur une base métier existante.
Un nouveau tarif manquant doit rester signalé, sans repli silencieux sur un prix
de démonstration. Les prix sont des hypothèses de chiffrage à valider, sans
licence Batiprix/BatiChiffrage ni grille fournisseur A2E importée.

`media-init` prépare les droits du volume uploads pour l’utilisateur node 1000.
Le web attend la réussite des deux services. En cas d’échec du migrator, lire ses
logs et corriger la cause ; ne pas forcer une résolution Prisma sans diagnostic.

## 5. Héberger sur un VPS plutôt que sur le NAS

Pour une installation neuve, installer Docker Engine et Compose sur Linux amd64,
puis déployer la même stack Git avec des volumes neufs et des secrets privés.
Pour reprendre des données existantes, restaurer la sauvegarde vers deux volumes
neufs sur le VPS et les rattacher explicitement, comme en section 7.

PostgreSQL reste sur le réseau Docker privé : le Compose ne publie pas son port
5432. Le volume SQL est monté sur `/var/lib/postgresql/data` et le volume médias
sur `/app/public/uploads`. Les volumes conservent les données au-delà du cycle
de vie du conteneur, selon la [documentation Docker](https://docs.docker.com/engine/storage/volumes/).

Configurer un enregistrement DNS vers le VPS et un certificat HTTPS valide dans
le reverse proxy. Le proxy joint le port web sur un chemin réseau accessible :
interface privée/LAN ou réseau Docker partagé selon l’architecture retenue.
`127.0.0.1` désigne le conteneur du proxy quand celui-ci est conteneurisé ; ce
n’est pas automatiquement le service A2E. Si le proxy tourne sur l’hôte, un bind
web sur `127.0.0.1` peut convenir. Ne pas laisser un port web public contourner le
proxy HTTPS. Les ports d’administration Portainer/proxy ne sont pas des pages
publiques du site.

Le fichier de référence Nginx Proxy Manager contient des chemins NAS
`/volume2/...` : les adapter au VPS et sauvegarder ses propres volumes et
certificats. Il n’est pas nécessaire de modifier la boîte email ou les MX du
domaine pour déplacer seulement l’hébergement web. Basculer le DNS/proxy après
validation de la copie, avec un plan pour les demandes reçues pendant la bascule.

## 6. Paramétrer les emails

### A. Réglages métier dans l’admin

Dans **Administration -> Site & notifications** :

1. choisir **OVH SMTP**, **Gmail SMTP**, **Autre serveur SMTP** ou **Brevo API** ;
2. saisir **1 à 20 destinataires**, un par ligne ; virgules et points-virgules
   sont aussi acceptés. Une liste invalide doit être corrigée en entier ;
3. activer l’email **nouvelle demande** et, si nécessaire, l’email **pré-devis PDF** ;
4. enregistrer, attendre la confirmation de relecture en base puis recharger.

![Réglages SMTP dans l’administration](images/11-notifications-smtp.png)

*Capture locale : adresses de documentation, saisie non enregistrée et aucun email envoyé.*

Une nouvelle configuration active la nouvelle demande et désactive le PDF pour
éviter un second message au téléchargement habituel. Les préférences existantes
restent conservées. Le contact sur mesure utilise le réglage nouvelle demande.
Si les deux événements sont actifs, une estimation puis son PDF peuvent donner
deux notifications distinctes. Les emails transmettent description, remarques,
souhait de rappel et disponibilités, y compris pour une notification PDF seule.

Les secrets SMTP/API ne sont ni saisis ni renvoyés par cet écran. Les préférences
média/sécurité historiques sont conservées, mais leurs automatismes ne sont pas
raccordés. Le CRM organise les relances et leur historique ; aucune campagne de
relance automatique vers les clients n’est annoncée comme opérationnelle.

### B. Paramètres techniques dans Portainer

Les exemples suivants ne contiennent aucun identifiant ou secret réel. Renseigner
les champs privés `SMTP_USER`, `SMTP_PASSWORD` et éventuellement `SMTP_FROM` avec
les valeurs autorisées de la boîte choisie, puis redéployer la stack.

| Canal | Hôte SMTP explicite | Port | `SMTP_SECURE` | Identifiants privés |
| --- | --- | --- | --- | --- |
| OVH MX Plan Europe, TLS direct | `ssl0.ovh.net` ou `smtp.mail.ovh.net` selon l’offre | `465` | `true` | `SMTP_USER`, `SMTP_PASSWORD` |
| OVH MX Plan Europe, STARTTLS | `smtp.mail.ovh.net`, confirmer le serveur de l’offre | `587` | `false` | `SMTP_USER`, `SMTP_PASSWORD` |
| Gmail | `smtp.gmail.com` | `465` | `true` | `SMTP_USER`, `SMTP_PASSWORD` d’application |
| Gmail avec STARTTLS | `smtp.gmail.com` | `587` | `false` | `SMTP_USER`, `SMTP_PASSWORD` d’application |
| Autre SMTP | Hôte fourni par le prestataire | Selon le prestataire | Selon le mode TLS | `SMTP_USER`, `SMTP_PASSWORD` |

OVH publie ces ports pour MX Plan ; Email Pro/Exchange utilisent d’autres hôtes.
Vérifier l’offre de la boîte dans la [documentation OVH](https://docs.ovhcloud.com/en/guides/web-cloud/web-hosting/email-sending-best-practices).
**Le Compose a un hôte OVH par défaut : pour Gmail, remplacer explicitement
`SMTP_HOST`, même après avoir choisi Gmail dans l’admin.**

Dans le code A2E, `SMTP_SECURE=true` utilise TLS dès la connexion ; sur 587,
`false` laisse Nodemailer négocier STARTTLS si le serveur l’annonce. Ce n’est
pas une désactivation générale du chiffrement, mais le code actuel ne force pas
`requireTLS`. Préférer 465/TLS direct lorsque l’offre le permet. Voir
[Nodemailer, options SMTP/TLS](https://nodemailer.com/smtp).

Pour Gmail, utiliser le compte complet et un **mot de passe d’application**
lorsque le compte y est éligible, avec validation en deux étapes. Le mot de
passe de connexion ordinaire n’est pas la configuration recommandée ici.
Certaines politiques Workspace/Protection avancée n’autorisent pas ces mots de
passe ; OAuth Gmail n’est pas implémenté par A2E. Sources :
[Google, mots de passe d’application](https://support.google.com/accounts/answer/185833?hl=fr)
et [Google, SMTP d’une application](https://knowledge.workspace.google.com/admin/gmail/send-email-from-a-printer-scanner-or-app?hl=fr).

`SMTP_FROM` utilise par défaut `SMTP_USER` si celui-ci est une adresse email.
Sinon, renseigner une adresse d’expéditeur autorisée. Il reste distinct de
l’expéditeur Brevo. L’email du visiteur sert seulement de Reply-To valide ; il
ne remplace pas l’expéditeur de l’entreprise. Sans email client, Reply-To est
omis et le téléphone est disponible dans le dossier.

Pour **Brevo API**, choisir ce canal dans l’admin et fournir `BREVO_API_KEY`,
`BREVO_SENDER_EMAIL` et, facultativement, `BREVO_SENDER_NAME` dans Portainer.
A2E appelle l’API transactionnelle HTTPS ; il n’utilise pas les identifiants SMTP
Brevo pour ce canal. Vérifier l’expéditeur et l’activation du service dans le
compte Brevo. Voir [l’API transactionnelle officielle](https://developers.brevo.com/docs/send-a-transactional-email).

Le SMTP peut utiliser une boîte existante sans abonnement email ajouté par A2E.
Les limites et frais restent ceux du fournisseur : aucun envoi gratuit illimité
n’est garanti. Ne pas transformer ces notifications internes en envois de masse.

### C. Vérifier l’authentification du domaine et la réception

Pour un expéditeur sur un domaine A2E, vérifier les enregistrements **SPF, DKIM
et DMARC** avec le fournisseur effectivement choisi. Ne pas copier des valeurs
DNS génériques : utiliser celles de l’offre, conserver les autres expéditeurs
légitimes et contrôler l’alignement avec l’adresse From. La configuration Brevo
demande notamment ses propres enregistrements de validation, DKIM et DMARC.
Voir [OVH, bonnes pratiques email](https://docs.ovhcloud.com/en/guides/web-cloud/web-hosting/email-sending-best-practices)
et [Brevo, authentification du domaine](https://help.brevo.com/hc/fr/articles/12163873383186-Authentifier-votre-domaine-dans-Brevo-code-Brevo-enregistrement-DKIM-enregistrement-DMARC).

Le statut **Configuration présente - réception à tester** signifie seulement
que les variables attendues sont présentes et plausibles. Il ne teste pas la
connexion, le mot de passe, le DNS ou la boîte de réception. La recette finale
consiste à envoyer une demande de test explicitement identifiée vers les boîtes
de l’équipe autorisées, puis à vérifier chacune d’elles, ses indésirables et les
en-têtes d’authentification. Aucun email réel n’a été envoyé lors de cette
préparation documentaire.

Dans le journal de notifications admin, **Acceptés par le fournisseur** n’est
pas une preuve d’arrivée en boîte principale. Consulter les états `sent`,
`partial`, `failed`, `pending`, `skipped`, leur motif et les comptes de
destinataires sur les 30 jours calendaires affichés, fuseau Europe/Paris.
Une panne email ne doit pas empêcher le PDF local ni perdre le dossier CRM.
Chaque événement/dossier est limité à une tentative ; un échec n’est pas
automatiquement rejoué après correction du secret. Aucun bouton de retry
automatique n’est fourni. Organiser une reprise manuelle appropriée sans créer
de doublons commerciaux.

## 7. Sauvegarder, restaurer et revenir en arrière

Les scripts fournis ciblent des volumes Docker nommés et PostgreSQL 16. Les
exécuter depuis une copie privée du dépôt sur le serveur, avec Bash, Docker,
`sha256sum` et `gzip`. Arrêter les autres outils qui écrivent SQL/médias pendant
la sauvegarde cohérente.

Avant modification, inventaire en lecture seule :

```bash
bash scripts/docker/preflight.sh
```

Sauvegarde avant mise à jour, exemple de chemin VPS à adapter :

```bash
A2E_BACKUP_ROOT=/srv/a2e/backups \
BACKUP_INCLUDE_IMAGES=1 BACKUP_KEEP_WEB_STOPPED=1 \
bash scripts/docker/backup.sh
```

Le script arrête le web pendant le dump SQL et l’archive médias, puis le laisse
arrêté ici pour la maintenance. Sans `BACKUP_KEEP_WEB_STOPPED=1`, il le relance
après la sauvegarde. Sur le NAS, adapter le chemin au stockage réel. Le dossier
horodaté contient dump SQL custom, archive médias, manifeste, checksums,
marqueur `COMPLETE` et, avec l’option choisie, images exactes. Le conserver sur
un second support privé. Les variables/secrets Portainer, le reverse proxy et
ses certificats sont à sauvegarder séparément.

Pour restaurer, utiliser un dossier avec `COMPLETE` et checksums validés. Charger
les images archivées si elles manquent, puis suivre la saisie privée de
`RESTORE_POSTGRES_PASSWORD` et les commandes du
[guide de restauration complet](../migration-docker-premium.md#5-restaurer--changer-de-nas-avec-de-nouveaux-volumes).
La commande de restauration reçoit exactement trois arguments :

```text
bash scripts/docker/restore-new-volumes.sh DOSSIER_SAUVEGARDE NOUVEAU_VOLUME_SQL NOUVEAU_VOLUME_MEDIAS
```

Les deux noms doivent être neufs et distincts. Le script refuse d’écraser un
volume existant et restaure SQL dans une transaction. Rattacher ensuite les
copies avec `docker-compose.external-volumes.yml` dans **Additional paths** de
la stack Git, en gardant `docker-compose.yml` comme chemin principal, et les
variables `A2E_POSTGRES_VOLUME` / `A2E_MEDIA_VOLUME`. Adapter la connexion aux
identifiants de la copie. Voir les formats de
[pg_dump](https://www.postgresql.org/docs/16/app-pgdump.html) et
[pg_restore](https://www.postgresql.org/docs/16/app-pgrestore.html).

Avant une bascule, tester la copie restaurée et garder les volumes d’origine.
Pour un retour arrière, une ancienne image n’est réutilisable sur la base
actuelle que si son schéma Prisma est compatible. En particulier, une image
historique avec prix `Int` ne doit pas ouvrir la base migrée avec prix `Float`.
En cas d’incompatibilité, restaurer la sauvegarde d’avant migration vers deux
volumes neufs et utiliser l’image de ce même instant. Ne pas reconvertir les
prix en entiers ni annuler les migrations sur les volumes actifs.

Une restauration revient à l’instant sauvegardé : rapprocher les demandes,
cotations et photos reçues depuis avant la bascule. Garder les originaux et
ne jamais utiliser une suppression de stack avec volumes, `down -v` ou un
nettoyage des volumes comme méthode de mise à jour.

## 8. Contrôle avant réouverture

- `/api/health` répond 200, base et médias contrôlés ; web healthy.
- Ancien dossier, prix personnalisé et média connus retrouvés sur la bonne base.
- Connexion admin HTTPS, refus sans authentification et relecture après sauvegarde.
- Lots à la carte et packs calculés avec les tarifs A2E validés ; PDF cohérent.
- Demande sur mesure avec description/remarques enregistrées, statut à rappeler
  seulement si demande, disponibilités conservées sans rendez-vous automatique.
- Publication d’une vraie réalisation avec médias autorisés et avis consentis ;
  les projets fictifs ne sont pas présentés comme de vrais chantiers A2E.
- Prix et médias toujours présents après redémarrage du web.
- Email de recette reçu par chaque boîte attendue, avec résultat fournisseur et
  contrôle du classement ; ne pas confondre cette étape avec un simple voyant.
- Sauvegarde recopiée hors serveur et restauration essayée vers des volumes neufs.

Les fichiers sources de référence de ce guide sont `docker-compose.yml`,
`docker/Dockerfile`, `docker/bootstrap.ts`, `.github/workflows/docker-image.yml`,
les scripts `scripts/docker/`, les gardes de session admin et les modules email.
Les états de recette et le tag final de la V1 figurent dans sa fiche de
livraison ; l’exploitation réelle sur l’hébergement cible reste à constater.
