<a id="plugin-development"></a>

# Desarrollo de plugins

El cliente de escritorio Tauri se conecta a un host remoto Doca. Los complementos se ejecutan en ese host a través de su directorio de instalación y el SDK público; el cliente no incluye ningún puente de ruta de origen exclusivo para escritorio. Ver [cliente de escritorio](desktop-client.es.md).

La fuente actual utiliza SDK **0.2.0**, con `ai.v2` / `ai.continuations.v2`Los contextos de herramientas siempre llevan `jobId`; `sessionId` Solo está presente en conversaciones reales. Reconstruye los complementos. `sdkRange: "^0.2.0"`; los rangos anteriores de SDK y los contratos de servicios de IA son rechazados sin adaptadores. Este cambio en la fuente no es una publicación ni un despliegue de npm. Véase [Separación de ejecución de MCP](mcp.es.md#execution-history-and-upgrade).

Un rango de SDK incompatible o una dependencia requerida no disponible aísla el plugin de negocio afectado. El host y los plugins no relacionados se inician, y Admin → Plugins explica el motivo y solicita una actualización. La selección de instalaciones, los archivos, los datos de negocio y las credenciales se conservan. Los paquetes antiguos no se convierten y el código del SDK antiguo no se ejecuta. Las nuevas instalaciones en línea aún rechazan los paquetes incompatibles. Las carpetas de instalación completamente offline conservan su identidad original y reciben la misma aislación.


Los clientes de IA externos utilizan [Servicios MCP](mcp.es.md)Las herramientas deben declarar explícitamente su exposición a MCP y mantener sus controles normales de autorización/admisión; un SKILL es algo manual, no una concesión de autorización.

0.1.26 utiliza un [base de datos comercial de complementos compartidos](plugin-database-isolation.es.md), separado del núcleo, con espacios de nombres automáticos. Reemplaza a las bases de datos por plugin lanzadas en 0.1.25. La actualización requiere desinstalar normalmente en el host anterior y reinstalar; los datos del plugin no se migran.

Línea de base de documentación: host 0.2.23 / SDK 0.1.11, verificada el 2026-10-28. Se registra la publicación del SDK 0.1.11 a continuación; la implementación en producción y la aceptación en dispositivos nativos siguen siendo separadas. Este es el guía de desarrollo principal, que incluye el contenido actual, los contratos de nativo e instalación. Los documentos vinculados proporcionan los protocolos completos y los registros históricos de aceptación. Cualquier adaptador de compatibilidad, conversión de formato antiguo o migración de base de datos requiere un acuerdo previo con el propietario del proyecto.

[中文](plugin-development.zh-CN.md)

El objetivo completo, incluyendo las partes que no se implementan, es [Contrato SDK](plugin-sdk-contract.es.md)No mantenga miembros obsoletos, sistemas de moderación o capas de compatibilidad para carga de fuentes.

El [Escalado horizontal y contrato de almacenamiento gestionado](plugin-horizontal-scaling.es.md) Está aprobado. Toda persistencia es gestionada por el host; los paquetes deben declarar `doca.storage: "host"`. Las declaraciones faltantes o diferentes se rechazan antes de la importación de código durante la instalación, el descubrimiento de directorios y el inicio. Los objetos SQL/gratuitos gestionados se exportan en el SDK 0.1.7; las credenciales se exportan en el código fuente del SDK 0.1.9; los espacios de trabajo siguen siendo un problema.

<a id="implemented-managed-storage"></a>

## Implementado almacenamiento gestionado

`@smartdoca/plugin-sdk/storage` Ahora exporta productos destinados a instalaciones. `pluginDatabaseToken` (`storage.sql.v1`) y `pluginObjectStorageToken` (`storage.objects.v1`). El subconjunto de la base de datos es la versión de esquema 1, con columnas texto/int32/double, restricciones primarias/únicas, operaciones de selección/inserción/actualización/eliminación estructuradas y transacciones con llamadas a callbacks ejecutadas una vez. `pluginCredentialToken` (`storage.credentials.v1`, SDK source 0.1.8) proporciona credenciales cifradas exclusivas para servidores con actualizaciones y eliminaciones verificadas por revisión. Los vínculos, claves foráneas, SQL genérico, upsert y espacio de trabajo no se exportan. Ver [API de credenciales y despliegue](plugin-credentials.es.md). El SQL empresarial utiliza una base de datos gestionada por un host compartido separada del núcleo: un archivo SQLite con prefijos de tabla, o una URL/cuenta de PostgreSQL con esquemas de plugin automáticos y un pool de conexiones compartido. La aislación de procesos sigue sin estar implementada. Véase [Configuración de almacenamiento y contrato de desinstalación antes de la actualización](plugin-database-isolation.es.md).

Los bases de datos lógicas utilizan `plugin:<pluginId>`Atribución de archivos de usuario y uso de objetos privados `plugins/<pluginId>`, y el uso de ZIPs liberados `host/plugin-releases/<sha256>.zip`. Los bytes ZIP completos e inmutables se almacenan en un almacenamiento de archivos configurado en el entorno; la base de datos compartida contiene la versión 2 del registro, referencias de archivo y índices de hash de archivo confiables. Los hits de caché verificados no descargan los ZIP de nuevo. Todas las instancias se reinician manualmente. Los paquetes de plugin o formatos de almacenamiento no soportados son rechazados sin conversión automática; los datos existentes se conservan. Las actualizaciones de la base de datos principal se realizan por separado. [Contrato de actualización de base de datos](database-schema-evolution.es.md). Ver [Implementación exacta y limitaciones](unified-storage-implementation.md).

<a id="license"></a>

## Licencia

Doca y el SDK de complemento público [MIT](../LICENSE). Un complemento puede ser de código abierto o propietario. Véase [Licenciamiento](../LICENSING.md).

No envíe un dependiente cuya licencia es desconocida, está prohibida la redistribución o entra en conflicto con la forma en que publica el complemento. Las notas de terceros siguen siendo la obligación del autor del complemento. La licencia de Doca no cubre el material de terceros para el cual el autor no puede otorgar una licencia.

<a id="install-and-start"></a>

## Instalar y iniciar

Instalar un ZIP completo preconstruido a través de Administrador → Plugins, o descargar uno `<plugin-id>/` liberar el directorio `DOCA_PLUGINS_DIR` mientras está detenido. Reiniciar cada instancia. La base de datos compartida almacena la selección deseada, referencias de archivo y índices de hash de archivos; los bytes completos del ZIP se encuentran en el almacén de archivos configurado; los cachés locales de la instancia se sincronizan automáticamente al iniciar. No existe una ruta de compatibilidad para el directorio de instalación de npm. Véase [protocolo de almacenamiento](plugin-store-protocol.es.md) y [guía de despliegue](plugin-deployment.es.md).

```json
{
  "name": "@example/attachments",
  "version": "1.0.0",
  "type": "module",
  "doca": {
    "dataVersion": "1",
    "storage": "host",
    "manifest": "./manifest.json",
    "server": "./dist/server.js",
    "web": { "directory": "./web", "entry": "./index.js" }
  }
}
```

`manifest.json` Es JSON estático. Su versión coincide. `package.json`:

```json
{
  "schemaVersion": 1,
  "id": "example.attachments",
  "version": "1.0.0",
  "displayName": "Attachments",
  "sdkRange": "^0.2.0",
  "dependencies": [{ "id": "doca.files", "range": "^0.1.0" }]
}
```

Solo se carga el JavaScript compilado. Se empaqueta o vende la clausura completa de dependencias como archivos reales. No hay scripts de instalación, obtención de registro ni ejecución de compilación en el host. Los caminos permanecen dentro de la raíz del paquete. `doca.dataVersion` Es necesario. Si el número de esa estructura puede cambiar, está especificado en [Estructura de datos](#data-structure) abajo.

<a id="sdk-and-host-services"></a>

## SDK y servicios de host

Depende del contrato público. No importar. `@server/*`, `@core/*`, `@web/*`, `@db/*`, hermano de Doca source, o un puente global. Los IDs de servicio son estables entre las instalaciones. El host inyecta la implementación.

```ts
import { definePlugin } from "@smartdoca/plugin-sdk";
import { filesServiceToken } from "@smartdoca/plugin-sdk/files";
import {
  httpServiceToken,
  usersServiceToken,
} from "@smartdoca/plugin-sdk/platform";
import manifest from "../manifest.json" with { type: "json" };

export default () =>
  definePlugin({
    manifest,
    async uninstall() {},
    injections: {
      required: [filesServiceToken, httpServiceToken, usersServiceToken],
    },
    async mount(context) {
      const files = context.inject(filesServiceToken);
      const users = context.inject(usersServiceToken);
      await context.inject(httpServiceToken).register(manifest.id, [
        {
          method: "GET",
          path: "/folders",
          async handle(request) {
            const user = await users.get(request, request.principal.id);
            const folders = await files.folders.list(
              { principalId: request.principal.id, signal: request.signal },
              { parentId: null },
            );
            return { user, folders };
          },
        },
      ]);
    },
  });
```

Ese camino es `/api/v1/plugins/example.attachments/folders`La identidad proviene de la sesión del host. Las operaciones de archivo verifican nuevamente los permisos. Almacene un identificador de archivo estable y una asociación de propietario, no una ruta de disco local. `users.get` Devuelve al usuario autenticado, o a un usuario a quien el administrador tiene permiso para leer, incluyendo información de contacto y campos de perfil personalizados. No devuelve un hash de contraseña ni secretos de autenticación. Se elimina la respuesta del navegador para que sea lo que el pantalla necesita.

<a id="public-services"></a>

## Servicios públicos

| Importación              | Servicio                   | Usa                                                                     |
| ------------------- | ------------------------- | ----------------------------------------------------------------------- |
| plugin-sdk/files    | fileServiceToken         | Folders, archivos, subida, contenido, enlaces y acceso                   |
| plugin-sdk/platform | Token de servicio de usuarios         | Perfil del usuario autorizado y búsqueda unificada de usuarios                   |
| plugin-sdk/platform | permisosServiceToken   | Registrar la autorización de recursos comerciales y las fuentes de relaciones       |
| plugin-sdk/platform | httpServiceToken          | Rutas autenticadas en el espacio de nombres propio del complemento                      |
| plugin-sdk/platform | policiesServiceToken      | Admisión antes de crear, almacenar, compartir, transferir y llamadas de IA           |
| plugin-sdk/platform | eventosServiceToken        | Lea el flujo de eventos duradero, incluyendo `ai.usage.recorded`            |
| plugin-sdk/platform | notificacionesServiceToken | Publicar y retirar notificaciones de manera idempotente                         |
| plugin-sdk/ai       | aiServiceToken / aiContinuationsServiceToken | Registrar las herramientas de IA con un esquema JSON y manuales de habilidades                  |
| plugin-sdk/content  | tokenServiceContenido       | Inventario unificado, lectura, resolución, búsqueda opcional y fuentes de conocimiento |
| plugin-sdk/platform | tokenServiceDeActividad      | Visitas recientes de propiedad de Plugin, agregación de anfitriones y autorización          |
| plugin-sdk/search   | tokenServiceDeBúsqueda        | Consultas de proyección, reconstrucción y índice autorizado                        |

Un identificador de registro comienza con el id del complemento y un punto. El espacio de nombres de ruta es igual al id del complemento. Estos registros siguen el ciclo de vida del complemento y se liberan si el complemento se detiene o no puede iniciarse. Los temporizadores y conexiones que usted crea manualmente todavía se utilizan `context.effect` o `effectAsync`El detenimiento no elimina los datos persistidos.

Un origen de directorio devuelve relaciones que son actualmente válidas. El host aplica la política “todo”, “relacionadas” o “ninguna” del administrador y filtra para usuarios válidos. Un error en el origen no amplía la visibilidad. Que sea buscable no significa que sea legible. Los orígenes utilizan `schemaVersion: 1`, en páginas `related`, y un hecho actual `verify`. El complemento mantiene su propio índice de relaciones. Paginación, tiempos de espera y verificaciones de candidatos se encuentran en [Entrega de correos electrónicos](plugin-mail-handoff.md).

Para un trabajo empresarial de fondo, la fuente SDK 0.1.10 expone `aiContinuationsServiceToken` para registerSource/wait/wake. Declare una inyección requerida. `sdkRange: "^0.2.0"`Implementar autorización de negocios en tiempo real y IDs de operación estables, luego notificar después de confirmar el resultado. El host reanuda la tarea asistente original después de completarla o por una nueva decisión humana. Ver [El contrato completo y el ejemplo](plugin-ai-continuations.es.md).

Regístrese con una herramienta de IA `aiServiceToken.registerTool`: id, descripción, inputSchema y execute. execute recibe al usuario autenticado, turnId, jobId, callId y signal, además de sessionId solo para conversaciones reales. No puede evitar las permisiones de archivos. `registerSkill` Toma ID, nombre, descripción, contenido y formatos. El manual se ingresa en la biblioteca de habilidades del host. Una herramienta empresarial verifica sus propias permisos de recursos y almacena un ID de operación estable en la base de datos del complemento para que una repetición no repita un efecto secundario. callId correlaciona una llamada. No asuma que una nueva llamada reutiliza un ID de llamada antiguo. La creación de un archivo o carpeta transmite un valor estable. `idempotencyKey`Un subir también pasa `contentIdentity` devuelto por `uploads.complete`Lea un recibo válido. `files.receipts.get`El estado pendiente puede ser reintentado. Los parámetros diferentes son 409. Un resultado eliminado no puede ser reconstruido mediante la reproducción. El protocolo completo se encuentra en la sección 7.1 del [Contrato SDK](plugin-sdk-contract.es.md).

Doca no incluye membresía, precios, puntos o cuotas comerciales. Las tasas de entrada y salida del modelo, y los tokens por imagen, convierten el uso bruto de un proveedor en tokens. No son un precio. El uso distingue una llamada no confirmada de las métricas reales. `ai.usage.recorded` está escrito dentro de la transacción de liquidación. Nivel superior `metrics` son el uso nominal. `provider.metrics` Mantiene los datos brutos del vendedor. Un complemento extrae los eventos. `events.read(cursor, limit)`, almacena su cursor y maneja cada identificador de evento una vez. Una verificación de política puede rechazar una llamada. Las reservas entre plugins, la compensación en caso de fallo y la consistencia monetaria aún no tienen un protocolo de transacción completo. Una verificación no constituye una implementación de facturación.

Los complementos tienen sus propios modelos de negocio, autorizaciones, lógica de trabajo y semántica de salida; todo el estado duradero utiliza servicios gestionados por el host público. Los complementos nunca eligen un servidor local/remoto, se conectan a una base de datos privada, leen credenciales de almacenamiento o persisten en directorios del sistema. El SQL gestionado y los objetos privados se exportan en SDK 0.1.7, y las credenciales en el código fuente de SDK 0.1.9. `data.v1`/`data.v2` Y los espacios de trabajo temporales no se exportan. Las capacidades faltantes no pueden ser reemplazadas por un almacén autogestionado.

<a id="monitoring-and-telemetry"></a>

## Monitoreo y telemetría

La versión 0.1.11 del código fuente de SDK añade `monitoringServiceToken` y `telemetryServiceToken` desde `@smartdoca/plugin-sdk/monitoring`, además solo para administradores `host.platform.monitoring`. Declarar las inyecciones requeridas. `sdkRange: "^0.2.0"`. Cuentas de sitios, métricas HTTP, usuarios en línea, registros, auditoría, trabajos, uso de IA y salud de servicios de alojamiento público; los complementos almacenan la historia a largo plazo a través de almacenamiento gestionado. Ver [métodos exactos, límites y decisiones de versión/datos](plugin-monitoring.es.md)No se añade ninguna migración de base de datos de host ni adaptador de host antiguo.

<a id="host-managed-persistence"></a>

## Persistencia gestionada por el host

`doca.storage` debe ser exactamente `"host"`, incluyendo plugins sin estado. Declara cumplimiento con el contrato de almacenamiento gestionado; no es un nombre de base de datos ni un selector de backend. La inspección estática lo verifica antes de resolver/importar código de servidor. La instalación con ZIP, npm/store, importación de directorios offline, restauración de archivos compartidos y las herramientas de paquetes utilizan esta verificación. No se proporcionan valores por defecto de campos faltantes ni adaptadores heredados. Una declaración es el compromiso de un autor de plugin confiable, no una sandbox de Node.js ni una auditoría de código.

No existe una variable de entorno business-data-directory de plugin ni un camino de datos seleccionable para plugins. `DOCA_PLUGINS_DIR` Se mantiene el caché de instalación reconstruible del host, no un almacén de negocios. Solo el host configura la persistencia local/remota y asegura el almacenamiento de base de datos/objetos compartidos para despliegues horizontales. Los complementos utilizan los mismos métodos SDK en ambos casos y no deben crecer en el servidor del host.

Los usuarios suben archivos, anexos y productos de exportación se utilizan `files.v1` Carpetas/archivos con IDs estables, enlaces y permisos. Los registros estructurados, configuraciones, trabajos, cursores y outbox pertenecen a la capacidad relacional gestionada por el host. Su nombre de base de datos lógica es `plugin:<pluginId>` Y está vinculado por inyección confiable. Los binarios privados duraderos utilizan una capacidad de objeto privado gestionada por el host; las credenciales utilizan una capacidad de credenciales gestionada por el host. Los objetos privados se exportan en SDK 0.1.7; las credenciales gestionadas en el código fuente de SDK 0.1.8. El trabajo temporal puede utilizar un espacio de trabajo o flujos de tareas gestionados por el host en el futuro, con límites y limpieza, y sin dependencia duradera en el path de una instancia anterior. Consulte el contrato de almacenamiento para las interfaces y el estado requeridos.

<a id="data-structure"></a>

## Estructura de datos

`doca.dataVersion` Es un identificador exacto de estructura de negocio de complemento, no una versión ordenada ni evidencia de que los archivos antiguos puedan leerse a través de un nuevo almacén. Las actualizaciones instaladas requieren el mismo identificador; la estructura real aún necesita validación. Los desajustes fallan explícitamente. No realice migraciones automáticas, downgrades, rellene campos antiguos, importe directorios antiguos ni operaciones de lectura/escritura simultáneas. Los datos gestionados por el usuario permanecen intactos y no se utilizan como fallback para una base de datos gestionada vacía. Cualquier futura conversión de estructura/servidor requiere un plan, validación y rollback aceptados por separado.

<a id="uninstall"></a>

## Desinstalar

Un plugin instalado debe implementar `uninstall(context)`; el inicio de operación rechaza una fábrica sin él. El gancho maneja la desvinculación o revocación externa de negocios y solo utiliza servicios de host públicos. Debe ser idempotente y nunca abrir ni eliminar recursivamente rutas de almacenamiento del host. Un plugin sin estado puede implementar un gancho vacío.

La gestión del limpiezo de bases de datos/personas privadas corresponde al host. En el caso de una desinstalación exitosa del servicio, la transacción del registro cierra la generación actual y agrupa el limpiezo de tablas/personas privadas con intentos de reinicio duraderos. Se implementa el limpiezo de credenciales y la cierre de la generación; la drenaje de tareas empresariales del clúster sigue siendo no disponible. Los archivos de usuario y otras referencias empresariales se conservan. La falla del hook deja la instalación intacta; los efectos del hook externo no pueden revertirse. Todas las instancias todavía requieren un reinicio manual.

Desactivar, cierre del proceso y `dispose` Liberar registros, temporizadores y conexiones sin eliminar los datos duraderos. Los archivos de usuario, los payloads de documentos, las asociaciones utilizadas por otras empresas y los recibos de archivos duraderos no se eliminan automáticamente con la eliminación del complemento. Cualquier limpieza de archivos utiliza el servicio de archivos y verifica la propiedad, la autorización y las referencias restantes.

<a id="web"></a>

## Web

`host.ai.open(input)` Abre la asistente personal con un prompt/contexto editable, referencias de documentos autorizados y archivos adjuntos existentes. `sessionId` Reanuda una conversación ya iniciada; la omisión crea una nueva. Solo lo explícito. `autoSend: true` Envía un mensaje a través de la cola de trabajo normal del host. La web y el contenedor de plugin nativo comparten la interfaz SDK tipada. Ver [parámetros, límites y ejemplos](plugin-assistant.es.md)El soporte de fuente no implica publicación en npm ni aceptación en dispositivos nativos.

La construcción web opcional default-exports `async host => bundle`. `host` Proporciona React, apiBase, useEnvironment, navigate, toast, confirm, request, FilePicker, platform y ui. React proviene del host, por lo que hay un único renderizador. Otras dependencias están incluidas en el paquete. El host no resuelve las importaciones de npm sin paquete. El paquete sigue las especificaciones correspondientes. `WebPluginBundle` exportado por `@smartdoca/plugin-sdk/web`. `manifest.pluginId` Y la versión coincide con el servidor. Se soportan las contribuciones de páginas, navegación, administración y configuración.

El anfitrión sirve el directorio declarado. `/api/v1/plugin-assets/{id}/{version}/`. El inicio frío carga los registros antes de montar; un documento ya en caché se monta inmediatamente, mientras que el descubrimiento utiliza la solicitud de inicio de sesión en tiempo real compartida en segundo plano. Los observadores de navegación y rutas se actualizan cuando llegan los registros, sin reconstruir el documento. Solo se cargan los activos versiónados actuales del servidor; los metadatos de inicio no son un paquete de complementos en caché ni un adaptador de autorización. Los errores de carga se aislan y se registran. Los archivos de paquete del servidor no se exponen. El renderizado de contribución tiene una frontera de error. Las comandos, vistas y ubicaciones opcionales soportan las posiciones actuales de la página web, documento, biblioteca y archivo. La selección, inserción, tema y posiciones nativas siguen siendo trabajo futuro; véase [métodos y slots exactos](plugin-extensions.es.md).

<a id="build-and-verify"></a>

## Construir y verificar

En el repositorio anfitrión, `pnpm build:plugin-sdk` construye el SDK, los contratos y la capacidad de archivos de JavaScript y `.d.ts`Los paquetes publicados son `@smartdoca/plugin-sdk` Y los paquetes de contrato son reexportados por él. `publishConfig` señala a `dist`. La instalación de plugins depende de esos artefactos de npm, no del código fuente de este repositorio.

Al menos verifique una instalación independiente, inicio sin plugins, conflictos de dependencias, denegación entre usuarios, conflictos de versión, llamadas idempotentes, relaciones revocadas, aislamiento de dos instancias de host y limpieza al cerrar. Las pruebas utilizan su propio banco de datos, usuarios y documentos. La copia de la interfaz sigue las mismas reglas. [interfaz de idiomas](i18n.es.md). Los editores siguen [integración de editor](editor-integration.es.md) y el [contrato de colaboración](collaboration-sdk-contract.es.md).

Los callbacks HTTP, el enlace de archivos adjuntos, la calibración del usuario, la búsqueda y el conocimiento, y los límites móviles están en… [Entrega de correos electrónicos](plugin-mail-handoff.md).

<a id="scope-and-delivery"></a>

## Alcance y entrega

`search.v1` Proporciona proyecciones y consultas de índices autorizadas. Nuevo contenido unificado, recuperación de contenido global y suscripciones a conocimientos. `content.v1` Abajo. Los complementos poseen datos comerciales y permisos actuales; el host posee suscripciones explícitas, programación, huellas dactilares de bloque y verificaciones de acceso a contenido derivado.

La aceptación instala una versión real del host, el SDK y el archivo tarball del complemento de negocio fuera de este repositorio. Prepara la clausura completa de dependencias. No dependa de un enlace de fuente, un caché no declarado o una obtención del registro durante la instalación o el inicio. Verifique los activos web, el flujo de negocio, la revocación, el intento de nuevo y el reinicio. La construcción del SDK no es una aceptación de extremo a extremo.

La base de datos de plugins debe coincidir con su versión de datos declarada. Una discrepancia impide el inicio. No existe ningún script de actualización o downgrade. Los requisitos para desinstalar se encuentran en… [Desinstalar](#uninstall) Arriba. No existe un protocolo de eliminación de usuarios. El contrato dinámico de WebView móvil está documentado en la guía de integración de correos v1. No existe un directorio de datos seleccionado por plugin; la persistencia utiliza capacidades de host delimitadas, con brechas de implementación documentadas por separado.

<a id="background-identity-checks-and-notifications"></a>

## Comprobaciones de identidad y notificaciones de fondo

`users.status(userId)` devuelve `{id, status}` O nulo para un trabajo en un servidor de confianza. Deje de trabajar en negocios cuando el estado no esté activo. Un cuenta activa no significa que el usuario pueda leer un recurso de negocios.

`notificationsServiceToken` exportaciones `notifications.v1`: `publish(pluginId, {recipientId, key, title, body, path, resource: {type, id}})` y `withdraw(pluginId, {recipientId, key})`. El host permite únicamente el pluginId propio del complemento. `key` Es no vacía y tiene al menos 200 caracteres, separados por complemento y receptor. Reproducir los mismos parámetros devuelve lo mismo. `{id}`. Diferentes parámetros devuelven 409. Una clave retirada devuelve 410. El outbox del complemento se publica antes de que se retira.

El tipo de recurso está registrado en permissions.v1 y se implementa `notification.read`Publicar, listar, contar números de leídos y hacer clic en “volver a verificar permisos actuales”. Una fuente que falte, esté deshabilitada, haya fallado o haya expirado el tiempo no se permite. El título y el cuerpo son texto plano, con un máximo de 200 y 2000 caracteres respectivamente. `path` es un camino dentro de la aplicación, como `/mail/<id>?message=...`, sin origen ni hash. El enlace pasa por un punto de extremo de autorización del host antes de la navegación. La página del plugin y la API aún se autorizan a sí mismas.

La publicación en esta instancia actualiza la aplicación web de inmediato. La aplicación web reconcilia las otras instancias cada 30 segundos. Estos son avisos dentro de la aplicación. No son notificaciones SMTP, push móvil ni de escritorio.

El registro HTTP limita el cuerpo a 1 MiB por defecto. Una ruta que necesita un cuerpo más grande, como un archivo adjunto, puede establecer `bodyLimit` En bytes, como máximo 32 MiB. El complemento sigue verificando el número de archivos adjuntos, el tamaño decodificado y los totales comerciales.

<a id="recent-activity"></a>

## Actividad reciente

`activityServiceToken` desde `@smartdoca/plugin-sdk/platform` exponer `activity.v1`. Los complementos registran fuentes de actividad reciente con paginación y almacenamiento de visitas propias, así como la eliminación y limpieza, y la autorización empresarial. El host fusiona las fuentes, renderiza sus etiquetas/iconos y vuelve a verificar `activity.read` Antes de mostrar y abrir. Declara el servicio requerido; un host más antiguo sin él rechaza el complemento en lugar de adaptar el almacenamiento privado. Véase el [contrato de integración y ejemplo](plugin-activity.es.md).

<a id="unified-content-reading-search-and-knowledge-subscriptions"></a>

## Contenido unificado: suscripciones a lectura, búsqueda y conocimiento

Usa `@smartdoca/plugin-sdk@^0.1.9`. Importación `contentServiceToken` y el `ContentSource` tipo de `@smartdoca/plugin-sdk/content`; declarar el token en `injections.required` Y registra la fuente durante el montaje. Las fuentes pertenecen al complemento de registro. Los documentos y archivos integrados utilizan el mismo contrato.

| Miembro                                        | Contrato                                                                                                                                                                                                    |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Declaración                                   | `id`, `pluginId`, `version: 1`, localizado `title`, `contentTypes`, `purposes`, `capabilities: {search}`, `configSchema`                                                                                     |
| `list(ctx, {config, cursor, limit})`          | Requerido. Devuelve `{items, nextCursor, snapshot}`Cada ítem contiene `ref: {sourceId, resourceId, blockId}`, `fingerprint`, `title`, opcional `order`, `anchor`, `excerpt`; no devuelva los cuerpos completos aquí. |
| `read(ctx, {config, ref, fingerprint})`       | Requerido. Verificar nuevamente los permisos y devolver el artículo junto con `text`O nulo cuando no está disponible. Un huello dactilar cambiado es un conflicto; nunca hay texto nuevo bajo un huello dactilar antiguo.                                       |
| `resolve(ctx, ref)`                           | Requerido. Verificar nuevamente el acceso y devolverlo. `{path, fingerprint}` o nulo. `path` Es una ubicación dentro de la aplicación.                                                                                                     |
| `search(ctx, {config, cursor, limit, query})` | Opcional; se declara e implementa juntos. Devuelve una página ligera. La búsqueda no soportada no se realiza una escaneo completo.                                                                                  |

`ctx` contiene la autenticación `principalId`, `purpose` (`knowledge`, `analysis`, o `search`) y cancelación `signal`. El proveedor aplica las permisos comerciales actuales en cada llamada. Una fuente que apoya el análisis puede ofrecer un complemento de tareas futuras sin una API específica para correos electrónicos. Los consumidores lo utilizan `sources(ctx, purpose)`, entonces servicio `list/read/search` con `sourceId` y `purpose`; servicio `resolve` toma `{ref, purpose}`Solo solicite un propósito declarado por esa fuente.

La paginación comienza y termina con null. Todas las páginas en una recorrido deben compartir un snapshot consistente; debe fallar al llegar al final del tiempo de validez, en lugar de continuar silenciosamente con datos diferentes. Este cursor se utiliza para paginar el inventario completo autorizado, no para un registro de cambios duradero. `listChanges` y `readChanges` No son requeridos ni exportados por este contrato. La fuente puede sincronizar su sistema de negocios internamente, pero Doca no exige esa implementación.

El conocimiento utiliza el sistema de suscripción y programación existente. El usuario selecciona explícitamente la fuente, la biblioteca y la configuración. El host almacena las referencias y los huellas de bloques, compara el inventario completo y solo lee/analiza los bloques nuevos o modificados. No guarda un espejo completo del cuerpo de la fuente. Los bloques sin cambios no necesitan ser leídos nuevamente. Solo un inventario completo y consistente puede determinar la eliminación; las ejecuciones fallidas o parciales no lo reconocen. La identidad estable del bloque no debe depender de toda la revisión de un documento o del índice de párrafos posicionales.

En caso de eliminación, desacoplamiento, revocación o falta de una fuente disponible, el conocimiento derivado se retira de las lecturas, listas, búsquedas y recuperación de respuestas en la nueva configuración; el contenido se conserva para su manejo por el administrador, incluyendo los resultados editados manualmente. El contenido ya entregado y la conexión de colaboración ya abierta no se revoca retroactivamente con esta verificación. La interfaz de configuración admite campos primitivos, enum y arrays de cadenas; la configuración compleja pertenece a la interfaz propia del plugin. Esta integración no implica migración de esquema de base de datos, lectura/escritura dual o adaptador de fuente antigua. El SDK sigue exportando `knowledge.sources.v1`, pero no es la entrada de suscripción para nuevas integraciones y no se adapta automáticamente `content.v1`.

Límites: 100 artículos de inventario por página, 100,000 artículos por recorrido, 2 millones de caracteres por cuerpo, 120,000 caracteres del cuerpo modificado por el análisis por ejecución y un plazo de 20 segundos para la llamada de fuente. El trabajo de tamaño excesivo o incompleto falla explícitamente; no lo truncen y no lo consideren completo. Los extremos HTTP son `/api/v1/content/sources` y `/api/v1/content/{list,read,resolve,search}`. Ver [procedimiento y límites exactos](plugin-content.es.md) Para formas de solicitud y rutas de suscripción.

<a id="native-cache-and-attachments"></a>

## Caché nativo y archivos adjuntos

Usa el mismo paquete web en la web y en el WebView móvil del escenario. `PluginWebHost` desde `@smartdoca/plugin-sdk/web` exponer `native`, que es nulo en Web. Los tipos nativos se exportan `@smartdoca/plugin-sdk/native`.

- `native.storage` suministros `get`, `set`, `remove`, `clear`; los valores de cadena se aislan por el servidor, el usuario autenticado y el complemento. Los límites son 2 millones de caracteres/valor y 20 millones/complemento. Cerrar sesión o eliminar la cuenta limpia la caché de la cuenta. Los complementos se activan por voluntad propia; IndexedDB no se migra y no se promete un inicio en modo offline.
- `native.attachments.save/share({path, name, mime})` Descarga una ruta de API de complemento relativa a través de un despacho nativo autenticado. Las credenciales nativas nunca entran en WebView. Se rechazan los redirecciones y el tamaño se limita a 32 MiB; los archivos temporales se eliminan.
- En Android, el guardado se completa o se cancela. En iOS, el guardado y el uso compartido del sistema pueden mostrarse, lo que no demuestra que el usuario haya completado la acción. El cambio de cuenta o la eliminación de página cancela las solicitudes pendientes.
- La vinculación de cuentas de correo está en la web. El OAuth nativo está fuera de este servicio.

La versión actual del SDK es 0.1.11; su publicación en npm está registrada a continuación. Las pruebas y construcciones en el entorno de alojamiento no reemplazan la integración independiente de paquetes de correo o la aceptación de dispositivos iOS/Android; estos aún están pendientes. Véase [protocolo nativo](plugin-native.es.md).

<a id="distribution-and-navigation"></a>

## Distribución y navegación

Se utiliza un archivo npm tgz completo para la publicación de almacenamiento o la instalación exacta de paquete/versión en Plugins → Settings. La carga local requiere un ZIP con package.json en su raíz, no un tgz. Ambos contienen artefactos compilados y la totalidad de las dependencias de ejecución; el host no ejecuta npm install ni scripts de paquete. La instalación, actualización, desactivación y desinstalación surten efecto después de reiniciar cada instancia. El comportamiento de desinstalación se especifica en [Desinstalar](#uninstall) arriba.

La navegación global tiene ámbitos para usuario web, usuario de aplicación y administrador web. Declara el propósito de la página y las plataformas; nunca ofrezca una página de usuario como página de administrador. Las páginas de complemento se etiquetan por origen, y no debe aparecer una entrada en tanto que en la barra lateral y en Más. Véase [distribución, WebView y navegación](plugin-mail-integration-v1.md) y [protocolo de almacenamiento](plugin-store-protocol.es.md).

<a id="public-reading-and-ui-extensions-sdk-014"></a>

## Lectura pública y extensiones de UI (SDK 0.1.4)

[Implementadas interfaces](plugin-extensions.es.md) describir la política de directorio de usuarios, snapshots de documentos nativos, recorrido por bibliotecas, `host.platform`, `host.ui` y comandos, vistas o ubicaciones opcionales. Los plugins que utilizan nuevos métodos declaran `sdkRange: "^0.2.0"`; los complementos existentes que son solo páginas no necesitan registro nuevo.

<a id="template-and-material-plugins"></a>

## Plantillas y complementos de materiales

SDK 0.1.5 añade proveedores y consumidores de recursos de creación opcionales. `host.platform.templates/materials`, y inyectó `TemplatePicker/MaterialPicker`. Ver [protocolo de recursos exacto](creation-resources.es.md)Los proveedores no tienen una instalación predeterminada. Regístrese bajo su espacio de nombres y ciclo de vida actual; los consumidores empresariales autorizan sus propias acciones.

Para la selección de múltiples fuentes nombradas y el recupero con IA, utilice la revisión de fuente 0.1.6: consulta con `providerIds`, declarar descripciones de fuente localizadas y modos de recuperación opcionales, e implementar `retrieve` junto con su declaración. El host proporciona detección de fuentes, agregación de resultados limitada y herramientas de IA; los proveedores eligen su motor de búsqueda. Los campos de consulta singulares antiguos son rechazados según el cambio acordado en el protocolo. Los metadatos de fuente están disponibles en los resultados y en los callbacks del selector. Véase [Formas y límites de solicitud](creation-resources.es.md).

<a id="plugin-document-elements-2026-10-02-sdk-016-source"></a>

## Elementos de documento del complemento (2026-10-02, fuente SDK 0.1.6)

El paquete web opcional `elements` registro y `@smartdoca/plugin-sdk/editor-elements` Se implementan para elementos atómicos en línea ricos y vistas de lienzo de hoja de cálculo con celdas completas. Los formularios de configuración se envían a través de operaciones nativas propiedad del host y operaciones de deshacer; no existe un manejo de editor público arbitrario. Los tipos/versiones exactas desconocidas muestran un espacio de texto de error y preservan JSON opaco, sin conversión, migración ni limpieza. Cero proveedores se instalan por defecto. Véase [El contrato de elemento exacto](plugin-editor-elements.es.md) y [Ejemplo independiente de cuenta atrás/novedades](../examples/plugin-elements/README.md)La publicación en npm, la instalación en producción y la aceptación en dispositivos nativos no están implícitas.


Las colecciones de materiales se implementan en el código fuente del SDK 0.1.9: materiales.v2 / proveedores de versión 2, grupos separados de resultados de materiales/colecciones, navegación, etiquetas y recuperación indexada. Los metadatos de la colección nunca incluyen miembros. La revisión acordada no incluye adaptador materiales.v1 ni migración de archivos/documentos existentes. La gestión de colecciones pertenece a los proveedores que utilizan una persistencia gestionada por el host público. Véase [protocolo de recursos](creation-resources.es.md).

<a id="sdk-publication--2026-10-13"></a>

## Publicación del SDK — 2026-10-13

`@smartdoca/plugin-sdk@0.1.11` Está publicado en npm. El consumidor de dependencias del registro importa todos los 16 puntos de entrada públicos y verifica los tokens de monitoreo/telemetría y la versión exacta del SDK. Esto no establece un plugin de monitoreo de producción ni una aceptación en dispositivos nativos.
