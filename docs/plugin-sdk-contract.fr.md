<a id="plugin-sdk-and-core-boundary"></a>

# SDK de plugin et frontière centrale

La source actuelle utilise le SDK **0.2.0**, avec `ai.v2` / `ai.continuations.v2`Les contextes d’outil portent toujours `jobId`; `sessionId` Cela n’est disponible que pour les conversations réelles. Reconstruisez les plugins. `sdkRange: "^0.2.0"`; les anciens plages de SDK et contrats de services IA sont rejetés sans adaptateurs. Ce changement de source n’est pas une publication ou un déploiement npm. Voir [Séparation de l'exécution des MCP](mcp.fr.md#execution-history-and-upgrade).

Une plage de SDK incompatible ou une dépendance requise indisponible isole le plugin commercial concerné. Le hôte et les plugins non liés se lancent, et l’option Admin → Plugins explique la raison et demande une mise à jour. La sélection des plugins installés, les archives, les données commerciales et les identifiants sont conservés. Les anciens paquets ne sont pas convertis et le code SDK ancien n’est pas exécuté. Les nouvelles installations en ligne rejettent toujours les paquets incompatibles. Les dossiers d’installation complètement hors ligne conservent leur identité originale et subissent la même isolation.


0.1.26 utilise un [base de données commerciale de plugin partagé](plugin-database-isolation.fr.md), séparé du noyau, avec des espaces de noms automatiques. Il remplace les bases de données par plugin publiées dans 0.1.25. L’upgrade nécessite une désinstallation normale sur l’hôte précédent et une réinstallation ; les données du plugin ne sont pas migrées.

[中文](plugin-sdk-contract.zh-CN.md)

Documentation de référence : host 0.2.23 / SDK 0.1.11, vérifié le 28 octobre 2026. La publication du SDK 0.1.11 est indiquée ci-dessous ; le déploiement en production et l’acceptation sur les appareils natifs restent distincts. Toute persistance des plugins est gérée par l’host ; les plugins détiennent les modèles de business et l’autorisation. Ce document constitue la norme d’acceptation pour la refonte. Cela ne signifie pas que toutes les interfaces sont implémentées. Le problème se situe dans la section 12. Un tutoriel de développement ne doit pas présenter une interface cible comme une export existante aujourd’hui.

Le SDK source 0.1.11 exporte monitoring.v1 et telemetry.v1 pour les statistiques du site, les métriques HTTP, les logs opérationnels redactés, les audits, les diagnostics de file d’attente/utilisation et la santé du système, avec le transport web pour l’administrateur. Voir [Surveillance de l’accès, de la conservation, de la couverture du cluster et de la restauration](plugin-monitoring.fr.md)Les interfaces existantes et les formats durables restent inchangés.

Le [capacités publiques et plan de refactorisation pour l’extension de l’interface utilisateur](plugin-sdk-expansion.md) Enregistre la direction des additifs convenues, l'inventaire actuel de mise en œuvre, les interfaces proposées et les lots d’acceptation. A–D sont maintenant mis en œuvre ; [méthodes et slots implémentées](plugin-extensions.fr.md) Enregistrer les exportations exactes et les limites. E/F reste une tâche future.

<a id="implemented-managed-storage"></a>

## Mise en œuvre du stockage géré

`@smartdoca/plugin-sdk/storage` actuellement, les exportations sont liées à l’installation `pluginDatabaseToken` (`storage.sql.v1`) et `pluginObjectStorageToken` (`storage.objects.v1`). Le sous-ensemble de la base de données est une version de schéma explicite 1, avec des colonnes text/int32/double, des contraintes primaires/uniques, des opérations de sélection, d’insertion, de mise à jour et de suppression structurées, ainsi que des transactions avec des callbacks exécutés une fois. `pluginCredentialToken` (`storage.credentials.v1`, le source SDK 0.1.8) fournit des identifiants chiffrés uniquement pour le serveur, avec des mises à jour et suppressions vérifiées par révision. Les joints, les clés étrangères, le SQL générique, les upsert et les espaces de travail ne sont pas exportés. Voir [API de credencial et déploiement](plugin-credentials.fr.md). Le SQL professionnel utilise une base de données gérée par un hôte partagé distinct du noyau : un fichier SQLite avec des préfixes de table, ou un compte PostgreSQL avec des schémas de plugins automatiques et un pool de connexions partagé. L’isolation des processus n’est pas encore implémentée. Voir [Configuration de stockage et contrat d’uninstallation avant upgrade](plugin-database-isolation.fr.md).

Les bases de données logiques utilisent `plugin:<pluginId>`, attribution des fichiers utilisateurs et utilisation des objets privés `plugins/<pluginId>`, et les ZIP sont libérés `host/plugin-releases/<sha256>.zip`. Les octets ZIP immuables complets sont stockés dans un fichier de stockage configuré dans l’environnement ; la base de données partagée contient la version 2 du registre, des références d’archivage et des index de hachage de fichiers de confiance. Les accès à la cache vérifiés ne font pas réduire à nouveau les téléchargements de ZIP. Toutes les instances sont redémarrées manuellement. Les paquets de plugins ou formats de stockage non supportés sont rejetés sans conversion automatique ; les données existantes sont conservées. Les mises à jour de la base de données principale se font séparément. [contrat d’amélioration de la base de données](database-schema-evolution.fr.md). Voir [implémentation exacte et limites](unified-storage-implementation.md).

<a id="_1-decisions"></a>
<a id="1-decisions"></a>

## 1. Décision

L’approbé [Échelle horizontale et contrat de stockage géré](plugin-horizontal-scaling.fr.md) Définit la propriété du base de données, l’isolation du nom de espace, le stockage utilisateur/privé/temporel et l’exécution multi-instances. Les packages doivent déclarer `doca.storage: "host"`; les autres déclarations ou celles manquantes sont rejetées avant l’import du code. Le hôte choisit seul le stockage local ou distant. Le SQL géré et les objets privés sont exportés dans la source SDK 0.1.7 ; les identifiants sont exportés dans la source SDK 0.1.9 ; les espaces de travail restent un problème.

Doca conserve le produit central et les services de plateforme génériques. Un business indépendant est découvert dans le répertoire d’installation. Les services de messagerie, de calendrier, de membership, de facturation, de contrôle d’utilisation et de modération de contenu ne sont pas des produits nécessaires.

Une extension dépend d’un SDK et d’un contrat de capacités publiés séparément. L’hôte injecte la mise en œuvre au moment du chargement. Ne vous fiez pas à une path de workspace Doca, à un module hôte privé, à un pont global ou à une table hôte privée. L’hôte ne importe pas la source de l’extension commerciale ni n’a besoin d’un identifiant spécifique de l’extension commerciale pour terminer un flux public.

Les plugins s'exécutent dans un processus serveur fiable. C'est une frontière de l'extension, et non une boîte noire Node.js. Le dossier d'installation est séparé du dossier du programme. L'hôte charge uniquement les plugins qui déclarent la gamme actuelle de SDK et dont la base de données correspond à la base de données actuelle.

<a id="_2-what-the-core-owns"></a>
<a id="2-what-the-core-owns"></a>

## 2. Qu’est-ce que le noyau possède

| Zone                 | Hôte                                                                                                                           | Extension                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Identité             | ID utilisateur stable, authentification, sessions, activation et désactivation, profil de base, visibilité des champs                                  | Comptes commerciaux externes, extensions de profil, adaptateurs fournisseurs d’identité                                                |
| Autorisations          | Entrée de subvention unifiée, refus par défaut, politique de répertoire, intersection                                                          | Enregistrer les types de ressources commerciales, cartographier les rôles et les actions, fournir des informations sur les subventions et les intersections                             |
| Fichiers                | Fichiers, fichiers attachés, liens d’attachement, téléchargement et chargement, stockage d’objets, permissions                                          | Références d’attachement commercial, importateurs, prévoyeurs, extraiteurs                                                         |
| Documents            | Animateur éditeur, persistance, collaboration, histoire, commentaires, permissions de document                                               | Nouveaux adaptateurs éditeur, modèles, import et export, actions de document                                                       |
| AI                   | Exécution du modèle, enregistrement des outils et compétences, contexte de l'appel, journal de usage brut, utilisation des tokens évaluée par le modèle                       | Outils de domaine, compétences, flux, quotas de adhésion, prix et frais                                                       |
| Recherche et connaissances | Recherche unifiée et entrée globale. Abonnements explicites, planification, empreintes digitales de bloc et contrôle d’accès au contenu dérivé | Enregistrer le contenu.v1, liste, lecture/résolution et recherche optionnelle, vérifications des permissions actuelles ; comptes externes et synchronisation avec les activités commerciales |
| Emplois et événements      | Organiser des événements, des points de connexion du cycle de vie et une persistance gérée                                                                      | Logique professionnelle, réessai, idempotence et état via les services hôtes                                                    |
| Interface            | Shell, routes, slots de navigation, thème, langue, limites d’erreur                                                             | Arbres d'affaires, pages, paramètres, administration, cartes de résultats IA                                                                   |
| Politique commerciale    | Extension de la politique d’opération générique et statistiques factuelles                                                                         | Niveaux, adhésion, points, plans, quotas, paiement                                                                        |
| Modération           | Limites de ressources génériques, événements d’opération, audit de sécurité                                                                      | Rapports, files de revue, détection, décisions, fournisseurs                                                                     |

Ne supprimez pas une fonctionnalité essentielle simplement parce qu’elle pourrait être une extension. Les documents, les fichiers, les utilisateurs et les accès doivent fonctionner sans installation de plugin commercial. Les fichiers et documents qui utilisent un cycle de vie de plugin interne constituent un détail d’implémentation essentiel. Ce n’est pas le canal d’installation du plugin commercial.

<a id="_3-installation-and-discovery"></a>
<a id="3-installation-and-discovery"></a>

## 3. Installation et découverte

La base de données hôte partagée contient les métadonnées du registre et de l’archive souhaités ; des ZIPs complets et immuables sont stockés dans le répertoire de fichiers hôte configuré. Chaque instance synchronise un fichier privé. `DOCA_PLUGINS_DIR` par défaut `<data-root>/plugins`Avant le chargement, il vérifie tous les fichiers en cache et répare les fichiers manquants ou corrompus provenant de l’archive partagée. Le démarrage ne contactera pas le store, il peut exécuter npm install ou compiler TypeScript.

Administrateur → Les plugins sont installés depuis le magasin HTTPS officiel ou via des téléchargements locaux, les étapes incluent les mises à jour, l’activation, l’inactivation et l’désinstallation. Le magasin par défaut est `https://store.smartdoca.cc`, annulé par `DOCA_PLUGIN_STORE_URL`Les opérations utilisent des écritures vérifiées, et ont effet après le redémarrage de chaque instance. L’interface utilisateur distingue la sélection souhaitée globale de la sélection en cours de l’instance répondante. Aucune suppression rapide des routes Fastify n’est promise.

Les versions prêtes à l’emploi sont déclarées `doca.manifest`, `doca.server`, optionnel `doca.web`, obligatoire `doca.dataVersion` et `doca.storage: "host"` Dans package.json. La validation du stockage statique se fait avant la résolution/importation dans le serveur pour chaque source d’installation et la restauration du système après démarrage. Les déclarations de stockage manquantes ou différentes échouent sans conversion. La plage SDK, les chemins, le graphique, le hash et la structure exacte sont également vérifiés. Les mises à jour installées nécessitent une version de données inchangée. L’uninstallation actuelle déclenche le hook de nettoyage requis et efface le marqueur en cas de succès ; la transaction du registre encadre la génération et enregistre le nettoyage du base de données/objet privé durable, qui se déroule après la mise à jour ; le drainage des tâches du cluster reste en attente.

Dossiers hors ligne `<install-root>/<plugin-id>/` Sont publiés dans le registre partagé au démarrage et transférés dans `.imports/`Les fichiers de exécution se trouvent ici `.releases/<sha256>/`. Aucun fichier manifest npm racine, liens de source ou chemin de découverte traditionnel n’est pris en compte. Les fichiers de programme et les données de plugin restent distincts. Le code source d’hébergement, le package.json et la configuration Vite ne sont jamais modifiés lors de l’installation.

Le [protocole de stockage](plugin-store-protocol.fr.md) Définit le plan de l’ensemble de paquets, les endpoints distants, les limites et la sémantique des multiples instances. Voir [déploiement](plugin-deployment.fr.md) pour le redémarrage et la récupération en cas de échec.

<a id="_4-lifecycle"></a>
<a id="4-lifecycle"></a>

## 4. Cycle de vie

```text
scan static metadata → check dependencies → import code
→ discover → required service check → initialize → mount → ready
→ stop accepting work → dispose in reverse dependency order
```

Les services sont identifiés par un identifiant de chaîne stable et une version, et non par l’identité de l’objet token. Le hôte fournit d’abord les services de plateforme. Un plugin commercial enregistre les services uniquement dans son propre espace de noms. Il ne peut pas injecter des services privés du hôte, tels que `doca.server.*`Chaque ID de service a un fournisseur. Les capacités de multi-contribution utilisent un registre.

Chaque inscription renvoie un disposer appartenant à un effet de contexte. Les services, les tâches, les abonnements à événements et les inscriptions de interface utilisateur appartiennent à une instance hôte unique. Ne les stockez pas. `globalThis` ou `Symbol.for`Deux applications de test dans un même processus ne doivent pas se perturber mutuellement.

Capacités cibles, dont certaines ne sont pas encore exportées : files.v1, documents.v1, users.v1, permissions.v1, http.v1, ai.v2, ai-usage.v1, search.v1, content.v1, activity.v1, notifications.v1 (exportées), events.v1, stockage relationnel du plugin géré par l’hôte (exporté dans le SDK 0.1.7), et policies.v1. Les identifiants réels suivent les exportations actuelles. Une réname doit être versionnée. Cette table ne constitue pas une permission pour transmettre une interface non implémentée à un plugin existant.

<a id="_5-user-information-and-request-context"></a>
<a id="5-user-information-and-request-context"></a>

## 5. Informations utilisateur et contexte de la demande

Les requêtes HTTP, les outils d’IA et les tâches en arrière-plan partagent un contexte d’exécution fiable : requestId, principal, pluginId, signal, et optionnellement sessionId, turnId, jobId et callId. L’identité provient de l’authentification de l’hôte ou de l’autorisation de tâche persistée. Un plugin ne peut pas créer une identité utilisateur à partir de son corps HTTP.

Le profil complet de l’utilisateur disponible sur le serveur comprend l’ID stable, l’ID public, le nom d’accès, le nom affiché, l’avatar, l’état, le flag administrateur, les contacts vérifiés, les champs du profil, les champs professionnels personnalisés et les métadonnées liées à l’identité que le appelant peut lire. Les résultats de recherche ordinaires restent une projection minimale. L’objet ne contient pas de hash de mot de passe, de token de session, de code de vérification, de token OAuth, de clé API de modèle ou de secret de stockage. Ne renvoyez pas un profil complet du serveur au navigateur, ni n’ajoutez-le automatiquement à un prompt de modèle.

Les événements de création de utilisateur, de mise à jour du profil et de changement d’état persistent. Il n’y a pas encore d’entrée pour la suppression d’utilisateur. Un travail en arrière-plan vérifie à nouveau l’état de l’utilisateur et les permissions de ressources. Un utilisateur désactivé ne peut pas conserver son accès grâce à un ancien snapshot de travail.

Un flux de suppression future est enregistré par l’hôte : marquer la suppression et le retrait de l’accès, les plugins se nettoient de manière idempotente et confirment, puis l’hôte termine la suppression. Il doit couvrir les plugins désactivés, non installés ou indisponibles, avec un réessai et un chemin manuel vérifié. Un timeout n’est pas considéré comme un succès. Il ne utilise pas de deux-phase commit entre bases de données. Il doit être accepté avant que l’entrée de suppression par l’utilisateur ne soit ouverte.

<a id="_6-permissions-and-user-intersection"></a>
<a id="6-permissions-and-user-intersection"></a>

## 6. Autorisations et intersection utilisateur

Une référence de ressource est `(pluginId, resourceType, resourceId)`. Le plugin enregistre son autorisateur. L’hôte l’appelle. Les services de fichiers et de documents conservent leurs propres ACL. Enregistrer un plugin ne confère pas le droit de lire les fichiers d’un utilisateur.

L’extension définit les actions commerciales et les cartes de rôles, comme mailbox.read. Les actions d’extension ne sont pas obligatoirement égales à l’éditeur de document. Un autorisateur manquant, une extension désactivée ou un résultat incertain empêche l’accès. La lecture du corps du message, le téléchargement des pièces jointes, les outils d’IA et la recherche permettent un recheck.

L’hôte conserve toutes les règles liées et les modifications par utilisateur de l’administrateur. Les candidats liés sont l’union des sources de documents et de fichiers intégrées ainsi que des sources d’intersection de plugins actifs. L’hôte filtre toujours le statut de l’utilisateur, la visibilité des champs et la pagination. Les règles de type « none » ne demandent pas au plugin d’élargir les règles.

Une source d’intersection indique quels utilisateurs d’un site peuvent être découverts en raison d’une relation commerciale autorisée. Les membres d’un boîtier de messagerie ou de calendrier partagé peuvent faire partie d’une intersection. La messagerie d’un inconnu, le même domaine e-mail ou un nom dans le corps d’un message ne le font pas. Le plugin ne définit pas la politique de répertoire de l’administrateur.

Le protocole source prend en charge un identifiant source, une version de schéma, des lots de candidats et des curseurs, un identifiant et une version de relation, ainsi qu'un recheck des faits actuels. Le plugin gère de grands index de relations et leur outbox. La recherche utilisateur ne scanne pas la base de données du plugin. Les candidats expirés sont rechecked avant leur retour. Une panne du source ne amplifie pas la recherche. Désactiver un plugin supprime immédiatement son source. Le réactiver calcule d'abord les versions et les relations valides.

Être consultable ne confère aucune autorisation commerciale et ne révèle pas le profil complet. Les utilisateurs dupliqués provenant de plusieurs sources sont dédupliqués avant la pagination. Le total de filtrage préalable ne doit pas révéler les utilisateurs cachés.

<a id="_7-files-plugin-data-and-transactions"></a>
<a id="7-files-plugin-data-and-transactions"></a>

## 7. Fichiers, données de plugin et transactions

Les plugins utilisent les fichiers injectés v1 et stockent des identifiants stables. Une binding d'attachement est `(ownerPlugin, ownerType, ownerId, role)`Ne créez pas de magasin de pièces jointes privées, ni ne sauvegardez une URL temporaire signée comme référence permanente. Une association de propriété signifie la propriété, pas l’accès. Lire une pièce jointe par courrier réinitialise le boîtier de messagerie et l’association. Ouvrir le fichier original respecte toujours les ACL de ce fichier.

Toute persistance des données est gérée par le serveur. Les plugins définissent les tables, les index, les semantics des tâches/outbox et l'autorisation, mais ne choisissent jamais de serveur de stockage, ne se connectent pas directement à une base de données ou ne persistent pas dans les répertoires du système. La base de données logique est `plugin:<pluginId>`, lié à l’identité de l’installation. Les fichiers utilisateur utilisent files.v1 ; les binaires privés, les identifiants et le travail temporaire exploitent leurs capacités respectives. Les API de base de données gérées/objets privés sont exportées via plugin-sdk/storage ; les identifiants sont exportés dans la source SDK 0.1.9 ; les API de workspace et data.v1/data.v2 ne sont pas disponibles. Les capacités manquantes ne peuvent pas être remplacées par un stockage auto-géré. Les structures correspondent exactement ; aucune conversion implicite ou fallback pour les données anciennes. Le hôte est responsable du nettoyage de managed-store, coordonné entre les instances, plutôt que de la suppression du système de fichiers plugin.

Dans les bases de données et le service de fichiers, utilisez l’idempotence, la compensation et la calibration. Il n’y a pas de transaction partagée.

<a id="_71-durable-file-creation"></a>
<a id="71-durable-file-creation"></a>

### 7.1 Création de fichiers durables

`files.v1.folders.create` et `files.v1.files.create` accepter une option `idempotencyKey`, non vide, jusqu’à 200 caractères, sans caractères de contrôle. Le champ concerne l’ID du plugin injecté, l’utilisateur actuel et le type d’opération. Le même clé et les mêmes paramètres renvoient le premier résultat. Le même clé et des paramètres différents provoquent une erreur 409. La ligne du fichier ou du dossier et la confirmation de réception complétée sont liées. Les réceptions ne expirent pas. Le désactivation et l’uninstallation ne les suppriment pas. Rejouer après la suppression du résultat renvoie 404 et ne crée pas de nouveau fichier. Replay et requête vérifient à nouveau l’accoutumance et les permissions d’écriture.

Retour du fin du téléchargement `contentIdentity: {sha256, size, mime}`. Une téléchargement idempotent doit le passer. Le hôte vérifie les octets téléchargés. Le empreinte de requête inclut le répertoire de destination, le nom et l’identité du contenu, et non l’identifiant de téléchargement temporaire. Copy utilise sourceFileId et n’a pas besoin d’identité de contenu. Le plugin stocke la clé d’opération, les paramètres commerciaux et l’identité du contenu dans son propre outbox.

`files.receipts.get(context, {operation, key})` renvoie null ou `{status: "pending" | "completed", operation, result}`« En attente » signifie que les paramètres originaux peuvent être réessayés. Cela ne signifie pas que le travail est toujours en cours. « Complété » renvoie la vue d’ensemble historique. Si la réponse est inconnue, lire la réception, puis réessayer la création originale. Une échec ne se transforme pas en réception de succès.

Le hôte réserve l’identifiant de l’objet et la configuration de stockage, puis écrit des bytes. Les écritures locales utilisent une opération de remplacement atomique. Les écritures S3 créent un objet complet. Lors de l’initialisation et de la vérification quotidienne, les objets inutilisés provenant d’intentions terminées, les bytes restants d’intentions non terminées depuis plus de 24 heures, ainsi que les fichiers temporaires sont récupérés. La récupération et l’upload répétés partagent un verrou utilisateur de base de données et vérifient les références aux objets. Un objet enregistré ne est pas supprimé comme déchets.

<a id="_72-search-and-external-knowledge"></a>
<a id="72-search-and-external-knowledge"></a>

### 7.2 Recherche et connaissances externes

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

<a id="_8-ai-tools-skills-and-usage"></a>
<a id="8-ai-tools-skills-and-usage"></a>

## 8. Outils, compétences et utilisation de l’IA

Le SDK source 0.2.0 exporte le serveur `ai.continuations.v2`: enregistrement de sources à l’échelle de l’installation, attente d’un outil authentifié, points de contrôle durables, notifications de réveil dédupliquées et réconciliation de redémarrage. Les tâches commerciales et l’autorisation restent propriété du plugin ; l’hôte libère l’exécution du modèle pendant l’attente. Seuls les enregistrements d’attente explicites de version 1 participent ; aucune migration de base de données ni conversion historique. Voir [contrat de continuation](plugin-ai-continuations.fr.md).

Le source de données Web SDK actuel exporte `PluginWebHost.ai.open` Pour le lancement de l’assistant personnel avec prompt/contexte, documents et fichiers autorisés, une session ou modèle optionnel propriétaire et envoi automatique explicite. Il utilise les flux de session/hôte et de politique d’exécution existants, sans migration de stockage ni adaptateur hôte ancien. Voir [le contrat de lancement](plugin-assistant.fr.md)C’est une fonctionnalité de l’interface utilisateur client, et non un service d’exécution d’IA serveur ; la disponibilité en production avec npm/native reste non vérifiée.

Un plugin peut enregistrer des outils, des compétences, des intentions, des workflows, des générateurs de résultats et des vérificateurs. Un outil possède un identifiant dans un espace de noms, des schémas d’entrée et de sortie, un exécuteur et une exigence de permission. Une compétence est du contenu versionné dans le paquet. Ce n’est pas une solution pour contourner l’autorisation des outils.

Une outil de plugin reçoit le profil utilisateur autorisé et le contexte de l'appel IA : session, tour, tâche, appel de l'outil, ID du modèle, paramètres, signal de annulation et références matérielles autorisées. L'historique arbitraire et chaque prompt ne font pas partie du contexte par défaut de l'outil. Le chat et le MCP partagent l'autorisation et l'exécution de l'outil.

MCP révèle maintenant les outils installés qui déclarent `mcp` Exposition via ce même exécutant et vérifications actuelles de l’utilisateur/adhésion. Les SKILLs officiels, installés comme extensions et activés, sont filtrés par le accord de service et l’utilisateur actif. La configuration de service personnel et d’entreprise est propriété de l’hôte, sans nouvelle exportation de SDK ni accès au chemin source de plugin. Voir [Services MCP](mcp.fr.md).

Le noyau ne comporte pas de niveaux de membre, de points, de prix, de quotas de cadeaux ou de filtrage des modèles par niveau. Le hôte conserve la configuration du modèle, les temps d’attente techniques, la concurrence, les limites de contexte et les données d’utilisation brutes, qui peuvent être consultées par l’utilisateur, le modèle, le plugin, la tâche ou la requête. Chaque modèle possède des taux de tokens d’entrée et de sortie. La génération d’images utilise des tokens par image réussie. Ces taux convertissent l’utilisation par le fournisseur en tokens cumulatifs. Ce ne sont pas une monnaie ni un prix final.

Chaque tentative de fournisseur possède sa propre ID de appel et ID de tentative. Les valeurs inconnues sont null. Ne créez pas 0. Les tokens de cache ou de raisonnement peuvent déjà être inclus dans les totales d’entrée ou de sortie. Ne les ajoutez pas deux fois. Le processus de règlement freeze le snapshot de taux depuis le début de l’appel. L’interface utilisateur et `ai.usage.recorded` Affichage de l’utilisation approuvée. Le registre conserve les mesures brutes du fournisseur. Les estimations et les chiffres réels restent séparés. Le replay ne mesure pas deux fois.

Seuls les appels qui passent par l'exécuteur IA de l'hôte figurent dans le compteur unifié. Une extension qui appelle directement un fournisseur ne respecte pas cette promesse.

Un plugin de contrôle doit réserver atomiquement dans sa propre transaction et retourner un identifiant de réservation idempotent. La réussite ou l’échec libère ou résout les problèmes via une répétition durable. Vérifier le solde, appeler, puis déduire ne constitue pas un contrôle de quota concurrentiel. Un événement d’utilisation échoué ne efface pas le livre de compte du hôte. La répétition des déductions est dédupliquée par ID de appel et ID d’essai.

La politique v1 couvre également la création de documents, l’enregistrement de fichiers et le partage. Elle renvoie un résultat « autoriser » ou « refuser » accompagné d’un code de raison stable. Par défaut, il n’y a aucune contrainte commerciale. Un plugin de politique ne peut pas étendre les ACL des ressources, l’état des comptes, la taille des requêtes ou les limites de sécurité d’exécution. Une exception de politique n’est pas intégrée dans le résultat « autoriser ». Si le plugin de contrôle requis manque, l’opération n’est pas disponible et l’erreur est explicite.

<a id="_9-pages-navigation-and-http"></a>
<a id="9-pages-navigation-and-http"></a>

## 9. Pages, navigation et HTTP

Un plugin commercial peut inclure une navigation globale, son propre arbre ou barre latérale, des pages, un admin, des paramètres personnels, des actions du menu document, des résultats de recherche et la présentation des résultats de l’IA. La position utilise un emplacement stable, un ordre et un identifiant. Ne modifiez pas une branche de route hôte pour ajouter un plugin commercial.

Cible web est un ESM de navigateur, des styles et des assets créés par la plugin. L'hôte charge une URL versionnée depuis le manifest actif. La build ne doit pas importer. `@web/*`, source hôte local, ou importations brutes non résolues. Le hôte fournit le dossier statique déclaré, et non l’ensemble du paquet npm. Une différence de version entre serveur et client rend la page de cette extension indisponible. Un renderer manquant maintient une affichage générique historique. Une erreur de registration web reste à l’intérieur de la limite de l’extension. Le workspace de base peut être rendu pendant que les bundles du navigateur s’chargent. Les pages directes de l’extension affichent un état de chargement tandis que leur route est découverte.

http.v1 enregistre `/api/v1/plugins/<plugin-id>/...` Et utilise à nouveau l’authentification hôte, les vérifications d’Origine et d’hôte, le schéma de requête, le format d’erreur, la limite de taux et la annulation. Un webhook public doit indiquer comment l’identité externe est vérifiée. Le code natif est toujours fourni avec la version de l’application. Les plugins compatibles mobiles utilisent désormais le shell WebView spécifique décrit dans la guide de l’intégration e-mail v1.

<a id="_10-removing-membership-and-moderation"></a>
<a id="10-removing-membership-and-moderation"></a>

## 10. Supprimer l’adhésion et la modération

Supprimer l’adhésion inclut les pages administratives, la affichage du niveau, les APIs de plan et de subvention, les cartes de niveau des fournisseurs d’identité, les quotas de ressources, les points d’IA et le filtrage des modèles par niveau. Cacher une page tout en maintenant une limite de niveau n’est pas suffisant. Les enregistrements de utilisation brute d’IA restent visibles. Le projet ne prend pas en charge les anciens champs commerciaux ou une couche de migration.

L’élimination de la modération du contenu inclut les points d’entrée pour les rapports, l’administrateur de l’examen, les fournisseurs, les tâches de scan et les appels d’examen dédiés dans les flux hôte. L’approbation de l’administrateur pour l’enregistrement fait partie de la politique de compte. L’audit de sécurité est essentiel. Aucun de ces éléments n’est supprimé, car la modération du contenu est supprimée.

L’e-mail, le calendrier, l’adhésion et la modération sont des plugins professionnels. Les notes rapides ont été retirées du noyau et pourraient revenir en tant que plugin indépendant à l’avenir. Les tickets, la synchronisation avec des tiers, les reconnaisseurs et les canaux de notification sont susceptibles d’être divisés ultérieurement, uniquement après que le même SDK, les mêmes données et l’acceptation du client auront été établis. Ne laissez pas de wrapper qui importe toujours une implémentation de hôte privé.

<a id="_11-development-and-acceptance"></a>
<a id="11-development-and-acceptance"></a>

## 11. Développement et acceptation

- Les IDs publics, les tables, les événements et les outils disposent d’un espace de noms de plugin. La gamme de versions du SDK est explicite.
- Le paquet fournit JavaScript. `.d.ts`, un manifeste statique, et des artefacts clients déclarés. Il ne dépend pas des alias de dépôts Doca.
- Les tests unitaires utilisent des faux de capacités. Les tests d'intégration utilisent un Doca distinct, une base de données isolée, et un répertoire d'installation temporaire.
- L’acceptation utilise une build réelle du hôte, le SDK et le fichier tarball du plugin en dehors du repository, avec la clôture des dépendances. L’installation et le démarrage ne récupèrent pas de registre ni ne suivent un lien source.
- Vérifiez qu’il n’y a pas de dossier de plugin vide, un seul plugin, plusieurs plugins, une dépendance manquante, un identifiant double, un conflit de version, une base de données inadaptée, et effectuez une nettoyage lors de l’arrêt du système.
- Vérifiez que deux instances d'hôte ne partagent pas de services d'extension, d'événements utilisateur ou de registrations d'outil.
- Vérifier les politiques relatives et celles qui ne le sont pas, la révocation de la relation, l’inhibition de l’extension, l’échec de la source, l’attachement des fichiers, ainsi que les mêmes permissions pour la recherche et l’IA.
- Vérifiez les appels en parallèle d’IA, les échecs et les annulations, l’utilisation manquante, la répétition de la settlement, ainsi qu’un plugin de contrôle qui a échoué, sans double mesure.
- Vérifiez que l’upgrade d’hôte ne modifie pas le registre des plugins, les archives immuables, les données commerciales ou les pièces jointes. Lorsque les plugins sont désactivés, les documents et fichiers de base continuent de fonctionner.
- Copie de l’interface suivante [interfaces de langues](i18n.fr.md). Les extensions éditeur suivent les documents sur la collaboration et l'intégration éditeur.

<a id="_12-what-exists"></a>
<a id="12-what-exists"></a>

## 12. Qu’est-ce qui existe

Vérifié avec l’hôte 0.2.23 et le SDK 0.1.11, exporté le 2026-10-28. Les objectifs futurs supérieurs restent soumis aux lacunes mentionnées ci-dessous.

| Article                   | Présent                                                                                                                                                                                                                                                             | Encore à faire                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Découverte              | Registre partagé, références d’archives et fichiers ZIP partagés, synchronisation de la cache d’instance, import de dossiers/ZIP, stockage administrateur, vérifications du manifeste statique                                                                                                           | Acceptation d’un ensemble de paquets indépendant                                                                                                    |
| Injection              | Services, effets, construction du SDK public, catalogue de services publics                                                                                                                                                                                                         | Plus de capacités commerciales sous forme de services                                                                                                      |
| Surveillance | monitoring.v1/telemetry.v1, HTTP windows/histograms, statistiques du site et en ligne, logs limités, audits et lectures d’utilisation durables, diagnostic des queues, état de santé, snapshots d’instances Redis et transport web pour l’administrateur | Les historiques à long terme/alertes appartiennent aux extensions ; les vérifications du réseau fournisseur externe ne sont pas exécutées ; l'acceptation npm/production reste distincte. |
| Gestion de la stockage des plugins | Déclaration requise, transactions/schema SQL liées à l’installation, objets privés immuables, identifiants chiffrés exclusivement pour le serveur, protection contre la génération de données et nettoyage durable des objets.                                                                                                                          | Les espaces de travail, gestion des tâches commerciales en cluster et isolation de processus plus robuste ; voir [contrat de stockage](plugin-horizontal-scaling.fr.md) |
| Fichiers et documents    | Snapshots publiques natives et lecture de la traversée des bibliothèques, pagination des ressources prise en compte des permissions, contrat des fichiers publiques, autorisation de téléchargement des bindings, idempotence du création durable, construction des paquets SDK                                                                       | Acceptation complète d’un ensemble de fonctionnalités de documents indépendants. Les objets de fichiers de réserve sont récupérés à un rythme déterminé.                               |
| Utilisateurs                  | Vérification et lecture automatique de la recherche, du résolution et de la sélection de dossiers en tenant compte des politiques, calibration par pages, création d’événements par l’utilisateur dans une transaction, statut et certains événements de profil                                                                                                   | Suppression de l’utilisateur et nettoyage asynchrone avant l’ouverture de l’entrée de suppression. De plus, vérifications supplémentaires des entrées de profil.                                                  |
| Intersection           | Registre de relations internes partagées/extensions, sources de relations paginées, vérification des faits actuels, timeout et refus de déconnexion                                                                                                                                         | Le plugin conserve son propre indice de relation incrémentielle.                                                                                 |
| Client                 | Commandes/vues/emplacements optionnelles, client public tapé, dialogues/développeurs/barre latérale et slots Web home/document/librairie/fichier, chargement dynamique du Web, WebView mobile scindé par espace de travail, navigation configurable, isolation de la rendu, cache natif persistant et sauvegarde/partage d’attachement | Contrats de sélection/insertion/thème ; acceptation par le client indépendant et le dispositif réel                                                          |
| Éléments de document      | Registre Web optionnel, types SDK publics, codec/configuration atomique intégrée riche, commandes de feuille entière de cellule canevas/native, placeholders inconnus de version opaque, exemple de comptage à rebours/actualités indépendant                                                                   | Blocs généraux, API de mutation arbitraire de l’éditeur, exportation sans perte entre différents formats et acceptation sur le dispositif natif.                                    |
| AI                     | Outils/compétences publiques et exécution du MCP, serveur `ai.continuations.v2`, paramétré `host.ai.open` Sur Web/native, utilisation brute, conversion entre taux de modèle et utilisation réelle, politique d’admission, événements de règlement durables                                                                                                                  | Réservations et compensation en cas d’échec, plus de dimensions d’utilisation ; acceptation du appareil de démarrage natif                                 |
| Activité récente        | activité.v1 enregistrement source, visites appartenant à une extension, navigation avec curseur fusionnée, ouverture avec vérification des permissions                                                                                                                                                              | Le stockage et le nettoyage des visites spécifiques au plugin appartiennent au plugin ; voir [intégration](plugin-activity.fr.md)                                       |
| Recherche et connaissances   | Contenu.v1 sources, récupération de contenu mondial, abonnements/planification des connaissances existantes, empreintes de bloc, interface utilisateur de configuration des sources et protections contre les contenus dérivés                                                                                                   | Intégration et acceptation indépendantes de la source de courrier ; les connexions de collaboration déjà ouvertes ne peuvent être annulées immédiatement.                 |
| Courrier électronique                   | Source hôte, pont, base de données, outils, entrée web et mobile, et tests d’affaires supprimés                                                                                                                                                                              | Une extension de messagerie future est développée et acceptée de manière autonome.                                                                                   |
| Membreship             | Backend, interface utilisateur et définitions des données commerciales supprimées                                                                                                                                                                                                                | Vérification combinée                                                                                                                       |
| Modération             | Routes, travailleurs, domaines d’activité et restrictions de lecture supprimées                                                                                                                                                                                                      | Une extension commerciale future                                                                                                                    |

Ordre : SDK public et répertoire d’installation, chargement du runtime web et vérification indépendante des paquets, extensions utilisateur, permissions et IA, messagerie sur les interfaces publiques, suppression de membres et de la modération, puis acceptation de l’upgrade combiné. Mettre à jour cette table à chaque étape. Une capacité non implémentée ne doit pas apparaître dans un exemple de tutoriel qui prétend fonctionner.

Le [transfert de courrier](plugin-mail-handoff.md) Enregistre les interfaces et les acceptations historiques. Ses anciennes directives de stockage auto-gérées sont remplacées par le contrat de stockage géré approuvé.

<a id="_13-delivery-grades"></a>
<a id="13-delivery-grades"></a>

## 13. Niveaux de livraison

- Le contenu hôte, les services de fichiers et les hooks d'intégration publique conservent leurs limites existantes. Les modèles de business, les permissions, les tentatives de récupération et les sémantiques de sortie restent propriétaires du plugin ; la persistance est toujours gérée par l'hôte.
- Déclaration de paquet requise `doca.storage: "host"` Il est vérifié avant l’import du code serveur pour les installations via ZIP/npm/store, l’import des dossiers hors ligne et la restauration du démarrage. Les valeurs manquantes ou différentes échouent. Aucun environnement variable de dossier de données de plugin, sélecteur de serveur, adaptateur legacy ou migration implicite des données n’est pris en charge.
- La gestion de l’stockage relationnel et des objets privés est exportée dans SDK 0.1.7. Les identifiants sont exportés dans la source SDK 0.1.9 ; des travaux temporaires restent à réaliser. Le choix du serveur et le déploiement partagé appartiennent au hôte ; les plugins ne font jamais de distinction entre local et distant. Leur état exact d’exportation est indiqué dans le contrat de stockage et dans la section 12.
- Les nouveaux magasins gérés acceptent uniquement la structure déclarée ; les écarts entraînent l’interdiction de l’activation. Ne créez pas de magasins vides pour les installations auto-gérées existantes, ni n’utilisez l’option “désinstaller” pour contourner un plan de migration. Les anciens paquets et données restent intacts ; toute conversion nécessite un accord séparé.
  La gestion du nettoyage des bases de données/premières privées incombe au hôte. Lors de l’uninstallation réussie du service, la transaction du registre sépare la génération actuelle et envoie le nettoyage des tables/premières privées avec des tentatives de récupération durables. Le nettoyage des credences et la séparation de la génération sont implémentés ; le drainage des tâches de service du cluster reste indisponible. Les fichiers utilisateur et autres références de service sont conservés. Une défaillance du hook laisse l’installation intacte ; les effets des hooks externes ne peuvent pas être annulés. Toutes les instances nécessitent encore un redémarrage manuel.
- Santé, logs redactés, erreurs récentes dans les tâches et retard sont résumés via des interfaces de statut public, et non par des extensions qui lisent les chemins de stockage du hôte.

Non fourni : SQL arbitraire, transactions distribuées entre plugins/hôtes, import automatique des anciens stockages/écritures doubles, accès AI par défaut à toutes les sources, ou code de plugin npm exécuté dynamiquement par le processus natif.

<a id="_14-plugin-owned-recent-activity"></a>
<a id="14-plugin-owned-recent-activity"></a>

## 14. Activité récente liée au plugin

`activity.v1` est exporté par `activityServiceToken` dans `plugin-sdk/platform`. Une source fournit `list` et `get`, labels de type localisés et un icône supportée. L’hôte ne conserve pas les visites de plugins. Les données de visite de base existantes restent intactes. L’inscription est limitée à une instance et est détruite avec le plugin ; la liste et l’ouverture nécessitent une instance actuelle. `activity.read` autorisation. Le [contrat d’activité](plugin-activity.fr.md) Definit une ordre strict des clés, des requêtes bornées, une isolation des échecs, le comportement du curseur et un rollback sans migration de données.

<a id="_15-content-and-native-implementation"></a>
<a id="15-content-and-native-implementation"></a>

## 15. Contenu et implémentation native

Le SDK source est exporté `content.v1` à travers `plugin-sdk/content`Liste requise/read/resolve, recherche optionnelle, validation complète de l’inventaire, et lecteurs de documents/fichiers intégrés. Les abonnements de connaissances réutilisent le stockage et les calendriers existants, comparent les empreintes numériques des blocs et lit/analyse uniquement les éléments modifiés. L’interface de configuration et les protections du contenu dérivé en temps réel couvrent les nouvelles lectures, listes et récupération de réponses. Aucun adaptateur knowledge.sources.v1, conversion de base de données ou migration de schéma n’est ajouté. L’intégration indépendante par e-mail et l’acceptation des appareils natifs restent requis. [Limites de contrat et de mise en œuvre](plugin-content.fr.md).

Le conteneur natif fournit désormais une stockage persistant par origine/utilisateur/plugin et permet le sauvegarde/partage d’attaches authentifiées. `PluginWebHost.native`Une vérification native et un client de messagerie reconstruit indépendamment sont encore nécessaires. [Contrat natif](plugin-native.fr.md).

<a id="creation-resources-sdk-015"></a>

## Ressources de création (SDK 0.1.5)

[Modèle/contrat de matériel](creation-resources.fr.md) Définit les registres de fournisseurs sans paramètres, le matching des consommateurs versionné, les tags/recherche/pagination, l’import de matériel, l’initialisation des documents, les clients publics et les pickers injectés. La table de modèle retirée est conservée sans migration ou enregistrement par défaut ; les anciennes API de modèle et la création de templateId sont supprimées conformément au plan convenu. La gestion des fournisseurs externes et des ressources de magasin reste une tâche distincte.

La révision de source 0.1.6 ajoute des descriptions de sources nommées, des sources multiples. `providerIds`, fournisseur détenu par des propriétaires `retrieve`, métadonnées de source dans les résultats et les callbacks de sélection, ainsi que les outils de découverte/recherche de source par l’IA. La modification de requête convenue rejette le premier cas singulier. `providerId`; les références de ressources conservent leur `providerId` Et les données stockées restent inchangées. La récupération non supportée ne parcourt jamais les pages de navigation. Voir la version actuelle [protocole de ressources](creation-resources.fr.md)La vérification de la source ne signifie pas que le contenu est publié sur npm.

<a id="plugin-document-elements-2026-10-02-sdk-016-source"></a>

## Éléments de document de plugin (2026-10-02, source SDK 0.1.6)

Le bundle Web optionnel `elements` registrement et `@smartdoca/plugin-sdk/editor-elements` Elles sont implémentées pour les éléments atomiques intégrés riches et les visualisations de canevas de cellule entière sur feuille de calcul. Les formulaires de configuration sont soumis via des opérations natives propres au hôte et l’annulation ; il n’existe pas de gestionnaire d’éditeur public arbitraire. Les types/versions exactes inconnues affichent un placeholder d’erreur et conservent un JSON opaque, sans conversion, migration ou nettoyage. Aucun fournisseur n’est installé par défaut. Voir [le contrat d’élément exact](plugin-editor-elements.fr.md) et [l’exemple de comptage/actualités indépendant](../examples/plugin-elements/README.md)La publication sur npm, l’installation en production et l’acceptation sur les appareils natifs ne sont pas implicites.


Les collections de matériaux sont implémentées dans le code source SDK 0.1.9 : materials.v2 / fournisseurs de version 2, groupes de résultats distincts pour les matériaux/collections, pagination, tags et récupération indexée. Les métadonnées des collections ne intègrent jamais les membres. La version convenue ne comporte pas d’adaptateur materials.v1 ni de migration des fichiers/documents existants. La gestion des collections appartient aux fournisseurs qui utilisent une persistance gérée par le hôte public. Voir… [protocole de ressources](creation-resources.fr.md).

<a id="sdk-publication--2026-10-13"></a>

## Publication du SDK — 2026-10-13

`@smartdoca/plugin-sdk@0.1.11` Il est publié sur npm. Le consommateur de dépendances du registre importe tous les 16 points d’entrée publics et vérifie les tokens de surveillance/telemetry ainsi que la version exacte du SDK. Cela ne constitue pas un plugin de surveillance de production ni une acceptation sur appareil natif.
