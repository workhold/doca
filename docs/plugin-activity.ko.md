<a id="plugin-recent-activity"></a>

# 플러그인 최근 활동

[中文](plugin-activity.zh-CN.md)

2026-09-30에 구현되었으며 공개적으로 배포되었습니다. `@smartdoca/plugin-sdk/platform`SDK 아티팩트와 이 인터페이스를 포함한 호스트를 사용하세요. 소스의 가용성만으로는 새로운 npm 출시를 확립할 수 없습니다.

<a id="storage-and-ownership"></a>

## 저장 및 소유권

플러그인은 등록됩니다. `activityServiceToken` (`activity.v1`). 그들은 호스트가 관리하는 지속성 기능을 활용하여 방문 기록, 역사적 질의, 현재 비즈니스 권한, 삭제 및 정리 작업을 처리합니다. 이 서비스는 단지 소스 데이터를 집계할 뿐이며, 비즈니스 미러나 특수한 방문 기록 저장 엔드포인트를 생성하지 않습니다. 사용하세요. [현재 관리 중인 스토리지 계약](plugin-horizontal-scaling.ko.md).

내장된 기록은 남아 있습니다. `resource_visits` 그리고 `workspace_activity`이 증가는 테이블을 변경하지 않았으며, 역사도 이동되지 않았고, 이중 쓰기도 발생하지 않았습니다. 공개 발견 페이지의 `/workspace/recent?publicOnly=true` 컬렉션 로직은 내장 리소스에 적용됩니다. 활동을 등록하면 발견, 선호 목록, 검색 또는 AI는 등록되지 않습니다.

삭제는 런타임 등록을 제거하고 해당 소스의 열기/등록을 중단합니다. 저장된 기록은 유지됩니다. 쿼리의 현재 플러그인 데이터를 다시 활성화합니다. 실제 설치/비활성화는 호스트의 재시작 기반 생명주기에 따라 이루어집니다.

<a id="registration"></a>

## 등록

```ts
import {
  activityServiceToken,
  permissionsServiceToken,
  type ActivitySource,
} from "@smartdoca/plugin-sdk/platform";
```

두 토큰을 모두 선언합니다. `injections.required`호스트가 없는 경우 `activity.v1` 그것을 요구하는 플러그인을 거부합니다; 개인 테이블이나 오래된 엔드포인트는 대체 수단이 아닙니다. 활동을 사용하지 않는 기존 플러그인은 새로운 등록이 필요하지 않습니다. `register(source)` 디스포저를 반환합니다; 스코프 기반 인젝션은 그것을 플러그인 효과에 연결하고 종료 또는 초기화 실패 시 해제합니다.

콘텐츠 유형별로 하나의 소스만 등록하세요. 예를 들어 `example.mail.messages` 그리고 `example.mail.threads`:

| 장소 | 요구사항 |
| --- | --- |
| `id` | 독특한 플러그인 접두사가 붙은 소스 ID, 최대 150자 |
| `pluginId` | 인젝트된 플러그인 ID와 같아야 합니다. |
| `schemaVersion` | 정확히 `1`; 지원되지 않는 버전은 등록에 실패합니다. |
| `resourceType` | 등록됨 `permissions.v1`; 아이템 ID는 해당 유형의 리소스를 식별합니다. |
| `title` | `en` 그리고 `zh`각 필터/소스 라벨은 최대 100자로 작성해야 합니다. |
| `icon` | `file`, `mail`, `calendar`, `message`, `task`, `book`, 또는 `folder` |
| `list(context, input)` | 현재 사용자의 읽기 가능한 방문 페이지 |
| `get(context, id)` | 재승인 권한이 있는 현재 기록/제목/경로, 또는 null |

ID와 리소스 유형은 소문자로 시작하며 점/하이픈으로 구분된 알파벳과 숫자 조합을 사용합니다. 각 인스턴스는 최대 64개의 플러그인 소스만 허용되며 중복된 ID는 허용되지 않습니다. 비즈니스 리소스는 무제한이지만 페이징이 필요합니다.

호스트가 생성한 컨텍스트는 `{principalId, signal}`주요 정보는 브라우저에서 선택된 사용자가 아닌 인증된 세션에서 제공됩니다. 특정 항목은 이런 형태를 가집니다.

```ts
{
  id: "message-123",                  // 唯一资源 ID，1–500 个可见 ASCII 字符
  title: "季度预算讨论",              // 原始内容标题，非空，最长 500 字符
  visitedAt: "2026-09-30T09:20:00.000Z",
  path: "/mail/inbox?message=message-123"
}
```

`id` 1~500개의 가시적인 ASCII 문자 포함; 제목은 비공백이며 최대 500자입니다. `path` 하이픈과 문자/숫자로 시작하며, 원본, 해시, 백슬래시, 제어 문자는 포함되지 않습니다. 외부/프로토콜 상대 주소는 금지됩니다. 쿼리 값을 인코딩합니다. 비즈니스 제목은 원본 내용을 그대로 유지합니다; 유형 이름은 사용됩니다. `title.en/zh`.

<a id="pagination"></a>

## 페이지 번호 표시

`list` 가지다 `{until, after, limit}` 그리고 돌아옵니다 `{items, hasMore}`:

1. 사용자/소스/리소스별로 최신 방문 기록을 하나씩 반환, 정렬된 형태로 `visitedAt DESC, id ASC` ASCII 이진 ID 순서로.
2. 밀리초 단위의 UTC ISO 문자열을 사용하고, 단지 `visitedAt <= until`.
3. `after=null` 시작합니다. 그렇지 않으면 요구합니다. `visitedAt < after.visitedAt`또는 동일한 시간으로 `id > after.id`기록이 삭제된 후에도 경계선은 사용할 수 있습니다.
4. `items.length <= limit`; 호스트는 현재 최대 51개의 요청을 받습니다. 짧은 페이지도 허용됩니다. 남은 기록은 `hasMore=true` 그리고 최소 하나의 반환된 항목이 있어야 합니다; 빈 페이지는 다시 시도할 수 없다는 의미입니다.
5. 사용자 방문 및 현재 권한을 먼저 필터링합니다. 호스트도 확인합니다. `activity.read` 모든 항목에 대해 사용할 수 있으며 필요에 따라 더 많은 데이터를 가져옵니다. 최대 20개의 배치와 각 소스당 1.5초가 소요되며, 권한 확인도 포함됩니다. 인덱스를 사용하고 취소 기능을 존중하며, 쿼리 내에서 원격 전체 동기화를 피해야 합니다.
6. 리스트는 방문 기록을 업데이트하지 않습니다. 방문 기록은 비즈니스 콘텐츠를 성공적으로 열었을 때만 기록됩니다. 전화와 미사용 후보는 반복될 수 있습니다.

호스트는 방문 시간이 낮은 순서, 소스 ID가 높은 순서, 그 다음으로 리소스 ID가 높은 순서로 페이지들을 결합합니다. 내장된 소스는 `doca`, 함께 `kind:id` 리소스 키. 불투명한 다음 커서는 사용자/필터를 연결하고 첫 번째 값을 유지합니다. `until`선택된 소스와 소비된 위치들.

이 목록은 고정된 데이터베이스 스냅샷이 아니라 현재의 허가를 반영합니다. 새 방문은 새로고침 시에 나타나며, 삭제, 취소 또는 업데이트된 방문 시간으로 인해 페이징 체인에서 기록이 제거될 수 있습니다. 일관된 개별 페이지 읽기에는 관리형 트랜잭션을 사용하세요.

실패, 타임아웃, 유효하지 않은 페이징/경로, 또는 권한 부족으로 인해 서비스가 해당 소스의 전체 페이지를 버리고 다른 소스는 보존합니다. 실패한 소스는 해당 탐색의 후속 페이지에서는 건너뛰어지고 표시됩니다. `unavailableSources`; 새로 등록된 소스도 다시 로드해야 합니다.

<a id="example"></a>

## 예시

이것 `mount(context)` 예제는 플러그인을 구현해야 합니다. `mailStore`현재 호스트가 관리하는 서비스를 계속 사용했습니다. `mailStore` SDK 엔티티가 아닙니다.

```ts
const pluginId = "example.mail";

context.inject(permissionsServiceToken).register({
  pluginId,
  resourceType: "message",
  async authorize(principalId, messageId, action) {
    if (action !== "activity.read") return false;
    return mailStore.canRead(principalId, messageId);
  },
});

const source: ActivitySource = {
  id: `${pluginId}.messages`,
  pluginId,
  schemaVersion: 1,
  resourceType: "message",
  title: { en: "Mail", zh: "邮件" },
  icon: "mail",
  async list({ principalId, signal }, { until, after, limit }) {
    // 业务实现：按用户、当前权限、until、after 过滤，再依协议排序。
    // 可读取 limit + 1 条以判断 hasMore；只返回前 limit 条。
    return mailStore.listRecent(principalId, { until, after, limit, signal });
  },
  async get({ principalId, signal }, id) {
    // 必须确认这个用户有该访问记录，资源仍存在且当前仍可读。
    return mailStore.getRecent(principalId, id, { signal });
  },
};
context.inject(activityServiceToken).register(source);
```

추가 `activity.read` 동일한 플러그인/리소스 유형을 두 번 등록하는 것보다는 기존 권한 등록에 활용하는 것입니다. 플러그인의 인증된 open-mail API가 콘텐츠를 성공적으로 읽은 후, 세션의 사용자 ID를 그 방문 테이블에 업데이트합니다. 삭제할 때는 해당 테이블을 정리하거나 조인을 통해 삭제된 항목을 필터링해야 하며, 호스트는 자신이 소유하지 않은 기록을 정리할 수 없습니다.

<a id="host-entry-points-and-authorization"></a>

## 호스트 엔트리 포인트 및 인증

- `GET /api/v1/workspace/activity`: 인증된 혼합 목록; 내장 기능을 지원함 `kind`, 플러그인 `source`, 그리고 `cursor`. `kind` 그리고 `source` 서로 배타적입니다. 반환값 `items`, `nextCursor`, `sources`, `unavailableSources`.
- 플러그인 아이템들이 있습니다. `kind=plugin`, `sourceId`, `sourceTitle`, 그리고 `icon`UI 키에는 소스 ID가 포함됩니다.
- `href` 지시하는 `/api/v1/workspace/activity/open?source=...&id=...`진행자는 계정/소스를 다시 확인합니다.`activity.read`, 호출 `get` 현재 경로에 대해 다시 승인한 후 재지정합니다. 실패 시는 404이 되며, 과거 스냅샷을 이용해 재지정되지 않습니다.
- 타겟 페이지와 비즈니스 API는 독립적으로 권한이 부여됩니다. 활동에는 첨부파일이나 관련 문서 접근 권한이 없습니다.

<a id="acceptance-and-rollback"></a>

## 수락 및 롤백

`tests/plugin-activity.test.ts` 그리고 `tests/workspace-home.test.ts` 분리된 데이터베이스/설치 디렉터리를 사용하세요. 이들은 동시 처리 순서, 탐색, 짧은 페이지 연속 처리, 삭제, 교차 사용자 접근, 취소, 등록 해제, 실패/타임아웃, 안전하지 않은 리디렉션, 유효하지 않은 커서, 실제 패키지 주입, 그리고 HTTP 열기와 관련된 기능을 포함합니다.

이 기능은 영구적인 테이블 변경을 일으키지 않았습니다. 호스트를 복구할 때 플러그인 기록이 남아 있습니다; 필요한 플러그인은 `activity.v1` 그런 기능이 없는 호스트는 거부합니다. 롤백을 위해 비즈니스 데이터를 삭제하지 마세요.
