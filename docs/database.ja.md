<a id="database-reference"></a>

# データベース参照

[中文](database.zh-CN.md)

現在の互換性世代は `doca-2026-10-12-book-payload-storage-v1`. [create-schema.ts](../packages/db/src/create-schema.ts) テーブル、インデックス、外部キー、およびチェックを定義する。 [schema.ts](../packages/db/src/schema.ts) Kysely型を定義する； [connection.ts](../packages/db/src/connection.ts) 接続を開く； [transactions.ts](../packages/db/src/transactions.ts) トランザクションと衝突の再試行を管理する。

空のデータベースは現在のスキーマで初期化されます。起動時には、現在のDDLとインストールされた構造を比較し、サポートされている互換性レベル内でレビューされた追加項目を自動的に適用します。破壊的で意味的な違いは、永続的な変更前にレビュー計画を生成します。最新のインストールされたデータは、追加された項目と失われた既存のフィールドを区別します。 [データベースアップグレード契約](database-schema-evolution.ja.md) これは将来のデータベース開発とリリースのためのプロジェクト標準です。リリースされました。 `doca-2026-10-09-history-storage-v1` 構造は承認された規則に従って現世代に合致し、古いビジネス行を変換せずに古い帳簿の構造を保持できる。正確に `doca-2026-10-08-knowledge-books-v2` 生成の最初に、明示的なオフライン歴史のアップグレードが必要です。以前のまたは中断された世代は引き続き制限されます。参照してください。 [アップグレード要件](deployment.ja.md#upgrade-from-0113)データ、ファイル、設定を保護する。既存のdocument_templatesテーブルは、CRUDや自動登録なしでリソースプロバイダとして保持される。詳細は [テンプレートと資料](creation-resources.ja.md).

<a id="connections-initialization-and-backup"></a>

## 接続、初期化、バックアップ

SQLiteではforeign_keys、WAL、busy_timeout=5000、およびsynchronous=FULLが有効になります。ソース開発では `data/v1/doca.db`; Composeが保持される `/data/doca.db` doca_data内です。信頼性の高いバックアップには、WALを一貫して含めるか、SQLiteのバックアップ/チェックポイントプロセスを使用する必要があります。アクティブに書き込まれている.dbのみをコピーするだけでは不十分です。

PostgreSQLは、デフォルトで最大10のプールを持つpgを使用します。オペレーターは環境設定を通じてそのURLとスキーマを設定します。複数のレプリカを実行するには、共有されたPostgreSQL、Redis、およびアクセス可能なファイルストレージが必要です。 [水平スケーリング](horizontal-scaling.ja.md)ドライバーのサポートや記録された孤立検査は、実際のデータベースやオブジェクトサービスに対する受け入れを代替するものではありません。

ホストとAIモジュールは、個別に設定されたデータベース接続を使用できます。認証マスターキーを含む、すべての設定されたデータベース、参照ファイルストレージ、保護されたデプロイメント設定をバックアップし、本番復元前に隔離された環境に一貫して復元します。

<a id="identifiers-and-concurrency"></a>

## 識別子と並行処理

- ほとんどのリソース/アカウントIDはランダムなUUID文字列です。プロトコルダイジェスト、シングルトンID、操作キーはそれぞれ定められた形式を使用します。
- タイムはUTC ISO 8601形式の文字列です。順序を決めるために、1つの標準化された形式を使用してください。
- クロスデータベースのブール値は整数の0/1で表され、通常はAPIのブール値に変換されます。JSONは、宣言された場所でテキストとして保存されます。
- メタデータバージョン、設定リビジョン、認可リビジョン、共同編集のシーケンス/エポック、および操作受領書はそれぞれ異なる意味を持ち、一方を他方と置き換えてはいけません。
- ソフトデリートでは、提供されているdeleted_atが使用されます。すべてのテーブルに削除列があるわけではありません。複合キー、ユニークインデックス、外部キー、およびシリアル化されたトランザクションが関連する制約を実施します。
- リクエストJSONでは通常camelCaseが使用されますが、リソース/データベースのプロジェクションではsnake_caseが使われることがあります。ご確認ください。 [HTTP API](api.ja.md).

<a id="resources-discovery-and-authorization"></a>

## リソース、発見、認可

リソースには文書とライブラリのアイデンティティが両方含まれます。フォーマットにはrich_text、markdown、スプレッドシート、キャンバス、プレゼンテーションが含まれます。owner_idは、グレンズとは別に単一の所有者を識別します。access_modeはinherit/customです。可視性はinvited/requestable/authenticated/publicです。認可と発見は別物です：発見可能なタイトルやコレクションエントリは、本体へのアクセスを許可しません。

個人用文書にはkind=document、owner_id=現在のユーザー、そしてlibrary_idやparent_idは存在しない。ライブラリはネストできない。文書には1つの場所があるため、親は同じライブラリに属していなければならず、親の連鎖は循環できない。 foreign keyはダングリング参照を防ぎ、core transactionsはクロス行の木構造のルールを検証する。手動のSQLは依然として不変性を破る可能性があり、サポートされているproduct-write APIではない。

ギャラントキーは `(resource_id,user_id,source_type,source_id)`direct/link/parent_overrideは、現在の許可評価を決定します。share_linksとshare_link_revocationsは、リンクの生成、アクセス、および撤回の事実を記録します。招待、リクエスト、コレクション、エントリー、チケットは、それぞれ独自のワークフローを実行します。読む [権限](permission-inheritance.ja.md) そして [発見](public-resource-discovery.ja.md) 正確な規則のため。

last_editor_id/last_edited_atレコードには、実際の作成、独立したコピー、名前変更、有効な内容の更新が含まれます。読み取り、変わらない同期、権限の変更は書き換えません。訪問は個人的であり、現在のアクセスと削除によってフィルタリングされます。user_preferencesは楽観的なバージョン条件を使用し、最初の保存されたレコード前はデフォルトバージョン=0となり、プロファイルの改訂を共有しません。

<a id="content-references-and-collaboration"></a>

## 内容、参考文献、および共同編集

保存されたコンテンツはdocument_states/checkpointsとdocument_updatesを使用し、エディター/Markdown epochsとreceiptsは順序付き操作を識別し、重複した再試行を排除する。document_versionsは回復データと共にビジネス履歴を保存する。Codec、schema、baseline、seq、epochはエディター固有のものであり、これら5つのフォーマットはそれぞれ実装された保存パスを使用する。詳細は [共同編集契約](collaboration-sdk-contract.ja.md), [共同編集ガイド](collaboration.ja.md)、そして [エディター統合](editor-integration.ja.md).

ドキュメント参照、統合イベント、保留中のイベント、プロジェクションジョブ/カーソル、および検索調整は、権威あるコンテンツ/権限を派生インデックスから分離します。参照はアクセス権を付与しません。検索設定/タスク/モデル指紋、および調整エントリは、プレーンテキストモデルの秘密情報を重複させることなく、設定や修復状態を追跡します。プロジェクションの失敗時には、成功したコンテンツの保存を偽造してはなりません。

コメントにはroot/reply関係、body/body_json、オプションのcurrent-protocolアンカー、解決状況、削除状態が保持されます。コメントテキスト/リッチコンテンツは安全に表示されます。通知には受信者、アクター、重複排除/ticketフィールド、オプションのプラグインメタデータが含まれます。監査/セキュリティ記録にはコピーされた文書本文ではなく、アクションメタデータが含まれます。詳細は [コメントと通知](comments-and-community.ja.md) そして [認証](authentication.ja.md).

<a id="files-and-plugin-state"></a>

## ファイルとプラグインの状態

storage_profilesには、stable id、active、created_atのみが含まれています。バックエンドの設定や認証情報は環境から提供されます。このベースラインには、プロバイダ/設定列や書き込み可能な管理者のストレージ設定はありません。assetsとfile_storage_objectsはstable store/objectのアイデンティティを保持します。file_items/folders/bindings、derivatives、extracts、operation receiptsがユーザーのファイルやコンテンツ処理を管理します。File bytesはデータベース行とは別物です。参照するドキュメントや履歴行が削除された場合に、共有の物理オブジェクトを削除してはいけません。詳細は [ファイルストレージ](storage.ja.md).

プラグイン名空間は、プラグインID、名空間、データバージョン、生成番号、状態、および宣言された定義を結びつけます。管理されるSQLビジネストーブルは、Schema内の固定リストではなく、プラグインストレージサービスを通じて宣言されたテーブルを持つ、別個の共有プラグインビジネストーブルデータベースに存在します。プライベートオブジェクト、ゴミ記録、不変アーカイブ、レジストリ状態、WebViewセッション、およびナビゲーション設定はホストが管理します。plugin_credentialsは、名空間/生成番号/リビジョンと共に暗号化された密封値を保存します。plugin_credential_keysは、マスターキーではなくキーフィンガプトを保存します。詳細は [プラグインストレージ](plugin-horizontal-scaling.ja.md) そして [認証情報](plugin-credentials.ja.md).

<a id="ai-and-knowledge-workflows"></a>

## AIと知識ワークフロー

AIセッションでは、ユーザーが指定したリソース、明確に承認されたリソース、および表示/履歴の関連性が区別されます。resource_idsだけではモデルのアクセスを許可することはできません。ジョブは承認の要約やパラメータの要約を保存し、承認を待つ間リースを放棄し、認証された所有権チェックが行われた後にのみ再開します。AIコールでは元の使用状況の情報が保持され、会計/ポリシービジネスモジュールはそれらを代替しません。秘密情報、スキル、MCPキー、メモ、操作受領書、セッションイベントはそれぞれ別のテーブルとアクセス境界を持ちます。

ネイティブソースのサブスクリプション、チャンク、リンクはインデックスや検索機能を保持します。以下の知識ブックテーブルには、編集可能な設定履歴、貢献者のソース、フィードバック、ワークフローの実行、不変のリリース、人間のタスクが保存されます。オリジナルソースの権限設定により、すべての派生結果が保護されます。古いカウンターデータやQ&Aテーブルは新しいデータベースには存在せず、古い記録は移行されたり削除されたりすることはありません。

MCPサービスは、ユーザースイッチ、ハッシュ化されたサービス認証情報/権限、実行コンテキスト、およびアトマスト・オンリー・カムクレームのために4つの別々のテーブルを使用します。 `ai_mcp_keys` 退職し、歴史的データを保存するためにのみ保持されている。実行時には決して読みません。参照 [MCPサービス](mcp.ja.md).

<a id="current-table-and-field-inventory"></a>

## 現在のテーブルとフィールドの在庫

以下のインベントリは現在のスキーマインタフェースを反映しています。フィールド名は完全に記載されていますが、正確なSQLタイプ、nullability、デフォルト値、プライマリ/ユニークキー、 foreignキーはcreate-schema.tsによって定義されています。オプションのTypeScriptプロパティはnullableなSQL列を意味するものではありません。これは参照であり、手動でテーブルを作成または変更するための指示ではありません。

| テーブル | フィールド |
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
