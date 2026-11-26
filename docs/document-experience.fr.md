<a id="documents-sharing-and-history"></a>

# Documents, partage et histoire

[中文](document-experience.zh-CN.md)

Décrit le source du hôte 0.2.23. Les débuts de développement et les enregistrements temporaires des paquets sont disponibles. [recherche](research.fr.md).

<a id="create-and-edit"></a>

## Créer et modifier

Le menu de création propose texte enrichi, Markdown, feuilles de calcul, canevas et collaboration. Les cinq formats disposent tous d’éditeurs et de codecs de collaboration indépendants. Les modèles nécessitent des fournisseurs installés ; la création de documents vides est disponible par défaut. Les documents personnels sont des pages indépendantes ; les documents de la bibliothèque utilisent leur arbre de bibliothèque.

Les images et les pièces jointes utilisent les téléchargements par l'hôte, les IDs d'actif et les téléchargements autorisés. L'édition nécessite l'autorisation d'un éditeur ou supérieure, et la confirmation de sauvegarde suit la mise à jour de la base de données. Les points de contrôle originaux et les modifications non confirmées persistent dans IndexedDB lorsque le stockage du navigateur réussit. La réouverture nécessite une réplique locale disponible et les actifs de l'application ; suivez les instructions. [limites hors ligne et récupération](collaboration.fr.md#save-reconnect-and-history) et tout retour d’information lié à des erreurs de stockage. Les outils de recherche/replacement, la présence et les commentaires varient selon le format ; voir [intégration éditeur](editor-integration.fr.md).

La source de l'espace de travail hors ligne ajoute **Menu de compte → Documents hors ligne** vers le client de bureau et les navigateurs avec le frontend Doca téléchargé. Le home affiche cette liste lorsque le serveur est inaccessible. Ouvrez une réplique pour modifier sous la dernière autorisation connue et synchronisez après que les vérifications de connexion et d'accès se rétablissent. Voir [Comment activer les documents hors ligne](access-offline-events.md#离线文档入口).

La page « Documents » permet de parcourir les visites récentes en dessous de ses filtres réglables. La page « Bibliothèques » et le dossier de documents hors ligne peuvent également être parcourus jusqu’à l’élément final lorsque leurs listes dépassent la zone de visualisation.

<a id="sharing-and-permissions"></a>

## Partage et permissions

Le panneau de partage gère la visibilité, les invitations, les sources d’autorisation des membres et les liens. Les modifications sont vérifées par version ou révision ; elles sont mises à jour après un conflit 409. Les opérations de gestion et de propriété suivent leurs propres règles d’autorisation ; voir [autorisations](permission-inheritance.fr.md).

Les liens sont utilisés `#/s/{token}` Pour l’affichage préliminaire et l’acceptation enregistrée. Le changement de lien global, l’inactivité ou l’expiration de liens individuels, ainsi que l’annulation des sources membres sont des actions distinctes ; l’élimination d’une source ne perturbe pas les autres sources valides. La lecture publique, la découverte, les collections et les favoris sont séparés ; la collecte ne donne aucun accès, et les administrateurs du système ne obtiennent pas automatiquement un accès aux contenus privés.

<a id="history-and-restore"></a>

## Histoire et restauration

- Le menu du document propose l'historique, les préviews de snapshotes et les snapshotes manuels. L'historique nécessite généralement l'autorisation de l'éditeur ; l'activation de l'historique pour les lecteurs permet l'accès en fonction des permissions de lecture du ressource.
- Les points de récupération récents restent détaillés ; l’histoire à long terme conserve un point pour chaque dix snapshots plus anciens. La même liste et les actions de prévisualisation/restauration s’appliquent à tous les points conservés, sans révéler leur emplacement de stockage. Le sampling élimine délibérément les neuf autres points ; voir [opérations de stockage](storage.fr.md#history-storage-and-offline-upgrade).
- Des snapshots de texte riche et de Markdown récupérables permettent leur restauration pour les gestionnaires ou les propriétaires. `expectedSeq` Vérifie le contenu actuel. Se rafraîchit après un conflit afin qu’une prévisualisation ancienne ne puisse pas surcharger les modifications plus récentes.
- Les feuilles de calcul, les diapositives et le canevas disposent de snapshots et de préviews en lecture seule. Ils renvoient actuellement `canRestore: false` et ne montre aucune action de restauration.
- L’histoire commerciale et les points de contrôle de collaboration sont stockés séparément. Restaurer utilise le format, la ligne de vie et les ressources de l’snapshot ; l’histoire manquante ne est jamais remplacée par du contenu actuel.
- Vérifier les archives des visites et des actions pour réexaminer les permissions actuelles. Ce ne sont pas des sauvegardes et ne permettent pas de reconstituer l’histoire non sauvegardée.

<a id="move-copy-and-trash"></a>

## Déplacer, copier et supprimer

Vérifiez les permissions de destination et de descendants avant de déplacer, et confirmez le réinitialisation de l’autorisation. La transfert de propriété nécessite l’autorisation du propriétaire. La copie crée une ressource et une identité de contenu indépendantes, réinitialise les ressources, et exclut les données de données, commentaires et historique d’annulation. La suppression se place dans la corbeille ; la restauration respecte les lots de suppression et l’état parent. La suppression permanente est une action de nettoyage explicitement autorisée et ne signifie pas la suppression de tous les objets de stockage partagé.

<a id="routes-and-source"></a>

## Routes et sources

Ces chemins ont les `/api/v1` préfixe :

| Route | Objectif |
| --- | --- |
| `GET /resources/:id/versions` | Liste de l’histoire |
| `POST /resources/:id/versions` | Snapshot manuel |
| `GET /resources/:id/versions/:versionId` | Prévisualisation et séquence de contenu actuelle |
| `POST /resources/:id/versions/:versionId/restore` | `{expectedSeq}`, restaurer un format pris en charge |
| `POST /share/redeem` | `{token, accept?, consume?}`, prévisualiser/accepter un lien |
| `GET /resources/:id/info` | Statistiques, visites ou enregistrements d’actions |

Voir [experience.ts](../apps/server/src/routes/experience.ts), [service d’histoire](../packages/core/src/modules/history/service.ts), et [éditeur dépêche](../apps/web/src/features/documents/document-editor.tsx). Le course `/api/openapi.json` Et la validation du serveur définissent l’API entièrement déployée.
