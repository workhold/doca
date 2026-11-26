<a id="webhook-delivery"></a>

# Entrega por webhook

[中文](webhooks.zh-CN.md)

Un administrador registra una URL de llamada de devolución, los eventos que recibe y cualquier encabezado de solicitud adicional. La transacción comercial solo escribe una fila en “outbox”. Después de la confirmación, un trabajador en segundo plano envía el evento mediante POST. La solicitud no bloquea la acción que la provocó.

La URL puede ser pública, en la misma máquina o en una red privada. Debe ser HTTP o HTTPS sin credenciales. Un callback recibe solo los eventos publicados después de su registro. Un callback pausado no recibe nada nuevo. Cada callback recibe cada evento una vez. Los receptores eliminan las duplicaciones. `id`.

Cualquier respuesta de tipo 2xx indica éxito. Otros estados y fallos de red se repiten después de 15 segundos, 1 minuto, 5 minutos y 30 minutos, hasta 5 intentos; después, la entrega se marca como fallida. Cada intento se extingue después de 8 segundos y no sigue los redirecciones.

SQLite almacena suscripciones y entregas. `webhooks.db` además de la base de datos principal. PostgreSQL utiliza una base de datos separada llamada `<main>_webhooks`, o `DOCA_WEBHOOK_DATABASE_URL`Se rechaza una base de datos de esquema no compatible. No hay migración desde una base de datos webhook antigua.

<a id="request"></a>

## Solicitud

```http
POST /hook HTTP/1.1
Content-Type: application/json
Authorization: Bearer service-token
```

`Content-Type` se establece por defecto `application/json`Los encabezados ingresados por el administrador se envían tal como fueron ingresados, y se anulan ese valor predeterminado cuando el nombre coincide. `Content-Length`, `Host`, `Connection`, `Transfer-Encoding`, `Keep-Alive`, `Upgrade`, `TE`, y `Trailer` No se puede establecer en un callback.

Doca no genera un secreto de firma y no envía nada. `X-Doca-Signature`.

<a id="body"></a>

## Cuerpo

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

| Campo | Significado |
| --- | --- |
| `id` | ID del evento estable |
| `sequence` | Secuencia monótona de eventos publicados |
| `type` | Tipo de evento, el mismo valor utilizado al suscribirse |
| `createdAt` | Cuando se escribió el evento, ISO-8601 |
| `data.version` | Versión de carga útil, actualmente `1` |
| `data` | Campos para ese tipo. No hay cuerpo de documento, contraseña ni información secreta. |

<a id="event-fields"></a>

## Campos del evento

Eventos de recursos`document.created`, `library.created`, `resource.renamed`, `resource.transferred`, `resource.arranged`, `resource.moved`, `resource.copied`, `resource.restored`, `resource.trashed`, `resource.invited`, `comment.created`, `comment.updated`, `like.added`, `like.removed`, `favorite.added`, `favorite.removed`) incluye:

| Campo | Significado |
| --- | --- |
| `resourceId` | ID de recurso |
| `actorId` | Actor |
| `kind` | `document` o `library` |
| `path` | Ruta dentro de la aplicación, como `#/r/<id>` |

Otros tipos:

| `type` | `data` campos |
| --- | --- |
| `resource.purged` | `resourceId`, `actorId` |
| `resource.permissions_changed` | `resourceId`, `actorId` |
| `resource.link_changed` | `resourceId`, `actorId` |
| `resource.link_joined` | `resourceId`, `userId` |
| `access.requested` | `requestId`, `resourceId`, `userId`, `role` |
| `access.approved` / `access.rejected` / `access.cancelled` | `requestId`, `resourceId`, `userId`, `actorId`, `role`, `includeDescendants` |
| `invitation.accepted` / `invitation.rejected` | `resourceId`, `userId` |
| `invitation.cancel` / `invitation.resend` | `resourceId`, `userId`, `actorId` |
| `notification.created` | `notificationId`, `userId`, además, cualquiera de `actorId`, `resourceId`, `type`, `ticketId`, `path` Esa fuente registró |
| `ticket.changed` | `ticketId`, `resourceId` |
| `user.created` | `userId`, y `status` cuando el registro lo registró |
| `user.updated` | `userId` |
| `user.status.changed` | `userId`, `status`, `previousStatus` |
| `ai.usage.recorded` | `callId`, `userId`, `modelId`, `jobId`, `state`, `metrics`, `units`, `provider` |
