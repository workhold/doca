<a id="webhook-投递"></a>

# Webhook 投遞

[English](webhooks.md)

管理員在 Hook 頁面登記回撥地址、訂閱事件和額外請求頭。業務事務只把事件寫入 outbox，提交後由後臺 POST。請求不佔用當前操作。

回撥地址可以是公網、本機或內網 HTTP(S)，不能帶賬號密碼。登記之後才會收到新事件；暫停後不再接收新事件。同一回撥、同一事件只投遞一次。接收方用正文裡的 `id` 去重。

2xx 視為成功。其他狀態或網路失敗會重試，間隔依次為 15 秒、1 分鐘、5 分鐘、30 分鐘，最多 5 次，之後記為失敗。單次請求超時 8 秒，不跟隨跳轉。

SQLite 把訂閱和投遞記在主庫同目錄的 `webhooks.db`。PostgreSQL 使用名為 `<主库名>_webhooks` 的獨立庫，也可以用 `DOCA_WEBHOOK_DATABASE_URL` 指定。結構基線不一致時拒絕開啟，不從舊錶遷移。

<a id="请求"></a>

## 請求

```http
POST /hook HTTP/1.1
Content-Type: application/json
Authorization: Bearer service-token
```

`Content-Type` 預設為 `application/json`。管理員填寫的請求頭按原樣附上，同名時覆蓋預設值。`Content-Length`、`Host`、`Connection`、`Transfer-Encoding`、`Keep-Alive`、`Upgrade`、`TE`、`Trailer` 不能由回撥設定。

系統不生成簽名金鑰，也不附加 `X-Doca-Signature`。

<a id="正文"></a>

## 正文

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

| 欄位 | 含義 |
| --- | --- |
| `id` | 事件 ID，穩定不變 |
| `sequence` | 已釋出事件的單調序號 |
| `type` | 事件型別，與訂閱值相同 |
| `createdAt` | 事件寫入時間，ISO-8601 |
| `data.version` | 載荷版本，當前為 `1` |
| `data` | 該型別的業務欄位，不含文件正文、密碼和金鑰 |

<a id="事件字段"></a>

## 事件欄位

資源類事件（`document.created`、`library.created`，以及 `resource.renamed`、`resource.transferred`、`resource.arranged`、`resource.moved`、`resource.copied`、`resource.restored`、`resource.trashed`、`resource.invited`、`comment.created`、`comment.updated`、`like.added`、`like.removed`、`favorite.added`、`favorite.removed`）攜帶：

| 欄位 | 含義 |
| --- | --- |
| `resourceId` | 資源 ID |
| `actorId` | 操作者 |
| `kind` | `document` 或 `library` |
| `path` | 站內路徑，例如 `#/r/<id>` |

其餘型別：

| `type` | `data` 欄位 |
| --- | --- |
| `resource.purged` | `resourceId`，`actorId` |
| `resource.permissions_changed` | `resourceId`，`actorId` |
| `resource.link_changed` | `resourceId`，`actorId` |
| `resource.link_joined` | `resourceId`，`userId` |
| `access.requested` | `requestId`，`resourceId`，`userId`，`role` |
| `access.approved` / `access.rejected` / `access.cancelled` | `requestId`，`resourceId`，`userId`，`actorId`，`role`，`includeDescendants` |
| `invitation.accepted` / `invitation.rejected` | `resourceId`，`userId` |
| `invitation.cancel` / `invitation.resend` | `resourceId`，`userId`，`actorId` |
| `notification.created` | `notificationId`，`userId`，以及當時帶上的 `actorId`、`resourceId`、`type`、`ticketId`、`path` |
| `ticket.changed` | `ticketId`，`resourceId` |
| `user.created` | `userId`，註冊流程中還有 `status` |
| `user.updated` | `userId` |
| `user.status.changed` | `userId`，`status`，`previousStatus` |
| `ai.usage.recorded` | `callId`，`userId`，`modelId`，`jobId`，`state`，`metrics`，`units`，`provider` |

`notification.created` 的欄位視來源而定：外掛通知至少有 `notificationId` 和 `userId`；工單通知另有 `resourceId`、`ticketId`、`path`；社群通知另有 `actorId`、`resourceId`、`type`、`path`。
