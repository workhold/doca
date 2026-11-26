<a id="architecture-and-implementation-boundaries"></a>

# 아키텍처와 구현의 경계

[中文](architecture.zh-CN.md)

기준: 호스트 0.2.23 / SDK 0.1.11, 문서는 2026-10-28에 소스와 비교하여 검토되었습니다. 이는 구현된 어셈블리와 경계를 설명하며, 배포에 특정한 서비스와 장치 동작은 별도의 승인이 필요합니다. 시작하세요. [능력과 한계](features.ko.md).

<a id="application-and-modules"></a>

## 애플리케이션 및 모듈

Doca는 TypeScript 모듈식 모노리스입니다. 개발은 하나의 브라우저 원본 뒤에 별도의 포트에서 React/Vite와 Fastify를 실행합니다. 프로덕션에서는 빌드된 웹 앱과 API를 Fastify를 통해 제공합니다. Cordis는 인프로세스 서비스와 생명주기를 관리하며, 공개 SDK는 플러그인의 경계를 정의합니다.

```text
Browser: React + five document editors
  │ same-origin HTTP / WebSocket; host-authenticated sessions
Fastify: Host/Origin validation, routes, security, static files
  │
Host composition: accounts, documents, files, search, AI, knowledge
  │ trusted business plugins discovered in the installation directory
Core domain rules / Kysely database access
  │
SQLite single instance, or shared PostgreSQL + Redis + file backend
```

기본 호스트에는 서식 있는 텍스트, 마크다운, 스프레드시트, 슬라이드, 캔버스, 문서 권한, 디스커버리, 파일, 소스 구독 및 지식 북, 인증, 등록 검토, 보안 감사, 그리고 원시 AI 사용 사실이 포함됩니다. 퀵 노트, 이메일, 캘린더, 멤버십, 결제, 비즈니스 할당량, 그리고 모더레이션은 독립적인 비즈니스 문제이며, 기본적으로 그러한 제공자가 설치되어 있지 않습니다. 템플릿/자료/요소는 기본 제공자가 없는 인터페이스를 노출합니다.

<a id="directories"></a>

## 디렉터리

| 경로 | 책임 |
| --- | --- |
| `apps/server/src/main.ts` | 스타트업, 듣기, 셧다운 |
| `apps/server/src/bootstrap/config.ts` | 기원, 데이터베이스, 프록시, Redis 설정 |
| `apps/server/src/app/create-app.ts` | HTTP 경로, 세션 및 보안 경계 |
| `apps/server/src/plugins/composition.ts` | 내장 서비스와 설치된 플러그인 어셈블리 |
| `apps/server/src/routes` | HTTP 엔드포인트 호스트 |
| `apps/server/src/services` | 실시간, 검색, AI 및 기타 애플리케이션 서비스 |
| `apps/web/src/app/app.tsx` | 작업 공간 라우팅 및 기능 조립 |
| `apps/web/src/features/documents/document-editor.tsx` | 5개의 설치된 편집기 패키지에 배포 |
| `packages/core/src` | 도메인 규칙, 권한 부여 및 거래 |
| `packages/db/src/create-schema.ts` | 새로운 생성 및 시작 시 정합성 확인을 위한 현재 목표 DDL |
| `packages/plugin-sdk` | 공용 서버/웹/플러그인 인터페이스 |
| `tests` | 분리된 단위 및 통합 검사 |

웹 코드는 데이터베이스나 비밀번호의 내부 구조를 가져오는 대신 HTTP DTO를 사용합니다. 비즈니스 플러그인은 배포된 SDK 서비스를 사용하며, 호스트 소스를 가져오거나 글로벌 런타임 브리지를 생성하지 않습니다. 참조하세요. [플러그인 아키텍처](plugin-architecture.ko.md) 그리고 [실행 인벤토리](plugin-sdk-contract.ko.md).

<a id="identity-and-security"></a>

## 정체성과 보안

한 배포에는 조직/공간/테넌트 테이블이 없는 계정 시스템이 하나 있습니다. 등록 및 외부 공급자는 비활성화된 상태로 시작되며, 기본 관리자는 존재하지 않습니다. 비밀번호는 scrypt와 무작위 염기를 사용하며, 데이터베이스는 세션 디게스트를 저장합니다. 브라우저, QR-로그인 및 WebView 세션은 기본적으로 24시간이며, 모바일 보유자 세션은 180일로 설정됩니다. 두 세션 기간 모두 설정 가능합니다. [세션 설정](configuration.ko.md#login-lifetime)비밀번호 변경 및 계정 비활성화는 세션을 취소합니다.

모든 요청은 설정된 Host를 확인합니다. 변경 작업도 동일 원본 Origin을 확인합니다. 사이트 쿠키는 HttpOnly, SameSite=Strict, 그리고 HTTPS를 통한 Secure 상태입니다. 인증 어댑터는 외부 OIDC 및 소셜 제공자를 지원하며, 확인 및 복구 기능이 구현되어 있으며 확인 게이트웨이가 필요합니다. 등록 승인에는 전용 검토 워크플로우가 있습니다. Doca는 OIDC 제공자로서 SAML 및 IdP 전체에 걸친 로그아웃 기능은 제공되지 않습니다. 참고하세요. [인증](authentication.ko.md).

관리자는 개인 콘텐츠에 대한 접근 권한을 부여하지 않습니다. 읽기 접근이 없으면 일반적으로 404 에러가 발생하며, 권한이 있는 독자가 조치를 취하지 않으면 403 에러가 발생합니다. ACL, 상속된 권한, 게시, 컬렉션, 공유에는 각각 다른 규칙이 있습니다. 숨겨진 조상은 공개되지 않습니다. 자세한 내용은 참조하세요. [권한](permission-inheritance.ko.md) 그리고 [발견](public-resource-discovery.ko.md).

<a id="persistence-and-collaboration"></a>

## 끈기와 협력

문서 메타데이터는 HTTP와 버전 확인을 사용합니다. 다섯 가지 편집기 형식 모두는 형식별 Yjs 코덱을 사용하는 하나의 호스트 WebSocket 라이프사이클을 갖습니다. 서버는 내용을 검증하고, 권한 확인을 다시 수행한 후 인정하기 전에 커밋합니다. 메타데이터 버전, 내용 순서, 에포크, 스키마, 역사 ID는 각기 다릅니다. 역사는 모든 형식에서 사용 가능하지만, 복원 기능은 현재 서식 있는 텍스트와 Markdown만 지원합니다. 자세한 내용은 참조하세요. [협력](collaboration.ko.md) 그리고 [문서 역사](document-experience.ko.md).

SQLite, AI 및 웹호크 저장소와 로컬 파일은 단일 인스턴스에 적합합니다. PostgreSQL은 별도의 웹호크 데이터베이스와 AI 스키마를 사용합니다. 여러 복제본을 위해서는 공유 데이터베이스, 파일 백엔드 및 이벤트, 존재 여부, 제한 사항을 위한 Redis가 필요합니다. Redis가 없으면 이러한 구현은 프로세스별로 작동합니다. 설정된 Redis가 실패하면 무시되지 않고 자동으로 대체되지 않습니다. 데이터베이스 작업은 프로세스 메모뿐만 아니라 임대/아웃박스를 사용합니다. 자세한 내용은 참조하세요. [설정](configuration.ko.md) 그리고 [수평 확장](horizontal-scaling.ko.md).

오브젝트는 안정적인 스토어 ID와 오브젝트 참조를 유지합니다. 환경 설정은 물리적 스토어를 선택하며, 스토리지 관리 페이지는 읽기 전용입니다. 개인 다운로드는 접근 권한을 다시 확인해야 합니다. CDN은 만료된 권한을 부여된 URL을 제공하며, 스토리지를 대체하지 않습니다. 백업에는 모든 데이터베이스, 참조된 서버, 플러그인 아카이브 및 보호된 설정이 포함됩니다. 자세한 내용은...을 참조하세요. [파일 저장](storage.ko.md).

설치된 플러그인은 공유 레지스트리 기록과 불변 아카이브를 사용하며, 시작 시 복원되는 개별 인스턴스별 캐시를 통해 작성도 가능합니다. 수동 재시작을 통해 원하는 릴리스를 활성화할 수 있습니다. 관리되는 개인적 SQL, 객체 및 자격 증명이 구현되었지만, 작업 소진, 임시 작업 공간 및 더 강력한 프로세스 격리 문제는 여전히 해결되지 않은 부분입니다. 정확한 버전 검증은 지원되지 않는 기준 또는 구조를 거부하며, 이곳에는 마이그레이션이나 호환성 어댑터가 추가되지 않습니다. 기존 데이터는 보존되어야 합니다. 참조하세요. [출시 요구사항](releases/0.2.23.md) 그리고 [데이터베이스 업그레이드 계약](database-schema-evolution.ko.md).

<a id="current-limits-and-acceptance"></a>

## 현재의 제한 및 수용성

댓글 스레드와 알림에는 전용 페이징된 엔드포인트가 있습니다. 문서 세부 정보는 완전한 댓글 내보내기가 아닙니다. 지속적인 로컬 복제본과 아웃박스 기능이 구현되어 있지만, 완전한 오프라인 애플리케이션 셸은 제공되지 않습니다. 기본 장치 통합, 실시간 ID/AI 제공자, 프로덕션 S3/CDN, 타겟 인프라 장애 복구는 별도의 승인이 필요합니다. 자동화된 격리 테스트는 명시된 범위를 보여주지만, 빌드만으로는 모든 외부 서비스가 작동하는지 증명되지 않습니다.
