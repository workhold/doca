<a id="comments-user-visibility-and-notifications"></a>

# Comentarios, visibilidad para los usuarios y notificaciones

[中文](comments-and-community.zh-CN.md)

<a id="data"></a>

## Datos

La base de datos actual es compatible con SQLite y PostgreSQL:

- `users.public_id` Es un ID de usuario único, separado del UUID interno. Se normaliza a minúsculas al crearse, tiene entre 3 y 160 caracteres, incluye letras y dígitos. `._@+-`Un índice único lo aplica. La registración y la creación de administradores pueden establecerlo `publicId`Si se omite, se utiliza el inicio de sesión. No cambia cuando cambia el nombre de visualización.
- Los campos de perfil SSO provienen de la asignación configurada por el proveedor. Si falta un nombre de usuario único adecuado u otro campo requerido, `/auth/complete` devuelve `needs_profile` Y la persona completa el perfil; el anfitrión no genera un nombre de usuario en el espacio de nombres del proveedor. Las cuentas nunca se fusionan debido a un mismo nombre, correo electrónico o identificador público. El enlace de autenticación sigue siendo “proveedor plus sujeto”. Vincular un nuevo método de inicio de sesión no cambia el identificador de usuario original.
- `users.directory_mode` Puede ser nulo, lo cual sigue al sitio `settings.directory_mode`.
- `comments.body_json` Es el JSON del comentario rico. `body` Se genera texto plano para búsqueda, resúmenes y notificaciones. Un comentario que no se elimina debe tener validez. `body_json`.
- `notifications` agregar `actor_id`, `comment_id`, y `dedupe_key`El evento y el cambio empresarial se comprometen juntos. Es único `dedupe_key` El índice evita los eventos duplicados.

Un comentario completo es la versión 1, con bloques de texto en párrafos y mención de niños, además de bloques de imagen. El servidor completa los nombres e IDs de las mencionadas desde la tabla de usuarios y no confía en la etiqueta del cliente. Un comentario tiene como máximo 5,000 caracteres, 9 imágenes y 50 bloques. Una imagen debe pertenecer al recurso actual y ser válida. `comment_image` O bien un archivo de imagen. El cargamento sigue utilizando almacenamiento privado, limpieza de imágenes y descarga autorizada. Un comentarista puede subir una imagen de comentario y no puede utilizarla para subir o cambiar un archivo de cuerpo.

<a id="who-can-be-found"></a>

## ¿Quién puede ser encontrado?

Los administradores definen la visibilidad de los usuarios, con un valor por defecto para el sitio y una modificación individual por usuario.

| Modo | Candidatos de nuevo usuario |
| --- | --- |
| todos | Usuarios activos del sitio |
| relacionado | Usuarios que actualmente comparten permisos explícitos de documentos/bibliotecas, incluyendo herencia, propiedad de la biblioteca, miembros válidos de enlaces y otorga de grupos efectiva; también miembros activos del mismo grupo de usuarios activos |
| nada | Ningún candidato. No se puede escribir un UUID de usuario para agregar una permisión o una mención. |

La visibilidad pública y la de usuarios autenticados no crean una relación. La revocación de la última relación de permisos/miembros la elimina. Los permisos existentes aún pueden cambiarse o ser revocados. Los comentarios y menciones en el cuerpo de mensajes existentes no desaparecen debido a la mejora en la política. La lista de usuarios administradores no está limitada por esta política de búsqueda. La búsqueda de grupos tiene una política de administrador independiente, que por defecto se aplica a los grupos a los que se ha unido; véase [grupos de usuarios](user-groups.es.md).

Las rutas están en proceso de modificación. `/api/v1`:

- `GET /users/lookup?q=` Búsca usuarios activos en el ámbito del llamante y devuelve los campos id, public_id, display_name y avatar. El prefijo de cuenta y id coinciden. El nombre de visualización es una coincidencia fuzzy. Hasta 20 elementos. Los comodines de búsqueda son texto normal.
- `GET /admin/directory-policy` devuelve `{mode, revision}`.
- `PUT /admin/directory-policy` toma `{mode, revision}`Un conflicto de versiones es 409.
- `PUT /admin/users/:id/directory` toma `{mode: "all" | "related" | "none" | null}`. null sigue al sitio de nuevo.
- `GET /me`, `GET /users/:id/profile`, y la lista de usuarios administradores incluye `public_id`.

<a id="rich-text-comment-interaction"></a>

## Interacción con comentarios de texto completo

El modo de edición añade un icono de comentario al final de la barra de herramientas flotante de selección del editor. El modo de lectura única muestra solo el icono de comentario, sin herramientas de formato. La presentación requiere ser un comentarista o superior.

La selección del navegador se asigna a un rango de Slate, y luego al ancla de posición relativa Yjs del editor. El ancla actual se encuentra dentro de un párrafo o bloque. Una selección que cruza bloques pide al usuario que lo seleccione nuevamente. No se trunca silenciosamente.

Cada hilo raíz no resuelto cuyo texto original aún existe es una tarjeta independiente. El marcador por defecto es un subrayado amarillo. Al hacer clic en el texto o en la tarjeta, se resalta ambos. La posición se mide nuevamente al desplazar, ampliar o actualizar la colaboración.

Si el texto original se elimina, el ancla deja de ser válido, o el comentario raíz se elimina o resuelve, la tarjeta y el destacado desaparecen. La base de datos conserva el comentario para historial y auditoría. Deshacer la eliminación puede volver a mostrar un comentario no resuelto cuando el ancla esté válido.

Los comentarios de documentos completos y los comentarios de selección comparten las funciones ricas del compositor: @ búsqueda, carga de imágenes, edición, respuestas, eliminación y resolución. La verificación de la versión editada sigue en pie. Una submisión fallida no elimina los datos de entrada.

El icono de eliminar abre primero un cuadro de confirmación; cancelar no envía ninguna solicitud de eliminación. Las respuestas utilizan espacios compactos, pero conservan los autores, los timestamps y las menciones.

El lateral de comentarios en los cinco editores tiene **Comentarios resueltos** Icono. Su diálogo muestra los comentarios raíz resueltos con sus respuestas. Los autores y gerentes pueden marcar un hilo como no resuelto; las permisiones actuales y las versiones de comentarios se verifican nuevamente. Los fallos mantienen la lista y muestran un error. Se pueden cargar más páginas; los raíces eliminadas están excluidas. Reabrir un hilo con un ancla válida restaura su tarjeta y marcador.

- `POST /resources/:id/comments` toma `{richBody, parentId, anchor?}`La respuesta permanece en el hilo del comentario raíz.
- `PATCH /resources/:id/comments/:commentId` toma `{version, richBody?, deleted?, resolved?}`.
- `POST /assets?purpose=comment_image&resourceId=...&filename=...` Sube bytes, hasta 5 MB. El servidor valida la imagen y el acceso.

Un @ en el cuerpo del documento utiliza la extensión de mención editor. Los candidatos provienen de la misma búsqueda de alcance. Un nodo de mención almacena el UUID del usuario, no solo el nombre de visualización.


Todos los cinco formatos tienen anclajes permanentes de comentarios; los detalles de selección de Slate mencionados anteriormente describen solo texto enriquecido. La hoja de cálculo captura los IDs estables de filas/columnas a través de su API de comentarios nativa, resuelve los rango actuales después de cambios estructurales y valida la existencia del destino en el servidor. Ver [colaboración](collaboration.es.md).

Hacer clic en un comentario resalta únicamente su contenido asociado en cada uno de los cinco editores. Abrir el sidebar o seguir un enlace de comentario no restaura un fondo anterior. Hacer clic en otro comentario reemplaza la resaltación; hacer clic en otro lugar, resolver el hilo o cerrar el sidebar lo elimina. La resaltación es un estado de visualización y no escribe estilos de celda, rellenos de forma, actualizaciones de Yjs ni anclajes permanentes. Las imágenes de comentario se abren en el visor de imágenes compartidas con zoom, copia y descarga. Ver [0.2.23 verificación](verification/editor-comments-2026-10-28.md).

<a id="notifications"></a>

## Notificaciones

Los eventos incluyen `comment.created`, `comment.mentioned`, `document.mentioned`, `resource.permissions_changed` para una nueva invitación, `like.added`, `favorite.added`, y transferencia de propiedad.

- Al actor no se le notifica. Alguien mencionó en el mismo comentario que el dueño o la persona a la que se responde solo recibe la mención, y no una notificación de comentario especial.
- Un mencionamiento no otorga acceso. El destinatario debe ser un usuario activo y debe poder leer el documento cuando se envíe el comentario. De lo contrario, la notificación se omite.
- Se detecta una nueva mención por el ID del nodo de mención estable. Mencionar al mismo usuario en otro nodo nuevo también se notifica. No ocurre lo mismo al reproducir una actualización antigua o al editar texto normal.
- Las notificaciones de listado verifican nuevamente los permisos del documento. Después de la revocación o eliminación, las notificaciones relacionadas se ocultan y no se consideran no leídas.
- WebSocket envía `notifications.changed` Como una anulación. El cliente vuelve a obtener su propia lista. El cuerpo no se transmite. Los eventos sin conexión ya están en la base de datos y se obtienen después de reconectar.
- `GET /notifications?offset=0` devuelve `{items, unread, nextOffset}`, 50 artículos por página, incluyendo el título del actor y del documento.
- `POST /notifications/read` toma `{ids:[]}`, como máximo 100, y solo actualiza las notificaciones del llamante.
- `POST /notifications/read-all` toma `{}` Y marca todas las notificaciones del llamante como leídas.

Estos son notificaciones dentro de la aplicación. No envían correos electrónicos, SMS ni notificaciones push de terceros. Una implementación de WebSocket de una sola instancia no crea por sí sola un bus multiinstancia. Varias réplicas utilizan la configuración existente. [Escalado horizontal](horizontal-scaling.es.md).

<a id="verification"></a>

## Verificación

Las pruebas abarcan conflictos de identificación pública, identificadores SSO, visibilidad y sobrerreglas por usuario, documentos públicos que no están relacionados, evasión de permisos, comentarios estructurados, aislamiento de imágenes y carga de comentarios, deduplicación de notificaciones, usuarios que no tienen acceso, ocultación de notificaciones después de la revocación, actualización solo del estado de lectura de uno mismo, reproducción de colaboración y un @ repetido.

Los controles de navegador utilizan un documento en memoria y usuarios simulados. No escriben comentarios de prueba en un documento real. Confirman el botón de la barra de herramientas, el botón de solo lectura, las menciones enriquecidas, el resaltado amarillo en ambas direcciones, la ocultación al resolver y la ocultación cuando el texto original se elimina.
