<a id="webhook-delivery"></a>

# Envoi via webhook

[中文](webhooks.zh-CN.md)

Un administrateur enregistre une URL de retour, les événements qu’il reçoit et tout en-tête de requête supplémentaire. La transaction commerciale ne crée qu’une ligne dans la table « outbox ». Après la mise à jour, un travailleur en arrière-plan envoie l’événement par POST. La requête ne bloque pas l’action qui l’a provoquée.

L’URL peut être public, sur le même ordinateur ou dans un réseau privé. Il doit être en format HTTP ou HTTPS sans identifiants. Un callback ne reçoit que les événements publiés après son enregistrement. Un callback en pause ne reçoit rien de nouveau. Chaque callback reçoit chaque événement une fois. Les récepteurs éliminent les doublons. `id`.

Toute réponse de type 2xx indique un succès. Les autres états et les échecs de réseau sont redémarrés après 15 secondes, 1 minute, 5 minutes et 30 minutes, jusqu’à 5 tentatives ; ensuite, la livraison est marquée comme échouée. Chaque tentative échoue après 8 secondes et ne suit pas les redirections.

SQLite stocke les abonnements et les livraisons. `webhooks.db` à côté de la base de données principale. PostgreSQL utilise une base de données séparée nommée `<main>_webhooks`, ou `DOCA_WEBHOOK_DATABASE_URL`Un niveau de base de schéma inadapté est rejeté. Il n’y a pas de migration depuis une base de données webhook plus ancienne.

<a id="request"></a>

## Demande

```http
POST /hook HTTP/1.1
Content-Type: application/json
Authorization: Bearer service-token
```

`Content-Type` s'applique par défaut `application/json`Les en-têtes entrés par l’administrateur sont envoyés tels quels, et remplacent le paramètre par défaut lorsque le nom correspond. `Content-Length`, `Host`, `Connection`, `Transfer-Encoding`, `Keep-Alive`, `Upgrade`, `TE`, et `Trailer` ne peut pas être défini sur un callback.

Doca ne génère pas de secret de signature et ne envoie rien. `X-Doca-Signature`.

<a id="body"></a>

## Corps

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

| Champ | Signification |
| --- | --- |
| `id` | ID d'événement stable |
| `sequence` | Séquence monotone d'événements publiés |
| `type` | Type d’événement, même valeur utilisée lors de l’inscription |
| `createdAt` | Lorsque l’événement a été écrit, ISO-8601 |
| `data.version` | Version payload, actuellement `1` |
| `data` | Champs pour ce type. Aucun corps de document, mot de passe ou secret. |

<a id="event-fields"></a>

## Champs de l'événement

Événements de ressources (`document.created`, `library.created`, `resource.renamed`, `resource.transferred`, `resource.arranged`, `resource.moved`, `resource.copied`, `resource.restored`, `resource.trashed`, `resource.invited`, `comment.created`, `comment.updated`, `like.added`, `like.removed`, `favorite.added`, `favorite.removed`) incluent :

| Champ | Signification |
| --- | --- |
| `resourceId` | ID de ressource |
| `actorId` | Acteur |
| `kind` | `document` ou `library` |
| `path` | Chemin intégré à l’application, par exemple `#/r/<id>` |

Autres types :

| `type` | `data` champs |
| --- | --- |
| `resource.purged` | `resourceId`, `actorId` |
| `resource.permissions_changed` | `resourceId`, `actorId` |
| `resource.link_changed` | `resourceId`, `actorId` |
| `resource.link_joined` | `resourceId`, `userId` |
| `access.requested` | `requestId`, `resourceId`, `userId`, `role` |
| `access.approved` / `access.rejected` / `access.cancelled` | `requestId`, `resourceId`, `userId`, `actorId`, `role`, `includeDescendants` |
| `invitation.accepted` / `invitation.rejected` | `resourceId`, `userId` |
| `invitation.cancel` / `invitation.resend` | `resourceId`, `userId`, `actorId` |
| `notification.created` | `notificationId`, `userId`, plus lequel que ce soit `actorId`, `resourceId`, `type`, `ticketId`, `path` Cette source a enregistré |
| `ticket.changed` | `ticketId`, `resourceId` |
| `user.created` | `userId`, et `status` lors de l’enregistrement, cela a été noté |
| `user.updated` | `userId` |
| `user.status.changed` | `userId`, `status`, `previousStatus` |
| `ai.usage.recorded` | `callId`, `userId`, `modelId`, `jobId`, `state`, `metrics`, `units`, `provider` |
