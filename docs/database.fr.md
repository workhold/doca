<a id="database-reference"></a>

# Référence de base de données

[中文](database.zh-CN.md)

La génération actuelle de compatibilité est `doca-2026-10-12-book-payload-storage-v1`. [create-schema.ts](../packages/db/src/create-schema.ts) definit les tables, les index, les clés étrangères et les vérifications ; [schema.ts](../packages/db/src/schema.ts) definit les types de courbes ; [connection.ts](../packages/db/src/connection.ts) ouvre des connexions ; [transactions.ts](../packages/db/src/transactions.ts) Gère les transactions et les retours de conflit.

Les bases de données vides sont initialisées avec le schéma actuel. Le processus de démarrage compare le DDL actuel avec la structure installée et applique automatiquement les ajouts approuvés dans la génération de compatibilité supportée. Les différences destructrices et sémantiques entraînent l’élaboration d’un plan de revue avant les modifications persistantes ; la version la plus récente de l’environnement installé permet de distinguer les ajouts des champs existants qui ont été perdus. [contrat d’amélioration de la base de données](database-schema-evolution.fr.md) C’est la norme du projet pour le développement et la mise en place des bases de données à l’avenir. Disponible. `doca-2026-10-09-history-storage-v1` Les structures peuvent s’aligner sur la génération actuelle selon les règles approuvées, en conservant les anciennes lignes de données sans convertir les anciens corps de fichiers. Le détail `doca-2026-10-08-knowledge-books-v2` La génération première nécessite une mise à jour explicite de l’histoire hors ligne ; les générations antérieures ou interrompues restent verrouillées. Voir [exigences d’amélioration](deployment.fr.md#upgrade-from-0113)Conserver les données, les fichiers et la configuration. Le tableau document_templates existant est conservé sans opérations CRUD ni enregistrement automatique en tant que fournisseur de ressources ; voir [modèles et matériaux](creation-resources.fr.md).

<a id="connections-initialization-and-backup"></a>

## Connexions, initialisation et sauvegarde

SQLite permet les foreign_keys, WAL, busy_timeout=5000, et synchronous=FULL. Le développement de la source utilise `data/v1/doca.db`; Compose persiste `/data/doca.db` Dans doca_data. Un backup fiable doit inclure les WAL de manière cohérente ou utiliser une procédure de backup/checkpoint SQLite ; copier uniquement un fichier .db actuellement écrit est insuffisant.

PostgreSQL utilise pg avec un pool maximal par défaut de 10. Les opérateurs configurent son URL et son schéma via les paramètres de l’environnement. Des instances partagées de PostgreSQL, Redis et des stockages de fichiers accessibles sont nécessaires pour plusieurs répliques ; voir [scalage horizontal](horizontal-scaling.fr.md)Le soutien fourni par le conducteur et les vérifications isolées enregistrées ne remplacent pas l’acceptation basée sur la base de données réelle et le service objet.

L’hôte et les modules IA peuvent utiliser des connexions de base de données configurées séparément. Faire une sauvegarde de chaque base de données configurée, de chaque stockage de fichiers référencé et de chaque configuration de déploiement protégée, y compris la clé maîtresse des identifiants. Restaurer ces éléments de manière cohérente dans un environnement isolé avant la restauration en production.

<a id="identifiers-and-concurrency"></a>

## Identifiants et concurrence

- La plupart des IDs de ressources/comptes sont des chaînes de UUID aléatoires ; les digests de protocoles, les IDs de singleton et les clés d’opération utilisent leurs formats définis.
- Les horaires sont des chaînes ISO 8601 UTC. Conservez un format normalisé pour l’ordre.
- Les booléens entre bases de données utilisent des nombres entiers 0/1, généralement convertis en booléens API. Le JSON est stocké sous forme de texte comme il est déclaré.
- Version des métadonnées, révision de la configuration, révision de l’autorisation, séquence/époque de la collaboration et les reçus d’opération ont des significations distinctes ; ne les remplacez jamais l’un par l’autre.
- La suppression douce utilise la colonne deleted_at si elle est disponible ; toutefois, toutes les tables n’ont pas de colonne de suppression. Les clés composite, les index uniques, les clés étrangères et les transactions sérialisées assurent les contraintes pertinentes.
- Les requêtes JSON utilisent généralement le camelCase, tandis que les projections de ressources/bases de données peuvent utiliser le snake_case ; consultez. [API HTTP](api.fr.md).

<a id="resources-discovery-and-authorization"></a>

## Ressources, découverte et autorisation

Les ressources conservent à la fois l’identité du document et celle de la bibliothèque. Les formats incluent rich_text, markdown, feuille de calcul, canevas et présentation. owner_id identifie le seul propriétaire, indépendamment des subventions. access_mode est inherit/custom ; la visibilité est invited/requestable/authenticated/public. L’autorisation et la découverte sont séparées : les titres ou entrées de collection découvrables ne confèrent pas accès au contenu.

Les documents personnels ont un type=document, un identifiant_owner=utilisateur actuel, et pas de library_id ni de parent_id. Les bibliothèques ne peuvent pas être imbriquées. Un document a une seule localisation ; les parents doivent appartenir à la même bibliothèque et les chaînes de parents ne peuvent pas circuler en boucle. Les clés étrangères empêchent les références déconnectées, tandis que les transactions de base valident les règles de arbre entre lignes. Le SQL manuel peut encore violer les invariants et n’est pas une API supportée pour l’écriture de produits.

La clé de délivrance est `(resource_id,user_id,source_type,source_id)`Les permissions directes/liens/overrides parent et l’état actif/disactivé permettent l’évaluation actuelle des permissions. share_links et share_link_revocations enregistrent les générations de liens, l’accès et les faits de révocation. Les invitations, les demandes, les collections, les entrées et les billets modèlent leurs processus de travail distincts. Lisez [autorisations](permission-inheritance.fr.md) et [découverte](public-resource-discovery.fr.md) pour les règles exactes.

Les enregistrements last_editor_id/last_edited_at permettent la création réelle, la copie indépendante, le renommé et les mises à jour du corps effectif. Les lectures, la synchronisation inchangée et les modifications des permissions ne le réécrivent pas. Les visites sont personnelles et filtrées par l’accès et la suppression actuels. user_preferences utilise des conditions de version optimiste, avec une version par défaut=0 avant son premier enregistrement sauvegardé ; il ne partage pas la révision du profil.

<a id="content-references-and-collaboration"></a>

## Contenu, références et collaboration

Le contenu persistant utilise document_states/point de contrôle et document_updates ; éditeur/époques Markdown et reçus identifient les opérations ordonnées et éliminent les tentatives de répétition inutiles. document_versions stocke l'historique commercial avec les données de récupération. Codec, schéma, baseline, seq et epoch sont spécifiques à l'éditeur ; les cinq formats utilisent tous leurs chemins de persistance mis en œuvre. Voir [contrat de collaboration](collaboration-sdk-contract.fr.md), [guide sur la collaboration](collaboration.fr.md), et [intégration éditeur](editor-integration.fr.md).

Les références de document, les événements d’intégration, les événements en attente, les tâches de projection/courants de recherche, et les entrées de réconciliation séparent le contenu/autorisation autoritaire des index dérivés. Les références ne confèrent pas d’accès. Les paramètres de recherche/tâches, les empreintes de modèle et les entrées de réconciliation suivent l’état de configuration et de réparation sans dupliquer les secrets du modèle en texte brut. Une échec de projection ne doit pas provoquer une sauvegarde réussie du contenu.

Les commentaires conservent les relations racine/réponse, le corps/body_json, les ancres optionnelles de protocole actuel, l’état de résolution et de suppression. Le texte du commentaire/le contenu riche est affiché en toute sécurité. Les notifications comprennent des destinataires, des acteurs, des champs de déduplication/ticket, ainsi que des métadonnées optionnelles de plugin. Les enregistrements d’audit/de sécurité contiennent des métadonnées d’action plutôt que des corps de documents copiés. Voir [commentaires et notifications](comments-and-community.fr.md) et [authentification](authentication.fr.md).

<a id="files-and-plugin-state"></a>

## Fichiers et état de la extension

Les profils de stockage contiennent uniquement l’identifiant stable, l’état actif et la date de création. La configuration du backend et les identifiants proviennent de l’environnement ; il n’y a pas de colonnes de fournisseur/config ou de configuration de stockage écrite par l’administrateur dans cette version de base. Les assets et les objets de stockage de fichiers conservent des identités de stockage/objet stables ; les éléments de fichiers/voix/fichiers d’attache, les dérivés, les extraits et les reçus d’opération gèrent les fichiers et le traitement du contenu utilisateur. Les bytes de fichier sont séparés des lignes de base de données. Ne supprimez jamais un objet physique partagé si un document ou une ligne d’histoire qui le référence a été supprimé. Voir [stockage de fichiers](storage.fr.md).

Les espaces de noms du plugin lient plugin_id, namespace, data_version, generation, state et les définitions déclarées. Les tables commerciales SQL gérées se trouvent dans la base de données commerciale partagée distincte du plugin, avec des tables déclarées via le service de stockage du plugin plutôt qu’une liste fixe dans le Schema. Les objets privés, les enregistrements inutiles, les archives immuables, l’état du registre, les sessions WebView et les paramètres de navigation restent gérés par l’hôte. plugin_credentials stocke des valeurs chiffrées scellées avec namespace/generation/revision ; plugin_credential_keys stocke les empreintes de clé, et non la clé principale. Voir [stockage de l'extension](plugin-horizontal-scaling.fr.md) et [credences](plugin-credentials.fr.md).

<a id="ai-and-knowledge-workflows"></a>

## IA et flux de travail du savoir

Les sessions AI séparent les ressources mentionnées par l’utilisateur, les ressources explicitement approuvées, ainsi que les associations entre les données et les historiques ; seul le paramètre resource_ids n’autorise pas l’accès au modèle. Les tâches stockent les résumés des approuvations et les synthèses des paramètres, renoncent aux licences en attendant l’approbation, et reprennent les activités uniquement après vérification de la propriété authentifiée. Les appels AI conservent les faits d’utilisation originaux ; les modules de gestion comptable et de politique ne les remplacent pas. Les secrets, les compétences, les clés MCP, les notes, les reçus d’opération et les événements de session disposent de tables et de limites d’accès distinctes.

Les abonnements, les chunks et les liens de la source native conservent leur indexation et leur recherche. Les tables de livres de connaissances ci-dessous conservent des historiques de configuration éditable, les sources des contributeurs, les retours, les exécutions du workflow, les versions immuables et les tâches humaines. Les permissions de la source originale protègent tous les résultats dérivés. Les tables de curation et de Q&A anciennes ne figurent pas dans les bases de données récentes ; les archives anciennes ne sont jamais migrées ni supprimées.

Les services MCP utilisent quatre tables distinctes pour les changements d’utilisateur, les identifiants/crédits de service haché, les contextes d’exécution et les revendications de appel au maximum une fois. `ai_mcp_keys` Il est retiré et conservé uniquement pour préserver les données historiques ; le runtime ne le lit jamais. Voir [Services MCP](mcp.fr.md).

<a id="current-table-and-field-inventory"></a>

## Inventaire actuel des tables et des champs

L’inventaire ci-dessous reflète l’interface Schema actuelle. Les noms des champs sont listés de manière exhaustive ; les types SQL exacts, la possibilité de nullité, les valeurs par défaut, les clés primaires/uniques et les clés étrangères sont définis par le fichier create-schema.ts. Les propriétés optionnelles de TypeScript ne signifient pas que les colonnes SQL doivent être de type nullable. C’est une référence, et non une instruction pour créer ou modifier manuellement les tables.

| Table | Champs |
| --- | --- |
| `schema_baseline` | `id`, `created_at`, `structure_json` |
| `file_operation_receipts` | `plugin_id`, `user_id`, `operation`, `operation_key`, `request_hash`, `status`, `result`, `object_id`, `profile_id`, `object_key`, `cleanup_at`, `created_at` |
| `ai_session_resources` | `session_id`, `kind`, `resource_id`, `title`, `href`, `touched_at` |
| `ai_sessions` | `approved_resource_ids`, `mentioned_resource_ids`, `id`, `user_id`, `title`, `model_id`, `resource_ids`, `archived`, `revision`, `created_at`, `updated_at` |
| `ai_users` | `user_id`, `default_model`, `memory_enabled`, `memory_revision`, `lock_version` |
| `ai_notes` | `user_id`, `content`, `updated_at` |
| `ai_secrets` | `user_id`, `key`, `value`, `updated_at` |
| `ai_jobs` | `id`, `session_id`, `user_id`, `model_id`, `status`, `input`, `digest`, `result`, `error`, `lease`, `lease_until`, `attempts`, `cancelled`, `created_at`, `updated_at` |
| `ai_task_resources` | `job_id`, `kind`, `resource_id`, `title`, `href`, `touched_at` |
| `ai_operations` | `id`, `user_id`, `job_id`, `digest`, `result`, `created_at` |
| `ai_calls` | `id`, `user_id`, `job_id`, `model_id`, `model_snapshot`, `periods`, `state`, `input_tokens`, `output_tokens`, `cached_tokens`, `usage`, `created_at`, `updated_at` |
| `ai_skills` | `id`, `user_id`, `name`, `description`, `content`, `formats`, `enabled`, `revision`, `updated_at` |
| `mcp_user_settings` | `user_id`, `enabled`, `revision`, `updated_at` |
| `mcp_services` | `id`, `kind`, `owner_id`, `name`, `token_hash`, `token_hint`, `enabled`, `grant_mode`, `tool_ids`, `skill_ids`, `expires_at`, `revoked_at`, `revision`, `created_at`, `updated_at` |
| `mcp_contexts` | `id`, `service_id`, `user_id`, `session_id`, `job_id`, `instance_id`, `expires_at`, `closed_at`, `created_at` |
| `mcp_tool_calls` | `context_id`, `request_id`, `tool_id`, `input_hash`, `status`, `created_at`, `updated_at` |
| `ai_mcp_keys` | `id`, `user_id`, `name`, `token_hash`, `resource_ids`, `writable`, `expires_at`, `created_at` |
| `ai_session_events` | `session_id`, `seq`, `event_id`, `digest`, `type`, `payload`, `created_at` |
| `tickets` | `operation_json`, `id`, `kind`, `resource_kind`, `source_key`, `hidden_for_user_id`, `resource_id`, `user_id`, `initiator_id`, `status`, `role`, `message`, `created_at`, `updated_at`, `expires_at`, `reminded_at` |
| `ticket_events` | `operation_json`, `id`, `ticket_id`, `actor_id`, `status`, `message`, `created_at` |
| `registration_reviews` | `user_id`, `status`, `reviewer_id`, `message`, `created_at`, `updated_at` |
| `access_invitations` | `include_descendants`, `resource_id`, `user_id`, `role`, `state`, `version`, `invited_by`, `created_at`, `updated_at`, `expires_at`, `decided_by` |
| `invitation_history` | `include_descendants`, `resource_id`, `user_id`, `role`, `state`, `version`, `invited_by`, `created_at`, `updated_at`, `expires_at`, `decided_by`, `id` |
| `resource_collections` | `user_id`, `resource_kind`, `resource_id`, `created_at` |
| `resource_entries` | `user_id`, `resource_id`, `state`, `source`, `version`, `updated_at` |
| `pending_integration_events` | `id`, `type`, `payload`, `created_at` |
| `projection_cursors` | `id`, `revision` |
| `projection_jobs` | `lease_token`, `lease_until`, `status`, `plugin_id`, `max_attempts`, `id`, `kind`, `payload`, `revision`, `attempts`, `available_at`, `last_error` |
| `markdown_epochs` | `resource_id`, `epoch_id` |
| `editor_epochs` | `resource_id`, `epoch_id`, `baseline` |
| `editor_receipts` | `resource_id`, `epoch_id`, `message_id`, `digest`, `seq` |
| `markdown_receipts` | `resource_id`, `epoch_id`, `message_id`, `digest`, `seq` |
| `access_requests` | `operation_json`, `message`, `decision_message`, `id`, `resource_id`, `user_id`, `role`, `status`, `created_at`, `updated_at`, `decided_by` |
| `integration_events` | `id`, `seq`, `type`, `payload`, `created_at` |
| `distribution_settings` | `id`, `config`, `revision` |
| `document_references` | `source_id`, `target_id` |
| `user_card_settings` | `id`, `config`, `revision` |
| `share_links` | `include_descendants`, `max_members`, `revoked`, `revoked_at`, `resource_id`, `token`, `token_hash`, `generation`, `revision`, `role`, `enabled`, `expires_at`, `created_by`, `created_at` |
| `share_link_revocations` | `resource_id`, `share_id`, `revoked_by`, `revoked_at`, `revoked_user_ids` |
| `document_versions` | `recovery_json`, `id`, `resource_id`, `seq`, `checkpoint`, `title`, `author_id`, `created_at` |
| `document_version_archives` | `id`, `resource_id`, `seq`, `title`, `author_id`, `created_at`, `is_ai`, `store_id`, `object_key`, `size`, `sha256`, `archive_version`, `archived_at` |
| `document_history_archive_operations` | `resource_id`, `snapshot_id`, `store_id`, `object_key`, `size`, `sha256`, `batch_json`, `created_at` |
| `document_history_garbage` | `store_id`, `object_key`, `created_at` |
| `visit_events` | `id`, `resource_id`, `user_id`, `created_at` |
| `account_settings` | `id`, `config`, `revision` |
| `login_identifiers` | `value`, `user_id`, `kind`, `active` |
| `user_contacts` | `user_id`, `kind`, `value`, `verified_at`, `verification_source` |
| `account_flows` | `id`, `kind`, `user_id`, `data`, `expires_at` |
| `verification_challenges` | `id`, `binding`, `destination`, `kind`, `purpose`, `digest`, `attempts`, `consumed`, `created_at`, `expires_at` |
| `security_audit` | `id`, `actor_id`, `user_id`, `action`, `details`, `created_at` |
| `auth_providers` | `profile_config`, `protocol_config`, `id`, `type`, `name`, `issuer`, `client_id`, `credential_ref`, `enabled`, `version` |
| `auth_identities` | `id`, `user_id`, `provider_id`, `subject`, `display_name`, `created_at` |
| `auth_flows` | `intent`, `id`, `browser_hash`, `provider_id`, `provider_version`, `verifier`, `nonce`, `user_id`, `session_id`, `expires_at`, `stage`, `identity` |
| `document_states` | `resource_id`, `codec`, `checkpoint`, `checkpoint_seq`, `seq`, `text`, `updated_at` |
| `document_updates` | `resource_id`, `seq`, `data`, `author_id`, `created_at` |
| `search_settings` | `id`, `enabled`, `endpoint`, `index_name`, `updated_at`, `image_recognition_enabled`, `image_policy_version`, `reconcile_interval_hours`, `generation`, `ai_min_score` |
| `search_embedding_task` | `id`, `operation_id`, `endpoint`, `index_name`, `embedder_name`, `task_uid`, `status`, `updated_at` |
| `search_embedding_models` | `id`, `endpoint`, `index_name`, `embedder_name`, `model_id`, `fingerprint`, `operation_id`, `applied`, `document_template`, `document_template_max_bytes`, `applied_at` |
| `search_reconciliation` | `id`, `generation`, `round_id`, `phase`, `cursor`, `remote_offset`, `scanned`, `differences`, `started_at`, `checked_at`, `completed_at`, `next_at`, `lease_token`, `lease_until`, `last_error` |
| `search_reconcile_entries` | `id`, `round_id`, `content_hash`, `pending` |
| `storage_profiles` | `id`, `active`, `created_at` |
| `file_storage_objects` | `id`, `profile_id`, `object_key`, `sha256`, `size`, `mime`, `category`, `ai_description`, `ai_status`, `ai_model`, `ai_generated_at`, `created_at` |
| `file_derivatives` | `id`, `source_id`, `profile_id`, `object_key`, `kind`, `recipe`, `mime`, `size`, `created_at` |
| `file_extracts` | `storage_object_id`, `status`, `result`, `error`, `updated_at` |
| `folder_publications` | `folder_id`, `enabled`, `revision` |
| `folder_entries` | `folder_id`, `user_id`, `state`, `updated_at` |
| `file_folders` | `storage_namespace`, `id`, `owner_id`, `parent_id`, `name`, `version`, `created_at`, `updated_at`, `deleted_at`, `delete_batch` |
| `file_folder_shares` | `folder_id`, `user_id`, `role`, `version`, `created_at`, `updated_at` |
| `file_folder_share_links` | `folder_id`, `token`, `token_hash`, `role`, `enabled`, `created_by`, `created_at`, `updated_at`, `max_members`, `expires_at`, `revision` |
| `file_folder_link_members` | `folder_id`, `token_hash`, `user_id`, `created_at` |
| `file_folder_invitations` | `id`, `folder_id`, `user_id`, `role`, `state`, `invited_by`, `message`, `created_at`, `updated_at` |
| `file_items` | `storage_namespace`, `id`, `owner_id`, `parent_type`, `parent_id`, `storage_object_id`, `name`, `mime`, `size`, `metadata`, `ai_description_override`, `locked`, `version`, `created_at`, `updated_at`, `deleted_at`, `delete_batch` |
| `file_bindings` | `id`, `file_id`, `owner_plugin`, `owner_type`, `owner_id`, `role`, `created_at` |
| `file_recognition_settings` | `id`, `config`, `revision` |
| `assets` | `uploaded_by`, `id`, `owner_id`, `resource_id`, `purpose`, `profile_id`, `object_key`, `filename`, `mime`, `size`, `created_at`, `deleted_at` |
| `workspace_activity` | `user_id`, `resource_kind`, `resource_id`, `visited_at`, `favorite` |
| `resource_visits` | `user_id`, `resource_id`, `visited_at` |
| `user_preferences` | `avatar_asset_id`, `user_id`, `avatar`, `theme`, `density`, `default_sort`, `sort_order`, `version` |
| `user_presence` | `user_id`, `last_seen_at` |
| `users` | `profile_metadata`, `profile_revision`, `public_id`, `directory_mode`, `id`, `login`, `display_name`, `password_hash`, `admin`, `status`, `created_at`, `last_login_at` |
| `sessions` | `id`, `user_id`, `expires_at` |
| `plugin_webview_auth` | `id`, `kind`, `plugin_id`, `parent_session`, `expires_at` |
| `navigation_settings` | `id`, `revision`, `draft`, `published` |
| `settings` | `directory_mode`, `id`, `registration`, `revision`, `site_name`, `site_logo`, `default_locale`, `default_timezone`, `registration_review`, `sso_registration`, `social_registration` |
| `resources` | `permission_overrides`, `content_bytes`, `authz_revision`, `history_readers`, `discoverable`, `last_editor_id`, `last_edited_at`, `cover_asset_id`, `page_width`, `id`, `kind`, `format`, `title`, `owner_id`, `library_id`, `parent_id`, `tree_order`, `access_mode`, `visibility`, `requests_enabled`, `share_links_enabled`, `public_role`, `version`, `deleted_at`, `delete_batch`, `created_at`, `updated_at` |
| `document_templates` | `id`, `format`, `title`, `content`, `preview`, `created_by`, `created_at`, `updated_at` |
| `grants` | `include_descendants`, `source_type`, `source_id`, `source_resource_id`, `status`, `created_by`, `created_at`, `updated_at`, `resource_id`, `user_id`, `role` |
| `comments` | `body_json`, `anchor`, `id`, `resource_id`, `author_id`, `body`, `parent_id`, `resolved`, `deleted_at`, `version`, `created_at`, `updated_at` |
| `reactions` | `resource_id`, `user_id`, `kind`, `created_at` |
| `plugin_notifications` | `notification_id`, `plugin_id`, `resource_type`, `resource_id`, `title`, `body`, `path`, `request_hash`, `withdrawn_at` |
| `notifications` | `ticket_id`, `actor_id`, `comment_id`, `dedupe_key`, `id`, `user_id`, `resource_id`, `type`, `read_at`, `created_at` |
| `plugin_storage_namespaces` | `plugin_id`, `namespace`, `data_version`, `generation`, `state`, `definition`, `created_at` |
| `plugin_object_garbage` | `id`, `store_id`, `object_key`, `created_at` |
| `plugin_credential_keys` | `id`, `fingerprint`, `created_at` |
| `plugin_credentials` | `plugin_id`, `namespace`, `generation`, `id`, `revision`, `sealed`, `created_at`, `updated_at` |
| `plugin_private_objects` | `plugin_id`, `generation`, `id`, `store_id`, `object_key`, `mime`, `size`, `sha256`, `created_at` |
| `plugin_registry` | `id`, `revision`, `state` |
| `plugin_archives` | `sha256`, `plugin_id`, `version`, `store_id`, `object_key`, `size`, `file_index`, `created_at` |
| `audit_events` | `id`, `actor_id`, `resource_id`, `action`, `created_at` |
| `user_page_state` | `user_id`, `key`, `value`, `version`, `updated_at` |
| `knowledge_chunks` | `id`, `source_kind`, `source_id`, `ordinal`, `title`, `text`, `anchor`, `content_hash`, `reader_ids`, `updated_at` |
| `knowledge_links` | `id`, `from_kind`, `from_id`, `to_kind`, `to_id`, `relation`, `score`, `reason`, `created_at` |
| `knowledge_link_hides` | `user_id`, `link_id`, `created_at` |
| `knowledge_feedback` | `id`, `user_id`, `chunk_id`, `judgment`, `query`, `created_at` |
| `knowledge_source_groups` | `config`, `id`, `library_id`, `title`, `source_kind`, `created_at` |
| `knowledge_subscriptions` | `name`, `group_id`, `id`, `creator_id`, `library_id`, `source_kind`, `source_id`, `url`, `source_version`, `status`, `created_at` |
| `knowledge_gaps` | `id`, `user_id`, `query`, `status`, `detail`, `created_at` |
| `webview_tickets` | `id`, `user_id`, `expires_at` |
| `qr_logins` | `id`, `secret_hash`, `user_id`, `expires_at` |
| `push_devices` | `id`, `user_id`, `token`, `platform`, `created_at`, `updated_at` |
| `knowledge_book_batch_checkpoints` | `id`, `book_id`, `run_id`, `node_id`, `stage`, `phase`, `scope_hash`, `plan_hash`, `batch_key`, `input_hash`, `result_ref`, `root_kind`, `root_sha256`, `raw_sha256`, `raw_size`, `access_manifest`, `summary`, `created_at`, `updated_at` |
| `knowledge_book_payload_objects` | `book_id`, `kind`, `sha256`, `store_id`, `object_key`, `stored_sha256`, `size`, `raw_size`, `state`, `created_at`, `updated_at` |
| `knowledge_book_payload_edges` | `book_id`, `parent_kind`, `parent_sha256`, `child_kind`, `child_sha256` |
| `knowledge_book_payload_references` | `book_id`, `owner_kind`, `owner_id`, `node_id`, `root_kind`, `root_sha256`, `raw_sha256`, `raw_size`, `access_manifest`, `summary`, `created_at`, `updated_at` |
| `knowledge_book_payload_operations` | `id`, `book_id`, `owner_kind`, `owner_id`, `node_id`, `expected_sha256`, `definition`, `lease_id`, `lease_until`, `state`, `created_at`, `updated_at` |
| `knowledge_books` | `id`, `revision`, `configuration`, `published_release_id`, `created_at`, `updated_at` |
| `knowledge_book_configurations` | `book_id`, `revision`, `configuration`, `author_id`, `created_at` |
| `knowledge_book_sources` | `id`, `book_id`, `title`, `creator_id`, `revision`, `configuration`, `status`, `created_at`, `updated_at` |
| `knowledge_book_source_versions` | `source_id`, `revision`, `title`, `configuration`, `status`, `author_id`, `created_at` |
| `knowledge_book_feedback` | `id`, `book_id`, `author_id`, `revision`, `detail`, `status`, `created_at`, `updated_at` |
| `knowledge_book_feedback_versions` | `feedback_id`, `revision`, `detail`, `status`, `author_id`, `created_at` |
| `knowledge_book_runs` | `id`, `book_id`, `actor_id`, `configuration_revision`, `configuration`, `input_hash`, `status`, `lease_id`, `started_at`, `heartbeat_at`, `artifact`, `error`, `trigger_key`, `created_at`, `updated_at` |
| `knowledge_book_node_runs` | `run_id`, `node_id`, `type`, `status`, `input_refs`, `output`, `error`, `started_at`, `completed_at` |
| `knowledge_book_releases` | `id`, `book_id`, `run_id`, `revision`, `artifact`, `created_at` |
| `knowledge_book_human_tasks` | `id`, `book_id`, `run_id`, `node_id`, `kind`, `title`, `status`, `revision`, `input_hash`, `resolution`, `created_at`, `updated_at` |
| `browser_clipper_web_sessions` | `connection_id`, `user_id`, `installation_id`, `website_session_id`, `token_hash`, `expires_at`, `created_at`, `updated_at` |
| `browser_clipper_login_codes` | `code_hash`, `connection_id`, `website_session_id`, `challenge`, `expires_at`, `consumed_at`, `created_at` |
| `browser_clipper_profiles` | `id`, `user_id`, `name`, `enabled`, `is_default`, `strategy`, `library_id`, `parent_id`, `target_id`, `title_template`, `ai_instruction`, `revision`, `created_at`, `updated_at` |
| `browser_clipper_connections` | `id`, `user_id`, `name`, `token_hash`, `token_hint`, `assistant_enabled`, `revoked_at`, `expires_at`, `revision`, `created_at`, `updated_at` |
| `browser_clipper_activations` | `id`, `connection_id`, `secret_hash`, `connection_revision`, `expires_at`, `consumed_at`, `created_at` |
| `browser_clipper_receipts` | `user_id`, `request_id`, `connection_id`, `input_hash`, `profile_id`, `profile_json`, `payload_json`, `images_json`, `status`, `resource_id`, `expires_at`, `created_at`, `updated_at` |
| `browser_clipper_assistant_sessions` | `session_id`, `connection_id`, `user_id`, `profile_id`, `profile_revision`, `resource_ids`, `job_ids`, `created_at` |
| `desktop_auth_flows` | `id`, `challenge`, `code_hash`, `user_id`, `browser_session_id`, `expires_at`, `created_at` |
| `desktop_sessions` | `id`, `user_id`, `device_name`, `created_at`, `revoked_at` |
| `group_directory_policies` | `id`, `user_id`, `mode`, `revision` |
| `user_groups` | `id`, `owner_id`, `name`, `avatar`, `revision`, `dissolved_at`, `cleaned_at`, `created_at`, `updated_at` |
| `user_group_members` | `group_id`, `user_id`, `role`, `joined_at` |
| `user_group_invitations` | `id`, `group_id`, `user_id`, `invited_by`, `state`, `expires_at`, `created_at`, `updated_at` |
| `user_group_invite_links` | `group_id`, `token_hash`, `invited_by`, `expires_at` |
| `resource_group_grants` | `resource_id`, `group_id`, `role`, `include_descendants`, `status`, `created_by`, `created_at`, `updated_at` |
| `file_folder_group_grants` | `folder_id`, `group_id`, `role`, `created_by`, `created_at`, `updated_at` |
| `group_resource_invitations` | `id`, `group_id`, `resource_id`, `folder_id`, `role`, `include_descendants`, `invited_by`, `state`, `expires_at`, `created_at`, `updated_at` |
