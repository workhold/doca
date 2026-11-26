<a id="comments-user-visibility-and-notifications"></a>

# Commentaires, visibilité pour les utilisateurs et notifications

[中文](comments-and-community.zh-CN.md)

<a id="data"></a>

## Données

La base de données actuelle prend en charge SQLite et PostgreSQL :

- `users.public_id` est un identifiant utilisateur unique, distinct du UUID interne. Il est normalisé en minuscules lors de sa création, de 3 à 160 caractères, composés de lettres et de chiffres. `._@+-`Un index unique le garantit. L’inscription et la création d’administrateurs peuvent être définies `publicId`Si cela est omis, le nom d’utilisateur utilisé est celui par défaut. Il ne change pas lorsque le nom d’affichage change.
- Les champs du profil SSO proviennent de la mapping configurée par le fournisseur. Si un nom d’utilisateur unique approprié ou un autre champ requis manque, `/auth/complete` retourne `needs_profile` Et la personne complète le profil ; le hôte ne génère pas de nom d’utilisateur dans le namespace du fournisseur. Les comptes ne sont jamais fusionnés en raison d’un même nom, d’une adresse e-mail ou d’une identité publique. Le lien d’authentification reste « fournisseur plus sujet ». L’ajout d’une nouvelle méthode de connexion ne modifie pas l’identifiant d’utilisateur original.
- `users.directory_mode` peut être nul, ce qui suit le site `settings.directory_mode`.
- `comments.body_json` C’est le JSON du commentaire riche. `body` Le texte brut est utilisé pour la recherche, les résumés et les notifications. Un commentaire qui n’est pas supprimé doit être valide. `body_json`.
- `notifications` ajouter `actor_id`, `comment_id`, et `dedupe_key`L’événement et les changements d’entreprise se produisent ensemble. C’est unique. `dedupe_key` L’index arrête les événements dupliqués.

Un commentaire riche est la version 1, avec des blocs de texte en paragraphes et des mentions d’enfants, ainsi que des blocs d’images. Le serveur remplit les noms et les IDs des mentions à partir de la table utilisateur et ne fait pas confiance aux étiquettes du client. Un commentaire ne peut pas dépasser 5 000 caractères, 9 images et 50 blocs. Une image doit appartenir au ressource actuel et être valide. `comment_image` Ou en tant qu’attachement d’image. Le téléchargement utilise toujours une stockage privé, une nettoyage des images, et un téléchargement autorisé. Un commentateur peut télécharger une image de commentaire, mais ne peut pas l’utiliser pour télécharger ou modifier un attachement de corps.

<a id="who-can-be-found"></a>

## Qui peut être trouvé

Les administrateurs définissent la visibilité des utilisateurs, avec une valeur par défaut pour le site et une modification personnalisée pour chaque utilisateur.

| Mode | Candidats de nouveaux utilisateurs |
| --- | --- |
| tout | Utilisateurs actifs du site |
| lié | Utilisateurs qui actuellement partagent des permissions explicites pour les documents/bibliothèques, y compris l'héritage, la propriété de la bibliothèque, les membres valides des liens et les subventions de groupe efficaces ; également membres actifs du même groupe d'utilisateurs actif |
| aucun | Aucun candidat. Il est impossible de saisir un UUID d’utilisateur pour ajouter une permission ou une mention. |

La visibilité publique et celle liée à l’inscription ne créent pas de relation. Le retrait de la dernière relation de permission/adhésion la supprime. Les permissions existantes peuvent encore être modifiées ou retirées. Les commentaires et mentions contenues dans les messages ne disparaissent pas à cause de la modification de la politique. La liste des utilisateurs administrateurs n’est pas limitée par cette politique de recherche. La recherche par groupe dispose d’une politique d’administration indépendante, qui se réfère aux groupes auxquels l’utilisateur est membre ; voir [groupes d'utilisateurs](user-groups.fr.md).

Les routes sont en cours de réparation `/api/v1`:

- `GET /users/lookup?q=` Recherche les utilisateurs actifs dans le champ de recherche du appelant et renvoie les champs id, public_id, display_name et avatar. Le préfixe de compte et d’id correspondent. Le nom de présentation est une correspondance approximative. Au maximum 20 éléments. Les signes de recherche sont du texte ordinaire.
- `GET /admin/directory-policy` retourne `{mode, revision}`.
- `PUT /admin/directory-policy` prend `{mode, revision}`Un conflit de version est 409.
- `PUT /admin/users/:id/directory` prend `{mode: "all" | "related" | "none" | null}`. null suitte à nouveau le site.
- `GET /me`, `GET /users/:id/profile`, et la liste des utilisateurs administrateurs comprend `public_id`.

<a id="rich-text-comment-interaction"></a>

## Interaction avec les commentaires de texte riche

Le mode d'édition ajoute un icône de commentaire à la fin de la barre d'outils flottants de sélection de l'éditeur. Le mode à lecture seule affiche uniquement l'icône de commentaire, sans outils de formatage. La soumission nécessite un commentateur ou un niveau supérieur.

Le choix du navigateur correspond à une plage Slate, puis à l’ancrage relatif Yjs de l’éditeur. L’ancrage actuel se trouve à l’intérieur d’un paragraphe ou d’un bloc. Une sélection qui traverse des blocs demande au utilisateur de la sélectionner à nouveau. Elle n’est pas tronquée silencieusement.

Chaque thread racine non résolu dont le texte original existe encore est une carte distincte. Le marqueur par défaut est une sous-titre jaune. Cliquez sur le texte ou la carte pour mettre en évidence les deux. La position est réévaluée lors du défilement, de l'zoom et des mises à jour liées à la collaboration.

Si le texte original est supprimé, l’ancrage n’est plus valide, ou le commentaire de racine est supprimé ou résolu, la carte et l’accent sont cachées. La base de données conserve le commentaire pour l’historique et les audits. Annuler la suppression permet de réafficher un commentaire non résolu lorsque l’ancrage est valide.

Les commentaires sur les documents complets et les commentaires de sélection partagent les fonctionnalités riches : recherche, téléchargement d’images, modification, réponse, suppression et résolution. La vérification de la version modifiée reste active. Une soumission échouée ne efface pas les données saisies.

L’icône de suppression ouvre d’abord un cercle de confirmation ; annuler ne déclenche aucune demande de suppression. Les réponses utilisent un espacement compact tout en conservant les auteurs, les timestamps et les mentions.

La barre de commentaires dans les cinq éditeurs a **Commentaires résolus** icône. Son dialogue affiche les commentaires de racine résolus avec leurs réponses. Les auteurs et les gestionnaires peuvent marquer un sujet comme non résolu ; les permissions actuelles et les versions de commentaire sont vérifiées à nouveau. Les échecs conservent la liste et affichent une erreur. D’autres pages peuvent être chargées ; les racines supprimées sont exclues. Reouvrir un sujet avec un ancrage valide restaure sa carte et son marqueur.

- `POST /resources/:id/comments` prend `{richBody, parentId, anchor?}`Une réponse reste dans le fil de commentaire de racine.
- `PATCH /resources/:id/comments/:commentId` prend `{version, richBody?, deleted?, resolved?}`.
- `POST /assets?purpose=comment_image&resourceId=...&filename=...` Téléchargements de bytes, au maximum 5 MB. Le serveur valide l’image et l’accès.

Un @ dans le corps du document utilise l’extension mention éditeur. Les candidats proviennent de la même recherche ciblée. Un nœud mention stocke l’UUID de l’utilisateur, et non seulement le nom d’affichage.


Tous les cinq formats disposent d'ancres de commentaire permanentes ; les détails de sélection Slate mentionnés ci-dessus ne concernent que le texte enrichi. La feuille de calcul capture les identifiants de ligne/colonne stables grâce à son API de commentaire natif, résout les plages actuelles après des modifications structurelles, et valide l'existence cible sur le serveur. Voir [collaboration](collaboration.fr.md).

Cliquez sur un commentaire pour mettre en évidence uniquement son contenu associé dans chacun des cinq éditeurs. Ouvrir la barre latérale ou suivre un lien de commentaire ne restaure pas le fond précédent. Cliquez sur un autre commentaire pour remplacer l’éclairage ; cliquez ailleurs, résolvez le sujet ou fermez la barre latérale pour le supprimer. L’éclairage est un état de visualisation et ne modifie pas les styles de cellule, les remplissages de forme, les mises à jour Yjs ou les ancres permanentes. Les images de commentaire s’ouvrent dans l’affichateur d’images partagées avec zoom, copie et téléchargement. Voir [0.2.23 vérification](verification/editor-comments-2026-10-28.md).

<a id="notifications"></a>

## Notifications

Les événements incluent `comment.created`, `comment.mentioned`, `document.mentioned`, `resource.permissions_changed` pour une nouvelle invitation, `like.added`, `favorite.added`, et transfert de propriété.

- L’acteur n’est pas informé. Quelqu’un a mentionné dans le même commentaire que la personne qui est également propriétaire ou à qui la réponse est envoyée ne reçoit que cette mention, et non une notification de commentaire inhabituelle.
- Une mention ne donne pas accès. Le destinataire doit être un utilisateur actif et devoir pouvoir lire le document lorsque la commentaire est soumis. Sinon, la notification est ignorée.
- Un nouveau mention de corps est détecté par l’identifiant du nœud de mention stable. Mentionner le même utilisateur sur un autre nœud nouveau indique à nouveau. La relecture d’une mise à jour ancienne ou l’édition de texte ordinaire ne le fait pas.
- Les notifications de mise en liste vérifient à nouveau les permissions du document. Après la révocation ou la suppression, les notifications correspondantes sont cachées et ne sont pas considérées comme non lues.
- WebSocket envoie `notifications.changed` Comme une invalidation. Le client récupère sa propre liste. Le corps n’est pas diffusé. Les événements hors ligne sont déjà dans la base de données et sont récupérés après reconnexion.
- `GET /notifications?offset=0` retourne `{items, unread, nextOffset}`, 50 éléments par page, y compris le titre de l’acteur et du document.
- `POST /notifications/read` prend `{ids:[]}`, au maximum 100, et ne met à jour que les notifications du appelant.
- `POST /notifications/read-all` prend `{}` et marque que toutes les notifications de l’appelant ont été lues.

Ce sont des notifications intégrées à l'application. Elles ne transmettent ni e-mail, SMS, ni notifications push d'un tiers. Une déploiement via WebSocket d'une seule instance ne crée pas automatiquement un bus multi-instance. Plusieurs répliques utilisent la configuration en [scalage horizontal](horizontal-scaling.fr.md).

<a id="verification"></a>

## Vérification

Les tests couvrent les conflits d’identifiants publics, les identifiants SSO, la visibilité et les modifications par utilisateur, les documents publics non liés, le contournement des permissions, les commentaires structurés, l’isolation des images et l’upload des commentaires, la déduplication des notifications, les utilisateurs qui n’ont pas accès, l’effacement des notifications après annulation, l’actualisation uniquement de l’état de lecture de l’utilisateur lui-même, la répétition de l’@, et une @ répétée.

Les vérifications avec navigateur utilisent un document en mémoire et des utilisateurs simulés. Ils ne écrivent pas de commentaires de test dans un document réel. Ils vérifient le bouton de la barre d’outils, le bouton de lecture seule, les mentions riches, les mettons en évidence jaunes dans les deux directions, l’effacement lors de la résolution, et l’effacement lorsque le texte original est supprimé.
