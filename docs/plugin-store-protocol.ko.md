<a id="doca-plugin-store-protocol-v1"></a>

# 도카 플러그인 스토어 프로토콜 v1

[中文](plugin-store-protocol.zh-CN.md)

2026-09-30에 업데이트되었으며, 아래에는 현재 필수 입력란과 내비게이션 참고 사항이 있습니다. **원격 매장 구현에서는 이 프로토콜을 사용합니다.** 이는 이전의 전체 카탈로그/스토어 호스팅 ZIP 초안을 대체합니다. 그 초안은 인정된 엔드포인트 계약이 아닙니다.

ZIP/npm 설치, 공유 아카이브, 다중 인스턴스 시작 복구, 원격 페이징, 업데이트 확인, 세부 정보 및 Web/App 내비게이션이 소스 코드에 구현되어 있습니다. 외부 저장소와 독립적인 플러그인은 여전히 아래의 승인 검사를 거쳐야 하며, 소스 구현이 모든 외부 서비스가 작동하는 것을 보장하지는 않습니다. 현재 SDK는 `0.1.9`; 설치된 호스트 버전과 패키지 정보와 비교하여 예제를 확인합니다.

<a id="_1-responsibilities-and-deployment"></a>
<a id="1-responsibilities-and-deployment"></a>

## 1. 책임과 배포

- npm 레지스트리는 완전한 사전 컴파일된 패키지들을 배포합니다. 이 스토어에는 ZIP 파일로 다운로드할 수 있는 엔드포인트가 없으며, 검토 시 실제 npm 패키지의 바이트를 직접 확인해야 합니다.
- 원격 스토어는 메타데이터, 카테고리, 릴리스 정보, 승인/철회 내역, 좋아요/다운로드 통계, 그리고 풍부한 텍스트 정보를 보유하고 있습니다.
- 도카는 관리자 권한, 설치 거래, 무결성 검증, 공유 아카이브, 실행 중인 버전, 웹/앱 항목, 그리고 레이아웃을 보유하고 있습니다.
- 좋아요와 GitHub 로그인은 원격 웹사이트에서 이루어집니다. Doca는 좋아요 수를 표시하며 클릭 시 새로운 페이지를 제공합니다. 원격 로그인 자격 증명을 수집하지 않으며, 좋아요 API, OAuth 콜백, 계정 바인딩도 구현하지 않습니다.
- 수동 npm 설치 및 로컬 ZIP/디렉터리 설치는 여전히 지원됩니다. 검토된 카탈로그에 없는 패키지는 '검토되지 않음'으로 표시됩니다. npm 배포판 자체는 공식 승인이 아닙니다.

```dotenv
DOCA_PLUGIN_STORE_URL=https://store.smartdoca.cc
DOCA_PLUGIN_NPM_REGISTRY=https://registry.npmjs.org
DOCA_PLUGINS_DIR=/data/plugins
```

저장소/등록소 주소는 자격 증명, 경로 접두사, 쿼리, 파편이 없는 HTTP(S) 원본입니다. 비어 있는 값은 기본값을 사용합니다. v1에서는 프라이빗 등록소 로그인이 지원되지 않습니다. Doca 서버 프록시는 브라우저 쿠키, 인증 정보, 사용자 ID, 비즈니스 데이터 없이 요청을 저장합니다; 원격 서비스는 브라우저 CORS이 필요하지 않습니다.

API 접두사는 `/api/v1`JSON은 UTF-8 형식이며, 응답에는 protocolVersion:1이 포함됩니다. 시간은 UTC ISO 8601 형식입니다. 값들은 부정적이지 않은 안전한 정수이거나, 알 수 없을 경우 null입니다. 알 수 없는 값은 0이 되어서는 안 됩니다. 모든 엔드포인트는 공개된 읽기 전용이며, 저장소 로그인이 필요하지 않습니다.

<a id="_2-public-types"></a>
<a id="2-public-types"></a>

## 2. 공용 타입

<a id="pluginsummary"></a>

### 플러그인 요약

```json
{
  "id": "example.mail",
  "name": "Mail",
  "summary": "Send and receive mail across multiple accounts.",
  "author": { "name": "Example", "url": "https://github.com/example" },
  "categoryId": "productivity",
  "icon": null,
  "detailPath": "/plugins/example.mail",
  "targets": ["web", "mobile"],
  "review": "approved",
  "official": false,
  "latestVersion": "1.2.0",
  "downloads": { "count": 1234, "period": "last30Days", "source": "npm", "asOf": "2026-09-30T00:00:00Z" },
  "likes": { "count": 42, "asOf": "2026-09-30T00:00:00Z" },
  "updatedAt": "2026-09-29T12:00:00Z"
}
```

제약 조건:

- id는 manifest.id와 일치합니다. `^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$`최대 100자.
- name/author.name: 1–160자; summary: 최대 300자; 모두 일반 텍스트.
- author.url: HTTP(S) URL 또는 null. 사용자 클릭 시에만 적용되며, 자동 호스트 조회는 없습니다.
- categoryId: 1–60자로 일치 `[a-z0-9-]+`페이지에서 추론하는 대신 각 카테고리를 별도로 가져오세요.
- 아이콘: PNG 데이터 URL 또는 null, 최대 24 KiB로 인코딩됨; SVG, 스크립트 또는 원격 이미지 URL은 포함되지 않음.
- detailPath: 동일 원본 절대 경로 `/plugins/<id>`설정된 원본과 함께 사용됩니다. 외부 원본, 쿼리/파편화, 트래버스는 거부됩니다. 새로운 창에서는 noopener, noreferrer를 사용합니다.
- 목표: 비어 있지 않고 중복이 제거된 웹/모바일 데이터 집합. 모바일이란 동적 네이티브 코드가 아닌 제어된 앱 웹뷰를 의미합니다.
- 리뷰: 승인됨/중단됨. 기본적으로는 승인된 상태로 표시되며, 세부 정보는 중단된 상태로 나타날 수 있습니다.
- 공식적인 정보: 필수적인 부울 값으로, 릴리스 리뷰와는 별개입니다. true일 경우에만 공식적인 정체를 표시하며, 설치 소스로부터 이를 추론하지 않습니다. 공식적인 정보가 없으면 프로토콜 오류가 됩니다.
- latestVersion: 최신 승인된 안정적인 릴리스 또는 null; 이는 특정 호스트에서 설치 가능성/업그레이드 가능성을 나타내지 않습니다.
- 지난 30일간의 npm 다운로드 수는 Doca 사용자/설치 또는 버전별 다운로드 수가 아닌 패키지 다운로드를 기준으로 합니다.
- 누락된 통계 정보는 여전히 null 개수/asOf 값을 가진 객체를 반환합니다. 목록에는 풍부한 텍스트 내용, 역사적 릴리스 배열, tar파일, 그리고 전체 내비게이션 기능이 누락됩니다.

<a id="release"></a>

### 출시

```json
{
  "pluginId": "example.mail",
  "version": "1.2.0",
  "sdkRange": "^0.1.9",
  "dataVersion": "1",
  "targets": ["web", "mobile"],
  "mobileHostRange": "^1.0.0",
  "dependencies": [],
  "changelog": "Improve mail synchronization.",
  "review": "approved",
  "reviewedAt": "2026-09-29T12:00:00Z",
  "publishedAt": "2026-09-29T10:00:00Z",
  "npm": {
    "registry": "https://registry.npmjs.org",
    "name": "@example/doca-mail",
    "version": "1.2.0",
    "integrity": "sha512-BASE64_OF_SHA512_DIGEST",
    "size": 12345
  }
}
```

위의 다이제스트는 플레이스홀더입니다. 실제 무결성은 64바이트의 표준-base64 SHA-512 다이제스트를 포함하는 하나의 SRI 값이어야 합니다. npm.size는 tgz 파일의 정확한 길이로, 1–33,554,432바이트입니다. npm.version, Release.version, package.json.version, 그리고 manifest.version은 모두 일치해야 합니다.

버전은 3부분으로 구성된 semver 방식을 사용하며, 프리리즈 버전도 포함될 수 있고 빌드 메타데이터는 제외되며, 길이는 최대 100자입니다. sdkRange는 매니페스트와 정확히 일치합니다. 현재 SDK는 0.1.9이며 지원되는 범위는 `*`, 정확히, `^`, 그리고 `~`모바일 타겟에 있어서는 mobileHostRange가 필요하며, 이는 모바일 플러그인-호스트 프로토콜(v1:1.0.0)을 의미합니다. 이는 앱 스토어 빌드 번호 및 SDK 호환성과는 별개의 개념입니다.

dataVersion이 일치함 `[a-zA-Z0-9._-]{1,80}` 주문 없이; v1 업그레이드는 정확한 동등성이 필요합니다. 의존성은 최대 100개까지 포함됩니다. `{id,range,optional?}` 도카 플러그인 의존성은 npm 의존성과는 별도입니다. 없어진 의존성 플러그인은 자동으로 설치되지 않습니다.

리뷰 발표가 승인되었거나 철회되었습니다. 철회로 인해 새로운 설치는 자동으로 실행 중인 버전을 제거하지 않고 이루어지지 않습니다. 승인 없이는 더 높은 npm 릴리스가 공식 추천 목록에 등장할 수 없습니다. 리뷰가 적용됩니다. `(pluginId,npm.registry,npm.name,version,integrity,size)`동일한 버전도 패키지를 대체할 수 없습니다. 저자, 통계 및 리뷰 정보는 변경될 수 있지만, 패키지의 바이트/기능 선언은 불변입니다.

변경 로그는 릴리스 목록과 정확한 릴리스 엔드포인트에서 필수적인 텍스트 문자열로, 최대 100000자입니다. 비어 있으면 주석이 없는 것을 의미합니다. HTML을 실행하지 않고 줄 바꿈을 그대로 유지해야 합니다.

<a id="_3-categories"></a>
<a id="3-categories"></a>

## 3. 카테고리

`GET /api/v1/categories?locale=zh`

```json
{"protocolVersion":1,"items":[{"id":"productivity","name":"Productivity","count":12}]}
```

최대 100개의 카테고리입니다. locale은 zh/en이며, 기본값은 zh입니다. 번역이 없는 경우 기본 라벨이 사용됩니다. count는 승인된 표시 가능한 카탈로그 총수이거나 null이며, 현재 목록 필터와는 무관합니다.

<a id="_4-paginated-search-and-ordering"></a>
<a id="4-paginated-search-and-ordering"></a>

## 4. 페이지별 검색 및 정렬

`GET /api/v1/plugins?q=mail&category=productivity&target=mobile&sort=downloads&limit=24&locale=zh`

| 매개변수 | 규칙 |
| --- | --- |
| q | 선택적; 최대 100자로 잘려나가며; 원격 매칭 검색 시 이름, 요약, 저자, 플러그인 ID, npm 이름을 포함합니다. |
| 카테고리 | 선택적 카테고리 ID; 생략된 경우 모든 것을 의미함 |
| 목표 | 선택적 웹/모바일; 생략된 경우 무제한 |
| 정렬 | 업데이트됨(기본값), 다운로드, 좋아요, 이름 |
| 제한 | 1–48, 기본값 24 |
| 커서 | 선택적 불투명 커서, 최대 2048자 |
| 지역 | zh/en, 기본값 zh |

```json
{
  "protocolVersion": 1,
  "items": [],
  "page": { "nextCursor": null, "total": 0, "snapshotAt": "2026-09-30T00:00:00Z" }
}
```

항목들은 limit 내의 PluginSummary&#91;&#93;입니다. total은 일치하는 개수이거나 null입니다; null nextCursor는 마지막 페이지를 의미합니다. Load More는 같은 쿼리의 결과만 추가합니다. 검색/필터/순서를 변경하면 cursor가 지워집니다; 쿼리를 섞는 대신 기존 요청을 취소하거나 늦은 응답을 무시하세요.

업데이트된 순서는 내림차순으로, updatedAt 값을 기준으로 합니다. 다운로드 수는 지난 30일간의 수를 기준으로 내림차순으로 표시됩니다. 좋아요 수는 내림차순으로 표시됩니다. 이름은 오름차순으로, 현지화된 이름이 표시됩니다. 모든 경우에 ID를 기준으로 안정적인 순서를 결정합니다. 알려지지 않은 통계는 알려진 값을 따릅니다.

커서는 정규화된 쿼리, 순서, 결과 스냅샷을 결합합니다. 계속 실행 기능은 스냅샷을 유지합니다. 통계가 변경될 때 중복이나 누락된 항목을 방지하기 위해 스냅샷은 최소 15분 동안 유지됩니다. 만료 시 410 cursor_expired 을 반환하고 다시 시작됩니다. 매개변수가 일치하지 않을 경우 400 cursor_mismatch 을 반환합니다. Doca는 로컬 검색/정렬/페이징을 수행하기 위해 전체 카탈로그를 다운로드해서는 안 됩니다.

페이지는 최대 2 MiB이며 15초의 타임아웃 시간이 있습니다. ETag는 선택적입니다. Doca는 일치하는 캐시된 응답이 있을 때만 If-None-Match를 전송하며, 304 상황에서는 그 캐시를 사용합니다.

<a id="_5-details-and-read-only-rich-text"></a>
<a id="5-details-and-read-only-rich-text"></a>

## 5. 세부 정보 및 읽기 전용 서식 있는 텍스트

`GET /api/v1/plugins/<id>?locale=zh`

```json
{
  "protocolVersion": 1,
  "plugin": { "id": "example.mail", "name": "See PluginSummary; return the complete object" },
  "description": {
    "format": "doca-slate",
    "version": 1,
    "nodes": [
      { "type": "heading", "level": 2, "children": [{"text":"Mail plugin"}] },
      { "type": "paragraph", "children": [{"text":"Supports multiple mail accounts.","bold":true}] }
    ]
  }
}
```

축약된 플러그인 객체는 실제로 전체 PluginSummary여야 합니다. 릴리스는 별도로 페이지화됩니다. 원격 서비스는 slatetsx를 사용하여 수정/저장하고 아래의 전송 하위 집합으로 변환합니다; Doca는 원격 편집기 플러그인을 저장, 편집, 로드하지 않고 읽기 전용으로 표시합니다. doca-slate는 임의의 내부 slatetsx 노드를 받지 않습니다.

<a id="rich-text-v1-nodes"></a>

### 리치 텍스트 v1 노드들

- 텍스트: `{text:string,bold?:boolean,italic?:boolean,underline?:boolean,strikethrough?:boolean,code?:boolean}`.
- 단락: `{type:"paragraph",children:Inline[]}`.
- 제목: 1~6의 정수 수준을 가진 단락 구조
- 링크: 인라인 `{type:"link",url:string,children:Text[]}`; https/http/mailto만 허용; 제어 문자, 자바스크립트/데이터 URL은 거부; 외부 윈도우에서는 noopener, noreferrer를 사용합니다.
- blockquote: `{type:"blockquote",children:Block[]}`.
- 목록 형식/숫자 형식: `{type:...,children:ListItem[]}`; 목록 항목: `{type:"list-item",children:Block[]}`.
- 코드블록: `{type:"code-block",language?:string,children:Text[]}`; 실행 없이 정상 텍스트로 표시.
- 이미지: `{type:"image",src:string,alt:string,children:[{text:""}]}`PNG/JPEG/WebP 데이터 URL의 경우, 이미지당 최대 1 MiB(1,048,576바이트)만 디코딩할 수 있습니다. 개인 주소 요청 및 추적을 방지하기 위해 SVG/원격 URL은 거부됩니다. Doca 0.1.5 이전 버전은 원래의 256 KiB 디스플레이 제한을 유지합니다. 더 큰 이미지의 경우 업데이트된 클라이언트가 필요합니다. 이 제한 변경은 데이터 이동이나 변환에 영향을 주지 않습니다. 클라이언트 롤백을 통해 이전 디스플레이 제한으로 돌아갈 수 있습니다. 전체 데이터 크기는 2 MiB 이내입니다.
- 분리자: `{type:"divider",children:[{text:""}]}`.

지원되지 않는 노드는 부분 표시 피드백과 함께 안전한 텍스트 자식 요소를 유지합니다. 알 수 없는 형식/버전의 경우 명확한 메시지와 원격 세부 정보 링크가 표시되며, HTML/JSX를 실행하지 않습니다. 원시 HTML, 스크립트, iframes, 실행 가능한 구성 요소, 이벤트 처리기 필드는 거부됩니다. 제한 사항: 5000개의 노드, 깊이 16, 200000자 텍스트, 그리고 총 2 MiB의 응답 크기입니다. 원격 서비스는 지원되지 않는 표/타입을 단락/이미지로 변환합니다. 새로운 타입의 경우 프로토콜/렌더러 변경이 필요합니다.

<a id="_6-releases-and-installation-checks"></a>
<a id="6-releases-and-installation-checks"></a>

## 6. 배포 및 설치 확인

`GET /api/v1/plugins/<id>/releases?limit=20&cursor=...`

반환 `{protocolVersion:1,items:Release[],page:{nextCursor,total,snapshotAt}}` 리스트 규칙과 1–48의 제한이 있습니다. semver를 내림차순으로 정렬하며 승인된 안정적인 릴리스를 기본으로 합니다; optional includePrerelease=true 옵션이 포함됩니다. 철회된 버전은 정확한 검색을 통해서만 확인할 수 있습니다.

`GET /api/v1/plugins/<id>/releases/<version>`

반환 `{protocolVersion:1,release:Release}`설치 시 유효한 리뷰 상태/정보를 다시 가져오며, 오래된 목록을 신뢰하지 않습니다. 알 수 없는 버전은 404를 반환하며, 철회된 항목은 200 응답으로 명시되어 있어 설치할 수 없습니다.

<a id="npm-download"></a>

### npm 다운로드

1. Release.npm.registry가 설정된 레지스트리(기본값은 npmjs)와 일치하는지 확인하세요. 스토어는 임의의 원본을 선택할 수 없습니다.
2. 정확한 버전 메타데이터를 가져오기 `GET /<encodeURIComponent(packageName)>/<encodeURIComponent(version)>`최신/태그/범위 해상도 없이.
3. 승인된 SRI와 비교하여 이름/버전 및 dist.integrity를 확인한 후 dist.tarball을 다운로드하세요.
4. 타르볼은 인증서/파편이 없는 레지스트리 원본의 HTTP(S) 형태이며, 리디렉션이 없습니다. 메타데이터: 2 MiB/15초. 다운로드: 32 MiB/120초, 정확한 크기와 SHA-512 검증이 가능합니다.
5. 정확히 하나의 패키지/라벨 아래에서 npm tgz를 안전하게 추출합니다. 일반 파일/디렉터리만 허용하며, 상징적/하드 링크, 장치, 절대 경로/패스스루/중복된 경로는 거부됩니다. POSIX pax x/g 확장 헤더는 추출하지 않으며, 그 경로를 사용하지도 않습니다. 다음 ustar 경로를 검증합니다. 최대 10000개의 항목과 128 MiB의 확장된 데이터를 허용하며 스트리밍 제한도 적용됩니다.
6. 패키지/manifest/review 메타데이터를 확인하고 완전한 아카이브/타겟 상태를 게시하세요. 누락된 런타임 의존성에 대해서는 npm 생명주기 스크립트, npm install 또는 다운로드를 절대 실행하지 마세요.

manual npm은 공식적인 검토 없이 설정된-registry 정확한 메타데이터와 동일한 검사를 사용합니다. 스토어 오프라인 상태는 수동 설치를 방지하지 않으며, 설치된 플러그인의 시작은 npm/store가 사용 가능해야 한다는 조건을 필요로 하지 않습니다.

<a id="_7-batch-update-checks"></a>
<a id="7-batch-update-checks"></a>

## 7. 배치 업데이트 확인

`POST /api/v1/updates/check`

```json
{
  "protocolVersion": 1,
  "host": { "sdkVersion": "0.1.9", "mobileHostVersion": "1.0.0" },
  "plugins": [
    { "id": "example.mail", "version": "1.0.0", "dataVersion": "1", "npm": {"registry":"https://registry.npmjs.org","name":"@example/doca-mail"} }
  ]
}
```

각 배치에 1~100개의 고유한 플러그인 ID를 128 KiB 이하로 보내세요. 사이트 식별자, 사용자, 설정, 콘텐츠, 자격 증명을 제외한 설치 메타데이터만 제출됩니다. Doca는 더 큰 데이터 세트를 처리합니다. npm 원산지가 없는 로컬 패키지의 경우 npm을 생략하고 공식 동일 ID의 릴리스를 확인할 수 있으며, 설치 소스가 무시되지 않습니다.

```json
{
  "protocolVersion": 1,
  "checkedAt": "2026-09-30T00:00:00Z",
  "items": [
    {
      "id": "example.mail",
      "installedVersion": "1.0.0",
      "status": "update_available",
      "currentReview": "approved",
      "latestVersion": "1.2.0",
      "release": { "pluginId": "example.mail", "version": "Return the complete Release object" },
      "reason": null
    }
  ]
}
```

요청당 정확히 하나의 항목만 반환되며, installedVersion이 반영되어 최신이 아닌 응답이 새로 설치된 버전과 연관되지 않도록 합니다.

| 상태 | 의미 |
| --- | --- |
| update_available | SDK/dataVersion/mobile 호스트와 호환되는 더 높은 승인된 안정적인 릴리스; 릴리스가 완료되었습니다. |
| up_to_date | 더 높은 승인된 안정적인 릴리스 없음; release=null |
| 불합리한 | 호환되는 후보가 없는 경우 더 높은 버전이 존재합니다; release=null; reason=sdk/data_version/mobile_host |
| 알 수 없음 | 알 수 없는 플러그인 또는 일치하지 않는 npm 소스; 릴리스=null; 이유=찾을 수 없음/소스 불일치 |

현재 리뷰는 승인되었거나 철회되었거나 알 수 없습니다. 자동 삭제/비활성화가 없는 철회된 설치 버전에 대해서는 별도로 알려주세요. Doca는 설치 과정에서 로컬 의존성 플러그인을 다시 확인합니다; 원격 권장 사항은 로컬 의존성 그래프를 보장할 수 없습니다.

최신 버전만 테스트하는 대신, 가장 호환되는 최고 버전을 선택하세요. latestVersion은 가장 높은 수준의 승인된 안정적인 버전이며 release.version을 초과할 수도 있습니다. Doca는 버전, SDK, 데이터 구조, 종속성을 독립적으로 검증합니다; 원격 추천은 승인이 필요하지 않습니다.

설치된/업그레이드 가능한 항목을 확인하고 수동으로 새로고침을 허용하며 캐시는 최대 15분으로 설정합니다. 설치는 해당 플러그인의 결과를 무효화합니다. 실패 시 모든 것이 최신인지 확인하는 대신 실패/알 수 없음으로 표시됩니다. 제거하는 동안 업그레이드를 제안하지 마세요. 전체 목표 버전을 비교하고, 버전/재시작 상태는 별도로 표시됩니다. 카탈로그에 없는 npm 패키지의 경우 레지스트리 버전을 확인할 수 있지만 자동 설치 없이는 검토되지 않습니다.

배치 응답: 2 MiB/15초. 부분적으로 알 수 없는 값은 항목 상태를 사용하며, 네트워크/속도 제한/포맷 오류는 가짜 정상 결과 없이 HTTP 오류를 발생시킵니다.

<a id="_8-packages-and-navigation"></a>
<a id="8-packages-and-navigation"></a>

## 8. 패키지와 네비게이션

npm tgz에는 package/package.json이 포함되어 있고, 로컬 ZIP에는 래퍼 없이 직접 package.json이 있습니다.

```json
{
  "name": "@example/doca-mail",
  "version": "1.2.0",
  "type": "module",
  "files": ["manifest.json", "dist", "web"],
  "doca": {
    "dataVersion": "1",
    "storage": "host",
    "manifest": "./manifest.json",
    "server": "./dist/server.js",
    "web": {"directory":"./web","entry":"./index.js"},
    "mobileHostRange": "^1.0.0",
    "navigation": [{
      "id": "example.mail.inbox",
      "title": {"zh":"邮箱","en":"Mail"},
      "icon": "mail",
      "webPath": "/plugins/example.mail/inbox",
      "mobile": true,
      "allowedSlots": ["web.left","web.top","web.topRight","web.right","web.user","web.home","web.more","mobile.drawer","mobile.bottom","mobile.topRight","mobile.account","mobile.home","mobile.more"],
      "defaults": ["web.left","mobile.drawer"],
      "order": 60,
      "adminOnly": false
    }]
  }
}
```

모든 런타임 의존성들을 사전 컴파일하고 번들화합니다. 호스트 소스 에일리어스, 글로벌 브리지, 또는 pnpm 심링크 트리는 포함되지 않습니다. `doca.storage: "host"` 필수입니다. ZIP/npm/store 설치, 디렉터리 임포트, 또는 시작 복원 과정에서 코드를 임포트하기 전에 누락된/다른 값은 기본값/适配器 없이 거부됩니다. 서버 기본값은 공장을 내보내며, 웹 기본값은 주입된 React를 사용하여 호스트=>bundle으로 전환합니다. 모든 영속성은 호스트 서비스를 사용하며, 플러그인은 로컬/원격 영속성 선택, 데이터베이스 생성, 또는 영속적 디렉터리 유지가 불가능합니다. 설치된 플러그인은 호스트 경로를 삭제하지 않고 비즈니스 정리 및 제거를 구현하며, 실패 시 설치는 유지됩니다. 자세한 내용은...을 참조하십시오. [저장 계약](plugin-horizontal-scaling.ko.md) 관리되는 기능 및 청소 조정을 위한 것.

정적 package.json 내의 네비게이션 ID는 네임스페이스를 사용하며, webPath는 그 아래에 유지됩니다. `/plugins/<plugin-id>/`웹 번들에 해당 페이지도 등록해야 합니다. 최대 30개의 항목만 허용됩니다. allowedSlots/defaults는 중복 제거되었으며, defaults는 하위 집합입니다. 모바일 선언이 없는 경우 모바일 슬롯은 존재하지 않습니다; 모바일 슬롯은 웹 페이지와 mobileHostRange가 필요합니다.

현재 슬롯에는 web.admin과 web.leftMore도 포함됩니다. Left More는 명시적인 선언이 필요하며, web.more는 여전히 오른쪽 위에 위치합니다. 참고하세요. [UI 확장 기능](plugin-extensions.ko.md)web.right는 임의의 페이지를 사이드 패널로 자동으로 포함시키는 것이 아니라, 게시물 형태로 페이지를 열어주는 툴바입니다. 게시물은 페이지를 열어주고, 명령어/뷰/패널 표현은 별도의 공개된 인터페이스를 가지고 있습니다.

관리자들은 Doca에서 웹/앱 가시성, 위치, 순서, 그룹화를 설정합니다. 레이아웃은 원격 스토어 설정이 아닙니다; 플러그인은 기본값을 선언하고 지원만 제공합니다. 용량 초과는 'More'를 사용합니다. 비활성화된 플러그인은 실행 중인 내비게이션에서 사라집니다. 숨겨진 내비게이션은 경로/API 접근 권한을 취소하지 않습니다; 호스트/플러그인이 모든 요청을 승인합니다.

리뷰 검사는 실제 웹/모바일 선언, sdkRange, 데이터버전, 종속성, 패키지 식별/버전을 기준으로 검사합니다. Doca는 다시 한 번 확인을 수행합니다. 릴리스에서는 전체 네비게이션을 제외하며, 패키지가 기능의 원천입니다.

앱은 먼저 모바일 플러그인 호스트가 포함된 빌드를 배포해야 합니다. 이후의 호환된 페이지들은 React Native 모듈을 다운로드하거나 실행하지 않고 제어된 WebView를 통해 로드됩니다. 로그인은 호스트의 일회성 티켓을 사용하며, 플러그인 스크립트에는 오랫동안 유효한 앱 보유자 토큰은 사용되지 않습니다. 내비게이션/호스트-콜 범위는 개발 가이드에 따라 진행됩니다.

<a id="_9-errors-cache-and-withdrawal"></a>
<a id="9-errors-cache-and-withdrawal"></a>

## 9. 오류, 캐시, 그리고 철회

```json
{"protocolVersion":1,"error":{"code":"not_found","message":"Plugin not found"}}
```

HTTP 오류: 400 invalid_request/cursor_mismatch; 404 not_found; 410 cursor_expired; 429 rate_limited (Retry-After 초 포함); 503 unavailable. 메시지는 단순 텍스트이며 로직 키가 아닙니다. 로그인 HTML, 리디렉션 또는 스택 트레이스를 반환하지 마세요. 실패는 로컬 관리 기능을 유지하며 재시도가 가능합니다. 유효성 검사를 거치지 않고는 설치가 진행될 수 없습니다.

세부 정보/정확한 리뷰 캐시는 최대 60초 동안 유지되어야 합니다. 설치 시 오프라인 캐시 없이 정확한 버전을 다시 인증해야 합니다. 승인은 절대적인 안전 보장이 아닙니다: 서버 플러그인은 샌드박스가 아닌 신뢰할 수 있는 프로세스에서 실행됩니다.

내부 리뷰, 저자 발행, GitHub 로그인, 그리고 유사한 글들은 저장소가 소유합니다. 발행 순서: npm 패키지 발행 → 불변의 실제 바이트를 획득 → 리뷰/스캔 기능 검토 → 승인된 릴리스 발행 → 요약 및 검색 인덱스 업데이트.

<a id="_10-multiple-instances-and-activation"></a>
<a id="10-multiple-instances-and-activation"></a>

## 10. 여러 인스턴스 및 활성화

설치 과정에서 완전한 아카이브와 전역 타겟 상태가 공유 호스트 데이터베이스에 저장됩니다. 인스턴스는 개인적인 쓰기 가능한 플러그인 디렉터리를 사용합니다. 시작 시 파일을 검증/복원하며 npm/store에 접근하지 않고 부분적인 패키지를 거부합니다. 누락되거나 손상된 공유 아카이브는 명확하게 실패합니다.

설치/업그레이드/활성화/비활성화/제거는 각 인스턴스를 재시작해야 합니다. 관리 시스템은 클러스터 전체 활성화를 주장하지 않고 응답하는 인스턴스의 실행 버전을 보고합니다. Compose는 사용됩니다. `docker compose restart doca`Kubernetes/operators는 인스턴스를 점진적으로 재시작하며 호환되지 않는 API에 대한 오래된 트래픽을 제거합니다.

역사적 웹 자산은 공유 아카이브에서 복원할 수 있으며, 버전 간 비즈니스 API 호환성은 필요하지 않습니다. 게시된 내비게이션 레이아웃은 클라이언트를 새로고침하면 재시작 없이 적용되며, 패키지 기능 변경 시 업그레이드/재시작이 필요합니다. 현재 제거 작업은 비즈니스 정리 작업을 수행하고 성공 시 데이터 버전 마커를 삭제하며, 불변 아카이브는 유지됩니다. 관리형 데이터베이스/프라이빗 객체 정리 및 생성 격리 기능이 구현되었습니다. 클러스터 전체의 비즈니스 작업 소진은 아직 진행 중이며, 플러그인은 디렉터리를 직접 삭제할 수 없습니다.

<a id="_11-integration-fixtures"></a>
<a id="11-integration-fixtures"></a>

## 11. 통합 장치

최소한 다음을 제공하세요:

1. 비어있고 2페이지 이상의 목록, 검색/카테고리/플랫폼 필터, 4가지 정렬 옵션, 만료되거나 맞지 않는 커서.
2. 완전한 요약, 알 수 없는 통계, 중단된 세부 정보, 유효한 서식 있는 텍스트, 그리고 알 수 없는 노드 텍스트의 저하.
3. 페이징 방식 변경; 최신 호환되지 않는, 하지만 덜 호환되는 업그레이드; 모든 업그레이드가 호환되지 않음; 설치된 릴리스가 취소됨; 알 수 없거나 맞지 않는 패키지.
4. npm 바이트와 실제 SRI/크기를 검토했으며, 교체된 패키지, 디그래스/선언 불일치, 리디렉션, 추출 탐색을 거부했습니다.
5. 429/503/시간 초과; 저장 실패는 로컬에 설치된 목록이나 현재 앱의 사용을 방해해서는 안 됩니다.
6. 하나의 인스턴스에 설치하고, 빈 디렉터리와 npm/store가 오프라인인 상태에서 다른 인스턴스를 재시작합니다. 공유 아카이브로 복원하고 손상된 로컬 캐시를 수리합니다.
7. 웹/앱 선언/내비게이션; 모바일 선언 없이는 앱 진입 불가; 호환되지 않는 데이터 업그레이드를 거부합니다.
8. ‘좋아요’ 클릭은 좋아요 API를 호출하거나 Doca OAuth를 시작하지 않고도 설정된 동일 원본 정보 페이지를 열게 합니다.

메일 연동은 원래부터 시작할 수 있습니다. [메일 플러그인 통합 가이드 v1](plugin-mail-integration-v1.md)연구 자료로 보관됨.

보세요 [플러그인 개발](plugin-development.ko.md) 그리고 [SDK 경계](plugin-sdk-contract.ko.md)호스트 API의 경우 실제 내보내진 타입을 사용하세요; 원격 저장소의 경우 이 와이어 프로토콜을 사용하세요. 제안된 호스트 방법을 추론하지 마세요.

<a id="cross-repository-acceptance"></a>

## 크로스 저장소 수용

실행하기 `pnpm exec tsx scripts/verify-plugin-store-contract.ts ../doca-plugin-store`이 기능은 비즈니스 데이터베이스나 npm 배포를 건드리지 않고, 카테고리(0개 포함), 검색, 타겟팅, 페이징, 상세 정보, 릴리스, 업데이트, 커서 만료 등에 대한 실제 경로를 메모리 내 데이터베이스로 실행합니다.

/categories는 임의의 멀티 태그가 아닌 카테고리 목록이며, 각 플러그인은 하나의 categoryId를 가집니다. 카테고리 수는 검색과 무관하게 발표된 모든 플러그인을 포함합니다. page.total은 검색 결과의 스냅샷을 나타냅니다. 알 수 없는 다운로드/좋아요는 하이퍼링크로 표시되고, 0은 0으로 표시됩니다.

리뷰는 호스트와 동일한 정적 네비게이션을 확인합니다: 이중 언어 제목(각각 1–80자), 아이콘, 순서, 허용되는 nonempty allowedSlots, 유효한 기본값, 그리고 알 수 없는 필드가 없습니다. 서버는 JS/mjs/cjs로 구축되며, 웹 엔트리는 JS로 작성되고, 매니페스트는 정적 JSON입니다. 리뷰나 설치 과정에서 패키지 설치 스크립트는 실행되지 않습니다.

<a id="official-identity-and-release-notes"></a>

### 공식 정체 및 출시 노트

위에서 명시한 바와 같이 PluginSummary.official과 Release.changelog는 필수입니다. 공식적 정체는 릴리스 검토와는 독립적입니다. 릴리스 노트는 줄바꿈이 있는 일반 텍스트 형태로 표시되며, 누락된 필드는 암묵적 기본값이 아닌 프로토콜 오류입니다.
