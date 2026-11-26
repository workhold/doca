<a id="plugin-development"></a>

# Développement de plugins

Le client de bureau Tauri se connecte à un hôte Doca distant. Les plugins s'exécutent sur cet hôte via son répertoire d'installation et le SDK public ; le client ne crée aucun pont de chemin de source spécifique au bureau. Voir [client de bureau](desktop-client.fr.md).

La source actuelle utilise le SDK **0.2.0**, avec `ai.v2` / `ai.continuations.v2`Les contextes d’outil portent toujours `jobId`; `sessionId` Cela n’est disponible que pour les conversations réelles. Reconstruisez les plugins. `sdkRange: "^0.2.0"`; les anciens plages de SDK et contrats de services IA sont rejetés sans adaptateurs. Ce changement de source n’est pas une publication ou un déploiement npm. Voir [Séparation de l'exécution des MCP](mcp.fr.md#execution-history-and-upgrade).

Une plage de SDK incompatible ou une dépendance requise indisponible isole le plugin commercial concerné. Le hôte et les plugins non liés se lancent, et l’option Admin → Plugins explique la raison et demande une mise à jour. La sélection des plugins installés, les archives, les données commerciales et les identifiants sont conservés. Les anciens paquets ne sont pas convertis et le code SDK ancien n’est pas exécuté. Les nouvelles installations en ligne rejettent toujours les paquets incompatibles. Les dossiers d’installation complètement hors ligne conservent leur identité originale et subissent la même isolation.


Les clients externes d’IA utilisent [Services MCP](mcp.fr.md)Les outils doivent déclarer explicitement leur exposition au MCP et maintenir leurs vérifications normales d’autorisation/d’admission ; un SKILL est un processus manuel, et non une autorisation accordée.

0.1.26 utilise un [base de données commerciale de plugin partagé](plugin-database-isolation.fr.md), séparé du noyau, avec des espaces de noms automatiques. Il remplace les bases de données par plugin publiées dans 0.1.25. L’upgrade nécessite une désinstallation normale sur l’hôte précédent et une réinstallation ; les données du plugin ne sont pas migrées.

Documentation de référence : host 0.2.23 / SDK 0.1.11, vérifié le 28 octobre 2026. La publication du SDK 0.1.11 est indiquée ci-dessous ; la déploiement en production et l’acceptation sur appareils natifs restent distincts. Il s’agit de la guide de développement principale, incluant le contenu actuel, les contrats natifs et d’installation. Les documents associés fournissent les protocoles complets et les archives historiques d’acceptation. Toute adaptation de compatibilité, conversion de format ancien ou migration de base de données nécessite l’accord préalable du propriétaire du projet.

[中文](plugin-development.zh-CN.md)

L’objectif complet, y compris les parties non implémentées, est [Contrat SDK](plugin-sdk-contract.fr.md)Ne conservez pas les membres obsolètes, les mécanismes de modération ou les couches de compatibilité de chargement de sources.

Le [Échelle horizontale et contrat de stockage géré](plugin-horizontal-scaling.fr.md) est approuvé. Toute persistance est gérée par l’hôte ; les packages doivent déclarer `doca.storage: "host"`. Les déclarations manquantes ou différentes sont rejetées avant l’import du code lors de l’installation, la découverte des répertoires et le démarrage. Les objets SQL gérés/privés sont exportés dans le SDK 0.1.7 ; les identifiants sont exportés dans la source du SDK 0.1.9 ; les espaces de travail restent un manque.

<a id="implemented-managed-storage"></a>

## Mise en œuvre du stockage géré

`@smartdoca/plugin-sdk/storage` actuellement, les exportations sont liées à l’installation `pluginDatabaseToken` (`storage.sql.v1`) et `pluginObjectStorageToken` (`storage.objects.v1`). Le sous-ensemble de la base de données est une version de schéma explicite 1, avec des colonnes text/int32/double, des contraintes primaires/uniques, des opérations de sélection, d’insertion, de mise à jour et de suppression structurées, ainsi que des transactions avec des callbacks exécutés une fois. `pluginCredentialToken` (`storage.credentials.v1`, le source SDK 0.1.8) fournit des identifiants chiffrés uniquement pour le serveur, avec des mises à jour et suppressions vérifiées par révision. Les joints, les clés étrangères, le SQL générique, les upsert et les espaces de travail ne sont pas exportés. Voir [API de credencial et déploiement](plugin-credentials.fr.md). Le SQL professionnel utilise une base de données gérée par un hôte partagé distinct du noyau : un fichier SQLite avec des préfixes de table, ou un compte PostgreSQL avec des schémas de plugins automatiques et un pool de connexions partagé. L’isolation des processus n’est pas encore implémentée. Voir [Configuration de stockage et contrat d’uninstallation avant upgrade](plugin-database-isolation.fr.md).

Les bases de données logiques utilisent `plugin:<pluginId>`, attribution des fichiers utilisateurs et utilisation des objets privés `plugins/<pluginId>`, et les ZIP sont libérés `host/plugin-releases/<sha256>.zip`. Les octets ZIP immuables complets sont stockés dans un fichier de stockage configuré dans l’environnement ; la base de données partagée contient la version 2 du registre, des références d’archivage et des index de hachage de fichiers de confiance. Les accès à la cache vérifiés ne font pas réduire à nouveau les téléchargements de ZIP. Toutes les instances sont redémarrées manuellement. Les paquets de plugins ou formats de stockage non supportés sont rejetés sans conversion automatique ; les données existantes sont conservées. Les mises à jour de la base de données principale se font séparément. [contrat d’amélioration de la base de données](database-schema-evolution.fr.md). Voir [implémentation exacte et limites](unified-storage-implementation.md).

<a id="license"></a>

## Licence

Doca et le SDK d’extension publique [MIT](../LICENSE). Une extension peut être open source ou propriétaire. Voir [Autorisation](../LICENSING.md).

Ne expédiez pas une dépendance dont la licence est inconnue, qui interdit la redistribution ou qui entre en conflit avec la manière dont vous publiez le plugin. Les mentions des tiers restent l’obligation de l’auteur du plugin. La licence de Doca ne couvre pas les matériaux de tiers que l’auteur ne peut pas licencier.

<a id="install-and-start"></a>

## Installer et démarrer

Installer un ZIP complet prêt à l'emploi via Admin → Plugins, ou déposer un fichier `<plugin-id>/` mettre le dossier de sortie dans `DOCA_PLUGINS_DIR` pendant le arrêt. Redémarrer chaque instance. La base de données partagée contient la sélection souhaitée, les références d’archivage et les index de hachage de fichiers ; les octets ZIP complets se trouvent dans le stockage de fichiers configuré ; les caches locaux de l’instance s’synchronisent automatiquement au démarrage. Il n’y a pas de chemin de compatibilité pour le dossier d’installation de npm. Voir [protocole de stockage](plugin-store-protocol.fr.md) et [guide de déploiement](plugin-deployment.fr.md).

```json
{
  "name": "@example/attachments",
  "version": "1.0.0",
  "type": "module",
  "doca": {
    "dataVersion": "1",
    "storage": "host",
    "manifest": "./manifest.json",
    "server": "./dist/server.js",
    "web": { "directory": "./web", "entry": "./index.js" }
  }
}
```

`manifest.json` C’est du JSON statique. Sa version correspond. `package.json`:

```json
{
  "schemaVersion": 1,
  "id": "example.attachments",
  "version": "1.0.0",
  "displayName": "Attachments",
  "sdkRange": "^0.2.0",
  "dependencies": [{ "id": "doca.files", "range": "^0.1.0" }]
}
```

Seulement le JavaScript compilé est chargé. Le bundle ou le vendor de la closure de dépendances complète est stocké en tant que fichiers réels. Aucun script d’installation, aucune récupération de registre ou aucune compilation sur le serveur n’est nécessaire. Les chemins se trouvent à l’intérieur du répertoire racine du paquet. `doca.dataVersion` est nécessaire. Le fait que ce numéro de structure puisse changer est indiqué dans [Structure de données](#data-structure) en bas.

<a id="sdk-and-host-services"></a>

## SDK et services hôte

Dépend du contrat public. Ne pas importer. `@server/*`, `@core/*`, `@web/*`, `@db/*`, un parent de Doca source, ou un pont global. Les IDs de service sont stables entre les installations. Le hôte injecte l’implémentation.

```ts
import { definePlugin } from "@smartdoca/plugin-sdk";
import { filesServiceToken } from "@smartdoca/plugin-sdk/files";
import {
  httpServiceToken,
  usersServiceToken,
} from "@smartdoca/plugin-sdk/platform";
import manifest from "../manifest.json" with { type: "json" };

export default () =>
  definePlugin({
    manifest,
    async uninstall() {},
    injections: {
      required: [filesServiceToken, httpServiceToken, usersServiceToken],
    },
    async mount(context) {
      const files = context.inject(filesServiceToken);
      const users = context.inject(usersServiceToken);
      await context.inject(httpServiceToken).register(manifest.id, [
        {
          method: "GET",
          path: "/folders",
          async handle(request) {
            const user = await users.get(request, request.principal.id);
            const folders = await files.folders.list(
              { principalId: request.principal.id, signal: request.signal },
              { parentId: null },
            );
            return { user, folders };
          },
        },
      ]);
    },
  });
```

Ce itinéraire est `/api/v1/plugins/example.attachments/folders`L’identité provient de la session hôte. Les opérations de fichier vérifient à nouveau les permissions. Conservez un identifiant de fichier stable et une association avec un propriétaire, et non une pathologie de disque local. `users.get` Renvoie l’utilisateur connecté, ou un utilisateur pour lequel un administrateur a le droit de lire, y compris les informations de contact et les champs de profil personnalisés. Il ne renvoie pas de hash de mot de passe ou de secrets d’authentification. Élimine la réponse du navigateur pour ne garder que ce qui est nécessaire à l’écran.

<a id="public-services"></a>

## Services publics

| Importation              | Service                   | Utilisez                                                                     |
| ------------------- | ------------------------- | ----------------------------------------------------------------------- |
| plugin-sdk/files    | filesServiceToken         | Fichiers, uploads, contenu, liens et accès                   |
| plugin-sdk/platform | utilisateursServiceToken         | Le profil de l’utilisateur autorisé et la recherche unifiée des utilisateurs                   |
| plugin-sdk/platform | permissionsServiceToken   | Enregistrer l’autorisation des ressources commerciales et les sources de relations       |
| plugin-sdk/platform | httpServiceToken          | Routes authentifiées dans le nom de space propre du plugin                      |
| plugin-sdk/platform | policiesServiceToken      | Admission avant de créer, stocker, partager, transférer et appels IA           |
| plugin-sdk/platform | eventsServiceToken        | Lisez le flux d’événements durable, y compris `ai.usage.recorded`            |
| plugin-sdk/platform | tokenServiceDes notifications | Publier et retirer les notifications de manière idempotente                         |
| plugin-sdk/ai       | aiServiceToken / aiContinuationsServiceToken | Enregistrer les outils AI avec un schéma JSON et les manuels de compétences                  |
| plugin-sdk/content  | contentServiceToken       | Inventaire unifié, lecture, résolution, recherche optionnelle et sources de connaissances |
| plugin-sdk/platform | activityServiceToken      | Visites récentes gérées par le plugin, agrégation d'hôtes et autorisation          |
| plugin-sdk/search   | tokenServiceRecherche        | Projections, reconstruction et requêtes d’index autorisées                        |

Un identifiant de registration commence par l’identifiant du plugin et un point. Le nom de domaine de route est égal à l’identifiant du plugin. Ces registrations suivent le cycle de vie du plugin et sont libérées si le plugin s’arrête ou ne parvient pas à se lancer. Les timers et les connexions que vous créez vous-même continuent d’être utilisés. `context.effect` ou `effectAsync`L’arrêt ne supprime pas les données persistantes.

Une source de répertoire renvoie les relations qui sont actuellement valides. L’hôte applique la politique « tout », « liées » ou « aucune » de l’administrateur et filtre pour obtenir des utilisateurs valides. Une erreur de source ne augmente pas la visibilité. Être recherchable ne signifie pas être lisible. Les sources utilisent `schemaVersion: 1`, paginé `related`, et une actualité en cours `verify`. Le plugin conserve son propre indice de relation. La pagination, les temps d’attente et les vérifications répétées des candidats sont inclus. [transfert de courrier](plugin-mail-handoff.md).

Pour un travail professionnel de fond, le SDK source 0.1.10 est exposé `aiContinuationsServiceToken` pour registerSource/wait/wake. Déclarez une injection obligatoire. `sdkRange: "^0.2.0"`Implémenter l’autorisation commerciale en temps réel et les identifiants de fonctionnement stables, puis notifier après avoir obtenu le résultat. Le hôte reprend la tâche d’assistant originale après l’achèvement ou suite à une décision humaine nouvelle. Voir [le contrat complet et l'exemple](plugin-ai-continuations.fr.md).

Enregistrer une outil d’IA avec `aiServiceToken.registerTool`: id, description, inputSchema, et execute. execute reçoit l’utilisateur authentifié, turnId, jobId, callId et signal, ainsi que sessionId uniquement pour les conversations réelles. Il ne peut pas contourner les permissions des fichiers. `registerSkill` Prend l’ID, le nom, la description, le contenu et les formats. Le manuel insère la bibliothèque de compétences de l’hôte. Un outil professionnel vérifie ses propres permissions de ressources et stocke un ID de fonctionnement stable dans la base de données du plugin afin qu’une répétition ne reproduise pas un effet secondaire. callId associe une appel. Ne supposez pas qu’une nouvelle appel réutilise un ancien ID d’appel. La création d’un fichier ou d’un dossier passe un stable. `idempotencyKey`Un téléchargement passe également... `contentIdentity` retourné par `uploads.complete`Lisez un reçu durable. `files.receipts.get`Le résultat en attente peut être réessayé. Les paramètres différents sont 409. Un résultat supprimé ne peut pas être reconstruit en le rejouant. Le protocole complet se trouve dans la section 7.1. [Contrat SDK](plugin-sdk-contract.fr.md).

Doca ne comprend pas les abonnements, les prix, les points ou les quotas d’activité. Les taux d’entrée et de sortie de modèles, ainsi que les tokens par image, convertissent l’utilisation brute d’un fournisseur en tokens. Ce ne sont pas des prix. L’utilisation permet de distinguer une appel non confirmée des indicateurs réels. `ai.usage.recorded` est indiqué dans la transaction de règlement. Niveau supérieur `metrics` c’est l’utilisation nominale. `provider.metrics` Conserve les données brutes du fournisseur. Une extension extrait les événements. `events.read(cursor, limit)`, stocke son curseur et gère chaque identifiant d’événement une seule fois. Une vérification de politique peut refuser une appel. Les réservations entre plugins, la compensation en cas d’échec et la cohérence des fonds ne disposent pas encore d’un protocole de transaction complet. Une vérification ne constitue pas une implémentation de facturation.

Les plugins possèdent leurs propres modèles de business, autorisations, logique de travail et sémantiques de sortie ; tout état durable utilise des services gérés par le hôte public. Les plugins ne choisissent jamais de serveur local ou distant, ne se connectent pas à une base de données privée, ne lisent pas les identifiants de stockage ni ne persistent dans les répertoires du système. Le SQL géré et les objets privés sont exportés dans le SDK 0.1.7, les identifiants dans la source du SDK 0.1.9. `data.v1`/`data.v2` Et les espaces de travail temporaires ne sont pas exportés. Les capacités manquantes ne peuvent pas être remplacées par un magasin auto-géré.

<a id="monitoring-and-telemetry"></a>

## Surveillance et télémétrie

Le SDK source 0.1.11 ajoute `monitoringServiceToken` et `telemetryServiceToken` depuis `@smartdoca/plugin-sdk/monitoring`, plus réservé aux administrateurs `host.platform.monitoring`. Déclarer les injections requises `sdkRange: "^0.2.0"`. Les comptes de sites, les métriques HTTP, les utilisateurs en ligne, les logs, les audits, les tâches, l'utilisation de l'IA et l'utilisation des services publics d'hôte ; les plugins stockent l'historique à long terme via une stockage géré. Voir [méthodes exactes, limites et décisions concernant les versions/données](plugin-monitoring.fr.md)Aucune migration de base de données hôte ou aucun adaptateur hôte ancien n’est ajouté.

<a id="host-managed-persistence"></a>

## Persistance gérée par l'hôte

`doca.storage` doit être exactement `"host"`, y compris les plugins sans état. Il déclare son conformité au contrat de stockage géré ; il ne s’agit pas d’un nom de base de données ou de sélecteur de serveur. L’inspection statique le vérifie avant de résoudre/importer le code serveur. La compression ZIP, l’installation via npm/store, l’importation de dossiers hors ligne, la restauration de l’archive partagée et les outils de gestion de paquets utilisent cette vérification. Aucun paramètre par défaut manquant ou adaptateur legacy n’est fourni. Une déclaration représente l’engagement d’un auteur de plugin fiable, et non une sandbox Node.js ou une vérification de code.

Il n’existe pas de variable d’environnement `business-data-directory` pour les plugins, ni de chemin de données permettant la sélection des plugins. `DOCA_PLUGINS_DIR` Il reste le cache d’installation réparable du hôte, et non un magasin commercial. Seul le hôte configure la persistance locale/remote et assure le stockage de base de données partagé/objets pour les déploiements horizontaux. Les plugins utilisent les mêmes méthodes SDK dans les deux cas et ne doivent pas s’appuyer sur le serveur backend du hôte.

Les fichiers téléchargés par l’utilisateur, les pièces jointes et les produits d’exportation sont utilisés `files.v1` Dossiers/fichiers avec des identifiants stables, liens et permissions. Les enregistrements structurés, les configurations, les tâches, les curseurs et les outbox appartiennent à la capacité relationnelle gérée par l’hôte. Son nom de base de données logique est `plugin:<pluginId>` Et est lié par une injection de confiance. Les binaires durables privés utilisent une capacité d’objet privé gérée par l’hôte ; les identifiants utilisent une capacité d’identifiants gérée par l’hôte. Les objets privés sont exportés dans le SDK 0.1.7 ; les identifiants gérés dans la source du SDK 0.1.8. Le travail temporaire peut utiliser un espace de travail ou des flux gérés par l’hôte à l’avenir, avec des limites et un nettoyage, sans dépendance durable sur le chemin de l’instance précédente. Voir le contrat de stockage pour les interfaces et le statut requis.

<a id="data-structure"></a>

## Structure de données

`doca.dataVersion` C’est un identifiant exact de la structure commerciale du plugin, et non une version ordonnée ou une preuve que les fichiers anciens peuvent être lus via un nouveau serveur. Les mises à jour installées nécessitent le même identifiant ; la structure réelle doit encore être validée. Les incohérences échouent explicitement. Ne effectuez pas de migration automatique, de downgrade, de remplissage de champs anciens, d’importation de dossiers anciens ou de lecture/écriture simultanée. Les données gérées par l’utilisateur restent intactes et ne sont pas utilisées comme fallback pour une base de données gérée vide. Toute conversion future de structure/serveur nécessite un plan, une validation et un rollback acceptés séparément.

<a id="uninstall"></a>

## Désinstaller

Une extension installée doit être implémentée `uninstall(context)`; le démarrage rejette une usine sans elle. Le hook gère l’annulation des relations commerciales ou la révocation externe et ne utilise que les services publics d’hôte. Il doit être idempotent et ne doit jamais ouvrir ou supprimer récursivement les chemins de stockage d’hôte. Un plugin sans état peut implémenter un hook vide.

La gestion du nettoyage des bases de données/premières privées incombe au hôte. Lors de l’uninstallation réussie du service, la transaction du registre sépare la génération actuelle et envoie le nettoyage des tables/premières privées avec des tentatives de récupération durables. Le nettoyage des credences et la séparation de la génération sont implémentés ; le drainage des tâches de service du cluster reste indisponible. Les fichiers utilisateur et autres références de service sont conservés. Une défaillance du hook laisse l’installation intacte ; les effets des hooks externes ne peuvent pas être annulés. Toutes les instances nécessitent encore un redémarrage manuel.

Désactiver, arrêt du processus et `dispose` Libérer les enregistrements, les timers et les connexions sans supprimer les données durables. Les fichiers utilisateurs, les conteneurs de documents, les bindings utilisés par d’autres entreprises et les reçus de fichiers durables ne sont pas supprimés automatiquement lors de l’élimination du plugin. Toute nettoyage de fichiers utilise le service de fichiers et vérifie la propriété, l’autorisation et les références restantes.

<a id="web"></a>

## Web

`host.ai.open(input)` Ouvre l’assistant personnel avec un prompt/contexte modifiable, des références de documents autorisés et des pièces jointes de fichiers existants. `sessionId` Reprend une conversation en cours ; l’omission crée une nouvelle. Seulement explicitement. `autoSend: true` Envoi d’un message via la file d’attente de travail normale du hôte. Le web et le conteneur de plugin natif partagent la même interface SDK. Voir [paramètres, limites et exemples](plugin-assistant.fr.md)Le soutien de la source ne signifie pas une publication sur npm ou une acceptation par les appareils natifs.

La construction web optionnelle default-exports `async host => bundle`. `host` Fournit React, apiBase, useEnvironment, navigate, toast, confirm, request, FilePicker, platform et ui. React provient du host, donc il y a un seul renderer. D’autres dépendances sont chargées dans le bundle. Le host ne résout pas les importations npm brutes. Le bundle suit les instructions. `WebPluginBundle` exporté par `@smartdoca/plugin-sdk/web`. `manifest.pluginId` Et la version correspond à celle du serveur. Les contributions concernant les pages, la navigation, l’administration et les paramètres sont prises en compte.

Le présentateur serve le répertoire indiqué. `/api/v1/plugin-assets/{id}/{version}/`. Le démarrage froid charge les registrations avant l’installation ; un document déjà en cache est monté immédiatement, tandis que la découverte utilise la requête de bootstrap en temps réel partagée en arrière-plan. Les observateurs de navigation et de routage se mettent à jour lorsque les registrations arrivent, sans reconstruire le document. Seules les ressources actuellement versionnées du serveur sont chargées ; les métadonnées de démarrage ne sont ni un bundle de plugin en cache ni un adaptateur d’autorisation. Les erreurs de chargement sont isolées et enregistrées. Les fichiers de paquet du serveur ne sont pas exposés. La rendu de contribution présente une limite d’erreur. Les commandes, vues et emplacements optionnels prennent en compte les positions actuelles du site web, du document, de la bibliothèque et des fichiers. La sélection, l’insertion, le thème et les positions natives restent du travail futur ; voir [méthodes et slots exacts](plugin-extensions.fr.md).

<a id="build-and-verify"></a>

## Construire et vérifier

Dans le dépôt hôte, `pnpm build:plugin-sdk` construit le SDK, les contrats et les capacités de fichiers JavaScript et `.d.ts`Les paquets publiés sont `@smartdoca/plugin-sdk` Et les paquets de contrat sont réexportés. `publishConfig` se concentre sur `dist`. L’installation des plugins dépend de ces artefacts npm, et non du code source de ce dépôt.

Au moins, vérifiez une installation indépendante, le démarrage sans plugins, les conflits de dépendances, les refus de partage entre utilisateurs, les conflits de versions, les appels idempotent, les relations révoquées, l’isolement de deux instances hôtes et le nettoyage après arrêt. Les tests utilisent leur propre base de données, utilisateurs et documents. La copie de l’interface suit. [interfaces de langues](i18n.fr.md). Les éditeurs suivent [intégration éditeur](editor-integration.fr.md) et le [contrat de collaboration](collaboration-sdk-contract.fr.md).

Les callbacks HTTP, l’attachement de données, la calibration utilisateur, la recherche et les connaissances, ainsi que la frontière mobile sont en [transfert de courrier](plugin-mail-handoff.md).

<a id="scope-and-delivery"></a>

## Portée et livraison

`search.v1` Fournit des requêtes de projection et d’index autorisées. Nouveaux contenus unifiés, récupération de contenu mondial et abonnements à des connaissances. `content.v1` En dessous. Les plugins détiennent les données commerciales et les permissions actuelles ; le hôte détient les abonnements explicites, les horaires, les empreintes de bloc et les vérifications d'accès au contenu dérivé.

L’acceptation installe une version réelle du hôte, le SDK et le fichier tarball du plugin commercial en dehors de ce dépôt. Préparez la clôture complète des dépendances. Ne dépendez pas d’un lien source, d’une cache non déclarée ou d’une récupération via le registre pendant l’installation ou le démarrage. Vérifiez les ressources web, le flux commercial, la révocation, la répétition et le redémarrage. La construction du SDK n’est pas une acceptation end-to-end.

Une base de données de plugin doit correspondre à sa version de données déclarée. Une incompatibilité empêche le démarrage. Il n’y a pas de script d’upgrade ou de downgrade. Les exigences d’installation sont dans… [Désinstaller](#uninstall) En haut. Un protocole de suppression des utilisateurs n’est pas disponible. Le contrat dynamique du WebView mobile est documenté dans la guide de l’intégration e-mail v1. Il n’y a pas de dossier de données sélectionné par plugin ; la persistance utilise les capacités d’hôte spécifiques, avec des lacunes d’implémentation documentées séparément.

<a id="background-identity-checks-and-notifications"></a>

## Vérifications d’identité et notifications de fond

`users.status(userId)` retourne `{id, status}` Ou null pour un travail sur un serveur de confiance. Arrêtez les activités commerciales lorsque l’état n’est pas actif. Un compte actif ne signifie pas que l’utilisateur peut lire des ressources commerciales.

`notificationsServiceToken` exportations `notifications.v1`: `publish(pluginId, {recipientId, key, title, body, path, resource: {type, id}})` et `withdraw(pluginId, {recipientId, key})`. L'hôte ne permet que le pluginId propre au plugin. `key` est non vide et ne dépasse pas 200 caractères, isolé par plugin et destinataire. Rejouer les mêmes paramètres renvoie le même résultat `{id}`. Différents paramètres renvoient 409. Une clé retirée renvoie 410. L’outbox du plugin est publié avant sa retrait.

Le type de ressource est enregistré dans permissions.v1 et est implémenté `notification.read`Publier, afficher la liste, compter le nombre de messages non lus, et cliquer sur « recheck » pour les permissions actuelles. Une source manquante, désactivée, échouée ou expirée est refusée. Le titre et le contenu sont du texte simple, d’une longueur maximale de 200 et 2000 caractères. `path` c’est une route intégrée à l’application, comme `/mail/<id>?message=...`, sans origine ni hash. Le lien passe un point d’accès d’autorisation du hôte avant la navigation. La page du plugin et l’API se font toujours autoriser elles-mêmes.

La publication dans cette instance met à jour l’application web immédiatement. L’application web met à jour les autres instances toutes les 30 secondes. Il s’agit de notifications intégrées à l’application. Ce ne sont pas des notifications SMTP, push mobiles ou de bureau.

Le registre HTTP limite le corps à 1 MiB par défaut. Une route nécessitant un corps plus grand, comme une pièce jointe, peut le définir `bodyLimit` En octets, au maximum 32 MiB. Le plugin vérifie toujours le nombre d'attachements, la taille décodée et les totaux d'affaires.

<a id="recent-activity"></a>

## Activité récente

`activityServiceToken` depuis `@smartdoca/plugin-sdk/platform` dévoile `activity.v1`. Les plugins enregistrent des sources d'activité récente paginées et un stockage des visites, ainsi que des opérations de suppression et de validation commerciale. Le hôte fusionne les sources, affiche leurs étiquettes/icônes et vérifie à nouveau. `activity.read` avant l’affichage et l’ouverture. Déclarer le service requis ; un hôte plus ancien sans celui-ci refuse l’extension plutôt que d’adapter le stockage privé. Voir [contrat d'intégration et exemple](plugin-activity.fr.md).

<a id="unified-content-reading-search-and-knowledge-subscriptions"></a>

## Contenu unifié : abonnements à la lecture, à la recherche et au savoir

Utilisez `@smartdoca/plugin-sdk@^0.1.9`. Importation `contentServiceToken` et le `ContentSource` type de `@smartdoca/plugin-sdk/content`; déclarer le token `injections.required` Et enregistrer la source lors du montage. Les sources appartiennent au plugin d’enregistrement. Les documents et fichiers intégrés utilisent le même contrat.

| Membre                                        | Contrat                                                                                                                                                                                                    |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Déclaration                                   | `id`, `pluginId`, `version: 1`, localisé `title`, `contentTypes`, `purposes`, `capabilities: {search}`, `configSchema`                                                                                     |
| `list(ctx, {config, cursor, limit})`          | Obligatoire. Retourner `{items, nextCursor, snapshot}`Chaque élément contient `ref: {sourceId, resourceId, blockId}`, `fingerprint`, `title`, optionnel `order`, `anchor`, `excerpt`; ne retournez pas le corps entier ici. |
| `read(ctx, {config, ref, fingerprint})`       | Obligatoire. Vérifier à nouveau les permissions et retourner l’article avec `text`, ou null si elle n’est pas disponible. Un empreinte digitale modifiée constitue un conflit ; il ne peut jamais y avoir de nouveaux textes sous une empreinte digitale ancienne.                                       |
| `resolve(ctx, ref)`                           | Obligatoire. Vérifier à nouveau l’accès et le retourner. `{path, fingerprint}` ou null. `path` est une localisation dans l’application en temps réel.                                                                                                     |
| `search(ctx, {config, cursor, limit, query})` | Optionnel ; déclaré et mis en œuvre ensemble. Retourne une page légère. Les recherches non supportées ne se transforment pas en une vérification complète.                                                                                  |

`ctx` contient les données authentifiées `principalId`, `purpose` (`knowledge`, `analysis`, ou `search`) et annulation `signal`. Le fournisseur applique les autorisations commerciales en vigueur à chaque appel. Une source permettant l’analyse peut fournir un plugin de tâches futures sans API spécifique au courrier électronique. Les consommateurs utilisent `sources(ctx, purpose)`, alors service `list/read/search` avec `sourceId` et `purpose`; service `resolve` prend `{ref, purpose}`Seulement demander une finalité déclarée par cette source.

La pagination commence et se termine par null. Toutes les pages d’une traversion doivent partager un snapshot cohérent ; une erreur se produit en cas d’expiration, plutôt que de continuer silencieusement avec des données différentes. Ce curseur permet de paginer l’ensemble des stocks autorisés, et non un journal de modifications durable. `listChanges` et `readChanges` Ce n’est pas requis ou exporté par le présent contrat. La source peut synchroniser son système de gestion interne, mais Doca ne exige pas cette mise en œuvre.

La connaissance utilise le système de abonnement et de planification existant. L’utilisateur sélectionne explicitement la source, la bibliothèque et la configuration. Le hôte stocke les références et les empreintes de bloc, compare l’inventaire complet et lit/analyse uniquement les blocs nouveaux ou modifiés. Il ne conserve pas de copie complète de la source entière. Les blocs qui ne sont pas modifiés n’ont pas besoin d’être lus à nouveau. Seul un inventaire complet et cohérent peut permettre une suppression ; les exécutions échouées ou partielles ne le reconnaissent pas. L’identité stable d’un bloc ne doit pas dépendre de toute la révision d’un document ou de l’index des paragraphes positionnels.

En cas de suppression, déconnexion, annulation ou de source indisponible, les connaissances dérivées ne sont pas affichées dans les lectures, les listes, les recherches et la récupération de réponses ; le contenu est conservé pour traitement par l’administrateur, y compris les résultats modifiés manuellement. Le contenu déjà livré et une connexion de collaboration déjà ouverte ne sont pas annulées de manière rétroactive par cette vérification. L’interface de configuration prend en charge les champs primitifs, les enums et les tableaux de caractères ; les configurations complexes relèvent de l’interface propre au plugin. Cette intégration ne nécessite aucune migration de schéma de base de données, ni double lecture/écriture, ni adaptateur pour sources anciennes. Le SDK continue d’être exporté. `knowledge.sources.v1`, mais ce n’est pas l’entrée de souscription pour de nouvelles intégrations et ne s’adapte pas automatiquement `content.v1`.

Limites : 100 articles d’inventaire par page, 100 000 articles par parcours, 2 millions de caractères par corps, 120 000 caractères de corps modifié par analyse, et un délai de 20 secondes pour la demande de source. Les travaux trop volumineux ou incomplets échouent explicitement ; ne les tronquer pas et ne les considérer pas comme terminés. Les endpoints HTTP sont `/api/v1/content/sources` et `/api/v1/content/{list,read,resolve,search}`. Voir [protocole et limites exacts](plugin-content.fr.md) pour les formes de demande et les routes de souscription.

<a id="native-cache-and-attachments"></a>

## Cache et pièces jointes natives

Utilisez le même bundle Web tant sur le Web que dans le WebView mobile scindé. `PluginWebHost` depuis `@smartdoca/plugin-sdk/web` dévoile `native`, qui est nul sur le Web. Les types natifs sont exportés `@smartdoca/plugin-sdk/native`.

- `native.storage` approvisionnements `get`, `set`, `remove`, `clear`; les valeurs de chaîne de caractères sont isolées par le serveur, l’utilisateur connecté et le plugin. Les limites sont de 2 millions de caractères/valeur et 20 millions/plugin. Une déconnexion ou la suppression de l’utilisateur effacent la cache de l’utilisateur. Les plugins doivent être activés ; IndexedDB n’est pas migré et une démarrage froid hors ligne n’est pas garanti.
- `native.attachments.save/share({path, name, mime})` Télécharge une path API de plugin relative via un dépôt natif authentifié. Les identifiants natifs ne pénètrent jamais dans le WebView. Les redirections sont refusées et la taille est limitée à 32 MiB ; les fichiers temporaires sont supprimés.
- En Android, le sauvegarde est retourné comme « complété » ou « annulé ». Sur iOS, le sauvegarde et le partage de système peuvent être signalés, ce qui ne prouve pas que l’utilisateur a effectué l’action. Le changement d’utilisateur ou la suppression de page annule les demandes en cours.
- L’attachement de compte de messagerie se fait sur le Web. Le OAuth natif ne fait pas partie de cette livraison.

La version actuelle du SDK est 0.1.11 ; sa publication sur npm est enregistrée ci-dessous. Les tests d’hébergement et les builds ne remplacent pas l’intégration indépendante des paquets de messagerie ou l’acceptation des appareils iOS/Android ; ces étapes restent en attente. Voir [protocole natif](plugin-native.fr.md).

<a id="distribution-and-navigation"></a>

## Distribution et navigation

Un fichier npm tgz complet est utilisé pour la publication ou l’installation exacte du package/version dans Plugins → Settings. L’upload local nécessite un fichier ZIP contenant package.json à la racine, et non un tgz. Les deux formats contiennent les artefacts compilés ainsi que l’ensemble des dépendances de runtime ; l’hôte ne lance pas npm install ou les scripts de package. L’installation, l’upgrade, l’inactivité et l’uninstallation ont effet après redémarrage de chaque instance. Le comportement de l’uninstallation est spécifié dans… [Désinstaller](#uninstall) en haut.

La navigation globale dispose de scopes utilisateur Web, utilisateur application et administrateur. Déclarez l’objectif de la page et les plateformes ; ne proposez jamais une page utilisateur en tant que page administrateur. Les pages de plugin sont étiquetées selon leur origine, et une entrée ne doit pas apparaître ni dans la barre latérale ni dans "Plus". Voir [distribution, WebView et navigation](plugin-mail-integration-v1.md) et [protocole de stockage](plugin-store-protocol.fr.md).

<a id="public-reading-and-ui-extensions-sdk-014"></a>

## Lecture publique et extensions UI (SDK 0.1.4)

[Implémentations d’interfaces](plugin-extensions.fr.md) Décrire la politique de répertoire utilisateur, les snapshots de documents natifs, la traversée des bibliothèques. `host.platform`, `host.ui` et commandes/visualisations/emplacements optionnels. Les plugins utilisant de nouvelles méthodes déclarent `sdkRange: "^0.2.0"`; les plugins existants uniquement sur la page n’ont pas besoin de nouvelle inscription.

<a id="template-and-material-plugins"></a>

## Modèles et plugins de matériel

Le SDK 0.1.5 ajoute des fournisseurs et consommateurs de ressources de création optionnels. `host.platform.templates/materials`, et injecté `TemplatePicker/MaterialPicker`. Voir [protocole de ressource exact](creation-resources.fr.md)Les fournisseurs n’ont pas de installation par défaut. Vous devez vous enregistrer dans votre espace de noms et dans le cycle de vie actuel ; les consommateurs professionnels autorisent eux-mêmes leurs actions.

Pour la sélection multi-source nommée et la récupération par IA, utilisez la révision de source 0.1.6 : requête avec `providerIds`, déclarer des descriptions de source localisées et des modes de récupération optionnels, et mettre en œuvre `retrieve` avec sa déclaration. L’hôte offre la découverte de sources, l’agrégation de résultats limitée et des outils d’IA ; les fournisseurs choisissent leur moteur de recherche. Les anciens champs de requête uniques sont rejetés en vertu du changement de protocole convenu. Les métadonnées des sources sont disponibles dans les résultats et dans les callbacks de sélection. Voir [formes et limites de la demande](creation-resources.fr.md).

<a id="plugin-document-elements-2026-10-02-sdk-016-source"></a>

## Éléments de document de plugin (2026-10-02, source SDK 0.1.6)

Le bundle Web optionnel `elements` registrement et `@smartdoca/plugin-sdk/editor-elements` Elles sont implémentées pour les éléments atomiques intégrés riches et les visualisations de canevas de cellule entière sur feuille de calcul. Les formulaires de configuration sont soumis via des opérations natives propres au hôte et l’annulation ; il n’existe pas de gestionnaire d’éditeur public arbitraire. Les types/versions exactes inconnues affichent un placeholder d’erreur et conservent un JSON opaque, sans conversion, migration ou nettoyage. Aucun fournisseur n’est installé par défaut. Voir [le contrat d’élément exact](plugin-editor-elements.fr.md) et [l’exemple de comptage/actualités indépendant](../examples/plugin-elements/README.md)La publication sur npm, l’installation en production et l’acceptation sur les appareils natifs ne sont pas implicites.


Les collections de matériaux sont implémentées dans le code source SDK 0.1.9 : materials.v2 / fournisseurs de version 2, groupes de résultats distincts pour les matériaux/collections, pagination, tags et récupération indexée. Les métadonnées des collections ne intègrent jamais les membres. La version convenue ne comporte pas d’adaptateur materials.v1 ni de migration des fichiers/documents existants. La gestion des collections appartient aux fournisseurs qui utilisent une persistance gérée par le hôte public. Voir… [protocole de ressources](creation-resources.fr.md).

<a id="sdk-publication--2026-10-13"></a>

## Publication du SDK — 2026-10-13

`@smartdoca/plugin-sdk@0.1.11` Il est publié sur npm. Le consommateur de dépendances du registre importe tous les 16 points d’entrée publics et vérifie les tokens de surveillance/telemetry ainsi que la version exacte du SDK. Cela ne constitue pas un plugin de surveillance de production ni une acceptation sur appareil natif.
