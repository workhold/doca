<a id="webhook-delivery"></a>

# Webhook配信

[中文](webhooks.zh-CN.md)

管理者はコールバックURL、受信するイベント、および任意の追加リクエストヘッダーを登録します。ビジネストランザクションはoutbox行のみを記録します。コミット後、バックグラウンドワーカーがイベントをPOSTします。このリクエストは、それを引き起こしたアクションをブロックすることはありません。

URLは、同じマシン上であるか、プライベートネットワーク上であるかのどちらかです。認証情報なしでHTTPまたはHTTPSでなければなりません。コールバックは、登録後に公開されるイベントのみを受け取ります。一時停止されたコールバックは新しいイベントを受け取りません。各コールバックは各イベントを一度だけ受け取ります。受信者は重複を排除します。 `id`.

2xxの応答があれば成功です。その他のステータスやネットワーク障害は、15秒、1分、5分、30分の後、最大5回の試行を行い、最終的に配達が失敗とマークされます。各試行は8秒後にタイムアウトし、リダイレクトに従いません。

SQLiteは、購読情報と配布情報を保存します。 `webhooks.db` メインデータベースの隣に。PostgreSQLは「名前のある」別のデータベースを使用する。 `<main>_webhooks`、または `DOCA_WEBHOOK_DATABASE_URL`一致しないスキーマのベースラインは拒否されます。古いWebhookデータベースからのマイグレーションはありません。

<a id="request"></a>

## 要求

```http
POST /hook HTTP/1.1
Content-Type: application/json
Authorization: Bearer service-token
```

`Content-Type` デフォルトで `application/json`管理者が入力したヘッダーはそのまま送信され、名前が一致した場合はデフォルトを上書きします。 `Content-Length`, `Host`, `Connection`, `Transfer-Encoding`, `Keep-Alive`, `Upgrade`, `TE`、そして `Trailer` コールバックに設定できない。

Docaは署名用の秘密を生成せず、送信もしません。 `X-Doca-Signature`.

<a id="body"></a>

## 体

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

| フィールド | 意味 |
| --- | --- |
| `id` | 安定したイベントID |
| `sequence` | 発表される出来事の単調な順序 |
| `type` | イベントタイプは、サブスクリプション時に使用される同じ値です。 |
| `createdAt` | このイベントが記述された時、ISO-8601 |
| `data.version` | ペイロードバージョン、現在 `1` |
| `data` | そのタイプのフィールド。文書の本文、パスワード、または秘密情報はありません。 |

<a id="event-fields"></a>

## イベントフィールド

リソースイベント（`document.created`, `library.created`, `resource.renamed`, `resource.transferred`, `resource.arranged`, `resource.moved`, `resource.copied`, `resource.restored`, `resource.trashed`, `resource.invited`, `comment.created`, `comment.updated`, `like.added`, `like.removed`, `favorite.added`, `favorite.removed`) 含まれるもの：

| フィールド | 意味 |
| --- | --- |
| `resourceId` | リソースID |
| `actorId` | 俳優 |
| `kind` | `document` または `library` |
| `path` | アプリ内のパス、例えば `#/r/<id>` |

その他のタイプ：

| `type` | `data` フィールド |
| --- | --- |
| `resource.purged` | `resourceId`, `actorId` |
| `resource.permissions_changed` | `resourceId`, `actorId` |
| `resource.link_changed` | `resourceId`, `actorId` |
| `resource.link_joined` | `resourceId`, `userId` |
| `access.requested` | `requestId`, `resourceId`, `userId`, `role` |
| `access.approved` / `access.rejected` / `access.cancelled` | `requestId`, `resourceId`, `userId`, `actorId`, `role`, `includeDescendants` |
| `invitation.accepted` / `invitation.rejected` | `resourceId`, `userId` |
| `invitation.cancel` / `invitation.resend` | `resourceId`, `userId`, `actorId` |
| `notification.created` | `notificationId`, `userId`、そしてどれかを `actorId`, `resourceId`, `type`, `ticketId`, `path` そのソースが記録した |
| `ticket.changed` | `ticketId`, `resourceId` |
| `user.created` | `userId`、そして `status` 登録が記録された時 |
| `user.updated` | `userId` |
| `user.status.changed` | `userId`, `status`, `previousStatus` |
| `ai.usage.recorded` | `callId`, `userId`, `modelId`, `jobId`, `state`, `metrics`, `units`, `provider` |
