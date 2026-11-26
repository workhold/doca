<a id="database-reference"></a>

# Referencia de base de datos

[中文](database.zh-CN.md)

La generación actual de compatibilidad es `doca-2026-10-12-book-payload-storage-v1`. [create-schema.ts](../packages/db/src/create-schema.ts) definen tablas, índices, claves foráneas y verificaciones; [schema.ts](../packages/db/src/schema.ts) definen los tipos de Kysely; [connection.ts](../packages/db/src/connection.ts) abre conexiones; [transactions.ts](../packages/db/src/transactions.ts) Gestiona transacciones y intentos de reconexión en conflictos.

Los bases de datos vacías se inicializan con el esquema actual. El inicio de la operación compara el DDL actual con la estructura instalada y aplica automáticamente las adiciones revisadas dentro de la generación de compatibilidad soportada. Las diferencias destructivas y semánticas generan un plan de revisión antes de los cambios persistentes; la última versión instalada distingue las adiciones de los campos existentes que se pierden. [Contrato de actualización de base de datos](database-schema-evolution.es.md) Es el estándar del proyecto para el desarrollo y lanzamiento de bases de datos en el futuro. Lanzado `doca-2026-10-09-history-storage-v1` Las estructuras pueden alinearse con la generación actual según las reglas aprobadas, manteniendo las filas de negocios antiguas sin convertir los cuerpos de libros antiguos. El exacto `doca-2026-10-08-knowledge-books-v2` La generación primero requiere una actualización explícita de la historia fuera de línea; las generaciones anteriores o interrumpidas permanecen cerradas. Ver [Requisitos de actualización](deployment.es.md#upgrade-from-0113)Conserve datos, archivos y configuración. La tabla existente document_templates se mantiene sin CRUD ni registro automático como proveedor de recursos; véase [Plantillas y materiales](creation-resources.es.md).

<a id="connections-initialization-and-backup"></a>

## Conexiones, inicialización y respaldo

SQLite permite foreign_keys, WAL, busy_timeout=5000 y synchronous=FULL. El desarrollo de la fuente utiliza `data/v1/doca.db`; Compose persiste `/data/doca.db` en doca_data. Un respaldo confiable debe incluir WAL de manera consistente o utilizar un procedimiento de backup/checkpoint de SQLite; copiar solo un .db activamente escrito es insuficiente.

PostgreSQL utiliza pg con un máximo de pool por defecto de 10. Los operadores configuran su URL y esquema a través de los ajustes del entorno. Se requieren almacenes compartidos de PostgreSQL, Redis y archivos accesibles para múltiples réplicas; ver [Escalado horizontal](horizontal-scaling.es.md)El soporte del conductor y las verificaciones aisladas grabadas no reemplazan la aceptación frente al banco de datos real y al servicio del objeto.

El host y los módulos de IA pueden utilizar conexiones de base de datos configuradas por separado. Realice copias de seguridad de cada base de datos configurada, almacén de archivos referenciado y configuración de despliegue protegida, incluyendo la clave maestra de credenciales. Restaurenlos de manera consistente en un entorno aislado antes de la recuperación en producción.

<a id="identifiers-and-concurrency"></a>

## Identificadores y concurrencia

- La mayoría de los IDs de recursos/conta son cadenas UUID aleatorias; los digests de protocolo, los IDs singletons y las claves de operación utilizan sus formatos declarados.
- Los tiempos son cadenas de formato UTC ISO 8601. Mantenga un formato normalizado para la ordenación.
- Las booleanas entre bases de datos utilizan números enteros 0/1, que comúnmente se convierten en booleanas de la API. El JSON se almacena como texto tal como está declarado.
- La versión de metadatos, la revisión de configuración, la revisión de autorización, la secuencia/época de colaboración y los recibos de operación tienen significados distintos; nunca deben sustituirse uno por otro.
- La eliminación suave utiliza la columna deleted_at cuando está disponible; no todas las tablas tienen una columna de eliminación. Las claves compuestas, los índices únicos, las claves foráneas y las transacciones serializadas imponen las restricciones relevantes.
- Los request JSON generalmente usan camelCase, mientras que las proyecciones de recursos/bases de datos pueden usar snake_case; consulte [API HTTP](api.es.md).

<a id="resources-discovery-and-authorization"></a>

## Recursos, descubrimiento y autorización

Los recursos poseen tanto identidades de documentos como de bibliotecas. Los formatos incluyen rich_text, markdown, hoja de cálculo, lienzo y presentación. owner_id identifica al único propietario de forma separada de las concesiones. access_mode es inherit/custom; la visibilidad es invited/requestable/authenticated/public. La autorización y el descubrimiento son separados: los títulos o entradas de colección que son descubribles no otorgan acceso al contenido.

Los documentos personales tienen kind=document, owner_id=usuario actual, y no tienen library_id ni parent_id. Las bibliotecas no pueden estar anidadas. Un documento tiene una única ubicación; los padres deben pertenecer a la misma biblioteca y las cadenas de padres no pueden circular. Las claves foráneas evitan referencias sin conexión, mientras que las transacciones principales validan las reglas del árbol entre filas. El SQL manual aún puede violar las invariantes y no es una API compatible con productos de escritura.

La clave de concesión es `(resource_id,user_id,source_type,source_id)`Los permisos de directo/link/parent_override y el estado activo/disactivado permiten la evaluación de permisos en tiempo real. share_links y share_link_revocations registran las generaciones de enlaces, el acceso y los hechos de revocación. Las invitaciones, solicitudes, colecciones, entradas y boletos tienen sus propios flujos de trabajo distintos. Lee [permisos](permission-inheritance.es.md) y [descubrimiento](public-resource-discovery.es.md) Para reglas exactas.

Los registros last_editor_id/last_edited_at permiten la creación real, copias independientes, renombramientos y actualizaciones efectivas del cuerpo. Las lecturas, la sincronización sin cambios y los cambios de permisos no lo reescriben. Las visitas son personales y se filtran según el acceso y la eliminación actuales. user_preferences utiliza condiciones de versión optimista, con la versión por defecto=0 antes de su primer registro guardado; no comparte la revisión del perfil.

<a id="content-references-and-collaboration"></a>

## Contenido, referencias y colaboración

El contenido persistido utiliza document_states/punto de control y document_updates; editor/épocas Markdown y recibos identifican las operaciones ordenadas y eliminan las repeticiones duplicadas. document_versions almacena la historia empresarial con datos de recuperación. Codec, esquema, línea base, secuencia y época son específicos del editor; los cinco formatos utilizan sus caminos de persistencia implementados. Véase el [contrato de colaboración](collaboration-sdk-contract.es.md), [guía de colaboración](collaboration.es.md), y [integración de editor](editor-integration.es.md).

Las referencias de documentos, los eventos de integración, los eventos pendientes, los trabajos/proyectores de proyección y las entradas de reconciliación separan el contenido/autorización autoritativo de los índices derivados. Las referencias no otorgan acceso. Las configuraciones de búsqueda/tareas/huellas de modelo y las entradas de reconciliación rastrean el estado de configuración y reparación sin duplicar los secretos del modelo en texto plano. El fallo de la proyección no debe crear una salvación exitosa del contenido.

Los comentarios mantienen relaciones raíz/respuesta, cuerpo/cuerpo_json, anclas opcionales de protocolo actual, estado de resolución y eliminación. El texto de los comentarios/contenido enriquecido se renderiza de manera segura. Las notificaciones tienen destinatarios, actores, campos de deduplicación/ticket y metadatos opcionales de plugin. Los registros de auditoría/seguridad contienen metadatos de acción en lugar de cuerpos de documentos copiados. Ver [Comentarios y notificaciones](comments-and-community.es.md) y [autenticación](authentication.es.md).

<a id="files-and-plugin-state"></a>

## Archivos y estado del complemento

Los perfiles de almacenamiento contienen únicamente el ID estable, el estado activo y la fecha de creación. La configuración del backend y las credenciales provienen del entorno; no existen columnas de proveedor/configuración ni configuración de almacenamiento escrita por el administrador en esta versión base. Los activos y los objetos de almacenamiento de archivos conservan identidades estables de almacenamiento/objeto; los elementos de archivo/ carpetas/asociaciones, derivados, extractos y recibos de operaciones gestionan los archivos y el procesamiento de contenido de los usuarios. Los bytes de archivo están separados de las filas de la base de datos. Nunca elimine un objeto físico compartido porque se haya eliminado un documento referenciado o una fila de historial. Ver [almacenamiento de archivos](storage.es.md).

Los espacios de nombres de plugin vinculan plugin_id, espacio de nombres, data_version, generación, estado y definiciones declaradas. Las tablas empresariales SQL gestionadas se alojan en la separada base de datos empresarial compartida de plugin, con tablas declaradas a través del servicio de almacenamiento de plugin en lugar de una lista fija en Schema. Los objetos privados, registros de basura, archivos inmutables, estado del registro, sesiones de WebView y configuraciones de navegación permanecen bajo gestión del host. plugin_credentials almacena valores cifrados sellados con espacio de nombres/generación/revisión; plugin_credential_keys almacena huellas de clave, no la clave maestra. Véase [almacenamiento complemento](plugin-horizontal-scaling.es.md) y [credenciales](plugin-credentials.es.md).

<a id="ai-and-knowledge-workflows"></a>

## IA y flujos de trabajo del conocimiento

Las sesiones de IA separan los recursos mencionados por el usuario, los recursos aprobados explícitamente y las asociaciones de visualización/historial; solo los resource_ids no autorizan el acceso al modelo. Las tareas almacenan resúmenes de aprobación y resúmenes de parámetros, renuncian a las licencias mientras esperan la aprobación y reanudan su funcionamiento solo después de verificar la propiedad autenticada. Las llamadas de IA conservan los hechos originales de uso; los módulos de contabilidad/políticas empresariales no los reemplazan. Los secretos, habilidades, claves MCP, notas, recibos de operación y eventos de sesión tienen tablas y límites de acceso separados.

Las suscripciones, fragmentos y enlaces de la fuente nativa conservan la indexación y búsqueda. Las tablas de conocimiento-book a continuación mantienen historias de configuración editables, fuentes de contribuidores, comentarios, ejecuciones de flujo de trabajo, publicaciones inmutables y tareas humanas. Los permisos de la fuente original protegen todos los resultados derivados. Las tablas de curaduría y Preguntas y Respuestas antiguas no están presentes en las bases de datos nuevas; los registros antiguos nunca se migran ni se eliminan.

Los servicios MCP utilizan cuatro tablas separadas para los cambios de usuario, las credenciales/permisos de servicio hashadas, los contextos de ejecución y las reclamaciones de llamadas “al menos una vez”. `ai_mcp_keys` Está retirado y mantenido únicamente para preservar los datos históricos; el tiempo de ejecución nunca lo lee. Ver [Servicios MCP](mcp.es.md).

<a id="current-table-and-field-inventory"></a>

## Inventario actual de tablas y campos

El inventario a continuación refleja la interfaz actual del esquema. Los nombres de los campos están listados de manera exhaustiva; los tipos SQL exactos, la posibilidad de ser nulos, los valores por defecto, las claves primarias/únicas y las claves foráneas siguen estando definidos en create-schema.ts. Las propiedades opcionales de TypeScript no implican columnas SQL que puedan ser nulas. Esta es una referencia, no una instrucción para crear o modificar tablas manualmente.

| Tabla | Campos |
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
