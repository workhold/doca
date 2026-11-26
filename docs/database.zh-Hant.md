<a id="数据库参考"></a>

# 資料庫參考

[English](database.md)

當前相容代際為 `doca-2026-10-12-book-payload-storage-v1`。[create-schema.ts](../packages/db/src/create-schema.ts) 定義建表、索引、外來鍵和檢查約束；[schema.ts](../packages/db/src/schema.ts) 定義 Kysely 型別；[connection.ts](../packages/db/src/connection.ts) 管理連線；[transactions.ts](../packages/db/src/transactions.ts) 管理事務和衝突重試。

空資料庫按當前結構初始化。啟動時比較最新 DDL 與已安裝結構，在支援的相容代際內自動補齊已審定的新增結構。破壞性與語義差異會在持久化修改前報告確認計劃；最新已安裝結構記錄用於區分新增欄位與原有欄位丟失。[資料庫升級規範](database-schema-evolution.zh-Hant.md) 是後續資料庫開發與釋出必須遵守的專案約定。已釋出的 `doca-2026-10-09-history-storage-v1` 結構可按已批准規則對齊當前代際，保留舊業務行而不轉換舊知識冊正文。準確的 `doca-2026-10-08-knowledge-books-v2` 代際須先顯式離線升級歷史；更早或中斷代際仍被門禁拒絕，見[升級要求](deployment.zh-Hant.md#从-0113-升级)。保留原資料、檔案和配置。已有 document_templates 表保留，不提供原 CRUD，也不自動註冊為資源來源，見[模板與素材](creation-resources.zh-Hant.md)。

<a id="连接、初始化与备份"></a>
<a id="连接初始化与备份"></a>

## 連線、初始化與備份

SQLite 開啟 foreign_keys、WAL、busy_timeout=5000 和 synchronous=FULL。原始碼開發預設使用 `data/v1/doca.db`，Compose 將 `/data/doca.db` 持久化到 doca_data。可靠備份須一致處理 WAL，或使用 SQLite 備份/檢查點流程；不能只複製正在寫入的 .db 檔案。

PostgreSQL 使用 pg，預設連線池上限 10；URL 與 schema 透過環境配置。多副本需要共享 PostgreSQL、Redis 和各例項可訪問的檔案儲存，見[水平擴充套件](horizontal-scaling.zh-Hant.md)。驅動支援和歷史隔離檢查不能代替真實資料庫、物件服務的部署驗收。

宿主與 AI 模組可分別配置資料庫連線。備份覆蓋所有配置資料庫、引用的檔案儲存和受保護的部署配置，包括憑證主金鑰。生產恢復前先在隔離環境中驗證一致恢復。

<a id="身份与并发"></a>

## 身份與併發

- 大多數資源、賬戶 ID 為隨機 UUID 字串；協議摘要、單例 ID 和操作 key 遵循各自格式。
- 時間為 UTC ISO 8601 字串，排序維持統一格式。
- 跨資料庫布林使用 integer 0/1，API 通常轉為布林；宣告的 JSON 欄位以文字儲存。
- 後設資料 version、配置 revision、授權 revision、協同 seq/epoch、操作回執各有含義，不能互相替代。
- 提供 deleted_at 的表使用軟刪除；並非每張表都含刪除欄位。聯合主鍵、唯一索引、外來鍵與序列化事務共同保證約束。
- 請求 JSON 通常為 camelCase，資源或資料庫投影可能為 snake_case，見 [HTTP API](api.zh-Hant.md)。

<a id="资源、发现与授权"></a>
<a id="资源发现与授权"></a>

## 資源、發現與授權

resources 統一儲存文件和知識庫身份，格式包括 rich_text、markdown、spreadsheet、canvas、presentation。owner_id 表示獨立於 grants 的唯一所有者；access_mode 為 inherit/custom，visibility 為 invited/requestable/authenticated/public。發現與授權分離：可見標題和收錄入口不授予正文訪問許可權。

個人文件滿足 kind=document、owner_id=當前使用者、library_id 和 parent_id 為空。知識庫不可巢狀，文件只有一個位置，父文件必須同庫，父鏈不能成環。外來鍵防止懸空，core 事務檢查跨行樹約束；手工 SQL 仍可能破壞規則，不屬於產品寫入介面。

grants 主鍵為 `(resource_id,user_id,source_type,source_id)`，direct/link/parent_override 與 active/disabled 參與當前許可權計算。share_links 和 share_link_revocations 記錄連結代次、許可權與撤銷事實。邀請、申請、收錄、入口和工單分別表達各自流程，詳見[許可權](permission-inheritance.zh-Hant.md)与[發現收錄](public-resource-discovery.zh-Hant.md)。

last_editor_id/last_edited_at 記錄真實建立、獨立複製、重新命名與有效正文更新；讀取、無變化同步和許可權調整不改寫。個人訪問歷史按當前許可權和刪除狀態過濾。user_preferences 以 version 樂觀鎖儲存，首次儲存前預設 version=0，與使用者資料 revision 分離。

<a id="正文、引用与协同"></a>
<a id="正文引用与协同"></a>

## 正文、引用與協同

正文透過 document_states/checkpoint 和 document_updates 持久化；editor/Markdown epoch 與回執標識有序操作並去重重試；document_versions 儲存業務歷史和恢復資料。codec、schema、baseline、seq、epoch 由各編輯器協議定義，五種格式採用實際實現的持久化路徑。見[協同契約](collaboration-sdk-contract.zh-Hant.md)、[協同說明](collaboration.zh-Hant.md)和[編輯器整合](editor-integration.zh-Hant.md)。

文件引用、整合事件、待投遞事件、projection jobs/cursors 和搜尋 reconciliation 將權威正文/授權與派生索引分開。引用不授予許可權；搜尋設定、任務、模型指紋和校對清單記錄配置及修復進度，不另存模型明文金鑰。投影失敗不能偽造正文儲存成功。

評論儲存主題/回覆關係、body/body_json、當前協議錨點、處理和刪除狀態，內容安全展示。通知儲存接收者、操作者、去重/工單欄位及可選外掛後設資料。審計和安全記錄儲存動作後設資料，不復制正文。見[評論通知](comments-and-community.zh-Hant.md)与[身份認證](authentication.zh-Hant.md)。

<a id="文件与插件状态"></a>

## 檔案與外掛狀態

storage_profiles 只有穩定 id、active 和 created_at，後端配置與憑據來自環境。本基線沒有 provider/config 列，也沒有可寫的管理員儲存配置。assets 和 file_storage_objects 儲存儲存/物件身份；file_items/folders/bindings、衍生檔案、提取結果和操作回執管理使用者檔案及處理過程。檔案位元組獨立於資料庫行；刪除一個文件或歷史行不能直接刪除共享物理物件。見[檔案儲存](storage.zh-Hant.md)。

外掛 namespace 繫結 plugin_id、namespace、data_version、generation、state 和宣告的 definition。託管 SQL 業務表由外掛儲存服務定義，不屬於 Schema 的固定表清單。私有物件、待清理記錄、不可變歸檔、登錄檔、WebView 會話和導航配置由宿主管理。plugin_credentials 儲存按 namespace/generation/revision 隔離的加密 sealed 值；plugin_credential_keys 只儲存指紋，不儲存主金鑰。見[外掛儲存](plugin-horizontal-scaling.zh-Hant.md)与[託管憑證](plugin-credentials.zh-Hant.md)。

<a id="ai-与知识流程"></a>

## AI 與知識流程

AI 會話分別儲存使用者主動提及、使用者明確批准和展示/歷史關聯的資源，resource_ids 本身不能授權模型訪問。任務儲存審批摘要與引數摘要，等待審批時釋放租約，認證並校驗歸屬後恢復。AI calls 保留原始用量事實，業務計費/策略模組不能替代。金鑰、技能、MCP key、記憶、操作回執和會話事件分別遵循各自邊界。

來源訂閱、知識分塊與關聯繼續提供索引和搜尋。下方知識冊表儲存配置歷史、貢獻者來源、人工反饋、執行、不可變成果和人工待辦。所有衍生成果遵守原來源許可權。新庫不建立舊整理和問答表，已有記錄不遷移、不刪除。

MCP 使用四張獨立表記錄使用者開關、服務憑據雜湊與授權、執行上下文和防重複呼叫宣告。`ai_mcp_keys` 已停用，僅保全歷史資料，執行時不讀取。詳見 [MCP 服務](mcp.zh-Hant.md)。

<a id="当前表与字段清单"></a>

## 當前表與欄位清單

以下窮舉當前 Schema 介面欄位。精確 SQL 型別、空值、預設值、主鍵/唯一約束和外來鍵以 create-schema.ts 為準；TypeScript 可選屬性不等於 SQL 可空列。該清單用於參考，不要求手工建表或修改資料庫。

| 表 | 欄位 |
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
