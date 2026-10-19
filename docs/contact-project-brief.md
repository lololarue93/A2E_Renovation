# Demande specifique et rappel

Le formulaire de contact accepte une description libre du projet, des remarques
facultatives et une demande de rappel avec une preference de disponibilite
facultative. Un chantier hors catalogue peut ainsi etre etudie sans prix invente.
Un email ou un telephone suffit pour une demande de contact ; le telephone est
obligatoire pour demander un rappel. La description du projet, les remarques et
le rappel sont egalement disponibles a la derniere etape du simulateur, avec les
coordonnees et l'estimation. Le descriptif complementaire ne modifie pas le prix
calcule et doit etre examine par l'equipe pour etablir le devis sur mesure.

La demande est enregistree dans `Lead` et son `Project.details` JSON :

- `message` : description du projet, compatible avec les anciens messages ;
- `remarks` : remarques du client ;
- `callbackRequested` : booleen explicite ;
- `callbackAvailability` : preference libre, sans reservation de rendez-vous.

Un rappel demande cree un dossier au statut `a_rappeler`. Aucune date de rappel
n'est fabriquee. Dans **Admin > Suivi**, l'equipe lit le besoin et les remarques,
puis renseigne **Prochaine action** et **Date de relance (Paris)**. La preference
transmise reste une demande initiale ; elle ne confirme ni appel ni rendez-vous.

Pour ajouter une precision depuis l'admin, utiliser **Remarques internes** lors
de la creation manuelle, ou **Compte rendu / remarques internes**, de type
**Note interne**, dans un dossier existant. Ces ajouts restent dans l'historique
du suivi ; ils ne remplacent pas le message initial du client et n'envoient aucun
email. La sauvegarde du suivi relit le dossier pour confirmer la persistance.

Les anciens dossiers sans ces champs restent lisibles. L'affichage du besoin
ignore un JSON absent, primitif, un tableau ou des champs de type inattendu. Les
textes sont affiches par React, avec leurs retours a la ligne et une coupure des
mots longs pour rester lisibles sur telephone. Aucune migration SQL ni nouvelle
variable d'environnement n'est necessaire.
