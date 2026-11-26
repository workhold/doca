<a id="sdd-module-index"></a>

# SDD 모듈 인덱스

그것 [데스크톱 클라이언트](desktop-client.ko.md) 타우리 셸을 넘어서, 원격 호스트 인증, 패키지된 웹 전송 및 창 세션 기능을 제공합니다. 기능 수용 및 검증이 실시간으로 이루어집니다. [`specs/006-desktop-client`](../specs/006-desktop-client/spec.md) 그리고 [`specs/007-desktop-workspace-tabs`](../specs/007-desktop-workspace-tabs/spec.md).

[中文](sdd-module-index.zh-CN.md) · [워크플로우](sdd.ko.md)

이 인덱스는 기존 모듈들을 소스, 현재 계약 및 재사용 가능한 검사와 연결합니다. 기존 기능성을 인증하거나 과거 수락 내역을 다시 실행하는 것은 아닙니다. 작업 전에 실제 출력 내용과 락파일 버전을 확인하고, [건축학](architecture.ko.md) 현재 제한 사항에 대한 적용 가능한 릴리스 노트도 포함됩니다. 모듈을 변경할 때 새로운 SDD를 추가하고, 같은 PR에서 그 SDD의 권위 있는 계약을 업데이트해야 합니다.

| 모듈 | 출처 항목 | 현재의 계약 및 지침 | 재사용 가능한 수표 |
| --- | --- | --- | --- |
| 호스트 구성 및 생명주기 | [서버](../apps/server/src), [핵](../packages/core/src) | [건축](architecture.ko.md), [개발](development.ko.md) | [호스트 격리/통합](../tests/cloud.test.ts) |
| 인증, 권한 및 그룹 | [핵심 규칙](../packages/core/src), [HTTP 경로](../apps/server/src/routes) | [인증](authentication.ko.md), [권한](permission-inheritance.ko.md), [그룹들](user-groups.ko.md) | [권한](../tests/permissions-v2.test.ts), [상속](../tests/permission-inheritance.test.ts), [그룹들](../tests/user-groups.test.ts) |
| 문서 편집자와 파일 교환 | [문서 UI](../apps/web/src/features/documents), [문서 핵심](../packages/core/src/modules/documents) | [편집기 통합](editor-integration.ko.md), [파일 교환](editor-file-exchange-contract.ko.md); 저장소 편집기 기술 | [패키지 업그레이드](../tests/editor-package-upgrade.test.ts), [통합](../tests/document-integration.test.ts), [PDF](../tests/document-pdf.test.ts) |
| 협력, 존재감, 그리고 의견 | [문서 코덱](../packages/core/src/modules/documents/codecs), [서버 서비스](../apps/server/src/services) | [협력 계약](collaboration-sdk-contract.ko.md), [댓글](comments-and-community.ko.md); 저장소 협업 능력 | [협력](../tests/collaboration.test.ts), [선택](../tests/rich-text-collaboration-selection.test.ts) |
| 데이터베이스 구조 및 저장 형식 | [DB 패키지](../packages/db/src), [현재의 DDL](../packages/db/src/create-schema.ts) | [업그레이드 계약](database-schema-evolution.ko.md), [스키마 인벤토리](database.ko.md) | [화해](../tests/schema-reconciliation.test.ts), [컬럼 정렬](../tests/schema-column-alignment.test.ts), [PostgreSQL CI](../.github/workflows/database-upgrade.yml) |
| 파일, 저장소, 역사 | [파일 경로](../apps/server/src/routes/files.ts), [문서 핵심](../packages/core/src/modules/documents) | [저장](storage.ko.md), [문서 동작](document-experience.ko.md) | [파일들](../tests/files.test.ts), [저장](../tests/storage.test.ts), [역사](../tests/history-storage.test.ts) |
| 플러그인 설치 및 공개 SDK | [SDK](../packages/plugin-sdk), [플러그인 호스트](../packages/plugin-host), [웹 등록 시스템](../packages/web-plugin-registry) | [SDK 계약](plugin-sdk-contract.ko.md), [개발](plugin-development.ko.md), [저장](plugin-horizontal-scaling.ko.md) | [SDK](../tests/plugin-sdk.test.ts), [매니저](../tests/plugin-manager.test.ts), [관리형 저장소](../tests/plugin-managed-storage.test.ts) |
| AI 실행, 도구 및 사용법 | [AI 코어](../packages/core/src/modules/ai), [서버 AI 서비스](../apps/server/src/services/ai), [호스트 패키지](../packages/ai-host) | [AI의 경계](ai-efficiency.md), [첨부파일](ai-attachments.md), [연속성](plugin-ai-continuations.ko.md), [SDK 계약](plugin-sdk-contract.ko.md) | [능력](../tests/plugin-ai-capability.test.ts), [연속성](../tests/ai-continuations.test.ts), [문서를 읽습니다.](../tests/ai-document-read.test.ts) |
| 검색 및 지식 책 | [호스트 검색](../packages/search-host), [지식](../packages/core/src/modules/knowledge), [책들](../packages/core/src/modules/knowledge-books) | [콘텐츠 제공자](plugin-content.ko.md), [지식 책](knowledge-books.ko.md), [체크포인트](knowledge-book-generation-performance.ko.md) | [검색](../tests/search-host-query.test.ts), [책들](../tests/knowledge-books.test.ts), [페이로드 저장](../tests/knowledge-book-payload-storage.test.ts) |
| MCP와 브라우저 어시스턴트 | [MCP 경로](../apps/server/src/routes/mcp-management.ts), [확장 기능](../apps/browser-extension) | [MCP](mcp.ko.md), [브라우저 어시스턴트](browser-assistant.ko.md) | [MCP](../tests/mcp.test.ts), [클리퍼](../tests/browser-clipper.test.ts), [조수](../tests/browser-assistant.test.ts) |
| 웹 셸, 네이티브 클라이언트 및 언어 | [웹](../apps/web/src), [모바일](../apps/mobile), [i18n](../packages/i18n) | [네이티브 통합](plugin-native.ko.md), [i18n](i18n.ko.md); 리포지토리 i18n 기술 | [언어](../tests/i18n.test.ts), [네이티브 세션](../tests/plugin-mobile-session.test.ts), [기본 능력](../tests/plugin-native.test.ts) |
| 작업, 웹호크, 멀티인스턴스 운영 | [작업 호스트](../packages/job-host), [웹호크](../apps/server/src/services/webhooks) | [웹호크](webhooks.ko.md), [수평 확장](horizontal-scaling.ko.md), [플러그인 스토리지](plugin-horizontal-scaling.ko.md) | [웹호크](../tests/webhooks.test.ts), [클러스터 모니터링](../tests/plugin-monitoring-cluster.test.ts) |
| 포장, 배포 및 문서화 | [스크립트](../scripts), [도커](../docker), [워크플로우](../.github/workflows) | [배포](deployment.ko.md), [문서화](documentation.ko.md), [확인 지수](verification/README.md) | [문서 검사기](../scripts/tests/documentation.test.mjs), [SDD 체크어](../scripts/tests/sdd.test.mjs), 모듈/출시에 특정한 스크립트 |

테스트 링크는 진입점이지만 모든 변경 사항에 대한 충분한 테스트 계획은 아닙니다. 수락 기준과 실제 경계에 따른 검사를 선택하세요: SQLite 결과만으로는 PostgreSQL 업그레이드를 증명할 수 없으며, 모의 데이터는 외부 공급자를 증명할 수 없고, 로컬 테스트는 네이티브 기기나 프로덕션 배포를 증명할 수 없습니다. 해당 영역을 변경하기 전에 적용 가능한 기술을 숙지하세요. 기존에 독립적으로 버전 관리된 편집기 패키지와 비즈니스 플러그인은 각각 별도의 저장소 검사와 명시적인 통합-버전 기록이 필요합니다.
