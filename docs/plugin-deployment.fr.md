<a id="install-and-deploy-plugins"></a>

# Installer et déployer les extensions

0.1.26 utilise un [base de données commerciale de plugin partagé](plugin-database-isolation.fr.md), séparé du noyau, avec des espaces de noms automatiques. Il remplace les bases de données par plugin publiées dans 0.1.25. L’upgrade nécessite une désinstallation normale sur l’hôte précédent et une réinstallation ; les données du plugin ne sont pas migrées.

[中文](plugin-deployment.zh-CN.md)

L’approbé [contrat de stockage géré](plugin-horizontal-scaling.fr.md) exige `doca.storage: "host"` et la persistance propriétaire par l’hôte. La rejetation statique, le SQL géré et les objets privés sont mis en œuvre. Les identifiants sont exportés dans la source SDK 0.1.8 ; les espaces de travail temporaires et le videment des tâches du cluster restent des lacunes. Les extensions ne choisissent pas de serveurs locaux/remotes ni ne reçoivent des dossiers de données commerciales.

Les administrateurs utilisent **Admin → Extensions** Pour naviguer dans le magasin officiel, télécharger un fichier ZIP local, installer, mettre à jour, activer, désactiver ou désinstaller des plugins. Les modifications sont sauvegardées comme installation souhaitée et prennent effet lors du prochain redémarrage de chaque instance. La page affiche la version en cours d'exécution de l’instance répondante indépendamment de l’objectif global. Une désinstallation actuelle appelle le hook de nettoyage commercial requis, puis efface le marqueur de structure. En cas d’échec du hook, l’installation reste intacte. Le nettoyage du magasin privé géré par l’hôte utilise la barrière de génération et les enregistrements de déchets d’objets durables ; les tâches commerciales de décharge restent non implémentées ; la suppression du système de fichiers de plugin est interdite. Les mises à jour d’un plugin installé nécessitent toujours les mêmes étapes. `doca.dataVersion`. Les extensions vérifient la structure réelle de la base de données lors de l’initialisation.

```dotenv
DOCA_PLUGIN_STORE_URL=https://store.smartdoca.cc
DOCA_PLUGINS_DIR=/data/plugins
```

L’adresse du magasin est une origine HTTP(S) configurable. Vérifiez séparément la disponibilité du service distant ; un magasin indisponible permet d’utiliser les plugins téléchargés et installés localement. Vide `DOCA_PLUGINS_DIR` retombe à `${DOCA_DATA_DIR:-./data}/plugins`, par rapport au répertoire de travail. Seul l'hôte configure le stockage de base de données/données durables. Il n'existe pas de variable d'environnement plugin business-data-directory ; les API plugin ne révèlent jamais si l'hôte stocke localement ou distantement.

Pour le déploiement Compose fourni, exécutez-le dans le dossier de déploiement :

```sh
docker compose restart doca
```

Ici, `doca` est le nom du service sous `services` dans `compose.yaml`; le nom du conteneur peut varier. Si vous avez renommé le service, remplacez `doca` dans la commande avec votre nom de service.

Redémarrez chaque instance dans un déploiement à plusieurs instances ; utilisez le superviseur approprié pour les autres types de déploiement. L’interface utilisateur ne redémarre pas les processus. Lors d’un redémarrage progressif, évacuez le trafic ou utilisez l’affinité si les API de plugin ont changé. La version V1 ne garantit pas des API de versions mixtes sans interruption de service.

<a id="implemented-storage-revision-2026-10-03-sdk-source-018"></a>

## Mise en œuvre de la révision de stockage (2026-10-03, source SDK 0.1.8)

`@smartdoca/plugin-sdk/storage` actuellement, les exportations sont liées à l’installation `pluginDatabaseToken` (`storage.sql.v1`) et `pluginObjectStorageToken` (`storage.objects.v1`). Le sous-ensemble de la base de données est une version de schéma explicite 1, avec des colonnes text/int32/double, des contraintes primaires/uniques, des opérations de sélection, d’insertion, de mise à jour et de suppression structurées, ainsi que des transactions avec des callbacks exécutés une fois. Le code source SDK 0.1.8 exporte également. `pluginCredentialToken` (`storage.credentials.v1`): CRUD chiffré uniquement pour le serveur, vérifications de métadonnées et de révisions. Voir [API de credences](plugin-credentials.fr.md). Les joints, les clés étrangères, le SQL générique, l’upsert et les espaces de travail ne sont pas exportés. Le SQL commercial utilise une base de données gérée par un hôte partagé, distincte du noyau : un fichier SQLite avec des préfixes de table, ou un URL/compte PostgreSQL avec des schémas d’extension automatiques et un pool de connexions partagé. L’isolation des processus reste non implémentée. Voir [Configuration de stockage et contrat d’uninstallation avant upgrade](plugin-database-isolation.fr.md).

Les bases de données logiques utilisent `plugin:<pluginId>`, attribution des fichiers utilisateurs et utilisation des objets privés `plugins/<pluginId>`, et les ZIP sont libérés `host/plugin-releases/<sha256>.zip`Les octets ZIP immuables complets sont stockés dans un fichier configuré dans l’environnement ; la base de données partagée contient la version 2 du registre, les références d’archivage et les index de hachage de fichiers fiables. Les accès au cache vérifiés ne font pas réduire à nouveau les téléchargements de ZIP. Toutes les instances sont redémarrées manuellement. Le nouveau niveau de base du hôte rejette les anciennes bases de données, formats ou packages SDK, tout en conservant leurs données, sans migration ni fallback. Voir [implémentation exacte et limites](unified-storage-implementation.md).

<a id="distribution-and-filesystem"></a>

## Distribution et système de fichiers

Toutes les instances utilisent la même base de données hôte. PostgreSQL est la solution de déploiement distribué. La base de données stocke un registre désiré atomique et des références d’archive immuables ; des ZIPs complets, y compris les uploads locaux, se trouvent dans le stockage de fichiers partagé configuré. Chaque instance dispose d’un cache privé écriture :

```text
/data/plugins/
  .releases/<sha256>/          verified immutable releases
  .staging/                   temporary extraction
  .imports/                   retained offline folder imports
```

Le service de démarrage vérifie chaque fichier contre l’archive partagée, restaure les fichiers manquants ou corrompus, et ne charge que les extensions après cela. Il ne installe jamais les dépendances npm, ne compile pas le code source et ne contacte pas la boutique. Une archive partagée manquante ou corrompue empêche le démarrage. Il est nécessaire de sauvegarder à la fois les métadonnées de la base de données partagée et les stockages de fichiers configurés contenant les versions immuables. Le hôte sauvegarde également les enregistrements des plugins gérés, les objets privés, les références de fichiers utilisateur et les identifiants. Les serveurs persistants multi-instances doivent être partagés ; un nom de dossier ne constitue pas une base de données distribuée.

Ne partagez pas de répertoire de cache de plugin entre les instances en ligne. L’installation sur une instance ne nécessite pas de copie manuelle vers une autre. Les ressources navigateur historiquement versionnées peuvent également être restaurées sur demande depuis les archives partagées pour gérer le routage du load-balancer.

Installation hors ligne : lorsque une instance est arrêtée, effectuer une mise à jour complète. `<DOCA_PLUGINS_DIR>/<plugin-id>/`Au démarrage, il est packé et publié dans le registre partagé, puis déplacé `.imports/`D’autres instances s’synchronisent au redémarrage. L’administration régulière devrait utiliser la soumission par ZIP. Il n’y a pas de manifeste npm root ni de chemin de compatibilité pour le chargement de sources.

Les codes postaux locaux et les codes postaux des magasins ont le même schéma et les mêmes vérifications. Utilisez-le. [protocole de stockage et spécification de paquet](plugin-store-protocol.fr.md)Les fichiers de programme, les données commerciales écritables et les identifiants doivent être séparés. Aucun script ne s’exécute pendant l’extraction. Toutes les dépendances de exécution doivent être fournies sous forme de fichiers réels ; les liens pnpm ne sont pas des artefacts distribuables.

<a id="lifecycle-and-retention"></a>

## Cycle de vie et conservation

L'hôte valide la plage SDK, les IDs identiques, la version des données et les dépendances des plugins avant d'importer le code. La configuration est globale ; l'identité et les permissions demandées restent entre les mains de l'hôte. La gestion effectue des vérifications de révision afin que les administrateurs en conflit réessayent plutôt que de surécrire l'un l'autre. Les opérations génèrent des événements d’audit de sécurité.

Désactiver et désinstaller s’applique à la reprise de service. Jusqu’alors, le processus ancien continue de gérer l’extension ancienne. Les caches de code anciens et les archives immuables sont conservés pour les instances en cours de fonctionnement et pour la réinstallation ; il n’y a pas de collecte automatique des archives dans la version 1. Désactiver/arrêter préserve l’état durable. Les attaches utilisateur, les contenu de documents, les références liées à d’autres entreprises et les reçus de fichiers ne sont pas supprimés automatiquement ; la nettoyage de l’état privé géré est à la charge de l’hôte et nécessite encore un coordonnateur de cluster. La suppression restaure la sélection de démarrage de l’instance répondante ; il s’agit d’une nouvelle modification globale de l’état souhaité, et non d’un retour en arrière instantané des autres processus.

Les échecs d’initialisation du plugin entraînent toujours l’arrêt du démarrage. Les échecs de compatibilité entre le SDK et les dépendances sont isolés comme décrit ci-dessous, ce qui permet la gestion du plugin. Il n’y a pas d’uninstall rapide, de tableau de bord de fin de cluster ni d’installation de code dynamique native sur mobile.

La validation utilise des bases de données isolées et des dossiers temporaires. Voir [acceptation du stockage](plugin-store-protocol.fr.md#cross-repository-acceptance).

<a id="compatibility-failure-isolation"></a>

## Isolation de la défaillance de compatibilité

Une plage de SDK incompatible ou une dépendance requise indisponible isole le plugin commercial concerné. Le hôte et les plugins non liés se lancent, et l’option Admin → Plugins explique la raison et demande une mise à jour. La sélection des plugins installés, les archives, les données commerciales et les identifiants sont conservés. Les anciens paquets ne sont pas convertis et le code SDK ancien n’est pas exécuté. Les nouvelles installations en ligne rejettent toujours les paquets incompatibles. Les dossiers d’installation complètement hors ligne conservent leur identité originale et subissent la même isolation.

Les paquets anciens ne déclarent pas statiquement toutes les politiques commerciales qu’ils enregistrent. Bien que cette instance dispose d’une extension activée mais indisponible, les requêtes couvertes par les vérifications de la politique d’extension retournent 503. Connexion, lecture et gestion des extensions restent disponibles. Mettez à jour vers un paquet compatible, ou désactivez explicitement les plugins affectés, puis redémarrez toutes les instances pour lever cette protection. Les sources de permissions manquantes des plugins continuent de refuser l’autorisation. Le code SDK incompatible ne peut pas exécuter les hooks d’uninstallation ; mettez à jour d’abord. Une mise à jour compatible en étapes ne peut pas être annulée pour revenir à un paquet SDK incompatible. Les paquets de remplacement doivent conserver dataVersion et la structure commerciale existante.

L’isolation est un état de diagnostic local à l’instance, et non une modification de schéma de registre ou de base de données. Les archives corrompues, les métadonnées invalides, les erreurs de fonctionnement du noyau et les erreurs liées au cycle de vie des données continuent de provoquer des échecs. Aucune migration de données ni aucun abaissement de l’application n’est impliqué.
