<a id="http-api"></a>

# API HTTP

[中文](api.zh-CN.md)

C’est un index des principales routes hôte 0.2.23. En cours d’exécution `/api/openapi.json` Décrit les routes et schémas enregistrés ; le code du serveur définit l’autorisation, les champs non annotés et les limites de comportement. Les anciennes interfaces sont conservées. [recherche](research.fr.md) et ne peut pas être considéré comme disponible aujourd’hui.

<a id="conventions"></a>

## Conventions

Les chemins de table ont `/api/v1` Préfixe. Les navigateurs utilisent des cookies de session HttpOnly ; les écritures nécessitent l’hôte configuré et l’origine de même origine. Les clients natifs utilisent des sessions Bearer authentifiées par hôte ; les WebViews plugins utilisent des sessions plugins spécifiques. Les ressources publiques ne exposent que leurs chemins de lecture autorisés.

Métadonnées `version`, configuration `revision`, et contenu `seq`/`epochId` Chaque élément a des rôles différents. Lisez les valeurs actuelles avant d’écrire. Un 409 indique un conflit ou un protocole/état non pris en charge ; cela ne signifie jamais une autorisation d’écrire en surcharge. La pagination varie en fonction de la route ; suivez les instructions. `nextCursor` ou `nextOffset`L’accès au contenu manquant renvoie généralement 404 ; l’administration du système ne permet pas l’accès à des contenus privés.

<a id="accounts-and-administration"></a>

## Comptes et administration

| Route | Objectif et autorisation |
| --- | --- |
| `GET /bootstrap` | Utilisateur actuel, site, capacités, extensions chargées ; aucun secret |
| `POST /auth/login`, `POST /auth/logout` | Connexion par mot de passe / Déconnexion |
| `POST /auth/register` | Inscription conformément à la politique d’admission ; les demandes en attente ne bénéficient pas de session. |
| `GET /me` | Profil et préférences personnels |
| `GET /auth/providers` | Provendeurs d’identité disponibles |
| `GET /admin/users` | Question de l’utilisateur administrateur avec statut/q/carreau |
| `PATCH /admin/users/:id` | `{status:active\|disabled}`, les utilisateurs ordinaires peuvent activer/désactiver ; les demandes en attente nécessitent une vérification de inscription |
| `GET /admin/registration-reviews` | Liste de revue de l’administrateur |
| `POST /admin/registration-reviews/:id` | `{decision:approved\|rejected,message?}`, revue dédiée |
| `GET /admin/stats` | Statistiques agrégées sans autorisation de contenu |
| `GET /admin/users/:id/resource-handover` | Inventaire des ressources comptes désactivées ; réservé aux administrateurs |
| `POST /admin/users/:id/resource-handover/preview`, `POST /admin/users/:id/resource-handover/execute` | Prévisualisation / confirmer les propriétés et les autorisations sélectionnées ; voir [transfert de ressources](admin-resource-handover.fr.md) |

Vérification de contact, récupération, liens d’identité, vérification de sécurité, politiques d’utilisation de l’account et rappels sont inclus. [authentification](authentication.fr.md)Les identifiants de plateforme sont utilisés [paramètres de service](service-credentials.fr.md); les plugins utilisent une version séparée [service de credences chiffrées](plugin-credentials.fr.md).

<a id="documents-permissions-and-history"></a>

## Documents, autorisations et historique

| Route | Objectif |
| --- | --- |
| `GET /resources`, `GET /resources/:id` | Liste autorisée / détail |
| `POST /resources` | Créer un document/bibliothèque ; le format du document est rich_text/markdown/feuille de calcul/canevas/presentation |
| `PATCH /resources/:id` | Mise à jour des métadonnées avec version |
| `PUT /resources/:id/permissions` | Configuration des permissions avec version |
| `POST /resources/:id/transfer`, `POST /resources/:id/move` | Transfert de propriété / déménagement |
| `POST /resources/:id/copy` | Copie indépendante |
| `POST /resources/:id/trash`, `POST /resources/:id/restore` | Déchets / restaurer |
| `GET /resources/:id/versions`, `POST /resources/:id/versions` | Histoire / capture d’écran du manuel |
| `GET /resources/:id/versions/:versionId` | Prévisualisation ; feuille de calcul/canevas/canvas canRestore est faux |
| `POST /resources/:id/versions/:versionId/restore` | `{expectedSeq}`, gestionnaire de restauration pour texte enrichi/Markdown |
| `POST /share/redeem` | Prévisualisation enregistrée ou acceptation d’un lien de document |

L’édition de contenu utilise `/api/v1/ws`; voir [collaboration](collaboration.fr.md)Les champs, les sources de données et l'héritage se trouvent dans [autorisations](permission-inheritance.fr.md). Partage et histoire sont dans [document de guide](document-experience.fr.md).

<a id="comments-notifications-and-discovery"></a>

## Commentaires, notifications et découverte

Créez un commentaire avec `POST /resources/:id/comments` et `{richBody,parentId,anchor?}`. `richBody` C’est un commentaire structuré de version 1 ; le texte brut précédent. `body` La demande est rejetée. Mettre à jour. `PATCH /resources/:id/comments/:commentId`, fournissant la version commentée et richBody/deleted/resolved. Les réponses de niveau unique, les images, les mentions et les ancres sont décrits [commentaires et notifications](comments-and-community.fr.md).

Les notifications sont utilisées `GET /notifications`, `POST /notifications/read`, et `POST /notifications/read-all`Les invalidations WebSocket déclenchent une nouvelle lecture autorisée. La découverte, les collections, l’activité récente et les invitations sont disponibles [découverte](public-resource-discovery.fr.md); les références et les téléchargements d’actifs se trouvent ici [intégration éditeur](editor-integration.fr.md).

<a id="search"></a>

## Rechercher

`GET /search/documents` Recherches de documents lisible actuellement. Le mode mot-clé peut se tourner vers la base de données avec un avertissement ; le mode vecteur nécessite Meilisearch et modèles disponibles. Les résultats sont vérifiés selon l'accès actuel ; l'inclusion dans l'index ne confère aucune permission.

L’administration utilise `GET/PUT /admin/search`, `POST /admin/search/reindex`, `POST /admin/search/reconcile`, `/admin/search/embeddings`, `/admin/search/embeddings/status`, et `/admin/search/relevance`Un résultat de configuration 202 signifie que la tâche de requête est terminée. Les changements de modèle ou de credences nécessitent de réappliquer les paramètres. La politique de reconnaissance d’images ne sauvegarde actuellement que la configuration ; son activation ne active pas le pipeline OCR pour la recherche.

<a id="files-and-storage"></a>

## Fichiers et stockage

L'upload des actifs est utilisé `POST /assets?purpose=&filename=&resourceId=` avec avatar/cover/attachment/comment_image et autorisation spécifique au but. Téléchargement utilisé `GET /assets/:id/content`, avec `?download=1` Pour la disposition des pièces jointes. Les images d’avatar/covers/comment permettent 5 MiB ; les pièces jointes de documents permettent 20 MiB. Les fichiers de plateforme ordinaire utilisent `/files` Routages avec des limites distinctes et des workflows multipart.

`GET /admin/storage` rapporte le serveur de déploiement; `PUT /admin/storage` retourne 405. Les variables d'environnement configurent les serveurs et les identifiants ; voir [stockage de fichiers](storage.fr.md).

<a id="ai-knowledge-and-plugins"></a>

## IA, connaissances et extensions

Les sessions et les postes d’IA utilisent `/ai`Les outils respectent le champ d’application de la session, les permissions réelles des ressources et les approbations. `POST /ai/jobs/:id/approval` prend `{approvalId,approved}` De la part du propriétaire du poste ; l’approbation ne modifie pas les ACLs des ressources.

`POST /mcp` Expose Streamable HTTP avec un token de porteur dédié. Les paramètres personnels sont utilisés `GET/PUT /me/mcp` et `/me/mcp-services`; les intégrations entre entreprises `/admin/mcp-services` et doit atteindre la cible `userId` Dans chaque opération MCP. Les mises à jour, réinitialisations ou annulations de service nécessitent la version actuelle. Les tokens ne sont affichés qu’au moment de la création ou de la réinitialisation. Voir [Configuration MCP, découverte des outils et transferts de fichiers](mcp.fr.md).

Les commandes de Knowledge-Book, les workflows en cours, les tâches humaines et les abonnements sources sont décrits. [livres de connaissances](knowledge-books.fr.md). Les sources unifiées utilisent `/content`; voir le [protocole de contenu](plugin-content.fr.md). L’extension de business routes a été installée `/plugins/:pluginId/...` et dépendent de la version chargée. L’hôte ne dispose pas d’une API pour les notes rapides ou les e-mails ; voir [capacités et limites](features.fr.md).

<a id="health-and-source"></a>

## Santé et source

`GET /health`, `GET /live`, et `GET /ready` omettre `/api/v1` Préfixer et afficher la version de l’hôte. Les vérifications de préparation examinent la base de données et le Redis configuré ; elles ne vérifient pas tous les services externes.

Source : [application](../apps/server/src/app/create-app.ts), [dossier de route](../apps/server/src/routes), [histoire](../apps/server/src/routes/experience.ts), [gateway en temps réel](../apps/server/src/services/realtime/gateway.ts).
