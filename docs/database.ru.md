<a id="database-reference"></a>

# Ссылка на базу данных

[中文](database.zh-CN.md)

Текущая génération совместимости — `doca-2026-10-12-book-payload-storage-v1`. [create-schema.ts](../packages/db/src/create-schema.ts) определяет таблицы, индексы, внешние ключи и проверки; [schema.ts](../packages/db/src/schema.ts) определяет типы кривых; [connection.ts](../packages/db/src/connection.ts) открывает соединения; [transactions.ts](../packages/db/src/transactions.ts) Управляет транзакциями и повторными попытками разрешения конфликтов.

Пустые базы данных инициализируются с использованием текущего схемы. При запуске текущая структура DDL сравнивается с установленной структурой, и автоматически применяются добавленные элементы в рамках поддерживаемой совместимости. Деструктивные и семантические различия требуют составления плана проверки перед внесением постоянных изменений; последняя установленная структура помогает отличить добавленные элементы от утраченных существующих полей. [Контракт на обновление базы данных](database-schema-evolution.ru.md) Это стандарт проекта для будущего разработки и выпуска баз данных. Опубликовано. `doca-2026-10-09-history-storage-v1` Структуры могут соответствовать современному поколению согласно утвержденным правилам, сохраняя старые бизнес-строки без преобразования старых книжных структур. Точно `doca-2026-10-08-knowledge-books-v2` Первый этап генерации требует явного обновления истории в оффлайне; предыдущие или прерванные этапы генерации остаются закрытыми. Смотрите [Требования к обновлению](deployment.ru.md#upgrade-from-0113)Сохраняйте данные, файлы и конфигурацию. Существующая таблица document_templates сохраняется без использования CRUD или автоматического регистрации в качестве поставщика ресурсов; см. [шаблоны и материалы](creation-resources.ru.md).

<a id="connections-initialization-and-backup"></a>

## Соединения, инициализация и резервное копирование

SQLite поддерживает параметры foreign_keys, WAL, busy_timeout=5000 и synchronous=FULL. В разработке источника используются `data/v1/doca.db`; Compose остается активным `/data/doca.db` В doca_data. Надежный резервный копирование должен включать WAL последовательно или использовать процедуру резервного копирования/контрольной точки SQLite; копирование только активно записанного .db недостаточно.

PostgreSQL использует pg с по умолчанию 10 максимальным пулом. Операторы настраивают его URL и схему через параметры окружения. Для нескольких реплик необходимы общие ресурсы PostgreSQL, Redis и доступные файловые хранилища; см. [горизонтальное масштабирование](horizontal-scaling.ru.md)Поддержка драйвера и записанные изолированные проверки не заменяют проверку на основе реальной базы данных и сервиса объектов.

Хост и модули ИИ могут использовать отдельно настроенные подключения к базе данных. Сделайте резервную копию каждой настроенной базы данных, хранилища файлов и защищенной конфигурации развертывания, включая главный ключ учетных данных. Восстановите их последовательно в изолированную среду перед производственным восстановлением.

<a id="identifiers-and-concurrency"></a>

## Идентификаторы и конкуренция

- Большинство идентификаторов ресурсов/аккаунтов представляют собой случайные строки UUID; протокольные дегиты, уникальные идентификаторы и ключи операций используют свои официально определенные форматы.
- Время представлено в формате строк ISO 8601 UTC. Для сортировки используйте один нормализованный формат.
- Булевы значения между базами данных представляются в виде целых чисел 0/1, которые обычно преобразуются в булевы значения API. JSON хранится в виде текста, указанного в документации.
- Версия метаданных, ревизия конфигурации, ревизия авторизации, последовательность/эпоха сотрудничества и подтверждения операций имеют разные значения; никогда не заменять одно другое.
- Мягкое удаление использует столбец deleted_at, если он предусмотрен; не в каждой таблице есть столбец для удаления. Композитные ключи, уникальные индексы, внешние ключи и сериализованные транзакции обеспечивают соответствующие ограничения.
- JSON-запросы обычно используют camelCase, в то время как проекции ресурсов/баз данных могут использовать snake_case; обратите внимание [HTTP API](api.ru.md).

<a id="resources-discovery-and-authorization"></a>

## Ресурсы, открытия и авторизация

Ресурсы имеют как идентичность документа, так и идентичность библиотеки. Форматы включают rich_text, markdown, электронную таблицу, холст и презентации. owner_id выделяет единого владельца от грантов. access_mode — inherit/custom; видимость — invited/requestable/authenticated/public. Авторизация и обнаружение отделены: обнаружимые заголовки или записи коллекции не предоставляют доступа к содержимому.

Личные документы имеют параметры kind=document, owner_id=текущий пользователь, и не имеют параметров library_id или parent_id. Библиотеки не могут быть вложенными. Документ имеет одно местоположение; родители должны принадлежать к одной и той же библиотеке, а цепочки родителей не могут циклироваться. Внешние ключи предотвращают отсутствие связей, а основные транзакции проверяют правила дерева между строками. Вручную выполненный SQL все равно может нарушать неизменяемые свойства, и это не является поддерживаемым API для создания продуктов.

Ключ гранта — `(resource_id,user_id,source_type,source_id)`Direct/link/parent_override предоставляет права, а активное/отключенное состояние — оценивает текущие разрешения. share_links и share_link_revocations записывают информацию о создании ссылок, доступе и отмене ссылок. Приглашения, запросы, коллекции, записи и билеты имеют свои отдельные процессы работы. Читайте [права](permission-inheritance.ru.md) и [откровение](public-resource-discovery.ru.md) Для точных правил.

Записи last_editor_id/last_edited_at отражают реальное создание, независимую копию, переименование и обновления эффективного объекта. Чтение, неизменная синхронизация и изменения прав не выполняют перезаписи. Посещения являются личными и фильтруются по текущему доступу и удалению. user_preferences использует оптимистичные условия версий, при этом по умолчанию версия равна 0 до первой сохраненной записи; он не делится профилем ревизии.

<a id="content-references-and-collaboration"></a>

## Контент, ссылки и сотрудничество

Сохраняемый контент использует document_states/checkpoints и document_updates; редактор/Markdown epochs и receipts определяют последовательные операции и устраняет дублирующие попытки. document_versions хранит бизнес-историю с данными восстановления. Codec, schema, baseline, seq и epoch являются специфичными для редактора; все пять форматов используют свои реализованные пути сохранения. См. также [договор о сотрудничестве](collaboration-sdk-contract.ru.md), [Руководство по сотрудничеству](collaboration.ru.md)и [интеграция редактора](editor-integration.ru.md).

Отсылки к документам, события интеграции, ожидающие события, задания/курсоры проекции и процедуры сопоставления поисковых данных отделяют авторитетный контент/авторизацию от производных индексов. Отсылки не предоставляют доступа. Настройки поиска/задачи/модельные отпечатки и записи сопоставления отслеживают конфигурацию и состояние ремонта без дублирования секретов модели в чистом текстовом виде. При неудаче проекции не должно происходить создание успешного сохранения контента.

Комментарии сохраняют отношения корневого/ответа, текст/rich content, опциональные анкоры текущей протоколом, состояние разрешения и удаления. Текст комментария/rich content отображается безопасно. Уведомления содержат получателей, участников, поля дублирования/тайника и опциональные метаданные плагина. Записи аудита/безопасности содержат метаданные действий, а не копированные документы. Смотрите [комментарии и уведомления](comments-and-community.ru.md) и [аутентификация](authentication.ru.md).

<a id="files-and-plugin-state"></a>

## Файлы и состояние плагина

Storage_profiles содержит только стабильный id, активный статус и время создания. Конфигурация сервера и учетные данные поступают из окружения; в этом базовом варианте нет колонок provider/config или возможности записи конфигурации хранилища администратором. assets и file_storage_objects сохраняют стабильные идентификаторы хранилища/объекта; file_items, папки, связи, производные объекты, выделения и квитанции операций управляют файлами пользователей и обработкой контента. Байты файлов отделены от строк базы данных. Никогда не удаляйте общий физический объект, если был удален документ или строка истории. Смотрите [хранение файлов](storage.ru.md).

Намины плагинов связывают plugin_id, namespace, data_version, generation, state и объявленные определения. Управляемые SQL бизнес-таблицы хранятся в отдельной общей бизнес-базе данных плагинов, где таблицы объявляются через сервис хранения плагинов, а не в фиксированном списке в Схеме. Приватные объекты, записьи-мусор, неизменяемые архивы, состояние реестра, сессии WebView и настройки навигации остаются в ведении хоста. plugin_credentials хранит зашифрованные закрытые значения с namespace/generation/revision; plugin_credential_keys хранит отпечатки ключей, а не главный ключ. См. также [хранилище плагина](plugin-horizontal-scaling.ru.md) и [представления](plugin-credentials.ru.md).

<a id="ai-and-knowledge-workflows"></a>

## ИИ и процессы обработки знаний

Сессии ИИ разделяют ресурсы, упомянутые пользователем, явно одобренные ресурсы и связи между ними/историю; отдельно от resource_ids не достаточно для разрешения доступа к модели. Задания хранят резюме одобрений и обобщения параметров, отказываются от аренды в ожидании одобрения и возобновляют работу только после проверки подлинности владения. Сообщения ИИ сохраняют первоначальные факты использования; модули учета/политики не заменяют их. Секреты, навыки, ключи MCP, записи, квитанции о выполнении и события сессии имеют отдельные таблицы и границы доступа.

Подписки на родных источниках, блоки и ссылки сохраняют возможность индексации и поиска. Таблицы знаний-книг содержат историю редактируемых конфигураций, источники участников, отзывы, процессы работы, неизменные релизы и человеческие задачи. Права на исходный источник защищают все полученные результаты. Старые таблицы для курации и ответов на вопросы отсутствуют в новых базах данных; старые записи никогда не мигрируют и не удаляются.

Сервисы MCP используют четыре отдельные таблицы для переключений пользователей, хешированных криптоключей/разрешений, контекстов выполнения и требований о вызовах, выполняемых максимум один раз. `ai_mcp_keys` Он вышел на пенсию и остается в системе только для сохранения исторических данных; во время выполнения программы он никогда не читает его. Смотрите [Сервисы MCP](mcp.ru.md).

<a id="current-table-and-field-inventory"></a>

## Текущий инвентарь таблиц и полей

Приведенный ниже список отражает текущую интерфейс схемы. Названия полей указаны полностью; точные типы SQL, возможность нулевого значения, значения по умолчанию, первичные/уникальные ключи и внешние ключи определяются файлом create-schema.ts. Дополнительные свойства TypeScript не подразумевают нулевое значение в SQL-столбцах. Это справочный материал, а не инструкция по созданию или изменению таблиц вручную.

| Таблица | Поля |
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
