# Deploiement A2E sur UGreen DXP4800

## Option recommandee : stack Portainer depuis GitHub

Le depot GitHub doit contenir `docker-compose.yml`. Dans Portainer :

1. Ouvrir **Stacks > Add stack**.
2. Choisir **Git repository**.
3. URL : `https://github.com/lololarue93/A2E.git`.
4. Reference : `main`.
5. Compose path : `docker-compose.yml`.
6. Ajouter les variables de `.env.example` dans **Environment variables**.
7. Deployer la stack.

Le fichier `.env` ne doit pas etre ajoute a GitHub. Les secrets restent dans la
configuration Portainer.

Variables obligatoires :

- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `AUTH_SECRET`

La valeur `DATABASE_URL` doit utiliser le nom de service Docker :

```text
postgresql://a2e:mot-de-passe@postgres:5432/a2e_renovation?schema=public
```

## Premier demarrage

Attendre que les conteneurs `a2e-postgres` et `a2e-web` soient healthy. Dans
la console Portainer du conteneur `a2e-web` :

```bash
pnpm exec prisma migrate deploy
pnpm run prisma:seed
```

Puis verifier :

```text
https://a2e.ton-domaine.fr/api/health
```

## Nginx Proxy Manager

Nginx Proxy Manager peut rester dans son stack actuel. Creer un **Proxy Host** :

| Champ | Valeur |
| --- | --- |
| Domain Names | `a2e.ton-domaine.fr` |
| Scheme | `http` |
| Forward Hostname / IP | IP LAN du NAS, par exemple `192.168.1.50` |
| Forward Port | `3000` |
| Websockets Support | Active |

Dans l'onglet SSL, demander un certificat Let's Encrypt et activer **Force SSL**.

Le DNS doit pointer le sous-domaine vers l'adresse publique de la box. Les ports
80 et 443 doivent etre rediriges vers le NAS. Le port PostgreSQL ne doit jamais
etre publie.

Si Nginx Proxy Manager et A2E sont places sur un reseau Docker commun, le proxy
peut utiliser le nom de service `web` et le port `3000`. Avec deux stacks
Portainer distinctes, l'IP LAN du NAS est la solution la plus simple.

## Mise a jour depuis GitHub

Dans la stack Portainer, utiliser **Pull and redeploy**. Portainer reconstruira
l'image A2E depuis la branche `main`. Apres chaque modification Prisma, executer :

```bash
pnpm exec prisma migrate deploy
```

Faire une sauvegarde PostgreSQL avant une migration importante.

## Points de securite sur le stack n8n fourni

Les valeurs suivantes ont ete partagees en clair dans le message et doivent etre
changees avant toute exposition publique :

- mot de passe PostgreSQL n8n `n8npass`
- mot de passe initial Nginx Proxy Manager `test`
- cle `N8N_ENCRYPTION_KEY`

Avec HTTPS actif dans Nginx Proxy Manager, passer aussi
`N8N_SECURE_COOKIE` a `true`. Les ports Ollama `11434` et Qdrant `6333`
peuvent etre retires de la section `ports` s'ils ne doivent pas etre accessibles
depuis le LAN. Les services n8n peuvent toujours les joindre par leurs noms
Docker.

Ne jamais committer ces secrets dans GitHub. Utiliser les variables Portainer ou
un fichier de secrets protege sur le NAS.

