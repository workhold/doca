<a id="public-reads-and-ui-extensions"></a>

# 공개 읽기 및 UI 확장 기능

[中文](plugin-extensions.zh-CN.md)

이 참고 자료는 공개된 읽기 서비스와 재사용 가능한 웹 명령어, 뷰, 및 배치 방법을 다룹니다. 원래의 읽기/UI 추가 기능은 SDK 소스에 포함되어 있습니다. `0.1.4`; 문서 요소가 입력됨 `0.1.6`현재 호스트의 경우 SDK를 사용하세요. `0.1.9` 그리고 일치하는 것을 선언합니다. `sdkRange` 예를 들어 `^0.1.9`API에 의존하기 전에 설치된 호스트와 생성된 SDK 아티팩스를 확인하세요. 소스 구현은 npm 아티팩트나 배포가 업데이트되었음을 보장하지 않습니다.

<a id="public-services"></a>

## 공공 서비스

| 서비스 / 수출 | 방법 | 목적과 경계 |
| --- | --- | --- |
| `users.v1` / `@smartdoca/plugin-sdk/platform` | `me`, `searchPage`, `resolveDirectory`, `validateSelection` | 호노르 관리자는 모든/모두/관련 디렉터리 정책을 무시합니다; 검색은 공개 표시 예측을 보여줍니다; 자기 프로필 읽기 정보는 별도입니다. |
| `permissions.v1` | `registerDirectory` | 내부 모듈과 플러그인은 공유됩니다. `DirectorySource`; 관련 모드만 소스를 호출하고 후보자를 확인하며 사용자 ID를 병합합니다. |
| `documents.read.v1` / `@smartdoca/plugin-sdk/documents` | `get`, `readSnapshot`, `capabilities`, `references` | 문서 메타데이터, 완전한 저장된 네이티브 콘텐츠, 현재 기능 및 참조 정보; 내부 협업 서비스와는 별개로 `documents.v1` |
| `libraries.v1` / `@smartdoca/plugin-sdk/documents` | `list`, `children`, `path` | 확인 가능한 라이브러리, 페이지로 나뉜 직접적인 자녀 항목, 그리고 허가된 조상 경로; 콘텐츠는 별도의 허가가 필요함 |
| `files.v1` / `@smartdoca/plugin-sdk/files` | folders/files/uploads/bindings/content/receipts | 폴더 구조, 파일 정보, 허가된 스트림, 첨부 파일 바인딩, 업로드 및 영수증 |
| `content.v1` / `@smartdoca/plugin-sdk/content` | `list`, `read`, `resolve`, `search` | 콘텐츠 검색, 분석, 지식 구독; 원본 문서 구조를 대체하지 않습니다. |

토큰들은 `usersServiceToken`, `permissionsServiceToken`, `documentReadServiceToken`, `librariesServiceToken`, `filesServiceToken`, 그리고 `contentServiceToken`서버 요구 사항을 명시하세요. `injections.required` 그리고 구현을 통해 얻을 수 있습니다. `context.inject(token)`관계 소스에 기여할 경우에만 디렉터리 소스를 등록해야 합니다. 소스 ID는 플러그인 네임스페이스에 속해야 합니다. 등록은 라이프사이클이 담당하며, 라이프사이클이 해제할 때만 런타임 기여를 해제합니다.

`DirectorySource` schemaVersion 1과 관련된/검증 프로토콜을 유지합니다. 내장된 문서와 공유 폴더도 소스 정보를 기록합니다. 검색 결과는 아무것도 나타나지 않습니다; 사용하세요. `me` 자신만의 방식으로 읽기. 모든 질의는 소스를 호출하지 않고 직접 활성 사이트 계정에서 처리됩니다. 관련 집합은 활성 소스들을 병렬로 처리하며 후보자를 검증하고 계정 상태를 필터링합니다. 소스에서 온 후보자들은 오류, 반복되는 커서, 예산 초과, 또는 실행 중 등록 취소 등의 이유로 거부됩니다. 페이지화된 결과는 부분적인 소스 실패를 보고합니다. `complete: false`각 소스는 2초의 예산, 최대 40페이지, 그리고 페이지당 최대 250명의 후보자만을 허용합니다.

`searchPage({query,cursor?,limit?})` 반환 `{items,nextCursor,complete}`제한값은 1–100이며, 기본값은 20입니다. 커서는 호출자와 쿼리, 그리고 실제 디렉터리 모드를 결합합니다. 각 페이지마다 다시 권한이 부여됩니다. 페이징 중에 정책이 변경되면 409 응답이 나오며, 1페이지부터 다시 시작해야 합니다. `resolveDirectory({ids})` 그리고 `validateSelection({ids})` 최대 100개의 ID만 받아들이고 현재 디렉터리를 다시 확인합니다. 계정이 발견되었다고 해도 공유, 할당, 또는 비즈니스 리소스 권한은 부여되지 않습니다. 기존의 `search` 아직 최대 20개의 항목으로 구성된 배열을 반환합니다; 신뢰할 수 있는 서버 전용 `list` 브라우저에 노출되지 않습니다.

`readSnapshot({documentId,expectedRevision?})` 반환 `{documentId,format,codec,schemaVersion,revision,epochId,seq,content,assets}`지원되는 형식은 rich_text, markdown, 스프레드시트, 캔버스, 그리고 프레젠테이션입니다. content은 요약이나 Yjs 업데이트가 아닌 편집기의 기본 모델(마크down의 경우 문자열)입니다. revision은 실제 콘텐츠, 코덱/스키마, 에포크/시퀀스 정보를 포함하는 불투명한 콘텐츠 식별자이며, 메타데이터 버전과는 별개입니다. expectedRevision 불일치 시 409를 반환합니다. 공동 작업 에포크 없이 저장된 rich 텍스트는 반환되지 않습니다. `epochId: null` 새로운 시대를 창조하지 않고. 남아있는 상태가 없으면 초기화 없이 409를 반환합니다. 위의 16 MiB를 초과하는 JSON 본문은 413을 반환합니다.

일관된 트랜잭션은 저장되지 않은 편집기 변경 사항이나 콘텐츠, 기록, 또는 ACK을 섞지 않고 저장된 콘텐츠를 복원합니다. 자산은 저장 키, 물리적 경로, 저장된 임시 URL을 제외하고 현재 승인된 안정적인 파일Id/이름/mime만을 노출합니다. 기능은 현재 리소스 권한과 스냅샷 지원을 설명하지만, 공개 문서 작성 서비스를 의미하지는 않습니다.

도서관 목록/아동 반환물 `{items,nextCursor}`호스트의 현재 100개 항목 페이지를 사용하여, 아이들이 받아들인다. `{libraryId,parentId,cursor?}` 루트에서 parentId가 null인 경우; 경로는 허용됩니다. `{resourceId}`발견과 읽기는 다릅니다: 보이는 제목은 role=none일 수 있지만 본문 접근은 거부될 수 있습니다. 각 페이지는 접근을 다시 확인하며, 동결된 목록을 나타내지 않습니다. 불완전한 탐색으로는 콘텐츠가 삭제되었다는 것을 확인할 수 없습니다.

<a id="browser-and-app-webview"></a>

## 브라우저 및 앱 웹뷰

`PluginWebHost.platform` 이 애플리케이션 서비스에 대한 타입화된 클라이언트를 제공합니다.

```js
const page = await host.platform.users.searchPage({ query: "张", limit: 20 });
const self = await host.platform.users.me();
const snapshot = await host.platform.documents.readSnapshot(
  { documentId }, { signal: context.signal },
);
const children = await host.platform.libraries.children({ libraryId, parentId: null });
const folders = await host.platform.files.folders.list({ parentId: null });
```

사용자 클라이언트에는 me/searchPage/resolveDirectory/validateSelection이 포함됩니다; 문서와 라이브러리는 위의 모든 읽기 기능을 제공하며; 파일은 폴더.get/list와 파일.get/list 기능을 제공합니다. 파일 쓰기, 콘텐츠 스트림, 첨부파일 다운로드는 서버를 사용합니다. `files.v1` 또는 기존의 첨부 파일 기능; 스트림은 JSON이 아닙니다.

인증된 통화는 사용됩니다 `POST /api/v1/plugin-platform/{pluginId}/{operation}`설치된 플러그인 네임스페이스와 명시적으로 나열된 작업만 허용됩니다. 입력에는 주체, 모드 또는 임의의 서비스 이름이 포함될 수 없습니다. 응답은 캐시되지 않습니다. 기존의... `host.request` 플러그인에 국한됩니다 `/api/v1/plugins/{pluginId}/` API.

모바일 플러그인은 단일 플러그인에 한정된 호스트가 발급한 WebView 세션을 사용합니다. 공개 호출은 해당 명명空间 내에 있어야 하며, 서버는 여전히 현재 사용자와 리소스 권한을 확인합니다. 플러그인은 네이티브 bearer 토큰을 받지 않습니다. 격리 테스트는 HTTP 세션 경계를 커버합니다. 이러한 카드 및 문서 배치는 웹 UI 구현 방식이며, 네이티브 모바일 배치는 기기에서 구현되지 않았거나 인정되지 않았습니다.

<a id="commands-views-and-placements"></a>

## 명령, 보기, 배치

웹 페이지 라우트 렌더러는 호스트가 소유합니다. `PageHeader` 그들의 구성 요소
루트 컨텍스트. 렌더링 `<context.PageHeader title={title} actions={actions} />`
리액트 콘텐츠를 글로벌 컨트롤과 함께 작업 공간 상단바에 배치합니다.
호스트가 마운팅 대상을 소유하며 페이지가 표시될 때 포트폴딩된 콘텐츠를 제거합니다.
마운트 해제합니다. 플러그인은 호스트 DOM 선택자를 조회하거나 호스트 소스를 임포트해서는 안 됩니다. 사용하세요.
모바일 플러그인 셸에 있는 인라인 헤더로, 작업 공간 상단 바가 없습니다.
이 항목에는 현재의 소스 호스트가 필요합니다; 더 오래된 호스트 어댑터는 없습니다.

`WebPluginBundle` 3개의 선택적 컬렉션이 포함됩니다:

- 명령어: id/pluginId/title/supportedContexts/execute를 가진 재사용 가능한 작업.
- 뷰: id/pluginId/title/supportedContexts/render를 가진 재사용 가능한 뷰
- 배치: id/pluginId/slot/order?/conditions?를 참조하는 레코드를 마운트하여, 정확히 하나의 commandId 또는 viewId를 참조합니다. view는 대화상자/드로어/사이드바 프레젠테이션을 지정할 수 있으며, 그렇지 않으면 place에서 렌더링됩니다.

제목은 사용됩니다 `{zh,en}`ID는 플러그인 네임스페이스에 속합니다. supportedContexts는 global/home/document/library/folder/resources입니다. conditions는 필터, target, resourceKinds, format, 및 capabilities를 포함합니다. 지원 및 가시성은 서버 인증과는 별개인 표시 규칙입니다. 중복된 ID, 유효하지 않은 슬롯, 누락된 참조, 그리고 크로스 플러그인 참조는 전체 번들을 거부하고 등록된 기여를 취소합니다.

아이콘만으로 표시되는 명령/보기 항목은 설정된 플러그인 스토어와 동일한 PNG 브랜딩을 사용합니다. 호스트는 인증된 방식으로 이를 제공합니다. `GET /api/v1/plugin-icons/<id>` 웹 자산을 사용하여 스토어/npm 설치를 실행할 때; 로컬 설치는 일반 아이콘을 유지합니다. 스토어 세부 정보는 기존 스토어 프로토콜로 검증되며, 동일한 플러그인에 대한 요청은 대기 중인 읽기 상태를 공유하고, 성공/실패는 60초 동안 호스트 메모리에만 캐시됩니다. 로드 중에 스토어 아이콘이 없거나 이미지가 로드되지 않을 경우, 항목은 일반 아이콘을 유지하며 사용할 수 있습니다. 기존 플러그인 번들, SDK 버전 및 저장된 데이터는 변경되지 않으며, 아이콘 선언, 변환 또는 마이그레이션이 필요하지 않습니다. 이 호스트 변경을 되돌리면 이전의 표시가 복원됩니다.

| 웹 슬롯을 구현함 | 상황 |
| --- | --- |
| global.more | 글로벌 액션은 웹.more 내비게이션과 같은 오른쪽 상단 애플리케이션 아이콘을 공유합니다; 액션/보기 항목은 홈풍선 레이블이 있는 아이콘을 사용합니다; 필터링된 집합이 둘 다 비어 있을 때는 숨겨집니다. |
| global.leftMore | 글로벌 액션은 web.leftMore 내비게이션과 같은 왼쪽 More 드롭다운을 공유합니다. 두 필터링된 집합이 모두 비어 있을 때는 숨겨집니다. |
| home.cards / home.actions | 홈 카드와 단축키 |
| document.toolbar / document.menu | 문서 ID, 형식, 그리고 현재 권한; 동일한 작업이 둘 다를 차지할 수 있습니다. |
| document.sidebar / document.status | 사이드바 및 상태 콘텐츠; 화면이 좁을 경우 사이드바가 문서 본문에 맞춰 배치됩니다. |
| library.toolbar / library.nodeMenu | 도서관 엔티티 및 디렉터리 노드 |
| 폴더.토글바 / 폴더.행메뉴 | 현재 폴더 또는 행 리소스 |
| resource.bulkActions / resource.details | 비어있지 않은 선택 및 문서 세부 정보 확장 기능 |

컨텍스트에는 범위/목표/지역/리소스?/리소스?/기능/신호가 포함되지만, 실제 내용이나 전체 사용자 디렉터리는 자동으로 제공되지 않습니다. 호스트는 리소스.read/comment/edit/manage display 기능을 제공합니다. 파일 위치에 대한 통합된 기능 프로젝션은 아직 존재하지 않으며, 부재가 접근 권한을 부여하지는 않습니다.

내비게이션 관리 라벨 `web.more` 오른쪽 상단에 More and `web.leftMore` 왼쪽에 더 보여줍니다. 관리자들은 서버 네비게이션에서 허용된 슬롯을 명시적으로 포함시킨 후에만 왼쪽에 플러그인 페이지를 배치할 수 있습니다. `web.leftMore`; 내장 사용자 항목은 둘 다를 지원합니다. `global.leftMore` 글로벌 컨텍스트를 지원하는 별도의 선택적 클라이언트 명령/보기 슬롯입니다. 프레젠테이션이 없는 보기는 메뉴 내에서 확장됩니다.

2026-10-02에 확정된 기존 규칙은 유지됩니다. `web.more` 그리고 `global.more` 오른쪽 위에 있습니다. 기존 설정은 마이그레이션되지 않으며, 기존 플러그인들은 자동으로 왼쪽 위치에 배치되지 않습니다. left More는 명시적인 선언/설정이 필요하며 자동으로 오버플로우를 받지 않습니다. 한 항목은 왼쪽 More 위치 두 곳을 모두 차지할 수 있습니다; 다른 중복 제거/오버플로우 규칙은 그대로 적용됩니다. 네비게이션 저장소는 schemaVersion=1을 사용합니다. 왼쪽 슬롯 지원이 없는 호스트로 되돌리기 전에, 모든 web.leftMore 설정을 삭제하고 게시하십시오: 더 오래된 엄격한 검증기로는 이를 변환할 수 없습니다. 또한 새로운 클라이언트/서버 슬롯 선언을 취소하거나 플러그인을 되돌리십시오.

이 브라우저 ESM 예제는 호스트 소스 경로를 전혀 사용하지 않습니다.

```js
export default host => {
  const pluginId = "example.tools";
  const viewId = "example.tools.preview";
  return {
    manifest: { pluginId, version: "1.0.0", targets: ["web"] },
    views: [{
      id: viewId, pluginId,
      title: { zh: "预览", en: "Preview" }, supportedContexts: ["document"],
      render(context) {
        return host.React.createElement("p", null, context.resource.title);
      },
    }],
    commands: [{
      id: "example.tools.open", pluginId,
      title: { zh: "预览", en: "Preview" }, supportedContexts: ["document"],
      execute(context) {
        host.ui.openView({ viewId, presentation: "dialog", context });
      },
    }],
    placements: ["document.toolbar", "document.menu"].map((slot, index) => ({
      id: `example.tools.placement${index}`, pluginId, slot,
      commandId: "example.tools.open",
    })),
  };
};
```

뷰는 호스트 React 인스턴스를 사용하고 의존성들을 번들링합니다. 호스트는 플러그인 ESM에서의 빈 npm 임포트를 해결하지 않습니다. 렌더/자식 컴포넌트 오류는 격리되며, 거부된 명령어 약속은 피드백을 제공하고, 실행 버튼은 비활성화됩니다. 플러그인에서 생성된 이벤트 핸들러와 비동기 작업은 오류와 취소를 스스로 처리해야 합니다.

컨텍스트가 변경되거나 구성 요소가 해제될 때, 그 위치에 있는 명령/보기 신호는 취소됩니다. 대화상자/드로어를 열면 컨텍스트가 패널의 자체 세션으로 전환되므로, 트리거되는 메뉴를 닫아도 그 세션이 파괴되지 않습니다. 패널을 닫거나 경로를 변경하거나 다른 패널을 열면 그 세션이 취소됩니다. 오래된 닫기 핸들은 새로운 패널을 닫을 수 없습니다. 이러한 리소스 작업은 선택 핸들이나 저장되지 않은 모델 저장 계약을 노출하지 않습니다.

<a id="capability-boundaries"></a>

## 능력 한계

선택/블록/삽입 위치, 문서 변경 명령, 공개 의견/기록, 공유 초대, 공개 AI 실행, 이벤트 필드 범위, 그리고 주제 기여는 각각 별도의 계약과 구현이 필요합니다. 이 읽기/UI 확장 기능은 임의적인 전역 CSS/DOM 변경, 레이아웃 지속성, 데이터베이스 마이그레이션, 또는 저장된 형식 변환을 허용하지 않습니다.

템플릿과 자료는 이제 별도로 존재합니다. [창조 리소스 계약](creation-resources.ko.md)이것은 공개 패키지, 문자열 토큰, 플러그인 네임스페이스, 라이프사이클/디스펜서, 인증된 컨텍스트, 타입화된 클라이언트를 재사용합니다. 기존의 document_templates 테이블을 제공자로 변환하지 않습니다. files.v1과 content.v1은 기존의 의미를 유지합니다.

<a id="verification-record"></a>

## 확인 기록

원본 격리 검사에는 디렉터리 집계/등록 취소/정책 변경, 다섯 가지 형식에 대한 기본 모델 및 수정 사항, 거부된 후보자에 대한 허가된 페이징, 탐색, 등록 롤백, 패널 취소 및 유효하지 않은 핸들, HTTP 허용 목록, 그리고 크로스플러그인 모바일 세션 거부가 포함됩니다.

`pnpm build:plugin-sdk` 리リー스 아티팩트를 생성합니다. `node scripts/verify-plugin-sdk.mjs` 아티팩트를 임시 독립적인 node_modules에 복사하고, JavaScript를 실행하며, 호스트 경로 매핑이 없는 NodeNext 프로젝트의 .d.ts를 확인합니다. 이 도구는 npm 패키지를 배포하거나 사용자 플러그인 디렉터리에 설치하지 않습니다.

홈 카드, 오른쪽 상단의 '더보기', 문서 메뉴/툴바, 데스크톱 사이드바, 스냅샷 대화상자 등에서 브라우저를 통해 격리된 예시가 확인되었습니다. 두 개의 개인용 플러그인과 물리적 모바일 기기는 각각 별도의 승인이 필요합니다. 2026-10-02에 기록된 실행 결과는 유형 검사, 162개 테스트 파일(1021개 통과, 3개 건너뛰기), SDK 빌드/독립적 사용, 웹 빌드, 공백 검사 등을 통과했습니다. 이는 역사적 결과이며, 이 페이지를 읽고 다시 실행하는 검사 결과는 아닙니다.

<a id="document-plugin-elements"></a>

## 문서 플러그인 요소

SDK 소스 `0.1.6` 선택적 웹 번들 도입 `elements` 그리고 `@smartdoca/plugin-sdk/editor-elements`이 기능은 원자적 리치 텍스트 인라인 요소, 전체 셀 스프레드시트 캔버스 렌더링, 설정 형식을 지원합니다. 호스트는 네이티브 명령과 취소 기능을 통해 설정을 저장하며, 플러그인은 제한 없는 편집기 핸들을 받지 않습니다. 알 수 없는 유형/버전은 오류 플래그를 표시하며, 변환, 마이그레이션, 정리 없이 원본 JSON을 그대로 유지합니다. 기본적으로 제공자는 설치되어 있지 않습니다. 자세한 내용은...을 참조하세요. [엘리먼트 계약](plugin-editor-elements.ko.md) 그리고 [독립형 카운트다운/뉴스 링크 예제](../examples/plugin-elements/README.md)소스 수용은 npm 배포, 생산적 설치, 또는 장치 수용을 보장하지 않습니다.
