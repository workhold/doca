<a id="webhook-delivery"></a>

# Доставка через Webhook

[中文](webhooks.zh-CN.md)

Администратор регистрирует URL-адрес возврата запроса, события, которые он получает, и любые дополнительные заголовки запроса. Бизнес-транзакция только добавляет строку в таблицу вывода. После коммита фоновый рабочий процесс отправляет событие. Запрос не блокирует действие, которое его вызвало.

URL может быть публичным, находиться на том же устройстве или в приватной сети. Он должен быть в формате HTTP или HTTPS без учетных данных. Кallback получает только события, опубликованные после его регистрации. Paused callback не получает ничего нового. Каждый callback получает каждое событие один раз. Приемники уничтожают дубликаты. `id`.

Любая ответная строка формата 2xx означает успех. Другие статусы и сетевые ошибки повторно попытки через 15 секунд, 1 минуту, 5 минут и 30 минут, до 5 попыток; после этого доставка считается неудачной. Каждая попытка завершается через 8 секунд и не следует перенаправлению.

SQLite хранит подписки и доставки. `webhooks.db` Помимо основной базы данных. PostgreSQL использует отдельную базу данных под названием `<main>_webhooks`или `DOCA_WEBHOOK_DATABASE_URL`Отклоняется несоответствующая схема базового уровня. Нет возможности миграции из старой базы данных webhook.

<a id="request"></a>

## Запрос

```http
POST /hook HTTP/1.1
Content-Type: application/json
Authorization: Bearer service-token
```

`Content-Type` предполагается `application/json`Заголовки, введенные администратором, отправляются такими, как они введены, и нарушают этот стандартный вариант, если имя совпадает. `Content-Length`, `Host`, `Connection`, `Transfer-Encoding`, `Keep-Alive`, `Upgrade`, `TE`и `Trailer` Не можно установить на кallback.

Doca не генерирует секрет подписи и не отправляет его. `X-Doca-Signature`.

<a id="body"></a>

## Тело

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

| Поле | Значение |
| --- | --- |
| `id` | Стабильный идентификатор события |
| `sequence` | Монотонный порядок происходящих событий |
| `type` | Тип события – тот же значение, который используется при подписи. |
| `createdAt` | Когда был написан этот событие, ISO-8601 |
| `data.version` | Версия с грузом, в настоящее время `1` |
| `data` | Поля для этого типа. Нет текста документа, пароля или секретных данных. |

<a id="event-fields"></a>

## Поля события

События ресурсов (`document.created`, `library.created`, `resource.renamed`, `resource.transferred`, `resource.arranged`, `resource.moved`, `resource.copied`, `resource.restored`, `resource.trashed`, `resource.invited`, `comment.created`, `comment.updated`, `like.added`, `like.removed`, `favorite.added`, `favorite.removed`) включает:

| Поле | Значение |
| --- | --- |
| `resourceId` | ID ресурса |
| `actorId` | Актер |
| `kind` | `document` или `library` |
| `path` | Путь в приложении, например `#/r/<id>` |

Другие типы:

| `type` | `data` поля |
| --- | --- |
| `resource.purged` | `resourceId`, `actorId` |
| `resource.permissions_changed` | `resourceId`, `actorId` |
| `resource.link_changed` | `resourceId`, `actorId` |
| `resource.link_joined` | `resourceId`, `userId` |
| `access.requested` | `requestId`, `resourceId`, `userId`, `role` |
| `access.approved` / `access.rejected` / `access.cancelled` | `requestId`, `resourceId`, `userId`, `actorId`, `role`, `includeDescendants` |
| `invitation.accepted` / `invitation.rejected` | `resourceId`, `userId` |
| `invitation.cancel` / `invitation.resend` | `resourceId`, `userId`, `actorId` |
| `notification.created` | `notificationId`, `userId`и любой из `actorId`, `resourceId`, `type`, `ticketId`, `path` Этот источник записал |
| `ticket.changed` | `ticketId`, `resourceId` |
| `user.created` | `userId`и `status` Когда регистрация была зафиксирована |
| `user.updated` | `userId` |
| `user.status.changed` | `userId`, `status`, `previousStatus` |
| `ai.usage.recorded` | `callId`, `userId`, `modelId`, `jobId`, `state`, `metrics`, `units`, `provider` |
