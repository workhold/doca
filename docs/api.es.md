<a id="http-api"></a>

# API HTTP

[中文](api.zh-CN.md)

Este es un índice de las rutas principales del host 0.2.23. En ejecución `/api/openapi.json` Describen rutas y esquemas registrados; el código del servidor define la autorización, los campos no anotados y los límites de comportamiento. Las antiguas interfaces se conservan. [investigación](research.es.md) y no puede asumirse que esté disponible hoy.

<a id="conventions"></a>

## Convenciones

Los caminos de la tabla tienen `/api/v1` Prefijo. Los navegadores utilizan cookies de sesión HttpOnly; las escrituras requieren el Host configurado y la misma origen. Los clientes nativos utilizan sesiones Bearer autenticadas por host; los WebViews de plugin utilizan sesiones de plugin con ámbito limitado. Los recursos públicos exponen únicamente sus rutas de lectura autorizadas.

Metadatos `version`, configuración `revision`, y contenido `seq`/`epochId` Tienen roles diferentes. Lea los valores actuales antes de escribir. Un 409 indica un conflicto o un protocolo/estado no soportado; nunca significa permiso para sobrescribir. La paginación varía según la ruta; siga `nextCursor` o `nextOffset`El acceso al contenido faltante generalmente devuelve 404; la administración del sistema no permite acceso a contenido privado.

<a id="accounts-and-administration"></a>

## Cuentas y administración

| Ruta | Propósito y permiso |
| --- | --- |
| `GET /bootstrap` | Usuario actual, sitio, capacidades, complementos cargados; sin secretos |
| `POST /auth/login`, `POST /auth/logout` | Inicio de sesión con contraseña / cierre de sesión |
| `POST /auth/register` | Registro bajo la política de admisión; los pendientes no reciben ninguna sesión. |
| `GET /me` | Perfil y preferencias personales |
| `GET /auth/providers` | Provedores de identidad disponibles |
| `GET /admin/users` | Pregunta de usuario administrador con estado/q/cursor |
| `PATCH /admin/users/:id` | `{status:active\|disabled}`, usuarios comunes pueden activar/desactivar; los que están en espera requieren revisión de registro |
| `GET /admin/registration-reviews` | Lista de revisión del administrador |
| `POST /admin/registration-reviews/:id` | `{decision:approved\|rejected,message?}`, revisión dedicada |
| `GET /admin/stats` | Estadísticas agregadas sin permiso de contenido |
| `GET /admin/users/:id/resource-handover` | Inventario de recursos de cuenta deshabilitada; solo para administradores |
| `POST /admin/users/:id/resource-handover/preview`, `POST /admin/users/:id/resource-handover/execute` | Vista previa / confirma la propiedad y los permisos seleccionados; ver [Entrega de recursos](admin-resource-handover.es.md) |

Verificación de contacto, recuperación, vinculación de identidad, verificación de seguridad, políticas de cuenta y llamadas de retorno están en [autenticación](authentication.es.md)Las credenciales de la plataforma se utilizan [Configuración de servicio](service-credentials.es.md); los complementos utilizan un espacio separado [servicio de credenciales encriptadas](plugin-credentials.es.md).

<a id="documents-permissions-and-history"></a>

## Documentos, permisos e historial

| Ruta | Propósito |
| --- | --- |
| `GET /resources`, `GET /resources/:id` | Lista/detalle autorizada |
| `POST /resources` | Crea documento/biblioteca; los formatos de documento son rich_text/markdown/hoja de cálculo/lienzo/presentación |
| `PATCH /resources/:id` | Actualización de metadatos con versión |
| `PUT /resources/:id/permissions` | Configuración de permisos con versión |
| `POST /resources/:id/transfer`, `POST /resources/:id/move` | Transferencia de propiedad / mudanza |
| `POST /resources/:id/copy` | Copia independiente |
| `POST /resources/:id/trash`, `POST /resources/:id/restore` | Basura / restaurar |
| `GET /resources/:id/versions`, `POST /resources/:id/versions` | Historia / snapshot manual |
| `GET /resources/:id/versions/:versionId` | Vista previa; hoja de cálculo/libro de diapositivas/lienzo no se puede restaurar |
| `POST /resources/:id/versions/:versionId/restore` | `{expectedSeq}`, gestor de restauración para texto enriquecido/Markdown |
| `POST /share/redeem` | Vista previa de inicio de sesión o aceptación de un enlace a documento |

La edición de contenido utiliza `/api/v1/ws`; ver [colaboración](collaboration.es.md)Los campos, las fuentes de asignación y la herencia están en [permisos](permission-inheritance.es.md)El compartir y la historia están en… [guía de documentos](document-experience.es.md).

<a id="comments-notifications-and-discovery"></a>

## Comentarios, notificaciones y descubrimientos

Crea un comentario con `POST /resources/:id/comments` y `{richBody,parentId,anchor?}`. `richBody` Es un comentario estructurado de versión 1; el anterior es texto plano. `body` La solicitud fue rechazada. Actualización. `PATCH /resources/:id/comments/:commentId`, suministrando la versión de comentario y richBody/deleted/resolved. Las respuestas de un solo nivel, imágenes, menciones y anclajes se describen en [Comentarios y notificaciones](comments-and-community.es.md).

Las notificaciones se usan `GET /notifications`, `POST /notifications/read`, y `POST /notifications/read-all`Las invalidaciones de WebSocket activan una nueva lectura autorizada. El descubrimiento, las colecciones, la actividad reciente y las invitaciones están en [descubrimiento](public-resource-discovery.es.md); las referencias y descargas de activos se encuentran en [integración de editor](editor-integration.es.md).

<a id="search"></a>

## Buscar

`GET /search/documents` Búsquedas de documentos actualmente legibles. El modo de palabra clave puede revertirse al banco de datos con una notificación; el modo vector requiere que tenga disponible Meilisearch y los modelos. Los resultados se revisan según el acceso actual; la inclusión en el índice no otorga ninguna permisión.

La administración utiliza `GET/PUT /admin/search`, `POST /admin/search/reindex`, `POST /admin/search/reconcile`, `/admin/search/embeddings`, `/admin/search/embeddings/status`, y `/admin/search/relevance`Un resultado de configuración 202 significa que está en cola; la tarea de consulta está completa. Los cambios en el modelo o las credenciales requieren aplicar nuevamente las configuraciones. La política de reconocimiento de imágenes actualmente solo guarda la configuración; activarla no activa una pipeline de OCR para búsqueda.

<a id="files-and-storage"></a>

## Archivos y almacenamiento

El cargue de activos utiliza `POST /assets?purpose=&filename=&resourceId=` con avatar/cubierta/attachment/comment_image y autorización específica para el propósito. La descarga se realiza `GET /assets/:id/content`, con `?download=1` Para la disposición de archivos adjuntos. Las imágenes de avatar/cubierta/comentarios permiten 5 MiB; los archivos adjuntos de documentos permiten 20 MiB. Los archivos de plataforma normal utilizan `/files` Rutas con límites separados y flujos de trabajo multipart.

`GET /admin/storage` informa sobre el servidor de despliegue. `PUT /admin/storage` Devuelve 405. Las variables de entorno configuran los servidores y credenciales; ver [almacenamiento de archivos](storage.es.md).

<a id="ai-knowledge-and-plugins"></a>

## IA, conocimiento y complementos

Las sesiones y trabajos de IA utilizan `/ai`Las herramientas respetan el alcance de la sesión, los permisos reales de recursos y la aprobación. `POST /ai/jobs/:id/approval` toma `{approvalId,approved}` Del propietario del trabajo; la aprobación no cambia las ACLs de los recursos.

`POST /mcp` Expose Streamable HTTP con un token de posesión dedicado. Las configuraciones personales se usan `GET/PUT /me/mcp` y `/me/mcp-services`; las integraciones de la empresa utilizan `/admin/mcp-services` y debe pasar el objetivo `userId` En cada operación MCP. La actualización, restablecimiento o revocación del servicio requieren la revisión actual. Los tokens se muestran solo en el momento de su creación o restablecimiento. Véase [Configuración MCP, descubrimiento de herramientas y transferencia de archivos](mcp.es.md).

Los comandos de Knowledge-Book, los flujos de trabajo, las tareas humanas y las suscripciones de fuentes se describen en [libros de conocimiento](knowledge-books.es.md)Las fuentes unificadas utilizan `/content`; véase el [protocolo de contenido](plugin-content.es.md). Instalado complemento rutas de negocio `/plugins/:pluginId/...` y dependen del lanzamiento cargado. El host no tiene una API para notas rápidas o correo; ver [capacidades y limitaciones](features.es.md).

<a id="health-and-source"></a>

## Salud y fuente

`GET /health`, `GET /live`, y `GET /ready` omita el `/api/v1` Prefijo y informe de la versión del host. Las verificaciones de preparación examinan la base de datos y Redis configurado; no verifica todos los servicios externos.

Fuente: [aplicación](../apps/server/src/app/create-app.ts), [directorio de ruta](../apps/server/src/routes), [historia](../apps/server/src/routes/experience.ts), [pasarela en tiempo real](../apps/server/src/services/realtime/gateway.ts).
