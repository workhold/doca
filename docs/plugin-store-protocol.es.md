<a id="doca-plugin-store-protocol-v1"></a>

# Protocolo de tienda de complementos Doca v1

[中文](plugin-store-protocol.zh-CN.md)

Actualizado el 2026-09-30, con los campos obligatorios actuales y notas de navegación a continuación. **Las implementaciones de tiendas remotas utilizan este protocolo.** Sustituye al borrador anterior del catálogo completo/zip alojado en la tienda; ese borrador no es un contrato de punto de acceso aceptado.

Instalación con ZIP/npm, archivos compartidos, restauración del inicio de múltiples instancias, paginación remota, verificaciones de actualización, detalles y navegación en Web/App están implementados en el código fuente. Los almacenes externos y los plugins independientes aún requieren las verificaciones de aceptación siguientes; la implementación en código fuente no garantiza que todos los servicios externos estén activos. El SDK actual es `0.1.9`; verifica los ejemplos contra las versiones del host instalado y las exportaciones de paquetes.

<a id="_1-responsibilities-and-deployment"></a>
<a id="1-responsibilities-and-deployment"></a>

## 1. Responsabilidades y despliegue

- El registro npm distribuye paquetes precompilados completos. El almacén no tiene un punto de acceso para descargar archivos ZIP; es necesario revisar los bytes reales del paquete npm.
- La tienda remota posee metadatos, categorías, lanzamientos, aprobaciones/retiros, estadísticas de “me gusta/cargar”, y detalles de texto enriquecido.
- Doca posee autorización de administrador, transacciones de instalación, verificación de integridad, archivos compartidos, versiones en ejecución, entradas de Web/App y diseños.
- Los “Likes” y el inicio de sesión en GitHub se realizan en el sitio web remoto. Doca muestra los números y ofrece una nueva página al hacer clic. No recopila credenciales de inicio de sesión remota, ni implementa ninguna API de “Likes”, llamada de callback OAuth o vinculación de cuenta.
- Las instalaciones mediante npm y las instalaciones locales en formato ZIP/directorio siguen siendo compatibles. Los paquetes que se encuentran fuera del catálogo revisado se etiquetan como “no revisados”; la distribución de npm por sí sola no cuenta con aprobación oficial.

```dotenv
DOCA_PLUGIN_STORE_URL=https://store.smartdoca.cc
DOCA_PLUGIN_NPM_REGISTRY=https://registry.npmjs.org
DOCA_PLUGINS_DIR=/data/plugins
```

Las direcciones de almacenamiento/registro son orígenes HTTP(S) sin credenciales, prefijos de ruta, consultas o fragmentos. Los valores vacíos utilizan los valores por defecto. El inicio de sesión en el registro privado no es soportado en v1. El servidor Doca proxy almacena las solicitudes sin cookies del navegador, autorización, identificadores de usuario o datos comerciales; el servicio remoto no necesita CORS del navegador.

El prefijo de la API es `/api/v1`El JSON es en formato UTF-8 y las respuestas incluyen protocolVersion:1. Los tiempos son en UTC ISO 8601. Los conteos son enteros seguros no negativos o null cuando son desconocidos; los valores desconocidos no deben ser cero. Todos los extremos son de lectura única y no requieren inicio de sesión en el almacén.

<a id="_2-public-types"></a>
<a id="2-public-types"></a>

## 2. Tipos públicos

<a id="pluginsummary"></a>

### Resumen del complemento

```json
{
  "id": "example.mail",
  "name": "Mail",
  "summary": "Send and receive mail across multiple accounts.",
  "author": { "name": "Example", "url": "https://github.com/example" },
  "categoryId": "productivity",
  "icon": null,
  "detailPath": "/plugins/example.mail",
  "targets": ["web", "mobile"],
  "review": "approved",
  "official": false,
  "latestVersion": "1.2.0",
  "downloads": { "count": 1234, "period": "last30Days", "source": "npm", "asOf": "2026-09-30T00:00:00Z" },
  "likes": { "count": 42, "asOf": "2026-09-30T00:00:00Z" },
  "updatedAt": "2026-09-29T12:00:00Z"
}
```

Restricciones:

- id coincide con manifest.id y `^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$`, máximo 100 caracteres.
- name/author.name: 1–160 caracteres; resumen: máximo 300; todo en texto plano.
- author.url: URL HTTP(S), o null, para solo los clics del usuario, sin recuperación automática del host.
- categoryId: 1–60 caracteres coincidentes `[a-z0-9-]+`Obtenga las categorías por separado, en lugar de inferirlas a partir de una página.
- Icono: URL de datos PNG o null, máximo 24 KiB codificado; sin SVG, scripts o URLs de imágenes remotas.
- detailPath: mismo origen absoluto `/plugins/<id>`, combinado con el origen configurado. Rechaza los orígenes externos, las consultas/fragmentos y el recorrido. Las nuevas ventanas utilizan noopener, noreferrer.
- Objetivos: un arreglo web/móvil no vacío y sin duplicados. “Móvil” significa una vista web de aplicación controlada, en lugar de código nativo dinámico.
- Revisión: aprobado/suspendido. La lista se establece en aprobado por defecto; los detalles pueden volver a mostrar suspendido.
- Oficial: booleano requerido, separado de la revisión de lanzamiento. Se muestra la identidad oficial solo en el caso de “true”, sin inferirlo a partir de la fuente de instalación. La ausencia de identidad oficial es un error de protocolo.
- latestVersion: la última versión estable aprobada o null; no determina la posibilidad de instalación o actualización en un host específico.
- El número de descargas de paquetes en los últimos 30 días en npm representa las descargas totales, en lugar de los usuarios/instalaciones de Doca o las descargas específicas por versión.
- Las estadísticas ausentes todavía devuelven objetos con contador de null/asOf. Las listas omiten el cuerpo de texto enriquecido, los arreglos de lanzamientos históricos, los tarballs y la navegación completa.

<a id="release"></a>

### Lanzamiento

```json
{
  "pluginId": "example.mail",
  "version": "1.2.0",
  "sdkRange": "^0.1.9",
  "dataVersion": "1",
  "targets": ["web", "mobile"],
  "mobileHostRange": "^1.0.0",
  "dependencies": [],
  "changelog": "Improve mail synchronization.",
  "review": "approved",
  "reviewedAt": "2026-09-29T12:00:00Z",
  "publishedAt": "2026-09-29T10:00:00Z",
  "npm": {
    "registry": "https://registry.npmjs.org",
    "name": "@example/doca-mail",
    "version": "1.2.0",
    "integrity": "sha512-BASE64_OF_SHA512_DIGEST",
    "size": 12345
  }
}
```

El digester anterior es un marcador de posición. La integridad real debe ser un valor SRI que contenga un digester SHA-512 en formato standard-base64 de 64 bytes. npm.size es la longitud exacta del tgz, de 1–33,554,432 bytes. npm.version, Release.version, package.json.version y manifest.version deben coincidir.

La versión utiliza un formato semver de tres partes, puede incluir versiones preliminares, excluye los metadatos de compilación y tiene un máximo de 100 caracteres. sdkRange coincide exactamente con el manifiesto; la SDK actual es 0.1.9 y los rangoes soportados son `*`, exacto, `^`, y `~`. mobileHostRange es necesario para los objetivos móviles y se refiere al protocolo complemento-móvil host (v1:1.0.0), separado del número de compilación de App Store y de la compatibilidad con SDK.

La versión de datos coincide `[a-zA-Z0-9._-]{1,80}` sin orden de pedido; las actualizaciones v1 requieren igualdad exacta. Las dependencias contienen al menos 100 `{id,range,optional?}` Dependencias del complemento de Doca, separadas de las dependencias de npm. Los complementos de dependencias ausentes no se instalan automáticamente.

La revisión de la liberación está aprobada/retirada. La retirada evita la instalación nueva sin descargar automáticamente las versiones en ejecución. Las liberaciones más recientes de npm no pueden aparecer en las recomendaciones oficiales sin aprobación. La revisión impide esto. `(pluginId,npm.registry,npm.name,version,integrity,size)`La misma versión no puede reemplazar su paquete. Los autores, estadísticas y estado de revisión pueden cambiar; las declaraciones de bytes/capacidad del paquete son inmutables.

El changelog es una cadena de texto plano obligatoria en los endpoints de lista de lanzamientos y de lanzamientos exactos, con un máximo de 100000 caracteres. Un valor vacío significa que no hay notas; se deben conservar los saltos de línea sin ejecutar HTML.

<a id="_3-categories"></a>
<a id="3-categories"></a>

## 3. Categorías

`GET /api/v1/categories?locale=zh`

```json
{"protocolVersion":1,"items":[{"id":"productivity","name":"Productivity","count":12}]}
```

Máximo 100 categorías. La configuración de locale es zh/en; las traducciones ausentes utilizan etiquetas predeterminadas. count representa el número total de categorías visibles aprobadas, o nulo, independientemente de los filtros de la lista actual.

<a id="_4-paginated-search-and-ordering"></a>
<a id="4-paginated-search-and-ordering"></a>

## 4. Búsqueda y ordenación paginada

`GET /api/v1/plugins?q=mail&category=productivity&target=mobile&sort=downloads&limit=24&locale=zh`

| Parámetro | Regla |
| --- | --- |
| q | Opcional; máximo de 100 caracteres; búsquedas de coincidencia a distancia con nombre, resumen, autor, ID de plugin y nombre de npm |
| categoría | ID de categoría opcional; omitido significa todo |
| objetivo | Opcional para web/móvil; no especificado significa sin restricciones |
| ordenar | Actualizado (por defecto), descargas, “me gusta”, nombre |
| límite | 1–48, por defecto 24 |
| cursor | Cursor opcional opaco, hasta 2048 caracteres |
| lugar | zh/en, por defecto zh |

```json
{
  "protocolVersion": 1,
  "items": [],
  "page": { "nextCursor": null, "total": 0, "snapshotAt": "2026-09-30T00:00:00Z" }
}
```

Los ítems son PluginSummary&#91;&#93; dentro del límite. Total es la cantidad de coincidencias o null; null nextCursor significa la última página. Cargar más añade resultados de la misma consulta únicamente. Cambiar búsqueda/filtro/orden limpia el cursor; cancelar solicitudes anteriores o ignorar respuestas tardías en lugar de mezclar consultas.

Ordenado por descenso: updatedAt; descargas por número de descargas en los últimos 30 días; “likes” por descenso; nombre en orden ascendente; nombre localizado. Todos utilizan el ID en orden ascendente como criterio estable para resolver conflictos. Las estadísticas desconocidas siguen los valores conocidos.

Los cursores vinculan la consulta normalizada, el orden y el snapshot de resultados; la continuación conserva el snapshotAt. Los snapshots duran al menos 15 minutos para evitar duplicados/entradas faltantes a medida que cambian las estadísticas. La expiración devuelve 410 cursor_expired y vuelve a iniciar; los parámetros no coincidentes devuelven 400 cursor_mismatch. Doca no debe descargar todo el catálogo para realizar búsquedas, ordenación o paginación local.

Una página tiene un tamaño de al menos 2 MiB y un tiempo de timeout de 15 segundos. El ETag es opcional; Doca envía If-None-Match solo cuando hay una respuesta en caché que coincida, y utiliza esa caché en casos de 304.

<a id="_5-details-and-read-only-rich-text"></a>
<a id="5-details-and-read-only-rich-text"></a>

## 5. Detalles y texto enriquecido de solo lectura

`GET /api/v1/plugins/<id>?locale=zh`

```json
{
  "protocolVersion": 1,
  "plugin": { "id": "example.mail", "name": "See PluginSummary; return the complete object" },
  "description": {
    "format": "doca-slate",
    "version": 1,
    "nodes": [
      { "type": "heading", "level": 2, "children": [{"text":"Mail plugin"}] },
      { "type": "paragraph", "children": [{"text":"Supports multiple mail accounts.","bold":true}] }
    ]
  }
}
```

El objeto complemento abreviado debe ser en realidad un PluginSummary completo. Las versiones están paginadas por separado. El servicio remoto edita/persiste con slatetsx y se convierte en el subconjunto de transporte a continuación; Doca lo muestra de forma de solo lectura sin guardar, editar ni cargar complementos de editor remoto. doca-slate no acepta nodos internos arbitrarios de slatetsx.

<a id="rich-text-v1-nodes"></a>

### Nodos de texto rico v1

- Texto: `{text:string,bold?:boolean,italic?:boolean,underline?:boolean,strikethrough?:boolean,code?:boolean}`.
- párrafo: `{type:"paragraph",children:Inline[]}`.
- Título: estructura de párrafo con nivel entero 1–6.
- Enlace: inline `{type:"link",url:string,children:Text[]}`; Solo https/http/mailto; rechaza caracteres de control, URLs de JavaScript/data; las ventanas externas usan noopener, noreferrer.
- blockquote: `{type:"blockquote",children:Block[]}`.
- Lista con viñetas/lista numerada: `{type:...,children:ListItem[]}`; list-item: `{type:"list-item",children:Block[]}`.
- código-block: `{type:"code-block",language?:string,children:Text[]}`; render texto plano sin ejecución.
- imagen: `{type:"image",src:string,alt:string,children:[{text:""}]}`URLs de datos PNG/JPEG/WebP: máximo 1 MiB decodificados por imagen (1,048,576 bytes). Se rechazan las URLS SVG/remotas para evitar solicitudes de dirección privada y seguimiento. Doca 0.1.5 y versiones anteriores mantienen su límite original de 256 KiB para la visualización; las imágenes más grandes requieren un cliente actualizado. Este cambio en el límite no implica migración ni conversión de datos; el rollback del cliente restaura su antiguo límite de visualización. Los detalles totales permanecen dentro de los 2 MiB.
- divisor: `{type:"divider",children:[{text:""}]}`.

Los nodos no soportados conservan los hijos de texto seguros con retroalimentación de visualización parcial. Los formatos/versiones desconocidas muestran un mensaje explícito y un enlace a detalles remotos, sin ejecutar HTML/JSX. El HTML bruto, los scripts, los iframes, los componentes ejecutables y los campos de manejo de eventos son rechazados. Límites: 5000 nodos, profundidad 16, 200000 caracteres de texto y 2 MiB de respuesta total. El servicio remoto convierte las tablas/tipos no soportados en párrafos/imágenes. Los nuevos tipos requieren cambios coordinados en el protocolo/renderizador.

<a id="_6-releases-and-installation-checks"></a>
<a id="6-releases-and-installation-checks"></a>

## 6. Liberación e inspecciones de instalación

`GET /api/v1/plugins/<id>/releases?limit=20&cursor=...`

Devuelve `{protocolVersion:1,items:Release[],page:{nextCursor,total,snapshotAt}}` Con reglas de lista y límite de 1–48. Ordenar descendente según semver y usar las versiones estables aprobadas por defecto; opcional: includePrerelease=true. Las versiones retiradas solo están disponibles mediante búsqueda exacta.

`GET /api/v1/plugins/<id>/releases/<version>`

Devuelve `{protocolVersion:1,release:Release}`La instalación recupera el estado exacto de la revisión/digest, en lugar de confiar en listas obsoletas. Las versiones desconocidas devuelven 404; el retiro está explícito en una respuesta 200 y no puede instalarse.

<a id="npm-download"></a>

### npm download

1. Verifique que Release.npm.registry sea igual al registro configurado (por defecto, npmjs); el almacén no puede elegir orígenes arbitrarios.
2. Obtén los metadatos de la versión exacta. `GET /<encodeURIComponent(packageName)>/<encodeURIComponent(version)>`, sin resolución de última versión/tag/rango.
3. Verifique el nombre/versión y la integridad de dist.integrity en comparación con el SRI aprobado, luego descargue dist.tarball.
4. El tarball es de tipo HTTP(S) en el origen del registro, sin credenciales/fragmento; no hay redirecciones. Metadatos: 2 MiB/15 segundos. Descarga: 32 MiB/120 segundos, tamaño exacto y validación SHA-512.
5. Extraer de forma segura el archivo npm tgz bajo exactamente un paquete/wrapper. Solo se aceptan archivos/directorios ordinarios; se rechazan enlaces simbólicos/duros, dispositivos, rutas absolutas/traversales/duplicadas. Saltar los encabezados de extensión POSIX pax x/g (usados para mtime/xattr por la biblioteca libarchive de npm/macOS), ni extraerlos ni adoptar sus sobrerreglas de ruta. Validar la siguiente ruta ustar. Aplicar un límite de al menos 10000 entradas y 128 MiB de datos expandidos con límites de streaming.
6. Verifique los metadatos del paquete/manifesto/revisión y publique el estado completo del archivo/objetivo. Nunca ejecute los scripts del ciclo de vida de npm, npm install o descargas para dependencias de ejecución ausentes.

El manual de npm utiliza los mismos controles con metadatos exactos del registro configurado, sin revisión oficial. Las interrupciones en la tienda no impiden la instalación manual; el inicio del plugin instalado no requiere que npm/store esté disponible.

<a id="_7-batch-update-checks"></a>
<a id="7-batch-update-checks"></a>

## 7. Verificaciones de actualización por lotes

`POST /api/v1/updates/check`

```json
{
  "protocolVersion": 1,
  "host": { "sdkVersion": "0.1.9", "mobileHostVersion": "1.0.0" },
  "plugins": [
    { "id": "example.mail", "version": "1.0.0", "dataVersion": "1", "npm": {"registry":"https://registry.npmjs.org","name":"@example/doca-mail"} }
  ]
}
```

Envíe de 1 a 100 IDs de complemento distintos por lote, hasta 128 KiB. Solo se envían los metadatos de instalación, excluyendo los identificadores del sitio, usuarios, configuración, contenido y credenciales. Doca utiliza lotes más grandes. Los paquetes locales sin origen npm pueden omitir npm y consultar las versiones oficiales del mismo ID, sin cambiar silenciosamente la fuente de instalación.

```json
{
  "protocolVersion": 1,
  "checkedAt": "2026-09-30T00:00:00Z",
  "items": [
    {
      "id": "example.mail",
      "installedVersion": "1.0.0",
      "status": "update_available",
      "currentReview": "approved",
      "latestVersion": "1.2.0",
      "release": { "pluginId": "example.mail", "version": "Return the complete Release object" },
      "reason": null
    }
  ]
}
```

Devuelva exactamente un elemento por solicitud, de modo que la versión instalada no se pueda usar en respuestas obsoletas.

| estado | Significado |
| --- | --- |
| update_available | Versión estable aprobada más reciente, compatible con SDK/dataVersion/mobile host; la versión está completa |
| up_to_date | No hay una versión estable aprobada más reciente; release=null |
| incompatible | Existen versiones más avanzadas sin un candidato compatible; release=null; reason=sdk/data_version/mobile_host |
| desconocido | Plugin desconocido o fuente npm no compatible; release=null; razón=not_found/source_mismatch |

La revisión actual está aprobada/retirada/desconocida. Notifique por separado las versiones instaladas retiradas sin eliminación/desactivación automática. Doca verifica nuevamente los plugins de dependencia local durante la instalación; las recomendaciones remotas no pueden garantizar el grafo de dependencias local.

Elija la versión más alta y compatible, en lugar de probar solo la más reciente. latestVersion es la versión estable y aprobada más alta y puede superar release.version. Doca verifica de forma independiente la versión, el SDK, la estructura de datos y las dependencias; las recomendaciones remotas no implican autorización.

Verifique la apertura de la vista Instalado/Actualizable, permita actualización manual y guarde la caché por al menos 15 minutos. La instalación anula el resultado del complemento. En caso de fallo, se mostrará "fallido/desconocido" en lugar de indicar que todo está actualizado. No sugiera actualizaciones durante la desinstalación. Compare las versiones objetivo globales; la visualización de estado de versiones en ejecución y reinicio es independiente. Los paquetes npm fuera del catálogo pueden verificar las versiones del registro, pero permanecerán sin revisión sin una instalación automática.

Respuestas por lote: 2 MiB/15 segundos. Los elementos desconocidos parciales utilizan los estados del ítem; los errores de red/límite de velocidad/formato utilizan errores HTTP sin resultados normales fabricados.

<a id="_8-packages-and-navigation"></a>
<a id="8-packages-and-navigation"></a>

## 8. Paquetes y navegación

El archivo npm tgz contiene el paquete y el archivo package.json; el ZIP local contiene el package.json directamente, sin un empaquetador.

```json
{
  "name": "@example/doca-mail",
  "version": "1.2.0",
  "type": "module",
  "files": ["manifest.json", "dist", "web"],
  "doca": {
    "dataVersion": "1",
    "storage": "host",
    "manifest": "./manifest.json",
    "server": "./dist/server.js",
    "web": {"directory":"./web","entry":"./index.js"},
    "mobileHostRange": "^1.0.0",
    "navigation": [{
      "id": "example.mail.inbox",
      "title": {"zh":"邮箱","en":"Mail"},
      "icon": "mail",
      "webPath": "/plugins/example.mail/inbox",
      "mobile": true,
      "allowedSlots": ["web.left","web.top","web.topRight","web.right","web.user","web.home","web.more","mobile.drawer","mobile.bottom","mobile.topRight","mobile.account","mobile.home","mobile.more"],
      "defaults": ["web.left","mobile.drawer"],
      "order": 60,
      "adminOnly": false
    }]
  }
}
```

Precompila y agrupe todas las dependencias de tiempo de ejecución; sin alias de fuentes de host, puentes globales o árboles de symlink de pnpm. `doca.storage: "host"` Es obligatorio. Los valores faltantes o otros valores se rechazan antes de importar código durante la instalación de ZIP/npm/store, la importación de directorios o la restauración de inicio, sin valores por defecto o adaptadores. El servidor exporta una fábrica por defecto; la Web utiliza host=>bundle con React inyectado. Toda persistencia utiliza servicios del host; los plugins no pueden elegir persistencia local/remota, crear bases de datos o mantener directorios persistentes. Los plugins instalados implementan la limpieza y desinstalación de negocios sin eliminar las rutas del host; en caso de fallo, la instalación se mantiene. Véase también [contrato de almacenamiento](plugin-horizontal-scaling.es.md) Para las capacidades gestionadas y la coordinación de limpieza.

Los IDs de navegación del paquete package.json estático utilizan el espacio de nombres, y webPath permanece bajo. `/plugins/<plugin-id>/`; también registre la página correspondiente en el paquete web. No más de 30 entradas. allowedSlots/defaults están desduplicados y defaults es un subconjunto. No hay slots móviles sin declaración móvil; móvil requiere una página web y mobileHostRange.

Los slots actuales también incluyen web.admin y web.leftMore. web.leftMore requiere una declaración explícita; web.more sigue estando en la esquina superior derecha. Ver [Extensiónes de UI](plugin-extensions.es.md)web.right es una barra de herramientas de entrada, en lugar de un incrustación automática de páginas arbitrarias como paneles laterales. Las entradas abren páginas; los comandos, vistas y presentaciones de paneles tienen un contrato público separado.

Los administradores configuran la visibilidad, la posición, el orden y el agrupamiento de las aplicaciones web en Doca. El diseño no es una configuración de tienda remota; los complementos declaran valores por defecto y solo brindan soporte. El exceso de capacidad se maneja mediante "Más". Los complementos deshabilitados desaparecen de la navegación en ejecución. La navegación oculta no revoca el acceso a rutas/API; el host y los complementos autorizan cada solicitud.

Las verificaciones de revisión comparan los objetivos con las declaraciones web/móviles reales, sdkRange, dataVersion, dependencias y identidad/versión del paquete. Doca repite la verificación. El lanzamiento excluye la navegación completa; el paquete es la fuente de la capacidad.

La aplicación debe primero enviar una versión que incluya el host del complemento móvil. Las páginas posteriores que cumplen con los requisitos se cargan a través de WebViews controlados, sin descargar ni ejecutar módulos React Native. El inicio de sesión utiliza boletas únicas del host, nunca tokens de portador de la aplicación de larga duración en los scripts del complemento. El alcance de la navegación y las llamadas al host sigue la guía de desarrollo.

<a id="_9-errors-cache-and-withdrawal"></a>
<a id="9-errors-cache-and-withdrawal"></a>

## 9. Errores, caché y retiro

```json
{"protocolVersion":1,"error":{"code":"not_found","message":"Plugin not found"}}
```

Errores HTTP: 400 invalid_request/cursor_mismatch; 404 not_found; 410 cursor_expired; 429 rate_limited con Retry-After segundos; 503 unavailable. El mensaje es texto plano, no una clave lógica. No devuelva HTML de inicio de sesión, redirecciones ni trazas de pila. La falla preserva la gestión local y permite intentos; la instalación no puede continuar sin validación.

Los detalles/revisión exacta del caché deben durar al menos 60 segundos. La instalación debe validar nuevamente las versiones exactas sin el caché offline. La aprobación no es una garantía de seguridad absoluta: los plugins del servidor se ejecutan en un proceso confiable, no en un sandbox.

La revisión interna, la publicación por parte del autor, el inicio de sesión en GitHub y las escrituras similares están propiedad de Store. Orden de publicación: publicar el paquete npm → obtener los bytes reales e inmutables → revisar/escanear las capacidades → publicar la versión aprobada → actualizar el resumen e índice de búsqueda.

<a id="_10-multiple-instances-and-activation"></a>
<a id="10-multiple-instances-and-activation"></a>

## 10. Múltiples instancias y activación

La instalación almacena los archivos completos y el estado objetivo global en la base de datos del host compartido; las instancias utilizan directorios privados de plugin escritibles. El inicio verifica/restaura los archivos y rechaza los paquetes parciales sin acceder a npm/store. Los archivos compartidos ausentes o corruptos fallan de forma explícita.

La instalación, actualización, habilitación, deshabilitación o desinstalación requiere que cada instancia se reinicie. La gestión reporta la versión en ejecución de la instancia respondedora, sin afirmar que la activación sea a nivel del clúster. Compose utiliza `docker compose restart doca`Kubernetes/operators reinicia las instancias de forma progresiva y elimina el tráfico antiguo para APIs incompatibles.

Los activos web históricos pueden restaurados desde archivos compartidos sin implicar compatibilidad de API comercial entre versiones. Los diseños de navegación publicados entran en efecto después de actualizar el cliente sin reiniciar; los cambios en la capacidad del paquete requieren actualización o reinicio. La desinstalación actual realiza la limpieza comercial, elimina los marcadores de versión de datos con éxito y conserva los archivos inmutables. Se implementan la limpieza de bases de datos gestionadas y de objetos privados, así como el control de generación. La eliminación de tareas comerciales en todo el clúster sigue pendiente; los plugins no pueden eliminar directores por sí mismos.

<a id="_11-integration-fixtures"></a>
<a id="11-integration-fixtures"></a>

## 11. Accesorios de integración

Proporcione al menos:

1. Listas vacías y de más de dos páginas, filtros de búsqueda/categoría/plataforma, cuatro métodos de ordenación, cursores caducados/mismos.
2. Resúmenes completos, estadísticas desconocidas, detalles suspendidos, texto enriquecido válido y degradación del texto en nodos desconocidos.
3. Paginación de lanzamientos; actualización incompatible pero más compatible; todas las actualizaciones son incompatibles; lanzamiento instalado retirado; paquete desconocido/incompatible.
4. Revisó los bytes de npm y el tamaño real de SRI; rechazó los paquetes reemplazados, las discrepancias en los digest/declaraciones, los redireccionamientos y la exploración de extracción.
5. 429/503/timeoutes; el fallo de almacenamiento no debe interrumpir las listas locales instaladas o el uso actual de la aplicación.
6. Instalar en una instancia; reiniciar otra con un directorio vacío y npm/store desconectado; restaurar desde el archivo compartido y reparar el caché local dañado.
7. Declaraciones/navegación de web/app; no hay entrada para la app sin declaración móvil; rechazar actualizaciones de datos incompatibles.
8. Al hacer clic, se abre la página de detalles del mismo origen configurado, sin llamar a una API de “like” ni iniciar Doca OAuth.

La integración de correos puede comenzar desde el original [Guía de integración de plugin v1](plugin-mail-integration-v1.md), conservado como material de investigación.

Vea [desarrollo de complementos](plugin-development.es.md) y [Límites del SDK](plugin-sdk-contract.es.md)Para las API del host, utilice los tipos exportados reales; para el almacén remoto, utilice este protocolo de red. No inferencie los métodos propuestos para el host.

<a id="cross-repository-acceptance"></a>

## Aceptación entre repositorios

Ejecutar `pnpm exec tsx scripts/verify-plugin-store-contract.ts ../doca-plugin-store`Ejercita las rutas reales del almacén con una base de datos en memoria para categorías (incluyendo cifras cero), búsqueda, objetivos, paginación, detalles, lanzamientos, actualizaciones y vencimiento del cursor, sin tocar las bases de datos empresariales ni publicar npm.

/categories es una lista de categorías, no un multi-tagging arbitrario; cada plugin tiene un categoryId. Los conteos de categorías cubren todos los plugins publicados independientemente de la búsqueda; page.total cubre el snapshot de la consulta. Las descargas/me gusta desconocidas muestran un guion, y cero muestra 0.

La revisión valida la misma navegación estática que el host: título bilingüe (1–80 caracteres cada uno), icono, orden, allowedSlots no vacíos, valores por defecto válidos y sin campos desconocidos. El servidor está construido en JS/mjs/cjs; la entrada web es en JS; el manifiesto es JSON estático. Ni la revisión ni la instalación ejecutan los scripts de instalación de paquetes.

<a id="official-identity-and-release-notes"></a>

### Identidad oficial y notas de lanzamiento

Resumen del plugin.official y Changelog de Release son obligatorios, como se especificó anteriormente. La identidad oficial es independiente de la revisión de lanzamiento. Las notas de lanzamiento se muestran en texto plano con saltos de línea; los campos ausentes son errores de protocolo y no valores por defecto implícitos.
