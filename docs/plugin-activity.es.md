<a id="plugin-recent-activity"></a>

# Actividad reciente del complemento

[中文](plugin-activity.zh-CN.md)

Implementado el 2026-09-30 y exportado públicamente desde `@smartdoca/plugin-sdk/platform`Utilice un artefacto SDK y un host que contenga esta interfaz. La disponibilidad de la fuente por sí sola no establece una nueva publicación en npm.

<a id="storage-and-ownership"></a>

## Almacenamiento y propiedad

Los complementos se registran a través de `activityServiceToken` (`activity.v1`). Poseen registros de visitas, consultas de historial, autorización comercial actual y limpieza de eliminaciones, utilizando la persistencia gestionada por el host. El servicio solo agréguea fuentes; no crea un espejo comercial ni un punto final especial para la escritura de visitas. Utilice [Contrato de almacenamiento gestionado actual](plugin-horizontal-scaling.es.md).

Los registros integrados permanecen en `resource_visits` y `workspace_activity`Este incremento no cambió ninguna tabla, no movió ningún historial y no introdujo ninguna escritura dual. La página de descubrimiento pública… `/workspace/recent?publicOnly=true` La lógica de colección se aplica a los recursos integrados. El registro de actividad no incluye el registro de descubrimientos, favoritos, búsqueda o IA.

La eliminación elimina las registraciones en tiempo de ejecución y detiene la apertura/listado de esa fuente. Los registros almacenados permanecen. La reactivación de las consultas recupera los datos del plugin actual. La instalación/desactivación real sigue el ciclo de vida basado en reinicio del host.

<a id="registration"></a>

## Registro

```ts
import {
  activityServiceToken,
  permissionsServiceToken,
  type ActivitySource,
} from "@smartdoca/plugin-sdk/platform";
```

Declarar ambos tokens. `injections.required`Un anfitrión sin `activity.v1` Rechaza un complemento que lo requiere; las tablas privadas o los endpoints antiguos no son sustitutos. Los complementos existentes que no usan actividad no necesitan registro nuevo. `register(source)` Devuelve un dispositivo; la inyección delimitada lo vincula a los efectos del complemento y lo libera al finalizar la operación o en caso de fallo durante la inicialización.

Registre una fuente por tipo de contenido, por ejemplo `example.mail.messages` y `example.mail.threads`:

| Campo | Requisito |
| --- | --- |
| `id` | ID de origen único con prefijo plugin, máximo 150 caracteres |
| `pluginId` | Debe ser igual al identificador del complemento inyectado |
| `schemaVersion` | Exactamente `1`Las versiones no soportadas fallan en el registro |
| `resourceType` | Registrado con `permissions.v1`; los IDs de los ítems identifican el recurso de ese tipo |
| `title` | `en` y `zh`, como máximo 100 caracteres cada uno, para etiquetas de filtros/fuente |
| `icon` | `file`, `mail`, `calendar`, `message`, `task`, `book`, o `folder` |
| `list(context, input)` | Página de visita legible para el usuario actual |
| `get(context, id)` | Registro/título/ruta actual con autorización reverificada, o nulo |

Los IDs y los tipos de recursos comienzan con una letra minúscula y utilizan segmentos alfanuméricos separados por puntos o guiones. Cada instancia permite al menos 64 fuentes de complementos y rechaza IDs duplicados. Los recursos empresariales son ilimitados, pero deben ser paginados.

El contexto creado por el anfitrión es `{principalId, signal}`El principal proviene de la sesión autenticada, y no del usuario seleccionado por el navegador. Un elemento tiene esta forma:

```ts
{
  id: "message-123",                  // 唯一资源 ID，1–500 个可见 ASCII 字符
  title: "季度预算讨论",              // 原始内容标题，非空，最长 500 字符
  visitedAt: "2026-09-30T09:20:00.000Z",
  path: "/mail/inbox?message=message-123"
}
```

`id` Contiene de 1 a 500 caracteres ASCII visibles; el título no está vacío y tiene al menos 500 caracteres. `path` Comienza con un guion y una letra/dígito, y no contiene ningún origen, hash, backslash o caracteres de control. Las direcciones externas/relativas a protocolos están prohibidas. Codifica los valores de consulta. Los títulos comerciales mantienen su contenido original; los nombres de tipo utilizan `title.en/zh`.

<a id="pagination"></a>

## Paginación

`list` toma `{until, after, limit}` y regresa `{items, hasMore}`:

1. Devuelve una visita más reciente por usuario/fuente/resurso, ordenada. `visitedAt DESC, id ASC` Con orden de ID binario ASCII.
2. Usar cadenas ISO UTC con milisegundos, y solo `visitedAt <= until`.
3. `after=null` Comienza. De lo contrario, requiere. `visitedAt < after.visitedAt`o tiempo igual con `id > after.id`El límite sigue siendo útil después de que su registro sea eliminado.
4. `items.length <= limit`El host actualmente solicita al menos 51. Se permiten páginas cortas. Los registros restantes requieren `hasMore=true` Y al menos un artículo devuelto; las páginas vacías no significan que se pueda intentar de nuevo más tarde.
5. Filtrar primero las visitas de usuarios y los permisos actuales. El host también verifica `activity.read` En cada elemento y obtiene más según sea necesario. No más de 20 lotes y 1.5 segundos por fuente, incluyendo verificaciones de permisos. Utilice índices, respete la cancelación y evite la sincronización completa remota dentro de las consultas.
6. La lista nunca actualiza las visitas. Las visitas se registran solo después de abrir con éxito el contenido del negocio. Las llamadas y los candidatos no consumidos pueden repetirse.

El anfitrión combina páginas de 50, ordenando por tiempo de visita descendente, ID de origen ascendente, y luego ID de recurso. La fuente integrada es `doca`, con `kind:id` Claves de recursos. Los punteros siguientes opacos vinculan usuarios/filtros y conservan el primero `until`, fuentes seleccionadas y posiciones consumidas.

La lista refleja los permisos actuales, y no un snapshot de base de datos inmovilizado. Las nuevas visitas aparecen al actualizar; la eliminación, revocación o actualización de los tiempos de visita pueden eliminar registros de una cadena de paginación. Utilice transacciones gestionadas para lecturas consistentes de páginas individuales.

El fracaso, el tiempo de espera, la página o camino inválidos, o la falta de permisos hace que el servicio descarte toda la página de ese origen y preserve otros origenes. Los orígenes fallidos se omiten para las páginas posteriores de ese recorrido y aparecen en `unavailableSources`; intentos de actualización. Las fuentes recién registradas también requieren actualización.

<a id="example"></a>

## Ejemplo

Esto `mount(context)` Ejemplo requiere complemento implementado por plugin `mailStore`, persistió con los servicios gestionados por el anfitrión actual; `mailStore` No es una exportación de SDK.

```ts
const pluginId = "example.mail";

context.inject(permissionsServiceToken).register({
  pluginId,
  resourceType: "message",
  async authorize(principalId, messageId, action) {
    if (action !== "activity.read") return false;
    return mailStore.canRead(principalId, messageId);
  },
});

const source: ActivitySource = {
  id: `${pluginId}.messages`,
  pluginId,
  schemaVersion: 1,
  resourceType: "message",
  title: { en: "Mail", zh: "邮件" },
  icon: "mail",
  async list({ principalId, signal }, { until, after, limit }) {
    // 业务实现：按用户、当前权限、until、after 过滤，再依协议排序。
    // 可读取 limit + 1 条以判断 hasMore；只返回前 limit 条。
    return mailStore.listRecent(principalId, { until, after, limit, signal });
  },
  async get({ principalId, signal }, id) {
    // 必须确认这个用户有该访问记录，资源仍存在且当前仍可读。
    return mailStore.getRecent(principalId, id, { signal });
  },
};
context.inject(activityServiceToken).register(source);
```

Añadir `activity.read` A un registro de permisos existente, en lugar de registrar el mismo tipo de plugin/recurso dos veces. Después de que la API de open-mail autenticada del plugin lea con éxito el contenido, actualice su tabla de visitas con el ID de usuario de la sesión. En caso de eliminación, limpie esa tabla o filtre los elementos eliminados mediante conexiones; el host no puede limpiar registros que no es él quien posee.

<a id="host-entry-points-and-authorization"></a>

## Puntos de entrada del host y autorización

- `GET /api/v1/workspace/activity`: lista mixta autenticada; acepta los integrados `kind`, complemento `source`, y `cursor`. `kind` y `source` son mutuamente excluyentes. Devuelve `items`, `nextCursor`, `sources`, `unavailableSources`.
- Los elementos del complemento tienen `kind=plugin`, `sourceId`, `sourceTitle`, y `icon`Las teclas de la interfaz de usuario incluyen el ID de origen.
- `href` se refiere a `/api/v1/workspace/activity/open?source=...&id=...`El anfitrión revisa nuevamente la cuenta/fuente.`activity.read`, invoca `get` Para el camino actual, se vuelve a autorizar y luego se redirige. El error es 404; no se redirige utilizando una imagen histórica.
- Páginas objetivo y APIs de negocio autorizadas de forma independiente. Las actividades no otorgan acceso a archivos adjuntos ni a documentos asociados.

<a id="acceptance-and-rollback"></a>

## Aceptación y rollback

`tests/plugin-activity.test.ts` y `tests/workspace-home.test.ts` Utilizar bases de datos o directorios de instalación aislados. Cubren orden de tiempo igual, recorrido, continuación de páginas cortas, eliminación, acceso cruzado entre usuarios, revocación, desregistro, fallos/tiempos de espera, redirecciones inseguras, cursores inválidos, inyección de paquetes reales y apertura de HTTP.

Esta capacidad no introdujo cambios persistentes en la tabla. El historial del complemento se mantiene al revertir un host; un complemento que requiere `activity.v1` Se niega a un host que no lo tenga. No elimine los datos de negocio para realizar un rollback.
