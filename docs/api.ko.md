<a id="http-api"></a>

# HTTP API

[中文](api.zh-CN.md)

이것은 주요 호스트 0.2.23 경로의 인덱스입니다. 실행 중입니다. `/api/openapi.json` 등록된 경로와 스키마를 설명합니다; 서버 코드는 권한 설정, 주석이 없는 필드, 그리고 동작 제한을 정의합니다. 이전 인터페이스는 그대로 유지됩니다. [연구](research.ko.md) 그리고 오늘 사용 가능하다고 가정할 수 없습니다.

<a id="conventions"></a>

## 관례/전통

표 경로에는 `/api/v1` 전제. 브라우저는 HttpOnly 세션 쿠키를 사용하며, 작성 시 설정된 Host와 동일 원본 Origin이 필요합니다. 네이티브 클라이언트는 호스트 인증 Bearer 세션을 사용하고, 플러그인 WebView는 제한된 플러그인 세션을 사용합니다. 공개 리소스는 권한이 부여된 읽기 경로만 노출합니다.

메타데이터 `version`, 설정 `revision`, 그리고 내용 `seq`/`epochId` 각각 다른 역할을 가지고 있습니다. 저장하기 전에 현재 값을 확인하세요. 409은 충돌이 있거나 지원되지 않는 프로토콜/상태를 의미하며, 덮어쓰는 권한은 없습니다. 페이징 방식은 경로에 따라 다릅니다. 그대로 따르세요. `nextCursor` 아니면 `nextOffset`누락된 콘텐츠 접근은 일반적으로 404를 반환하며, 시스템 관리자는 개인 콘텐츠 접근을 허용하지 않습니다.

<a id="accounts-and-administration"></a>

## 회계 및 관리

| 노선 | 목적과 허가 |
| --- | --- |
| `GET /bootstrap` | 현재 사용자, 사이트, 능력, 로드된 플러그인; 비밀 정보 없음 |
| `POST /auth/login`, `POST /auth/logout` | 비밀번호 로그인 / 로그아웃 |
| `POST /auth/register` | 입학 정책에 따른 등록; 대기 중인 학생은 세션을 받지 않습니다. |
| `GET /me` | 자신의 프로필과 선호도 |
| `GET /auth/providers` | 사용 가능한 신원 제공자 |
| `GET /admin/users` | 상태/q/커서를 포함한 관리자 사용자 쿼리 |
| `PATCH /admin/users/:id` | `{status:active\|disabled}`일반 사용자는 활성화/비활성화할 수 있음; 대기 중인 경우는 등록 검토가 필요함 |
| `GET /admin/registration-reviews` | 관리자 검토 목록 |
| `POST /admin/registration-reviews/:id` | `{decision:approved\|rejected,message?}`, 헌신적인 리뷰 |
| `GET /admin/stats` | 콘텐츠 허가 없이 집계된 통계 |
| `GET /admin/users/:id/resource-handover` | 비활성 계정 리소스 인벤토리; 관리자 전용 |
| `POST /admin/users/:id/resource-handover/preview`, `POST /admin/users/:id/resource-handover/execute` | 미리보기 / 선택된 소유권 및 권한을 확인하고 승인합니다; 보기 [자원 이전](admin-resource-handover.ko.md) |

연락 확인, 복구, 신원 연동, 보안 확인, 계정 정책, 그리고 콜백 기능이 포함되어 있습니다. [인증](authentication.ko.md). 플랫폼 자격 증명을 사용합니다 [서비스 설정](service-credentials.ko.md); 플러그인은 별도의 것을 사용합니다 [암호화된 자격 증명 서비스](plugin-credentials.ko.md).

<a id="documents-permissions-and-history"></a>

## 문서, 권한, 그리고 기록

| 노선 | 목적 |
| --- | --- |
| `GET /resources`, `GET /resources/:id` | 승인된 목록/상세 정보 |
| `POST /resources` | 문서/라이브러리를 생성합니다. 문서 형식은 rich_text/markdown/스프레드시트/프레젠테이션/캔버스입니다. |
| `PATCH /resources/:id` | 버전과 함께 메타데이터 업데이트 |
| `PUT /resources/:id/permissions` | 버전을 포함한 허가 설정 |
| `POST /resources/:id/transfer`, `POST /resources/:id/move` | 소유권 이전/이전 |
| `POST /resources/:id/copy` | 독립적인 사본 |
| `POST /resources/:id/trash`, `POST /resources/:id/restore` | 쓰레기 / 복원 |
| `GET /resources/:id/versions`, `POST /resources/:id/versions` | 역사 / 매뉴얼 스냅샷 |
| `GET /resources/:id/versions/:versionId` | 미리보기; 스프레드시트/슬라이드/캔버스 canRestore는 false입니다 |
| `POST /resources/:id/versions/:versionId/restore` | `{expectedSeq}`, 서식 있는 텍스트/마크다운을 위한 관리자 복원 |
| `POST /share/redeem` | 로그인된 미리보기 또는 문서 링크의 수락 |

콘텐츠 편집은 사용됩니다 `/api/v1/ws`; 보기 [협력](collaboration.ko.md)필드, 보조 자원, 그리고 상속은 있습니다. [권한](permission-inheritance.ko.md)공유와 역사는 있다. [문서 가이드](document-experience.ko.md).

<a id="comments-notifications-and-discovery"></a>

## 댓글, 알림, 발견

댓글을 작성하세요. `POST /resources/:id/comments` 그리고 `{richBody,parentId,anchor?}`. `richBody` 버전 1의 구조화된 코멘트입니다; 이전의 일반 텍스트 형태입니다. `body` 요청이 거부되었습니다. 업데이트하세요. `PATCH /resources/:id/comments/:commentId`댓글 버전과 richBody/deleted/resolved를 제공합니다. 단일 레벨의 답변, 이미지, 언급, 앵커에 대해 설명되어 있습니다. [댓글과 알림](comments-and-community.ko.md).

알림을 사용합니다. `GET /notifications`, `POST /notifications/read`, 그리고 `POST /notifications/read-all`WebSocket 불일치가 새로운 권한 부여된 읽기 작업을 트리거합니다. 발견, 컬렉션, 최근 활동, 그리고 초대장 정보도 포함됩니다. [발견](public-resource-discovery.ko.md); 참고 자료와 자산 다운로드는 여기에 있습니다 [편집기 통합](editor-integration.ko.md).

<a id="search"></a>

## 검색

`GET /search/documents` 현재 읽을 수 있는 문서를 검색합니다. 키워드 모드는 알림과 함께 데이터베이스로 전환될 수 있습니다; 벡터 모드는 Meilisearch와 모델이 필요합니다. 결과는 현재 접근 권한을 확인합니다; 인덱스 포함은 어떠한 권한도 부여하지 않습니다.

행정부가 사용함 `GET/PUT /admin/search`, `POST /admin/search/reindex`, `POST /admin/search/reconcile`, `/admin/search/embeddings`, `/admin/search/embeddings/status`, 그리고 `/admin/search/relevance`202번 구성 결과는 대기 중이라는 의미이며, 쿼리 작업이 완료된 것입니다. 모델이나 자격 정보의 변경은 설정을 다시 적용해야 합니다. 이미지 인식 정책은 현재 설정만 저장하는 기능만 제공하며, 이를 활성화해도 검색을 위한 OCR 파이프라인이 작동하지 않습니다.

<a id="files-and-storage"></a>

## 파일과 저장소

자산 업로드가 사용됩니다. `POST /assets?purpose=&filename=&resourceId=` 아바타/커버/첨부파일/코멘트 이미지와 목적에 맞는 권한으로 다운로드됩니다. `GET /assets/:id/content`, 함께 `?download=1` 첨부 파일 처리에 관한 내용입니다. 아바타/커버/코멘트 이미지는 5 MiB까지 허용되며, 문서 첨부 파일은 20 MiB까지 허용됩니다. 일반 플랫폼 파일은... `/files` 별도의 제한이 있는 경로와 다단계 워크플로우.

`GET /admin/storage` 배포 서버를 보고합니다. `PUT /admin/storage` 405 에러 반환. 환경 변수는 서버와 자격 정보를 설정합니다; 참조하세요. [파일 저장](storage.ko.md).

<a id="ai-knowledge-and-plugins"></a>

## AI, 지식, 그리고 플러그인

AI 세션과 작업은 사용됩니다 `/ai`도구는 세션 범위, 실제 리소스 권한, 그리고 승인을 고려합니다. `POST /ai/jobs/:id/approval` 가지다 `{approvalId,approved}` 작업 소유자로부터; 승인은 리소스 ACL을 변경하지 않습니다.

`POST /mcp` 전용 서비스 Bearer 토큰을 사용하여 Streamable HTTP을 노출합니다. 개인 설정은 사용됩니다. `GET/PUT /me/mcp` 그리고 `/me/mcp-services`; 회사 통합 작업에 사용됨 `/admin/mcp-services` 그리고 목표를 통과해야 합니다. `userId` 모든 MCP 작업에서. 서비스 업데이트/재설정/폐기는 현재 버전이 필요합니다. 토큰은 생성/재설정 시에만 표시됩니다. 참조하세요. [MCP 설정, 도구 발견 및 파일 전송](mcp.ko.md).

지식-북 명령어, 워크플로우 실행, 인간 작업 및 소스 구독에 대해 설명되어 있습니다. [지식 책](knowledge-books.ko.md). 통합된 소스가 사용됨 `/content`; 보기 [콘텐츠 프로토콜](plugin-content.ko.md)플러그인을 설치한 비즈니스 루트를 사용합니다. `/plugins/:pluginId/...` 로드된 릴리스에 의존합니다. 호스트에는 빠른 메모나 이메일 비즈니스 API가 없습니다; 참조하세요. [능력과 한계](features.ko.md).

<a id="health-and-source"></a>

## 건강과 출처

`GET /health`, `GET /live`, 그리고 `GET /ready` 생략하세요 `/api/v1` 프리픽스와 호스트 버전을 보고합니다. 준비 상태는 데이터베이스와 설정된 Redis를 확인하며, 모든 외부 서비스를 검증하지는 않습니다.

출처: [응용 프로그램](../apps/server/src/app/create-app.ts), [루트 디렉터리](../apps/server/src/routes), [역사](../apps/server/src/routes/experience.ts), [실시간 게이트웨이](../apps/server/src/services/realtime/gateway.ts).
