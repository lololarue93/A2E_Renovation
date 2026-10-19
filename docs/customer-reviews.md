# Avis clients

La source unique des avis est `SiteSettings`, cle `customer_reviews` :

```json
{ "schemaVersion": 1, "version": 0, "reviews": [] }
```

Une cle absente represente une liste vide. Aucun avis, note ou compteur de demonstration n'est cree. Le bloc public de l'accueil reste masque tant que la liste des avis publies avec accord confirme est vide. Une panne ou une configuration invalide masque egalement ce bloc.

La rubrique admin **Realisations & avis** gere le nom public autorise, la ville, les travaux, la date, la note recue de 1 a 5, le texte exact, le lien source facultatif, l'accord client et la publication. La preuve de l'accord doit rester dans le dossier client : la case admin est une attestation de l'equipe, pas une collecte automatique du consentement. Une URL source est facultative pour permettre les avis transmis directement.

Les ajouts, modifications et suppressions restent locaux jusqu'a **Enregistrer les avis**. Une suppression peut etre annulee avant enregistrement. Aucun brouillon n'est remplace apres une erreur. Un rechargement volontaire avec modifications locales demande de confirmer leur abandon.

`GET /api/admin/reviews` et `PUT /api/admin/reviews` exigent l'autorisation admin cote serveur. L'ecriture utilise une transaction serialisable, verifie `version`, incremente cette version et journalise uniquement version, nombre et nombre publie. Une version obsolete retourne 409. Les champs et la configuration stockee sont controles par Zod ; une valeur stockee invalide n'est jamais ecrasee par une liste vide. L'API relit l'ecriture en base, puis l'interface effectue une seconde lecture avant de confirmer le succes.

Aucune migration ni variable d'environnement supplementaire. Les avis sont conserves dans le volume PostgreSQL existant. Le script `pnpm exec tsx scripts/verify-reviews.ts` utilise des doubles en memoire explicites et ne contacte aucune base.
