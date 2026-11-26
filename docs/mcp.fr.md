<a id="mcp-services"></a>

# Services MCP

[简体中文](mcp.zh-CN.md)

Doca expose ses outils d’assistance et les manuels de compétences aux clients externes `POST /api/v1/mcp`. Paramètres personnels → Le MCP gère les services qui agissent comme l’utilisateur connecté. Administrateur → Les services MCP de l’entreprise gèrent les intégrations qui mentionnent explicitement l’utilisateur actif. `userId` Dans chaque opération. Les tokens d’entreprise nécessitent un administrateur créateur actif ; ils ne héritent pas des permissions de ressources de ce créateur lorsqu’ils fonctionnent en tant qu’autre utilisateur.

Chaque service dispose d’un token indépendant, d’un bouton d’activation, d’une expiration optionnelle et d’un `all` ou `selected` octroi. `all` suit le catalogue des outils/compétences disponibles, y compris les ajouts ultérieurs. `selected` Il ne montre que les IDs de l’outil et des compétences enregistrés. Une attribution d’outil constitue un consentement tacite pour exécuter cette action ; elle ne modifie pas les ACL des ressources, les limites de stockage, les restrictions de téléchargement, l’état de l’utilisateur ou les politiques d’admission pour hôte/plugin. Une compétence ne donne jamais des permissions sur l’outil. Les manuels officiels, les plugins installés et les compétences personnelles activées sont filtrés pour l’utilisateur actif.

<a id="connect-a-client"></a>

## Connecter un client

Chaque service affiche un commande Codex. `config.toml`Exemples d’initialisation/découverte HTTP, ainsi qu’une instruction copiable pour que l’IA puisse l’installer. Les tokens ne apparaissent qu’après création/réinitialisation ; les listes contiennent uniquement leurs huit caractères finaux. La base de données stocke les hachages de tokens SHA-256. Ne mettez pas de token dans une URL ou ne le soumettez pas dans un fichier de configuration.

```toml
[mcp_servers.doca]
url = "https://docs.example.com/api/v1/mcp"
bearer_token_env_var = "DOCA_MCP_TOKEN"
```

Sélectionner `DOCA_MCP_TOKEN` Dans l'environnement qui lance le client. Pour la CLI :

```sh
codex mcp add doca --url 'https://docs.example.com/api/v1/mcp' --bearer-token-env-var DOCA_MCP_TOKEN
```

Une phrase pour une IA : « Installer un Streamable HTTP MCP nommé doca » `https://docs.example.com/api/v1/mcp`, lire son jeton porteur `DOCA_MCP_TOKEN`, puis vérifiez l’initialisation et listez les outils et compétences disponibles. Pour un service d’entreprise, ajoutez : « Passer le utilisateur cible » `userId` chaque fois `doca_*` opération.

Le Codex dispose de sa propre politique d’approbation des outils. L’interface utilisateur fournit également... **optionnel** Configuration non surveillée : `[mcp_servers.doca.tools.doca_call]` avec `approval_mode = "approve"`Utilisez cela uniquement lorsque vous avez l’intention de préautoriser l’utilisation par le client des actions accordées par le service. Les exemples de connexion par défaut ne le permettent pas. Voir [configuration officielle du MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli) et [Paramètres d’approbation des outils](https://learn.chatgpt.com/docs/config-file/config-reference).

<a id="discover-and-execute"></a>

## Découvrir et exécuter

1. Appeler `doca_tools` avec la tâche complète en `purpose`. Optionnel `resources`, `files`, `currentResourceId` et `currentFolder` Fournir un contexte explicite en utilisant les UUIDs de documents/fichiers existants. Les références de fichiers reçoivent la même image de données autorisée utilisée par l’assistant. Le résultat contient `contextId`, l’indépendant `taskId`, et un catalogue concis. Aucune conversation n’est créée.
2. Appeler `doca_describe_tools` avec cela `contextId` Et jusqu’à quatre IDs de outils pour obtenir leurs schémas d’entrée complets. Seules les schémas nécessaires pour l’opération suivante sont récupérés.
3. Lisez le manuel correspondant jusqu’à la fin. `doca_skills`/`doca_load_skill`, ou le standard `doca_skill` Prompt MCP. Ces informations consultent le catalogue actuel ; une compétence privée désactivée ne est plus disponible.
4. Appeler `doca_call` en séquentiel avec `contextId`, un nouveau UUID `requestId`, `tool` et `input`Les éditions natives utilisent la version actuelle `seq`, `epochId`ID et commandes fournis par les outils de document standard. Il s’agit de la même implémentation d’assistant, avec les mêmes codecs natifs, transactions, notifications et registre d’utilisation de l’IA originale lorsque un fournisseur Doca est effectivement appelé. L’utilisation du modèle client externe n’est pas inventée dans le registre de Doca.
5. Appeler `doca_context_close` Lorsque c’est terminé. Les documents/fichiers saisis restent en place. Les buffers de téléchargement en attente et l’état d’inspection visuelle locale sont libérés.

Les opérations personnelles sont omises `userId`L’approvisionnement est rejeté. Les opérations de l’entreprise doivent fournir l’UUID d’un utilisateur cible actif à chaque fois. Un contexte ne peut pas changer l’utilisateur effectif ou le service. La recherche, les lectures, les écritures et les téléchargements vérifient les permissions de l’utilisateur. L’audit enregistre le créateur du service, l’utilisateur effectif, le contexte, l’ID de la requête, l’outil et l’résultat, sans enregistrer les secrets d’entrée.

`requestId` Il assure une exécution au plus une fois dans son contexte. Un ID répété entraîne un conflit HTTP/tool avec son statut enregistré, et différents paramètres ne peuvent pas le réutiliser. Il ne rejoue pas le contenu privé enregistré ou ne réessaye pas aveuglément une écriture qui pourrait avoir été terminée. Vérifiez le ressource enregistrée avant d’effectuer une nouvelle écriture après un résultat incertain. Les workflows natifs et de fichiers normaux conservent leurs reçus durables existants.

<a id="files"></a>

## Fichiers

Le natif `file_browse`, `file_manage`, `file_folder_manage`, `file_read` et `file_create` Les outils restent disponibles. `file_download` maintient le sens de son assistant : récupérer un fichier web public **dans** Doca.

Pour les transferts de clients réels :

- `file_upload_begin`: nom de fichier, MIME, taille déclarée et valeur SHA-256 optionnelle ; maximum 20 MiB et limite d’utilisateur plus stricte si configurée.
- `file_upload_chunk`: base64 canonique, offset de byte continu ; maximum de chunk décodé 128 KiB.
- `file_upload_complete`Sauvegarder le téléchargement complet dans une boîte de données utilisateur avec UUID, ou `folderId:null` Pour le compte de l’utilisateur root. Les téléchargements sont liés au contexte de service et à l’utilisateur actif.
- `file_upload_abort`: libérer une téléchargement en attente.
- `file_content`: téléchargement autorisé de plage de bytes avec base64, SHA-256 pour le fichier complet/tronquée, version du fichier et `nextOffset`Transmettre cette même version aux blocs suivants ; rejeter les fichiers modifiés plutôt que de combiner les versions.

Ces méthodes réutilisent le service de fichiers hôte. Elles n’ont besoin ni de cookies de navigateur, ni de chemin de fichier serveur, et ne permettent jamais de contourner l’autorisation de téléchargement en transformant une URL de contenu en une URL de téléchargement.

<a id="transport-and-lifetime"></a>

## Transport et durée de vie

L’endpoint utilise HTTP Streamable sans état depuis la version 1.30.0 du SDK, avec des versions de protocole explicitement acceptées. `2025-11-25`, `2025-06-18` et `2025-03-26`L’initialisation doit indiquer une version supportée ; les demandes ultérieures doivent contenir `MCP-Protocol-Version`GET/DELETE renvoie des réponses 405 authentifiées. Les règles relatives aux hôtes existants s’appliquent, et une origine invalide est rejetée. Les protocoles HTTP+SSE et les anciens adaptateurs de tokens sont déprécisés et ne sont plus disponibles.

Les contextes d'exécution ont une durée de vie de 15 minutes en mode inactif, au maximum 16 contextes actifs/en attente par service et 128 par instance. Les appels au sein d’un même contexte sont séquentiels. Les accès aux outils/compétences, les tokens et les utilisateurs actifs sont vérifiés à nouveau ; le réinitialisation/revocation d’un token, l’inactivation d’un service ou l’arrêt de l’MCP personnel annulent les contextes en cours d’utilisation. La limite de requêtes HTTP est de 600 par minute par service, en utilisant le limiteur de taux d’utilisation du hôte. Les corps de requête sont limités à 1 MiB.

L'exécution du contexte et les preuves visuelles sont locales à l’instance. Un contexte actif est envoyé à la même instance. Après redémarrage, expiration ou routage vers une autre instance, un nouveau contexte est ouvert et les artefacts existants sont examinés ; aucune continuité automatique ou récupération des preuves visuelles n’est garantie. Les données de document natives restent dans le stockage durable normal. Les identifiants du fournisseur, les valeurs secrètes, les sessions de navigateur et les historiques de chat antérieurs ne sont pas exportés en configuration MCP.

<a id="execution-history-and-upgrade"></a>

## Historique d'exécution et mises à niveau

MCP et chat partagent les locations de tâches, les annulations, l’autorisation des ressources, les implémentations d’outils, les reçus d’opération, les faits d’utilisation du fournisseur et l’audit de sécurité. MCP crée un `ai_jobs` exécution avec NULL `session_id` et `model_id`; cela ne crée pas `ai_sessions` Rangées, messages de chat ou threads de mémoire. Les appels réels des fournisseurs conservent toujours leur modèle réel et leur utilisation. `ai_calls`.

Paramètres personnels → MCP → Historique d'exécution affiche les tâches de l'utilisateur actif, y compris les tâches de service d'entreprise exécutées par cet utilisateur. Il prend en charge les liens vers les ressources autorisées, l'état des appels, ainsi que la suppression ou la suppression du historique d'exécution fermé. La suppression de l'historique conserve les documents sauvegardés, les fichiers générés, les reçus d'opération, l'utilisation du fournisseur original et les faits d'audit de sécurité. Les images générées conservent les restrictions du dossier de sortie de l'IA et portent une indication explicite. `aiTaskId` lié, sans une boîte de conversation. Une tâche ne lit que ses propres reçus ; les associations de conversation NULL ne regroupent jamais des exécutions non liées.

Le propriétaire a approuvé la séparation directe le 2026-11-01. Les DDL actuels sont... `ai_jobs.session_id`, `ai_jobs.model_id` et les retenues `mcp_contexts.session_id` disponible via le réconcileur de colonne natif existant. Le nouveau `ai_task_resources` Le livre de comptes commence vide et est déclaré. `schemaEvolution`Il n’y a aucun remplissage ni aucun changement de génération de compatibilité. Les conversations, contextes, fichiers, subventions et lignes d’audit historiques restent inchangés, sont exclues des points d’entrée de chat et ne sont ni convertis ni repris. Les champs/tableaux installés précédemment restent protégés par l’empreinte installée.

Le source du SDK plugin version 0.2.0 expose `ai.v2` / `ai.continuations.v2`: `jobId` est nécessaire et `sessionId` Existe uniquement pour l'exécution basée sur la conversation. Reconstruisez les paquets de plugin. `sdkRange: "^0.2.0"`. Le hôte, le Web et les plugins doivent être mis à jour ensemble. Les anciens contrats de service et les plages de SDK sont rejetés ; il n’y a pas d’adaptateur d’interface ancienne ni de downgrade automatique. Conservez les sauvegardes de base de données/fichiers avant l’upgrade et préservez les écritures de tâches/fichiers suivantes pour une restauration examinée séparément avant de rétablir les fichiers d’application. Voir [vérification](verification/mcp-execution-decoupling-2026-11-01.md).

<a id="storage-and-retired-mcp"></a>

## Stockage et MCP retiré

Le propriétaire a approuvé l’arrêt de l’utilisation de la ancienne implementation inutilisée le 2026-10-20. `/ai/mcp-keys` Et l’adaptateur de quatre outils ancien est retiré. `doca_mcp_…` Les identifiants sont rejetés ; de nouveaux tokens sont utilisés `doca_mcp_v1_…`. L’inerte `ai_mcp_keys` Les tables/rows restent uniquement pour conserver les données stockées ; aucune lecture en temps de exécution n’est effectuée, et aucune identifiants ou autorisations n’est convertie.

`mcp_user_settings`, `mcp_services`, `mcp_contexts` et `mcp_tool_calls` des tables additives vides déclarées dans la DDL actuelle et `schemaEvolution`Les utilisateurs existants commencent avec le MCP personnel désactivé, car il n’y a pas de nouvelle ligne de paramètres ; l’utilisation du service d’entreprise est indépendante de ce paramètre. Les documents existants, les fichiers, les ACL, les sessions AI, les valeurs configurées et la génération de compatibilité sont conservés. Les rejets de revue structurelle et les erreurs de réconciliation ne provoquent aucune modification partielle et persistante. La suppression d’une table MCP installée précédemment entraîne une perte de données et ne se crée pas silencieusement à nouveau.

Conserver les sauvegardes pré-upgrade et effectuer l’upgrade du serveur/Web en même temps. Les anciens binaires ne respectent pas le nouveau contrat de token/grant/contexte. Il n’y a pas de rétrogradation automatique de l’application ni de suppression des données ; il est nécessaire de conserver les nouveaux enregistrements et de revoir la restauration avant de retourner à une déploiement plus ancien. Voir… [contrat d’amélioration de la base de données](database-schema-evolution.fr.md) et [preuves d’acceptation](verification/mcp-2026-10-20/README.md).
