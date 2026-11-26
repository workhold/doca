<a id="background-task-continuation"></a>

# 백그라운드 작업 지속

현재 SDK 소스 **0.2.0**, 서버 기능 `ai.continuations.v2`, 수출됨 `@smartdoca/plugin-sdk/ai`npm 배포는 포함되지 않습니다. 이는 설치된 모든 서버 플러그인에 공통적으로 적용됩니다; 지식 북도 동일한 호스트 메커니즘을 사용합니다.

선언하다 `aiContinuationsServiceToken` 필수적인 주사로서 `sdkRange: "^0.2.0"`이 기능이 없는 호스트는 초기화를 거부합니다. 퇴출된 AI 서비스 버전을 통한 어댑터나 역사적 비즈니스 작업의 자동 등록 기능도 없습니다.

MCP 도구 컨텍스트에는 없음 `sessionId`; 사용하기 `jobId` 작업 상관관계를 위해. 그들 `wait` 통화는 승인된 스냅샷을 반환할 수 있지만, 내부 채팅/모델 연속 작업을 시작하지는 않습니다. 후속 통화는 외부 클라이언트가 책임집니다.

플러그인은 사업 관련 작업, 현재 승인, 지속적인 성과, 안정적인 운영 ID 및 알림/아웃박스 전송을 제공합니다. 이를 공개 호스트 관리 저장소를 통해 저장합니다. 호스트는 보조 식별 정보, 지속적인 대기 티켓, 취소, 모델 계속 실행 및 기술적 제한을 가지고 있습니다. 웨이크는 사업적 조치를 승인하거나 인간 작업을 승인하지 않습니다.

1. 마운트하는 동안 소스를 등록하세요. `id` 먼저 시작해야 합니다. `<pluginId>.` 그리고 그것 `pluginId` 설치 식별 정보와 일치해야 합니다. 등록 정보는 폐기 시 자동으로 삭제됩니다.
2. `read(context, {operationId})` 현재의 비즈니스 허가를 다시 확인하고 버전 1 스냅샷을 반환하며, 거부되거나 사용 불가능한 작업의 경우 null을 반환합니다. 이는 최신으로 읽은 호스트 식별 정보와 중단 신호를 받으며, 비밀 정보는 반환하지 않습니다. 작업 ID는 내구성 있는 작업을 식별하며, 사용자가 제공한 주체는 아닙니다.
3. 현재 실행 중인 등록된 AI 도구에서 호출하기 `wait(pluginId, context, {sourceId, operationId})` 호스트가 제공한 정확한 맥락으로. 복사하거나 조작된, 또는 보관된 맥락은 거부됩니다. 대기하기 전에 비즈니스 작업 IDempotently를 시작하세요. 이 도구는 영수증을 반환합니다.
4. 호출하기 전에 결과를 저장하세요. `wake(pluginId, {sourceId, operationId})`반복되는 알림은 저장된 보조 체크포인트를 한 번만 사용할 수 있습니다. 주차 전 알림은 안전합니다: 정기적인 조정 및 시작 복구 과정에서 내구성 있는 소스 데이터를 다시 읽습니다.

스냅샷이 있습니다. `version: 1`, `state`, `revision`, `summary` 그리고 선택적 JSON `result`국가들은 `running`, `waiting_input`, `completed`, `failed`, `cancelled`. 변경 `revision` 실행 가능한 결과나 인간의 결정이 변할 때. 심장 박동을 실행해도 모델을 깨우지 못합니다. 인간의 입력으로 전환되면 한 번 모델이 깨어나고, 어시스턴트는 진행 중인 작업을 설명하며 또 다른 결정을 기다립니다. 터미널 스냅샷은 원래 작업의 결과 사실을 다시 시작합니다. 터미널 작업 결과는 안정적이어야 하며, 새로운 비즈니스 실행에는 새로운 작업 ID가 필요합니다.

호스트는 완전한 도구 교환만 저장합니다. 대기 중에는 실행 슬롯을 해제하고 원본 작업/체크포인트를 유지하며 비정상적인 복구 시도를 하지 않습니다. 읽기 권한은 등록, 알림 및 실행 시 재승인됩니다. 권한이 취소되거나 사용자가 비활성화되거나 소스가 제거되거나 무효화된 기록은 눈에 보이는 오류와 함께 계속 작업을 중단시키고 체크포인트를 보존합니다. 어시스턴트를 취소하면 재시작 능력이 사라지며, 비즈니스 작업을 취소하는 것은 별도의 플러그인 작업입니다.

제한 사항: 어시스턴트 회전당 20개의 의존성, 소스 ID는 120자, 작업 ID/수정본은 200자, 요약문은 2,000자, 시리얼라이즈된 스냅샷은 24,000자, 20초의 소스 읽기 마감 시간. 조정 작업은 키셋 페이지와 제한된 병렬 읽기를 사용하며, 느린 소스는 일반 모델 실행 슬롯을 차지하지 않습니다. 시작 조정은 플러그인 조합이 완료될 때까지 기다립니다.

<a id="integration-example"></a>

## 통합 예제

그것 `jobs` 아래 객체는 플러그인 자체의 저장소이며, 이는...에 의해 지원됩니다. `storage.sql.v1`, **SDK 엑스포트가 아닙니다.**. `startOnce` 내구성이 좋은 비즈니스 익명성 키를 사용해야 합니다. `readAuthorized` 실시간 리소스 권한을 확인하고 현재 스냅샷을 반환합니다. 작업자 알림은 승인된 비즈니스 트랜잭션에 따라 진행됩니다.

```ts
import { aiServiceToken, aiContinuationsServiceToken } from "@smartdoca/plugin-sdk/ai";

// Inside mount(context):
const pluginId = "example.reports";
const sourceId = `${pluginId}.jobs`;
const ai = context.inject(aiServiceToken);
const continuations = context.inject(aiContinuationsServiceToken);
continuations.registerSource({
  id: sourceId, pluginId,
  read: (request, { operationId }) => jobs.readAuthorized(request, operationId),
});
ai.registerTool({
  id: `${pluginId}.generate`, description: "Generate a report",
  inputSchema: { type: "object", properties: { reportId: { type: "string" } }, required: ["reportId"], additionalProperties: false },
  async execute(input, request) {
    const operationId = await jobs.startOnce(request, input.reportId);
    return continuations.wait(pluginId, request, { sourceId, operationId });
  },
});

// In the plugin worker, after its durable result commit:
await continuations.wake(pluginId, { sourceId, operationId });
```

<a id="persistence-and-rollback"></a>

## 지속성과 롤백

새롭게 명시된 대기 작업만 엄격한 버전 1 체크포인트를 생성합니다. 기존의 것은... `ai_jobs` 상태 제약은 변하지 않음: 의존성 대기 작업은 예약된 상태를 사용하고 노출됨 `awaiting_dependency` API/UI에서입니다. 스키마 마이그레이션, 듀얼 쓰기, 추론된 오래된 티켓, 누락된 필드 변환, 역사적 작업 깨우기 기능은 없습니다. 형식이 잘못된 새로운 티켓은 거부되어 진단을 위해 보관됩니다.

롤백은 새로운 등록/쓰기 작업을 중단하고 체크포인트, 비즈니스 결과 및 감사 기록을 유지합니다. 더 오래된 호스트는 이 새로운 프로토콜을 재시작하지 않습니다. 활성 버전 1 웨이터를 실행하기 전에 그 보조 웨이터를 취소하거나 작업자를 중단하고 일치하는 호스트를 복원하지 않고는 실행해서는 안 됩니다. 데이터 재설정은 롤백의 일부가 아닙니다.

지식-북 진행은 기존의 감사 저장소를 사용하며, 압축된 버전 관리된 노드/배치/모델/재시도 카운터가 있습니다. 모델 본체는 해당 로그에 복사되지 않습니다. 실행 창은 상태, 하트비트, 현재 오류 및 최신 200개의 기록된 이벤트를 업데이트합니다. 역사적 이벤트는 조작되지 않으며, 보존된 오래된 이벤트는 저장소에 남아 있습니다.
