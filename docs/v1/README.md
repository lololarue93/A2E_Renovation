# A2E Renovation - documentation V1

Edition du 19 octobre 2026. Les guides decrivent les fonctions effectivement
presentes dans la V1 et leurs limites ; ils ne constituent pas une promesse
de prestation, de qualification RGE ou d'aide financiere.

## Guides PDF illustres

- [Utilisation et administration](downloads/A2E-V1-Utilisation-et-administration.pdf) : parcours client, simulateur, demandes sur mesure et rappel, CRM, catalogue, cotations, galerie, avis, notifications, KPI et exports.
- [Deploiement et email](downloads/A2E-V1-Deploiement-et-email.pdf) : NAS ou VPS, Docker, DNS/HTTPS, Portainer lie a Git, variables, SMTP, sauvegarde et restauration.

## Versions consultables et modifiables

- [Guide d'utilisation et d'administration](guide-utilisation-administration.md)
- [Guide de deploiement et d'email](deploiement-et-email.md)
- [Notes de version et perimetre V1](notes-version.md)

Les captures proviennent du site local. Les donnees EXEMPLE et les adresses
`example.test` servent a la documentation. Le reglage SMTP illustre une saisie
non enregistree, sans email externe. Aucun mot de passe, cle ou jeton n'est
present dans ces guides.

## Construire les PDF

Depuis la racine du depot, avec Python, `reportlab` et `pypdf` disponibles :

```bash
python scripts/build-v1-guides.py
```

Le script lit les deux sources Markdown et les captures `images/`. Il genere
les PDF dans `output/pdf/` et copie les versions finales dans `downloads/`.
Il utilise Segoe UI sur Windows, DejaVu Sans sur Linux ou la police Vera fournie
avec ReportLab. Les polices sont integrees aux PDF. Les sources de documentation
et les PDF sont exclus de l'image applicative Docker.

Avant publication d'une nouvelle edition, rendre les PDF avec Poppler et relire
chaque page : les controles de texte seuls ne valident pas la mise en page.
