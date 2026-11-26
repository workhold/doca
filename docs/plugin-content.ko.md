<a id="content-providers-contentv1"></a>

# 콘텐츠 제공자: content.v1

[中文](plugin-content.zh-CN.md)

공공 입장은 `@smartdoca/plugin-sdk/content`호스트는 계약과 호출 경계를 정의하고, 플러그인들은 비즈니스 행동을 구현합니다. 내장된 문서/파일은 동일한 인터페이스를 통해 등록됩니다. 소스의 등록이 이루어져도 모든 소스를 AI에 자동으로 노출시키는 것은 아닙니다.

<a id="contract"></a>

## 계약서

- `sources(context, purpose)` 소스 선언을 발견합니다.
- 출처들은 요구합니다. `list`, `read`, 그리고 `resolve`. 선택적 `search` 능력 선언과 정확히 일치해야 합니다.
- `list(context, {config, cursor, limit})` 경량으로 돌아옴 `{items,nextCursor,snapshot}`각 항목에는 포함되어 있습니다. `ref:{sourceId,resourceId,blockId}`, `fingerprint`, 그리고 `title`, 선택적으로 `order`, `anchor`, 그리고 짧은 `excerpt`. 몸 `text` 금지됩니다.
- `read(context, {config,ref,fingerprint})` 리스트 필드와 선택된 블록을 반환합니다. `text`현재 읽을 수 없을 경우는 null입니다. 변경된 지문은 충돌을 일으키므로 다시 등록해야 합니다.
- `resolve(context,ref)` 재승인하고 반환함 `{path,fingerprint}` 또는 null. 경로는 애플리케이션 내부에 있어야 합니다.
- `search(context, {config,cursor,limit,query})` 동일한 경량 리스트를 반환합니다. 소스는 검색 기능을 구현하며, 호스트는 전신 스캔을 대체하지 않습니다.

서비스 목록/읽기/검색 요청도 포함됩니다. `sourceId` 그리고 `purpose`콜백은 실제 값을 받습니다. `principalId`, `purpose`, 그리고 `signal`모든 호출 시 계정, 설정된 범위, 현재 권한을 확인합니다. 전달된 사용자 ID는 신뢰할 수 없습니다. 호스트는 호출 전후에 사용자/소스의 생명주기를 확인하고 20초의 타임아웃을 적용합니다.

```ts
const content = context.inject(contentServiceToken);
content.register({
  id: "example.tasks.content", pluginId: "example.tasks", version: 1,
  title: { zh: "待办", en: "Tasks" }, contentTypes: ["task"],
  purposes: ["analysis", "knowledge"], capabilities: { search: false },
  configSchema: { type: "object", additionalProperties: false, properties: {} },
  list: listAuthorizedTaskBlocks,
  read: readAuthorizedTaskBlock,
  resolve: resolveAuthorizedTaskBlock,
});
```

이 플러그인은 세 가지 콜백을 모두 구현합니다. 비공개 호스트 테이블/소스나 다른 플러그인의 데이터베이스를 읽어서는 안 됩니다.

<a id="reconciliation"></a>

## 화해

소비자들은 현재 ID와 구독 설정 하에서 참조/지문을 저장합니다. 전체 탐색이 완료된 후, 변경되지 않은 블록은 읽기/AI 분석이 필요 없으며, 변경된 블록은 직접 읽힙니다. 성공적인 전체 탐색만이 사라짐을 보장합니다. 시간 초과, 실패한 페이지, 변경된 스냅샷, 불확실한 권한은 빈 집합이나 소비된 지문으로 처리될 수 없습니다.

`cursor=null` 시작됨; `nextCursor=null` 끝. 탐색 과정의 스냅샷은 일관성을 유지해야 합니다. 커서들은 페이지를 나열하지만, 이는 지속적인 증분 로그 위치가 아닙니다. 콘텐츠, 범위, 또는 권한이 완전성을 해치는 경우 기존 커서는 거부됩니다. 별도로 `listChanges`/`readChanges` 필요하지 않습니다.

제한 사항: 페이지당 100개 항목, 블록당 200만 자, 전체 재고에는 10만 개의 블록이 있습니다. 호스트는 참조, 중복, 커서, 취소 작업을 검증합니다. 분석 도구는 총 변경된 텍스트를 제한하며, 텍스트가 넘치는 경우 잘라내거나 완전함을 주장하는 대신 명확하게 실패를 표시합니다.

내장 소스는 단락 내용 주소를 사용합니다. 변경되지 않은 단락 앞에 단락을 삽입해도 그 정체는 변하지 않습니다. 본문 편집은 기존 블록을 제거하고 새로운 블록을 생성합니다. 이들은 네이티브 편집기의 안정적인 노드 ID가 아닙니다. 중복 블록, 제목 컨텍스트, 긴 단락 슬라이싱 규칙은 있습니다. [지문 기록](content-fingerprint-reconciliation.md).

<a id="host-apis-and-consumers"></a>

## 호스트 API와 소비자

HTTP: `GET /api/v1/content/sources?purpose=analysis`; POST `/api/v1/content/list`, `/read`, `/resolve`, `/search`식별 정보는 호스트 세션에서 제공되며, 응답에는 store가 사용되지 않습니다.

글로벌 검색은 검색을 선언하는 소스만을 호출합니다. 플러그인 비즈니스 범위에 적용되지 않는 문서/라이브러리 필터는 해당 플러그인 결과를 제외합니다. 클릭하면 다시 접근 권한이 부여됩니다.

네이티브 라이브러리는 소스 등록을 유지합니다. `knowledge_subscriptions` 그리고 `knowledge_source_groups.config`; 그들은 큐레이션 일자리, 파생 항목 또는 소비형 지문 미러를 생성하지 않습니다. POST `/api/v1/knowledge/libraries/:id/content-subscriptions` 가지다 `{sourceId,config,title}` 그리고 목적에 대한 지식이 필요합니다. 기여자는 제공자 범위를 변경할 수 있습니다.

지식 북은 실행 시 완전한 승인된 목록을 독립적으로 기록하고 출판 전에 다시 인증합니다. 증거는 보존됩니다. `contentRef`소스 버전, 콘텐츠 해시 및 정확한 인용 부분. 제공자, 바인딩, 기여자 또는 원본 소스 권한이 사용 불가능해지면 소스 접근이 중단됩니다; 보존된 데이터는 접근 권한을 부여하지 않습니다. 추가적인 완전한 제공자 본문 저장소는 없습니다.

소스 선택기에는 기본적인 스키마 형태가 제공되지만, 복잡한 중첩된 설정은 플러그인 자체 페이지를 사용해야 합니다. `PUT /api/v1/knowledge/libraries/:id/content-source-groups/:groupId` 생성 매개변수를 가져옵니다. 구독하는 주체만 범위를 변경할 수 있습니다. 변경 사항은 이후의 소스 읽기에 영향을 미칩니다.

`knowledge.sources.v1` 자동으로 적응되지 않음 `content.v1`; 비즈니스 플러그인은 공용 표준을 구현합니다. 지식 북은 새로운 기준을 사용하며, 역사적 변환이나 기존 프로토콜 어댑터는 제공되지 않습니다.
