# Comptes equipe et messagerie V1.1

La V1.1 ajoute des comptes nominatifs, des connecteurs mail administrables,
des listes et des envois manuels. Les guides Word/PDF V1 restent le reflet de
leur version ; les ecrans ci-dessous completent leur fonctionnement.

## Comptes et droits

Dans Equipe, creer le compte avec nom, email, role et mot de passe initial
d'au moins 12 caracteres. Il est hache en base, jamais relu ni envoye par
automatisme. Communiquer le mot de passe a son destinataire par un canal prive.

| Profil | Acces |
| --- | --- |
| Administrateur | Metier, comptes, connecteurs et reglages. |
| Associe | CRM, cotations, prix, realisations, avis, emails et suivi. |
| Secretariat | CRM, cotations, realisations, emails ; prix en lecture. |
| Auditeur | Lecture des rubriques autorisees ; aucun envoi ou changement. |

Les API et les pages privees verifient l'identite et les permissions. Modifier
un compte ou son mot de passe revoque ses sessions. La desactivation de son
propre compte et la perte du dernier administrateur SQL sont refusees. Les
modifications concurrentes demandent une relecture. L'auteur reel est journalise.

Le compte principal `ADMIN_EMAIL` / `ADMIN_PASSWORD` reste un acces de reprise
configure dans Portainer. Il est protege dans l'interface ; les autres comptes
se gerent dans Equipe et sont conserves apres un redemarrage.

## Connecteurs et essais

Dans Messagerie, un administrateur peut ajouter plusieurs connecteurs OVH,
Gmail, autre SMTP ou Brevo API. Renseigner nom, expediteur, compte et secret,
enregistrer, puis relire la configuration. Choisir ensuite le canal par defaut
utilise par les notifications et les envois manuels.

Verifier la connexion controle le transport et le compte. Envoyer un email de
test est une action distincte, vers une adresse autorisee. Verifier ensuite la
boite de reception et les indesirables : parametres presents, connexion valide,
acceptation fournisseur et reception sont des etats differents.

| Service | Parametres |
| --- | --- |
| OVH MX Plan | `ssl0.ovh.net`, port 465 TLS, adresse complete et mot de passe de boite. OVH documente aussi `smtp.mail.ovh.net`. |
| Gmail | `smtp.gmail.com`, 465 TLS ou 587 STARTTLS ; adresse complete et mot de passe d'application lorsque le compte l'autorise. |
| Autre SMTP | Hote public du fournisseur, 465 TLS ou 587 STARTTLS obligatoire. |
| Brevo API | Cle API et adresse d'expedition validee chez Brevo. |

Sources verifiees le 19 octobre 2026 :
[OVH MX Plan](https://docs.ovhcloud.com/en/guides/web-cloud/email-and-collaborative-solutions/mx-plan/landing-page-mx-plan),
[Gmail SMTP](https://support.google.com/a/answer/176600).
Les autres offres OVH peuvent utiliser un autre hote. Choisir Autre SMTP pour
les parametres de l'offre exacte. Microsoft 365 peut exiger OAuth ; cette edition
ne fournit pas de connecteur OAuth Microsoft natif
([documentation Microsoft](https://learn.microsoft.com/en-us/Exchange/mail-flow-best-practices/how-to-set-up-a-multifunction-device-or-application-to-send-email-using-microsoft-365-or-office-365)).

Les secrets admin sont chiffres en SQL avec AES-256-GCM et ne sont jamais
renvoyes par GET ou dans le journal. Garder dans Portainer une cle privee stable
de 32 caracteres minimum : `MAIL_ENCRYPTION_KEY`, ou `AUTH_SECRET` par defaut.
Sauvegarder cette cle en prive avec la procedure de restauration. Changer la cle
exige de ressaisir les secrets. Un champ secret vide conserve la valeur du meme
service ; changer d'hote ou de compte demande de la ressaisir. Les anciens
connecteurs SMTP/Brevo d'environnement restent disponibles. Les serveurs SMTP
locaux/prives et les ports autres que 465/587 sont refuses.

## Listes et envoi manuel

Creer une liste Equipe ou Clients avec ses membres. Les listes Equipe peuvent
recevoir les notifications en complement des destinataires historiques. Pour
les listes Clients, les membres sans autorisation sont exclus de la composition.

Choisir le canal, les listes et les adresses, rediger objet et message, puis
ouvrir l'apercu. Verifier les destinataires retenus/exclus avant de confirmer.
Les adresses saisies directement exigent une confirmation d'autorisation.
L'envoi manuel accepte 50 destinataires maximum et envoie individuellement les
messages pour ne pas divulguer les autres adresses.

Le journal est ecrit avant le reseau. Rejouer le meme identifiant ne reexpedie
pas les messages. Une modification de contenu, de destinataires ou de transport
demande un nouvel apercu. En cas de resultat incomplet, verifier le fournisseur
avant de creer une nouvelle tentative. Aucune campagne programmee ou lecture de
boite IMAP n'est ajoutee. Une erreur email ne bloque pas le PDF.

## Migration Portainer

`20261019200000_user_accounts` ajoute les champs des comptes et l'unicite des
emails sans distinction de casse, sans supprimer de compte. Un ancien doublon
de casse arrete la migration et doit etre resolu sans suppression automatique.
Sauvegarder SQL, medias et variables, garder les volumes, choisir le tag SHA
publie puis Pull and redeploy. Attendre migrate Exited (0), puis web healthy.
Ne pas lancer le seed historique. Verifier les comptes et la vraie reception
email sur l'hebergement cible.

## Reference V1 pour les variables et les notifications historiques

L'admin gere 1 a 20 destinataires par alerte, les evenements nouvelle demande et PDF, et le canal Brevo ou SMTP. Une sauvegarde est confirmee par relecture en base. Le statut technique porte sur le fournisseur selectionne et verifie les variables necessaires sans afficher leur valeur.

SMTP reutilise une boite existante : aucune licence email supplementaire A2E n'est ajoutee. Le fournisseur fixe ses propres quotas et tarifs ; la gratuite illimitee n'est pas promise. Pour SMTP, definir dans la stack `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`. `SMTP_FROM` est facultatif si `SMTP_USER` est une adresse email ; il devient necessaire pour un identifiant technique. L'expediteur SMTP n'utilise jamais `BREVO_SENDER_EMAIL`. OVH/Gmail disposent de valeurs d'hote par defaut lorsque SMTP_HOST est absent. Redepoyer la stack apres modification des variables.

Le journal dans Site & notifications lit uniquement les WebhookEvent de notification sur les 30 jours calendaires a Paris. Il distingue acceptation fournisseur, acceptation partielle, echec, resultat en attente et non-envoi. Les compteurs sont des tentatives, pas des clients ni une preuve de reception/lecture. Les nombres acceptes/refuses viennent de SMTP lorsqu'ils sont disponibles. Les anciens journaux restent sans ces nombres lorsqu'ils ne les contiennent pas.

Chaque evenement lie a un devis ou un contact dispose d'un identifiant de tentative stable. Le journal est cree avant expedition ; s'il est indisponible ou deja present, aucun nouvel email n'est envoye. Une panne de lecture des preferences n'utilise pas des destinataires par defaut pour envoyer. Si l'ecriture du resultat echoue apres acceptation, la tentative reste en attente : verifier le fournisseur avant toute reexpedition manuelle. Aucune relance automatique des echecs n'est programmee.

Les relances clients sont organisees dans Dossiers clients : prochaine action et date, files en retard/aujourd'hui/sans action, historique d'appels/emails/visites declares. Les liens telephone et messagerie ouvrent l'application de l'operateur. Un echange est enregistre comme realise uniquement par une action explicite dans le suivi. Aucun cron, campagne ou envoi client automatique n'est ajoute.

Verification sans reseau : `node node_modules/tsx/dist/cli.mjs scripts/verify-notifications.ts`. Le script utilise exclusivement un transport et une base doubles de test, puis restaure les methodes et variables de test.
