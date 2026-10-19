# Alertes email et relances

L'admin gere 1 a 20 destinataires par alerte, les evenements nouvelle demande et PDF, et le canal Brevo ou SMTP. Une sauvegarde est confirmee par relecture en base. Le statut technique porte sur le fournisseur selectionne et verifie les variables necessaires sans afficher leur valeur.

SMTP reutilise une boite existante : aucune licence email supplementaire A2E n'est ajoutee. Le fournisseur fixe ses propres quotas et tarifs ; la gratuite illimitee n'est pas promise. Pour SMTP, definir dans la stack `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`. `SMTP_FROM` est facultatif si `SMTP_USER` est une adresse email ; il devient necessaire pour un identifiant technique. L'expediteur SMTP n'utilise jamais `BREVO_SENDER_EMAIL`. OVH/Gmail disposent de valeurs d'hote par defaut lorsque SMTP_HOST est absent. Redepoyer la stack apres modification des variables.

Le journal dans Site & notifications lit uniquement les WebhookEvent de notification sur les 30 jours calendaires a Paris. Il distingue acceptation fournisseur, acceptation partielle, echec, resultat en attente et non-envoi. Les compteurs sont des tentatives, pas des clients ni une preuve de reception/lecture. Les nombres acceptes/refuses viennent de SMTP lorsqu'ils sont disponibles. Les anciens journaux restent sans ces nombres lorsqu'ils ne les contiennent pas.

Chaque evenement lie a un devis ou un contact dispose d'un identifiant de tentative stable. Le journal est cree avant expedition ; s'il est indisponible ou deja present, aucun nouvel email n'est envoye. Une panne de lecture des preferences n'utilise pas des destinataires par defaut pour envoyer. Si l'ecriture du resultat echoue apres acceptation, la tentative reste en attente : verifier le fournisseur avant toute reexpedition manuelle. Aucune relance automatique des echecs n'est programmee.

Les relances clients sont organisees dans Dossiers clients : prochaine action et date, files en retard/aujourd'hui/sans action, historique d'appels/emails/visites declares. Les liens telephone et messagerie ouvrent l'application de l'operateur. Un echange est enregistre comme realise uniquement par une action explicite dans le suivi. Aucun cron, campagne ou envoi client automatique n'est ajoute.

Verification sans reseau : `node node_modules/tsx/dist/cli.mjs scripts/verify-notifications.ts`. Le script utilise exclusivement un transport et une base doubles de test, puis restaure les methodes et variables de test.
