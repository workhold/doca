<a id="shared-plugin-business-database"></a>

# Base de données commerciale partagée avec plugin

[简体中文](plugin-database-isolation.zh-CN.md)

Tous les plugins partagent une base de données commerciale gérée par l'hôte, distincte de la base de données principale. PostgreSQL nécessite une configuration de base de données/conta pour le déploiement ; l'hôte crée automatiquement le schéma et les tables de chaque plugin. SQLite n'a besoin d'aucune configuration et crée automatiquement un fichier partagé. Les plugins continuent à utiliser les mêmes structures. `storage.sql.v1` SDK, version de schéma 1 et `dataVersion`, sans chaînes de connexion, pilotes ou chemins de fichier système.

<a id="configuration-and-isolation"></a>

## Configuration et isolation

SQLite est par défaut `<DOCA_SQLITE_PATH>.plugins.db`. `DOCA_PLUGIN_DATABASE_PATH` Sélectionne optionnellement un autre fichier local persistant. Le fichier a un mode 0600. Chaque table physique a… `plugin_<SHA256(plugin ID), first 56 hex>__` Préfixe ; les noms de table du SDK restent inchangés. Les hôtes en mémoire utilisent une base de données extension en mémoire partagée par connexion hôte. Faire une sauvegarde du fichier partagé ainsi que de la base de données principale et du stockage privé des fichiers. SQLite reste une option pour un seul hôte.

PostgreSQL utilise une base de données commerciale préparée par un opérateur et un compte de connexion. Les privilèges du compte sont choisis par l’opérateur de déploiement ; les comptes ordinaires, les superutilisateurs, les rôles dotés d’attributs administratifs ou de membreships, ainsi que le même compte utilisé pour les fonctionnalités de base, sont acceptés. Le compte doit être efficace. `CONNECT` et `CREATE` Privilèges sur cette base de données commerciale pour créer des schémas de plugins, plus `USAGE` et `CREATE` sur lui `public` schéma pour initialiser le marqueur partagé. Niveau de base de données `CREATE` ne donne pas un accès au niveau du schéma `CREATE`PostgreSQL 17/18 ne donne pas par défaut ces droits aux rôles ordinaires qui ne sont pas des propriétaires. Voir [Privilèges de schéma PostgreSQL](https://www.postgresql.org/docs/18/ddl-schemas.html#DDL-SCHEMAS-PRIV). Configurez-les une fois avant d’activer les plugins SQL :

```dotenv
DOCA_PLUGIN_DATABASE_URL=postgresql://doca_plugins:replace-me@postgres:5432/doca_plugins
DOCA_PLUGIN_DATABASE_POOL_MAX=4
```

Pour une nouvelle déploiement, les dispositions d'exemple de compte dédié suivantes préparent l'établissement. `psql` (Remplacer le mot de passe). Un compte déjà autorisé peut également être configuré directement :

```sql
CREATE ROLE doca_plugins LOGIN PASSWORD 'replace-me';
CREATE DATABASE doca_plugins;
REVOKE ALL ON DATABASE doca_plugins FROM PUBLIC;
GRANT CONNECT, CREATE ON DATABASE doca_plugins TO doca_plugins;
\connect doca_plugins
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO doca_plugins;
```

Pour une déploiement existant, conservez son rôle, la base de données et les données. Si les rapports d’initialisation manquent. `USAGE`/`CREATE` sur `public`, se connecter en tant qu’admin du base de données à **base de données commerciale extension** et courir `GRANT USAGE, CREATE ON SCHEMA public TO doca_plugins;`, en utilisant le nom de rôle configuré. Si vous créez un schéma de plugin, il y a une erreur de base de données. `CREATE`, accord `CREATE ON DATABASE doca_plugins TO doca_plugins` en tant que son propriétaire. Réessayer le démarrage après correction des permissions ; aucune désinstallation, réinitialisation ou conversion de données n’est nécessaire. Le hôte ne donne pas automatiquement des privilèges. Ces privilèges s’appliquent uniquement à la base de données professionnelle dédiée au plugin. Les marqueurs partagés existants ne nécessitent pas `CREATE` sur `public` Encore. Les chaînes de connexion/mots de passe et les erreurs SQL brutes restent cachées dans les réponses du plugin ; ces diagnostics de configuration de l'hôte corrigés sont rapportés explicitement.

Le présentateur crée automatiquement `plugin_<SHA256(plugin ID), first 56 hex>` Schémas sur la première déclaration. Chaque plugin partage un pool de connexions par instance hôte ; `DOCA_PLUGIN_DATABASE_POOL_MAX` C’est un entier compris entre 1 et 20, par défaut 4. Inclure ce pool, les pools de base/IA/webhook et le nombre d’instances dans le budget de connexion au serveur. Toutes les répliques doivent utiliser la même base de données commerciale partagée. Aucune base de données, rôle ou entrée de connexion n’est nécessaire lors de l’ajout d’un autre plugin. Les plugins sans stockage SQL n’ont pas besoin de cette URL.

La base de données commerciale configurée doit être distincte de Core, même si les deux URLs utilisent le même identifiant. L’hôte ne vérifie pas les attributs de rôle élevé, les membres de rôle ou les privilèges de la table Core, et ne modifie pas les permissions des comptes de base de données. Les opérateurs décident eux-mêmes si les comptes doivent être restreints grâce aux autorisations PostgreSQL. L’hôte ne crée pas de bases de données/roles et ne se tourne jamais vers le stockage Core. Les transactions PostgreSQL établissent un schéma local à la transaction ; les connexions groupées ne conservent pas le champ de scope d’un autre plugin. L’uninstall inspecte et supprime uniquement les tables déclarées et le marqueur d’installation du plugin supprimé ; les schémas et données des autres plugins ainsi que le stockage partagé restent intacts.

La politique de compte gérée par l’opérateur a été approuvée le 2026-10-16. Elle remplace le rejet des privilèges de compte utilisé dans les versions 0.1.26–0.1.29. Les déclarations, marqueurs, générations et versions de données du format-3 existants sont conservés sans conversion ; aucune donnée ou permission n’est modifiée lors de l’upgrade. Un rollback du hôte rétablit les anciennes restrictions de compte, ce qui peut entraîner un rejet à nouveau de l’authentification d’un administrateur. Il est conseillé de conserver la base de données, les données et la configuration existantes lors de la planification du rollback. La procédure d’upgrade vers le format-2 ci-dessous reste inchangée.

C’est une isolation via des services SDK propriétaires de l’hôte. Les plugins s’exécutent dans un processus Node.js fiable ; le partage du rôle commercial n’est pas un environnement de sandboxed ou un système d’exploitation.

Le noyau conserve les utilisateurs, les documents, les permissions, les audits de sécurité, l'utilisation brute de l'IA, les références du registre/archive des plugins, les enregistrements de nom de domaine, les identifiants chiffrés, les références aux objets privés et les intentions de gestion des objets durables. La propriété/permissions des fichiers et des identifiants, les instructions de création de base de données du noyau et `schema_baseline.id` reste inchangé.

<a id="exact-storage-format-and-lifecycle"></a>

## Format de stockage et cycle de vie exacts

Les déclarations de hôte utilisent le format 3`storageVersion: 3`, initialement `schema: null`). Le marqueur racine partagé est `_doca_shared_plugin_database` avec format 3. Chaque extension `_doca_plugin_store` Le marqueur enregistre son identifiant exact, sa génération, sa version de données et son schéma canonique. La validation du marqueur et l’inspection ciblée empêchent l’adoption de données non liées. Les fichiers partagés manquants, les espaces de noms ou les tables déclarées précédemment sont rejetés ; ils ne sont jamais ré créés en silence. Changer l’URL ou le fichier ne migre pas les données, et une remplacement vide est rejetée dès que le schéma a été enregistré.

La première déclaration verrouille le nom de espace core, crée le nom de espace plugin, les tables commerciales et le marqueur en une seule transaction commerciale, puis enregistre la déclaration dans la transaction core. Une tentative de répétition après une commit core interrompue accepte uniquement le marqueur commercial exactement commit et la structure réelle. Les différentes définition de schéma, types/valeurs par défaut/nullabilité, contraintes primaires/uniques et tables inattendues sont rejetées. Les callbacks de transaction utilisateur s'exécutent une seule fois et sont désactivés après l'achèvement. Une commit commerciale suivie d'une échec de commit core est un résultat incertain nécessitant l'idempotence/redémarrage commercial ; les callbacks ne sont pas réexécutés.

Le verrou du espace de noms central est maintenu grâce à la transaction commerciale, donc l’uninstallation attend les écritures approuvées. Le hook d’uninstallation commerciale s’exécute en premier. En cas de succès, la transaction du registre central bloque la génération, efface la sélection d’installation et les identifiants, et envoie en file d’attente la nettoyage des objets privés. Les fichiers utilisateur, les permissions, les reçus et les archives de sortie restent intacts. En cas d’échec du hook, l’installation reste intacte ; les effets des hooks externes ne peuvent pas être annulés.

Le nettoyage des données commerciales se fait en suivant la transaction principale, en utilisant la déclaration conservée comme intention durable. Les startups, les nettoyages périodiques, les tentatives d’uninstallation et d’installation sont répétés. Le nettoyage vérifie que la génération et le marqueur supprimés ont bien été éliminés avant de supprimer les tables déclarées. Les tables inconnues ou les marqueurs invalides rejettent le nettoyage sans suppression partielle. PostgreSQL laisse le espace de noms vide pour permettre des réessayages idempotent ; SQLite laisse le fichier partagé. La réinstallation attend le nettoyage, augmente la génération et crée des tables commerciales vides. Aucune transaction atomique distribuée ou tâche automatique de cluster n’est promise ; il est nécessaire de redémarrer chaque instance.

<a id="approved-upgrade-from-0125"></a>

## Mise à niveau approuvée depuis 0.1.25

Le propriétaire a approuvé **Un désinstallation normale de la version précédente suivie d’une réinstallation, sans migration des données du plugin.**. La version 0.1.25 utilise les fichiers et bases de données par plugin et le format 2. Les installations du format-2, y compris les plugins sans état, sont rejetées avant les écritures de réconciliation de base. Le format obsolète `DOCA_PLUGIN_DATABASE_DIR` et `DOCA_PLUGIN_DATABASES_JSON` Les paramètres sont explicitement rejetés. Il n’y a pas de lecteur de anciens fichiers, de conversion automatique des données, de fonction de écriture double ou de suppression automatique des bases de données/fichiers anciens.

1. Faire une sauvegarde de la base de données principale originale, de toutes les anciennes bases de données et fichiers de plugins, du stockage de fichiers privés, de la configuration et de la clé maîtresse des identifiants originale.
2. Lors de l’ancien hôte, on désinstalle normalement tous les plugins commerciaux externes et on résout toute nettoyage en attente. Cela fait disparaître délibérément leurs données commerciales privées, les identifiants chiffrés et les objets privés. On réconfigure les plugins et on réinitialise les comptes externes après réinstallation. Les données de base et les fichiers utilisateur ordinaires restent.
3. Arrêter toutes les instances hôtes. Supprimer les ancires paramètres par plugin. Pour PostgreSQL, provisionner/configurer une base de données commerciale partagée vide et un accès sélectionné par l'opérateur ; pour SQLite, utiliser le fichier partagé automatique ou configurer son chemin. Conserver les anciens stockages/backups comme preuve de récupération.
4. Déployer le nouveau hôte contre la base de données centrale existante, les fichiers ordinaires et la clé maîtresse originale. Réinstaller les plugins et redémarrer chaque instance. Le hôte se connecte automatiquement à chaque plugin à la base de données commerciale partagée, en commençant par des données commerciales privées vides.

Si l’uninstallation échoue, résolvez le problème sur l’hôte précédent. Si le démarrage rejette une installation résiduelle, retournez vers cet hôte pour terminer l’uninstallation ; ne réinitialisez jamais la base de données centrale. L’histoire des noms de domaine déjà supprimés reste, et une reinstallation explicite augmente sa génération. La gestion existante de l’histoire des noms de domaine nettoyés avant la version 0.1.25 reste inchangée ; elle ne lit pas les données commerciales anciennes. Résidu de colocation `plugin_<56 hex>` Les tables provenant de versions encore plus anciennes nécessitent toujours une revue et ne sont pas supprimées automatiquement.

Avant les nouvelles écritures, pour revenir à l’état pré-installation, il est nécessaire de synchroniser les sauvegardes originales de core/plugin/fichiers ainsi que le code et la configuration antérieurs. Les autorisations externes révoquées peuvent nécessiter un réenroulement. Après les nouvelles écritures, il faut conserver les nouveaux bases de données/fichiers et convenir d’un plan de restauration distinct ; restaurer les sauvegardes anciennes entraînerait la perte des données ultérieures. Les anciens hôtes ne peuvent pas lire le format 3. L’exploitation mixte de anciens et de nouveaux hôtes n’est pas supportée.

<a id="verification"></a>

## Vérification

`scripts/verify-plugin-database-isolation-upgrade.ts` crée des données de noyau retenues synthétiques et des données de plugin privé format-2 avec les versions réellement publiées `smartdoca/doca:0.1.25` Image. Elle vérifie le rejet sans modifier les lignes/declarations de base conservées, l’uninstallation normale de l’ancien hôte, la réouverture de la même base de données de base et l’installation à nouveau dans un stock partagé vide. Exécutez-la sur SQLite isolé et PostgreSQL 17/18. Les tests de stockage géré couvrent également les mêmes noms logiques entre plugins, le stockage physique/pool partagé, le redémarrage, les scopes concurrents, le rollback, les générations obsolètes, les stores manquants et la nettoyage répétable. Ces vérifications ne concernent pas la mise en production ou les opérations avec des versions mixtes.
