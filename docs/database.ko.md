<a id="database-reference"></a>

# 데이터베이스 참조

[中文](database.zh-CN.md)

현재 호환성 세대는 `doca-2026-10-12-book-payload-storage-v1`. [create-schema.ts](../packages/db/src/create-schema.ts) 테이블, 인덱스, 외래 키 및 체크를 정의합니다. [schema.ts](../packages/db/src/schema.ts) Kysely 타입을 정의합니다; [connection.ts](../packages/db/src/connection.ts) 연결을 열다; [transactions.ts](../packages/db/src/transactions.ts) 거래와 충돌 재시도를 관리합니다.

빈 데이터베이스는 현재의 스키마로 초기화됩니다. 시작 과정에서 현재의 DDL을 설치된 구조와 비교하여 지원되는 호환성 범위 내에서 검토된 추가 사항을 자동으로 적용합니다. 파괴적이거나 의미상의 차이가 발생하면 지속적인 변경 전에 검토 계획이 생성됩니다. 최신 설치된 파일을 통해 추가된 항목과 사라진 기존 필드를 구분할 수 있습니다. [데이터베이스 업그레이드 계약](database-schema-evolution.ko.md) 이는 향후 데이터베이스 개발 및 배포의 표준입니다. 출시되었습니다. `doca-2026-10-09-history-storage-v1` 구조는 승인된 규칙에 따라 현재 세대와 일치할 수 있으며, 기존의 비즈니스 행을 변환하지 않고 기존의 책체를 그대로 유지할 수 있습니다. 정확히는 `doca-2026-10-08-knowledge-books-v2` 첫 번째 세대에서는 명시적인 오프라인 역사 업그레이드가 필요합니다. 이전 또는 중단된 세대는 여전히 차단된 상태로 남습니다. 참조하세요. [업그레이드 요구사항](deployment.ko.md#upgrade-from-0113)데이터, 파일 및 설정을 보존합니다. 기존의 document_templates 테이블은 CRUD이나 자동 등록 없이 리소스 제공자로 유지됩니다. 자세한 내용은 [템플릿과 자료](creation-resources.ko.md).

<a id="connections-initialization-and-backup"></a>

## 연결, 초기화, 백업

SQLite는 foreign_keys, WAL, busy_timeout=5000, 그리고 synchronous=FULL을 지원합니다. 소스 개발에서는 사용됩니다. `data/v1/doca.db`; Compose는 지속됩니다 `/data/doca.db` doca_data에 있습니다. 신뢰할 수 있는 백업은 WAL을 일관되게 포함해야 하거나 SQLite 백업/체크포인트 절차를 사용해야 합니다; 활발하게 쓰이는 .db만 복사하는 것은 충분하지 않습니다.

PostgreSQL은 기본적으로 10개의 풀을 사용하는 pg를 사용합니다. 운영자들은 환경 설정을 통해 그 URL과 스키마를 설정합니다. 여러 복제본을 위해서는 공유된 PostgreSQL, Redis, 그리고 접근 가능한 파일 저장소가 필요합니다. 자세한 내용은… [수평 확장](horizontal-scaling.ko.md)드라이버 지원 및 기록된 격리 검사는 실제 데이터베이스와 객체 서비스에 대한 인증을 대체할 수 없습니다.

호스트와 AI 모듈은 별도로 설정된 데이터베이스 연결을 사용할 수 있습니다. 자격증명 마스터 키를 포함한 모든 설정된 데이터베이스, 참조 파일 저장소, 보호된 배포 설정도 백업해야 합니다. 이를 생산 복구 전에 격리된 환경으로 일관되게 복원해야 합니다.

<a id="identifiers-and-concurrency"></a>

## 식별자와 동시성

- 대부분의 리소스/계정 ID는 무작위 UUID 문자열입니다. 프로토콜 디그스트, 싱글턴 ID, 작업 키는 명시된 형식을 사용합니다.
- 시간은 UTC ISO 8601 문자열입니다. 순서를 정하기 위해 하나의 표준화된 형식을 유지하세요.
- 크로스 데이터베이스 부울 값은 정수 0/1로 표현되며, 일반적으로 API 부울 값으로 변환됩니다. JSON은 선언된 대로 텍스트 형태로 저장됩니다.
- 메타데이터 버전, 설정 수정 버전, 권한 수정 버전, 공동 작업 시퀀스/에포크, 및 운영 영수증은 각각 다른 의미를 가지며, 한 가지를 다른 것으로 대체해서는 안 됩니다.
- 소프트 삭제는 제공된 deleted_at을 사용합니다; 모든 테이블에 삭제 열이 있는 것은 아닙니다. 복합 키, 고유 인덱스, 외래 키, 그리고 시리얼라이즈된 트랜잭션이 관련 제약 조건을 강제합니다.
- 요청 JSON은 일반적으로 캐멘케이스를 사용하지만, 리소스/데이터베이스 프로젝션은 스네이크케이스를 사용할 수 있습니다. 확인해 주세요. [HTTP API](api.ko.md).

<a id="resources-discovery-and-authorization"></a>

## 리소스, 발견, 및 권한 부여

리소스는 문서와 라이브러리의 정체성을 모두 포함합니다. 지원되는 형식으로는 rich_text, markdown, 스프레드시트, 캔버스, 프레젠테이션이 있습니다. owner_id는 보조금과는 별도로 단일 소유자를 식별합니다. access_mode는 inherit/custom이며, visibility는 invited/requestable/authenticated/public입니다. 권한 부여와 발견은 별개입니다: 발견 가능한 제목이나 컬렉션 항목은 내용에 대한 접근 권한을 부여하지 않습니다.

개인 문서는 kind=document, owner_id=현재 사용자이며, library_id나 parent_id는 없습니다. 라이브러리는 서로 중첩될 수 없습니다. 문서는 하나의 위치만을 가질 수 있으며, 부모는 같은 라이브러리에 속해 있어야 하고 부모 체인은 순환될 수 없습니다. 외래 키는 끊긴 참조를 방지하며, 핵심 트랜잭션은 행 간 트리 규칙을 검증합니다. 수동 SQL은 여전히 불변성을 위반할 수 있으며 지원되는 제품-작성 API가 아닙니다.

보조금 키는 `(resource_id,user_id,source_type,source_id)`direct/link/parent_override는 현재 권한 평가를 수행하며, active/disabled 상태도 반영합니다. share_links와 share_link_revocations는 링크의 생성, 접근, 취소 사실을 기록합니다. 초대장, 요청, 컬렉션, 항목, 티켓은 각각 다른 작업 흐름을 가집니다. 읽기 [권한](permission-inheritance.ko.md) 그리고 [발견](public-resource-discovery.ko.md) 정확한 규칙을 위해.

last_editor_id/last_edited_at 레코드는 실제 생성, 독립적인 복사, 이름 변경 및 유효한 내용 업데이트를 처리합니다. 읽기, 변경되지 않은 동기화, 권한 변경은 이를 다시 작성하지 않습니다. 방문은 개인적이며 현재 접근 및 삭제에 따라 필터링됩니다. user_preferences는 낙관적 버전 조건을 사용하며, 첫 번째 저장된 레코드 이전에는 기본 버전=0이 됩니다; 프로필 수정값을 공유하지 않습니다.

<a id="content-references-and-collaboration"></a>

## 콘텐츠, 참고 자료, 그리고 협업

저장된 콘텐츠는 document_states/checkpoints와 document_updates를 사용하며, 편집기/Markdown epoch과 receipt은 순서 있는 작업을 식별하고 중복된 재시도를 제거합니다. document_versions는 복구 데이터와 함께 비즈니스 기록을 저장합니다. Codec, schema, baseline, seq, epoch은 편집기에 특화된 것으로, 이 다섯 가지 형식 모두 각각의 구현된 저장 방식을 사용합니다. 자세한 내용은...을 참조하세요. [협력 계약](collaboration-sdk-contract.ko.md), [협력 가이드](collaboration.ko.md), 그리고 [편집기 통합](editor-integration.ko.md).

문서 참조, 통합 이벤트, 대기 중인 이벤트, 프로젝션 작업/커서, 그리고 검색 조정은 권한 있는 콘텐츠/권한을 파생된 인덱스와 분리합니다. 참조는 접근 권한을 부여하지 않습니다. 검색 설정/작업/모델 지문 및 조정 항목은 평문 모델 비밀을 중복하지 않고 설정 및 수정 상태를 추적합니다. 프로젝션 실패 시 성공적인 콘텐츠 저장을 조작해서는 안 됩니다.

댓글은 루트/답변 관계, 본문/본문_JSON, 선택적 현재 프로토콜 앵커, 해결 상태 및 삭제 상태를 유지합니다. 댓글 텍스트/리치 콘텐츠는 안전하게 렌더링됩니다. 알림에는 수신자, 행위자, 중복 제거/티켓 필드 및 선택적 플러그인 메타데이터가 포함됩니다. 감사/보안 기록에는 복사된 문서 본문이 아닌 행동 메타데이터가 포함됩니다. 자세한 내용은...을 참조하세요. [댓글과 알림](comments-and-community.ko.md) 그리고 [인증](authentication.ko.md).

<a id="files-and-plugin-state"></a>

## 파일과 플러그인 상태

storage_profiles는 stable id, active, and created_at만 포함합니다. 백엔드 설정 및 자격 정보는 환경에서 제공되며, 이 기준 버전에는 제공자/설정 열이나 쓰기 가능한 관리자 스토리지 설정이 없습니다. assets와 file_storage_objects는 stable store/object 식별자를 유지합니다; file_items/folders/bindings, derivatives, extracts, 및 operation receipt는 사용자 파일과 콘텐츠 처리를 관리합니다. 파일 바이트는 데이터베이스 행과는 별개입니다. 문서나 역사 행을 참조하는 공유 물리적 객체가 삭제된 경우, 공유 물리적 객체를 절대 삭제하지 마십시오. 자세한 내용은...을 참조하십시오. [파일 저장](storage.ko.md).

플러그인 명명空间은 플러그인 ID, 명명空间, 데이터 버전, 생성 번호, 상태 및 선언된 정의를 결합합니다. 관리되는 SQL 비즈니스 테이블은 별도의 공유 플러그인 비즈니스 데이터베이스에 존재하며, 테이블은 스키마의 고정 목록이 아닌 플러그인 저장 서비스를 통해 선언됩니다. 개인 객체, 쓰레기 레코드, 불변 아카이브, 레지스트리 상태, WebView 세션 및 네비게이션 설정은 호스트가 관리합니다. plugin_credentials는 명명空间/생성 번호/수정 버전과 함께 암호화된 봉인된 값을 저장하며, plugin_credential_keys는 마스터 키가 아닌 키 피드백을 저장합니다. 자세한 내용은...을 참조하십시오. [플러그인 스토리지](plugin-horizontal-scaling.ko.md) 그리고 [자격 증명](plugin-credentials.ko.md).

<a id="ai-and-knowledge-workflows"></a>

## AI와 지식 워크플로우

AI 세션은 사용자가 언급한 리소스, 명시적으로 승인된 리소스, 그리고 표시/기록 연관성을 구분합니다. resource_ids만으로는 모델 접근 권한을 부여할 수 없습니다. 작업은 승인 요약과 매개변수 요약을 저장하며, 승인을 기다리는 동안 임대권을 포기하고, 인증된 소유권 확인 후에만 다시 시작됩니다. AI 호출은 원본 사용 사실을 보존하며, 회계/정책 비즈니스 모듈은 이를 대체하지 않습니다. 비밀, 기술, MCP 키, 메모, 운영 영수증, 세션 이벤트는 별도의 테이블과 접근 경계를 가지고 있습니다.

원본 소스 구독, 섹션 및 링크는 인덱싱/검색 기능을 유지합니다. 아래의 지식북 테이블들은 수정 가능한 설정 기록, 기여자 소스, 피드백, 워크플로우 실행 기록, 불변된 릴리스 및 인간 작업을 보존합니다. 원본 소스 권한은 모든 파생된 결과를 보호합니다. 오래된 큐레이션 및 Q&A 테이블은 새 데이터베이스에는 존재하지 않으며, 오래된 기록은 절대 마이그레이션되거나 삭제되지 않습니다.

MCP 서비스는 사용자 스위치, 해시된 서비스 자격 증명/허가, 실행 컨텍스트, 그리고 최대 한 번만 호출하는 클레임에 대해 네 개의 별도 테이블을 사용합니다. `ai_mcp_keys` 퇴역되었으며, 역사적 데이터를 보존하기 위해서만 유지됩니다. 실행 시간 동안은 절대 읽지 않습니다. 참고하세요. [MCP 서비스](mcp.ko.md).

<a id="current-table-and-field-inventory"></a>

## 현재 테이블 및 필드 목록

아래 목록은 현재 스키마 인터페이스를 반영합니다. 필드 이름은 모두 기재되어 있습니다; 정확한 SQL 타입, nullability, 기본값, 주요/유일 키, 외래 키는 create-schema.ts에 정의되어 있습니다. 선택적 TypeScript 속성은 nullable SQL 컬럼을 의미하지 않습니다. 이는 참고 자료일 뿐, 테이블을 수동으로 생성하거나 수정하는 지침은 아닙니다.

| 표 | 필드 |
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
