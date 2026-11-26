<a id="webhook-delivery"></a>

# 웹호크 전송

[中文](webhooks.zh-CN.md)

관리자는 콜백 URL, 수신되는 이벤트, 그리고 추가 요청 헤더를 등록합니다. 비즈니스 트랜잭션은 오직 아웃박스 행만 저장합니다. 커밋 후, 백그라운드 워커가 이벤트를 POST합니다. 이 요청은 그 원인이 된 작업을 방해하지 않습니다.

URL은 공개된 경우, 동일한 기기에서, 또는 개인 네트워크에서 사용될 수 있습니다. 자격 증명 없이 HTTP 또는 HTTPS 방식이어야 합니다. 콜백은 등록된 후에 발행되는 이벤트만을 받습니다. 일시 중지된 콜백은 새로운 이벤트를 받지 않습니다. 각 콜백은 각 이벤트를 한 번만 받습니다. 수신자는 중복을 제거합니다. `id`.

2xx 응답이면 성공입니다. 다른 상태나 네트워크 실패는 15초, 1분, 5분, 30분 후에 최대 5번 시도가 가능하며, 그 후 배달이 실패로 표시됩니다. 각 시도는 8초 후에 타임아웃되며 리디렉션을 따르지 않습니다.

SQLite는 구독과 배달 정보를 저장합니다. `webhooks.db` 주 데이터베이스 옆에. PostgreSQL은 별도의 데이터베이스를 사용합니다. `<main>_webhooks`, 또는 `DOCA_WEBHOOK_DATABASE_URL`맞지 않는 스키마 기준값이 거부됩니다. 더 오래된 웹호크 데이터베이스에서 마이그레이션이 이루어지지 않습니다.

<a id="request"></a>

## 요청

```http
POST /hook HTTP/1.1
Content-Type: application/json
Authorization: Bearer service-token
```

`Content-Type` 기본값으로 설정됨 `application/json`관리자가 입력한 헤더는 그대로 전송되며, 이름이 일치할 경우 기본 설정을 무시합니다. `Content-Length`, `Host`, `Connection`, `Transfer-Encoding`, `Keep-Alive`, `Upgrade`, `TE`, 그리고 `Trailer` 콜백에 설정할 수 없습니다.

Doca는 서명 비밀번호를 생성하지 않으며 전송하지도 않습니다. `X-Doca-Signature`.

<a id="body"></a>

## 몸

```json
{
  "id": "6f1c2a40-1b7e-4d2a-9c31-0a5b8e2d44f1",
  "sequence": 12,
  "type": "document.created",
  "createdAt": "2026-09-29T03:00:00.000Z",
  "data": {
    "version": 1,
    "resourceId": "8b2e1c55-7a10-4f3e-9d22-11c0a9e5b731",
    "actorId": "2c91aa10-88d4-4e55-b0a1-77e4d2c88a19",
    "kind": "document",
    "path": "#/r/8b2e1c55-7a10-4f3e-9d22-11c0a9e5b731"
  }
}
```

| 장소 | 의미 |
| --- | --- |
| `id` | 안정적인 이벤트 ID |
| `sequence` | 발표된 사건들의 단조롭게 증가하는 순서 |
| `type` | 이벤트 유형, 구독할 때 사용되는 동일한 값 |
| `createdAt` | 이 내용이 작성되었을 때, ISO-8601 |
| `data.version` | 페이로드 버전, 현재 `1` |
| `data` | 그 유형에 대한 필드들. 문서 본문, 비밀번호, 또는 기밀 정보는 없습니다. |

<a id="event-fields"></a>

## 이벤트 필드

리소스 이벤트`document.created`, `library.created`, `resource.renamed`, `resource.transferred`, `resource.arranged`, `resource.moved`, `resource.copied`, `resource.restored`, `resource.trashed`, `resource.invited`, `comment.created`, `comment.updated`, `like.added`, `like.removed`, `favorite.added`, `favorite.removed`) 포함:

| 장소 | 의미 |
| --- | --- |
| `resourceId` | 리소스 ID |
| `actorId` | 배우 |
| `kind` | `document` 아니면 `library` |
| `path` | 앱 내 경로, 예를 들어 `#/r/<id>` |

기타 유형:

| `type` | `data` 장소들 |
| --- | --- |
| `resource.purged` | `resourceId`, `actorId` |
| `resource.permissions_changed` | `resourceId`, `actorId` |
| `resource.link_changed` | `resourceId`, `actorId` |
| `resource.link_joined` | `resourceId`, `userId` |
| `access.requested` | `requestId`, `resourceId`, `userId`, `role` |
| `access.approved` / `access.rejected` / `access.cancelled` | `requestId`, `resourceId`, `userId`, `actorId`, `role`, `includeDescendants` |
| `invitation.accepted` / `invitation.rejected` | `resourceId`, `userId` |
| `invitation.cancel` / `invitation.resend` | `resourceId`, `userId`, `actorId` |
| `notification.created` | `notificationId`, `userId`, 그리고 어떤 것도 `actorId`, `resourceId`, `type`, `ticketId`, `path` 그 소스에 기록된 내용 |
| `ticket.changed` | `ticketId`, `resourceId` |
| `user.created` | `userId`, 그리고 `status` 등록이 기록될 때 |
| `user.updated` | `userId` |
| `user.status.changed` | `userId`, `status`, `previousStatus` |
| `ai.usage.recorded` | `callId`, `userId`, `modelId`, `jobId`, `state`, `metrics`, `units`, `provider` |
