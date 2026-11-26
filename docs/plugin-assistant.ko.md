<a id="launch-the-ai-assistant-from-a-plugin"></a>

# 플러그인을 통해 AI 어시스턴트를 실행하세요.

[中文](plugin-assistant.zh-CN.md)

SDK 소스 0.1.7이 출시되었습니다. `PluginWebHost.ai.open(input)`웹은 전체 개인 비서 기능을 제공하며, 앱 플러그인 WebView는 네이티브 대화 기능을 활성화합니다. 소스 검증 결과 npm 배포나 업데이트된 앱이 확인되지 않았습니다. 이는 클라이언트 시작 API이며, 서버 백그라운드 실행은 별도의 계약에 따릅니다.

```ts
import type { PluginAssistantOpenInput } from "@smartdoca/plugin-sdk/web";

const input: PluginAssistantOpenInput = {
  prompt: "Summarize this email and list action items",
  context: mail.plainText,
  documentIds: [document.id],
  attachmentFileIds: [attachment.fileId],
};
const { sessionId } = await host.ai.open(input);
```

| 매개변수 | 행동과 한계 |
| --- | --- |
| `prompt` | 수정 가능한 초기 입력 텍스트 |
| `context` | 문자 그대로의 텍스트가 뒤에 추가됨 `prompt`; 최대 20,000자까지, 시스템 명령이 아닌 사용자 메시지 형태로 |
| `documentIds` | 최대 20개의 고유한 호스트 문서 UUID가 있습니다. 호스트는 현재 허가된 제목/형식을 읽고 참조 칩을 표시합니다. |
| `attachmentFileIds` | 최대 8개의 고유한 호스트 파일 UUID가 있으며, 각각 최대 20 MiB, 총 25 MiB입니다. 승인된 API를 통해 AI 첨부파일에 복사됩니다. |
| `sessionId` | 현재 사용자에 속하는 기존 대화 UUID입니다. 이를 생략하면 대화가 생성됩니다. 아카이브된 대화는 먼저 복원되어야 합니다. |
| `modelId` | 사용 가능한 모델입니다. 생략 시 대화 모델, 사용자 기본 설정, 그 다음 사이트 기본 설정을 사용합니다. |
| `autoSend` | 기본적으로 채우기; 명시적 `true` 메시지를 전송하고 비어있지 않아야 함 `prompt` 아니면 `context` |

`host.ai.open()` 빈 대화를 시작할 수 있습니다. 반환됩니다. `Promise<{sessionId: string; jobId?: string}>`. `jobId` 즉시 전송이 작업을 제출할 때만 존재하며, 모델이 완료된다는 의미는 아닙니다. 한 클라이언트에서 동시에 발생하는 중복 실행은 거부됩니다. 성공적인 새로운 호출은 별도의 실행이며, 메시지를 자동으로 재시도하지 않습니다.

```ts
const { sessionId, jobId } = await host.ai.open({
  prompt: "Draft a reply",
  context: mail.plainText,
  autoSend: true,
});
```

참고 자료, 파일, 대화, 모델 및 전송은 현재 호스트의 권한을 사용합니다. 식별 정보는 세션에서 제공됩니다. 입력 정보는 제공될 수 없습니다. `userId`토큰이나 시스템 프롬프트입니다. 알 수 없는 필드, 중복된 ID, 유효하지 않은 UUID, 과도한 입력은 거부됩니다. 플러그인은 자신의 비즈니스 콘텐츠가 해당 사용자와 AI에게 전달될 수 있도록 보장해야 합니다. 출시는 리소스 권한을 확장하거나 모델 실행 정책, 도구 승인, 사용 기록을 우회하지 않습니다.

허가가 거부되었거나 사용할 수 없는 모델, 보관된/다른 사용자 대화, 첨부파일 제한, 네트워크 오류, 계정 전환은 요청을 거부합니다. 아직 파싱 중인 첨부파일은 미리 채워질 수 있으며, 즉시 전송 시 명시적인 오류가 발생합니다. 플러그인은 나중에 다시 시도하거나 미리 채워진 대화를 시작할 수 있습니다. 실패 시 사용자 데이터는 삭제되지 않으며, 생성된 일반적인 첨부파일이나 비어 있는 대화는 기존 호스트의 보존 규칙에 따라 처리됩니다.

프리필은 현재 UI 프로세스 메모리에만 존재하며, 리프레시나 종료 시 사라집니다. URL에는 대화 ID와 앱 내부의 일회성 실행 식별자만 포함되어 있으며, 내용이나 첨부 파일 매개변수는 없습니다. 네이티브 `assistant.open` 플러그인 명명空间을 사용하고 고정된 계정 자격 정보를 사용합니다. 플러그인을 제거하거나 계정을 전환하면 대기 중인 요청이 취소됩니다; 자격 정보는 웹뷰에 절대 저장되지 않습니다. 웹 및 앱에서 전송하기 전에 참조 및 첨부 파일을 제거할 수 있습니다.

이 업데이트로는 데이터베이스 스키마, 기존 형식의 읽기기, 마이그레이션, 또는 기존 호스트 어댑터가 추가되지 않았습니다. 기존 대화는 호스트의 기존 형식을 그대로 유지하며, 소스 데이터를 복구할 때도 변환이나 삭제가 필요하지 않습니다. 이러한 기능이 없는 호스트나 네이티브 컨테이너도 마찬가지입니다. `assistant.open`, 기능을 제공할 수 없습니다. 해당 아티팩트를 배포하세요; 독립적인 npm 배포와 장치 인증은 별도의 검증이 필요합니다.
