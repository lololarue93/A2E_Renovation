# Dependances - controle du 19 octobre 2026

Le controle avant publication a detecte 2 avis critiques et 35 avis eleves dans l'ancien verrouillage, notamment Next 14.2.35 et Nodemailer 9.0.3. La version candidate utilise Next et eslint-config-next 15.5.28, Nodemailer 10.1.2 et PostCSS 8.5.30. Les pages et la route uploads attendent maintenant leurs parametres asynchrones Next 15.

Sources primaires : [avis Next Windows](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36), [avis Next AVIF](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4), [guide de migration Next 15](https://nextjs.org/docs/app/guides/upgrading/version-15). Les versions disponibles et leurs dates ont aussi ete verifiees dans le registre npm officiel.

`pnpm audit --prod --json` apres correction : **0 avis connu**, toutes severites. Ce resultat date ne constitue pas une garantie permanente.

L'audit complet conserve **1 avis eleve et 8 moderes** dans les outils de developpement : `braces` (aucun correctif annonce dans le registre), instrumentation OpenTelemetry de Lighthouse et selecteurs CSS de Tailwind. Le motif `braces` vient des configurations de fichiers locales, sans entree de formulaire client utilisee comme motif de compilation. Ne pas compiler de configurations ou motifs provenant d'utilisateurs. Le controle complet programme reste actif et peut echouer tant que ces dependances amont ne sont pas corrigees ; aucun avis n'est masque.

Les correctifs transitifs compatibles sont verrouilles par `pnpm.overrides` dans package.json pour pnpm 9.15.4 (CI), et les memes valeurs dans pnpm-workspace.yaml pour les lanceurs locaux pnpm 10/11. Ne pas les faire diverger. Aucune exclusion permanente de delai de publication n'a ete ajoutee.

Reproduire avec Node 22 et pnpm 9.15.4 : `pnpm install --frozen-lockfile`, `pnpm audit --prod`, `pnpm exec prisma generate`, `pnpm run qa:check`, `pnpm run lint`, `pnpm run build`. Les rapports JSON locaux sont ignores dans docs/preview-tests.
