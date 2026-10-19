# Site A2E Renovation

Cette application Next.js rassemble la vitrine, le simulateur multi-postes, les reperes de prix, le contact, les possibilites d'aides et l'administration. Le depot actif est ce dossier A2E ; la copie presente dans son parent est historique.

## Equipe et messagerie V1.1

Les comptes nominatifs permettent de creer les acces des associes et du
secretariat avec des droits serveur. Les connecteurs OVH, Gmail, autre SMTP et
Brevo, les listes et les envois manuels se gerent dans l'admin.
Voir [les comptes, connecteurs et la mise a jour](docs/notifications-email.md).
La reception reelle demande un compte expediteur configure et un test depuis
l'hebergement. Aucun secret de messagerie n'est fourni avec le code.

## Documentation V1

Les [guides V1 illustres](docs/v1/README.md) presentent les fonctions disponibles,
leur utilisation et leurs limites. Deux PDF sont fournis : utilisation et
administration ; deploiement sur NAS ou VPS et configuration email SMTP.
Les [notes de version](docs/v1/notes-version.md) decrivent le perimetre livre.

## Demarrage local

Installer Node.js 22 et pnpm 9.15.4. Executer `pnpm install --frozen-lockfile`, `pnpm exec prisma generate`, puis `pnpm dev`. Sans DATABASE_URL, la vitrine affiche une base de demonstration ; les demandes et sauvegardes ne pretendent pas fonctionner sans PostgreSQL.

Avec une base de test, configurer une copie privee de .env.example puis executer `pnpm exec prisma migrate deploy`. L'administration requiert ADMIN_EMAIL et ADMIN_PASSWORD (au moins 12 caracteres). Le seed historique remplace les prix et demonstrations : ne pas l'utiliser pour migrer une production.

## Parcours disponibles

- / : vitrine responsive et calculette express.
- /services et /services/[slug] : prestations et points techniques.
- /simulateur : panier multi-postes, dimensions, isolants et PAC explicites, brouillon local, PDF apres demande consentie.
- /tarifs : catalogue central avec recherche, descriptions et fourchettes.
- /aides : orientation 2026 IDF et textes 2027 publies, sans promesse d'eligibilite.
- /realisations : publications administrables et inspirations identifiees.
- /contact : demande conservee avec message, sans budget fictif.
- /admin : CRM, KPI, galerie, reglages et journal des notifications.
- /admin/prix et /admin/cotations : CSV, cotations persistantes, remise motivee, TVA et exports PDF/JSON/CSV.

## Verification

`pnpm run lint`, `pnpm run build` et les scripts `verify-*.ts` dans scripts couvrent calculs, cotations, autorisations, exports, contact, preferences analytics et medias. Les doubles de stockage ne remplacent pas une recette PostgreSQL. Les scripts de rendu PDF sont reproductibles ; les preuves locales sont dans docs/preview-tests et ignorees par Git.

## Documentation et migration

- [Pilotage, priorites et navigation admin](docs/PILOTAGE.md)
- [Recette locale d'octobre 2026 et controles restants](docs/recette-2026-10.md)
- [Refonte et livraison](docs/refonte-a2e-2026.md)
- [Marche IDF et sources](docs/benchmark-marche-idf-2026.md)
- [Cotations et catalogue](docs/quote-workspace.md)
- [KPI et administration](docs/admin-operations-and-kpis.md)
- [Email SMTP / Brevo et relances](docs/notifications-email.md)
- [Dependances et correctifs](docs/dependances-2026-10.md)
- [Migration Docker et restauration](docs/migration-docker-premium.md)
- [Portainer UGreen](docs/deployment-ugreen.md)

La migration 20261006180000_price_item_centimes accepte les prix unitaires a deux decimales en preservant les anciennes valeurs. Le bootstrap de production ajoute les entrees manquantes sans remplacer les prix personnalises. Le nouveau catalogue doit etre revu avant import : unite, contenu, base HT/TTC, taux et couts fournisseurs.

L'image est testee dans GitHub Actions avant publication sur main. Le deploiement utilise sha-<commit-complet>, conserve les volumes et inclut sauvegarde, restauration vers de nouveaux volumes et controles de persistance. Le NAS et les services email ne sont pas configures par une preview locale.
