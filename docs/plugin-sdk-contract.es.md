<a id="plugin-sdk-and-core-boundary"></a>

# SDK de complemento y límites centrales

La fuente actual utiliza SDK **0.2.0**, con `ai.v2` / `ai.continuations.v2`Los contextos de herramientas siempre llevan `jobId`; `sessionId` Solo está presente en conversaciones reales. Reconstruye los complementos. `sdkRange: "^0.2.0"`; los rangos anteriores de SDK y los contratos de servicios de IA son rechazados sin adaptadores. Este cambio en la fuente no es una publicación ni un despliegue de npm. Véase [Separación de ejecución de MCP](mcp.es.md#execution-history-and-upgrade).

Un rango de SDK incompatible o una dependencia requerida no disponible aísla el plugin de negocio afectado. El host y los plugins no relacionados se inician, y Admin → Plugins explica el motivo y solicita una actualización. La selección de instalaciones, los archivos, los datos de negocio y las credenciales se conservan. Los paquetes antiguos no se convierten y el código del SDK antiguo no se ejecuta. Las nuevas instalaciones en línea aún rechazan los paquetes incompatibles. Las carpetas de instalación completamente offline conservan su identidad original y reciben la misma aislación.


0.1.26 utiliza un [base de datos comercial de complementos compartidos](plugin-database-isolation.es.md), separado del núcleo, con espacios de nombres automáticos. Reemplaza a las bases de datos por plugin lanzadas en 0.1.25. La actualización requiere desinstalar normalmente en el host anterior y reinstalar; los datos del plugin no se migran.

[中文](plugin-sdk-contract.zh-CN.md)

Documentación de referencia: host 0.2.23 / SDK 0.1.11, verificada el 2026-10-28. Se registra la publicación del SDK 0.1.11 a continuación; el despliegue de producción y la aceptación en dispositivos nativos siguen siendo separados. Toda la persistencia de los plugins es gestionada por el host; los plugins son responsables de los modelos de negocio y la autorización. Este documento es el estándar de aceptación para la refactorización. No significa que todas las interfaces estén implementadas. La brecha se encuentra en la sección 12. Un tutorial de desarrollo no debe presentar una interfaz objetivo como una exportación que existe hoy en día.

La versión 0.1.11 del SDK exporta monitoring.v1 y telemetry.v1 para las estadísticas del sitio, métricas HTTP, registros operativos redactados, auditoría, diagnósticos de cola/uso y salud, con transporte web para el administrador. Ver [Monitoreo de acceso, retención, cobertura del clúster y rollback](plugin-monitoring.es.md)Las interfaces existentes y los formatos duraderos permanecen sin cambios.

El [Capacidades públicas y plan de refactorización de la extensión de la interfaz de usuario](plugin-sdk-expansion.md) Registra la dirección aditiva acordada, el inventario de implementación actual, las interfaces propuestas y los lotes de aceptación. A–D ya se han implementado; el [métodos e slots implementados](plugin-extensions.es.md) Registrar las exportaciones exactas y los límites. E/F sigue siendo trabajo futuro.

<a id="implemented-managed-storage"></a>

## Implementado almacenamiento gestionado

`@smartdoca/plugin-sdk/storage` Ahora exporta productos destinados a instalaciones. `pluginDatabaseToken` (`storage.sql.v1`) y `pluginObjectStorageToken` (`storage.objects.v1`). El subconjunto de la base de datos es la versión de esquema 1, con columnas texto/int32/double, restricciones primarias/únicas, operaciones de selección/inserción/actualización/eliminación estructuradas y transacciones con llamadas a callbacks ejecutadas una vez. `pluginCredentialToken` (`storage.credentials.v1`, SDK source 0.1.8) proporciona credenciales cifradas exclusivas para servidores con actualizaciones y eliminaciones verificadas por revisión. Los vínculos, claves foráneas, SQL genérico, upsert y espacio de trabajo no se exportan. Ver [API de credenciales y despliegue](plugin-credentials.es.md). El SQL empresarial utiliza una base de datos gestionada por un host compartido separada del núcleo: un archivo SQLite con prefijos de tabla, o una URL/cuenta de PostgreSQL con esquemas de plugin automáticos y un pool de conexiones compartido. La aislación de procesos sigue sin estar implementada. Véase [Configuración de almacenamiento y contrato de desinstalación antes de la actualización](plugin-database-isolation.es.md).

Los bases de datos lógicas utilizan `plugin:<pluginId>`Atribución de archivos de usuario y uso de objetos privados `plugins/<pluginId>`, y el uso de ZIPs liberados `host/plugin-releases/<sha256>.zip`. Los bytes ZIP completos e inmutables se almacenan en un almacenamiento de archivos configurado en el entorno; la base de datos compartida contiene la versión 2 del registro, referencias de archivo y índices de hash de archivo confiables. Los hits de caché verificados no descargan los ZIP de nuevo. Todas las instancias se reinician manualmente. Los paquetes de plugin o formatos de almacenamiento no soportados son rechazados sin conversión automática; los datos existentes se conservan. Las actualizaciones de la base de datos principal se realizan por separado. [Contrato de actualización de base de datos](database-schema-evolution.es.md). Ver [Implementación exacta y limitaciones](unified-storage-implementation.md).

<a id="_1-decisions"></a>
<a id="1-decisions"></a>

## 1. Decisiones

El aprobado [Escalado horizontal y contrato de almacenamiento gestionado](plugin-horizontal-scaling.es.md) Define la propiedad de la base de datos, la aislación del espacio de nombres, el almacenamiento de usuarios/privado/temporario y la ejecución de múltiples instancias. Los paquetes deben declarar `doca.storage: "host"`; Otras o faltantes declaraciones son rechazadas antes de la importación de código. Solo el host elige el almacenamiento local/remoto. SQL gestionado y objetos privados se exportan en la fuente SDK 0.1.7; credenciales se exportan en la fuente SDK 0.1.9; los espacios de trabajo siguen siendo un problema.

Doca mantiene los servicios clave del producto y las plataformas genéricas. Se descubre un negocio independiente en el directorio de instalación. Correo, calendario, membresía, facturación, control de uso y moderación de contenido no son productos requeridos por el host.

Un complemento depende de un SDK y contrato de capacidades publicados por separado. El host inyecta la implementación en tiempo de ejecución. No dependa de una ruta de espacio de trabajo Doca, un módulo de host privado, un puente global o una tabla de host privado. El host no importa la fuente del complemento de negocio ni requiere un identificador específico del complemento de negocio para completar un flujo público.

Los plugins se ejecutan dentro de un proceso de servidor confiable. Esto es una frontera de extensión, no una sombra de caja de Node.js. La carpeta de instalación está separada de la carpeta del programa. El host solo carga los plugins que declaran el rango actual del SDK y cuyo base de datos coincide con el estándar actual.

<a id="_2-what-the-core-owns"></a>
<a id="2-what-the-core-owns"></a>

## 2. Lo que posee el núcleo

| Área                 | Anfitrión                                                                                                                           | Complemento                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Identidad             | ID de usuario estable, autenticación, sesiones, activar y desactivar, perfil básico, visibilidad de campos                                  | Cuentas comerciales externas, extensiones de perfil, adaptadores de proveedores de identidad                                                |
| Permisos          | Entrada unificada de subvenciones, denegación por defecto, política de directorios, intersección                                                          | Registrar los tipos de recursos comerciales, mapear roles y acciones, proporcionar datos sobre concesiones e intersecciones                             |
| Archivos                | Folders, archivos, enlaces de archivos, subida y descarga, almacenamiento de objetos, permisos                                          | Referencias de afiliación comercial, importadores, previsores, extractores                                                         |
| Documentos            | Anfitrión del editor, persistencia, colaboración, historia, comentarios, permisos de documento                                               | Nuevos adaptadores de editor, plantillas, importación y exportación, acciones de documento                                                       |
| AI                   | Ejecución del modelo, registro de herramientas y habilidades, contexto de llamada, registro de uso bruto, uso de tokens evaluado por el modelo                       | Herramientas de dominio, habilidades, flujos, cuotas de membresía, precios y cargos                                                       |
| Búsqueda y conocimiento | Búsqueda unificada y entrada global. Suscripciones explícitas, programación, huellas digitales de bloque y control de acceso al contenido derivado | Registrar contenido.v1 list/read/resolve y búsqueda opcional, verificaciones de permisos actuales; cuentas externas y sincronización empresarial |
| Trabajos y eventos      | Organiza eventos, ganchos de ciclo de vida y persistencia gestionada                                                                      | Lógica de trabajo empresarial, repetición, idempotencia y estado a través de servicios de host                                                    |
| Interfaz            | Shell, rutas, espacios de navegación, tema, idioma, límites de error                                                             | Árboles de negocios, páginas, configuraciones, administrador, tarjetas de resultados de IA                                                                   |
| Política comercial    | Extensión de política de operaciones genéricas y estadísticas de hechos                                                                         | Niveles, membresía, puntos, planes, cuotas, pago                                                                        |
| Moderación           | Límites genéricos de recursos, eventos de operación, auditoría de seguridad                                                                      | Informes, colas de revisión, detección, decisiones, proveedores                                                                     |

No elimine una capacidad fundamental solo porque podría ser un complemento. Documentos, archivos, usuarios y concedencias deben funcionar sin que se instale ningún complemento empresarial. Los archivos y documentos que utilizan un ciclo de vida de complemento interno son un detalle de implementación fundamental. No es el canal de instalación del complemento empresarial.

<a id="_3-installation-and-discovery"></a>
<a id="3-installation-and-discovery"></a>

## 3. Instalación y descubrimiento

La base de datos del host compartido almacena los metadatos del registro y el archivo deseados; los ZIPs completos e inmutables se almacenan en el almacén de archivos del host configurado. Cada instancia sincroniza un archivo privado `DOCA_PLUGINS_DIR` por defecto `<data-root>/plugins`) antes de cargarlo. Verifica todos los archivos en caché y repara los archivos ausentes o corruptos del archivo compartido. Al iniciar, no se contacta con el almacén, se ejecuta npm install o se compila TypeScript.

Administrador → Los plugins se instalan desde el almacén HTTPS oficial o desde subidas locales, se realizan actualizaciones en etapas, se habilitan, deshabilitan y desinstalan. El almacén por defecto es `https://store.smartdoca.cc`, anulado por `DOCA_PLUGIN_STORE_URL`Las operaciones utilizan escrituras verificadas y surten efecto después de que se reinicie cada instancia. La interfaz de usuario distingue la selección deseada global de la selección en ejecución de la instancia respondedora. No se promete la eliminación inmediata de las rutas Fastify.

Las versiones preconstruidas declaran `doca.manifest`, `doca.server`, opcional `doca.web`, obligatoria `doca.dataVersion` y `doca.storage: "host"` En package.json. La validación del almacenamiento estático precede a la resolución/importación del servidor para cada fuente de instalación y a la restauración del inicio. Las declaraciones de almacenamiento ausentes o diferentes fallan sin conversión. También se verifican el rango del SDK, los caminos, el grafo, el hash y la estructura exacta. Las actualizaciones instaladas requieren que dataVersion permanezca sin cambios. La desinstalación actual invoca el gancho de limpieza empresarial requerido y elimina el marcador en caso de éxito; la transacción del registro protege la generación y registra la limpieza duradera de la base de datos/persona privada, que se ejecuta después del commit; el drenaje de tareas del clúster sigue pendiente.

Carpetas en modo offline `<install-root>/<plugin-id>/` se publican en el registro compartido al inicio de la ejecución y se trasladan a `.imports/`Los archivos de tiempo de ejecución se encuentran en `.releases/<sha256>/`. No se soportan manifestos de npm raíz, enlaces de fuente o rutas de descubrimiento heredadas. Los archivos de programa y los datos comerciales del complemento permanecen separados. La fuente de alojamiento, package.json y la configuración de Vite nunca se modifican durante la instalación.

El [protocolo de almacenamiento](plugin-store-protocol.es.md) Define el diseño del paquete, los endpoints remotos, los límites y las semánticas de múltiples instancias. Véase [despliegue](plugin-deployment.es.md) Para reinicio y recuperación en caso de fallo.

<a id="_4-lifecycle"></a>
<a id="4-lifecycle"></a>

## 4. Ciclo de vida

```text
scan static metadata → check dependencies → import code
→ discover → required service check → initialize → mount → ready
→ stop accepting work → dispose in reverse dependency order
```

Los servicios se identifican por un identificador de cadena estable y una versión, y no por la identidad del objeto de token. El host proporciona primero los servicios de plataforma. Un plugin empresarial registra los servicios únicamente en su propio espacio de nombres. No puede inyectar servicios privados del host, como `doca.server.*`Cada ID de servicio tiene un proveedor. Las capacidades de contribución múltiple utilizan un registro.

Cada registro devuelve un disposer propio de un efecto de contexto. Los servicios, trabajos, suscripciones a eventos y registros de UI pertenecen a una instancia de host. No los almacene en `globalThis` o `Symbol.for`Dos aplicaciones de prueba en un mismo proceso no deben afectarse entre sí.

Capacidades objetivo, algunas de las cuales aún no se exportan: files.v1, documents.v1, users.v1, permissions.v1, http.v1, ai.v2, ai-usage.v1, search.v1, content.v1, activity.v1, notifications.v1 (exportado), events.v1, almacenamiento relacional de plugin gestionado por el host (exportado en SDK 0.1.7) y policies.v1. Los IDs reales siguen las exportaciones actuales. Es necesario versionar el cambio de nombre. Esta tabla no es una permiso para pasar una interfaz no implementada a un plugin existente.

<a id="_5-user-information-and-request-context"></a>
<a id="5-user-information-and-request-context"></a>

## 5. Información del usuario y contexto de la solicitud

Las solicitudes HTTP, las herramientas de IA y los trabajos en segundo plano comparten un contexto de ejecución confiable: requestId, principal, pluginId, signal y, opcionalmente, sessionId, turnId, jobId y callId. La identidad proviene de la autenticación del host o de la autorización de trabajo almacenada. Un plugin no puede crear una identidad de usuario a partir de su cuerpo HTTP.

Un registro completo de usuario disponible en el servidor incluye el ID estable, el ID público, el login, el nombre de presentación, el avatar, el estado, la bandera de administrador, los contactos verificados, los campos del perfil, los campos comerciales personalizados y los metadatos de identidad-link que el llamante puede leer. Los resultados de búsqueda ordinarios son una proyección mínima. El objeto no contiene un hash de contraseña, un token de sesión, un código de verificación, un token OAuth, una clave de API del modelo o un secreto de almacenamiento. No devuelva un perfil completo del servidor al navegador ni lo agregue automáticamente a un prompt del modelo.

Se persisten los eventos de creación de usuario, actualización de perfil y cambio de estado. Aún no existe una entrada para eliminación de usuario. Un trabajo en segundo plano verifica nuevamente el estado del usuario y los permisos de recursos. Un usuario deshabilitado no puede mantener acceso desde un antiguo snapshot de trabajo.

Un flujo de eliminación futuro es registrado por el host: marca la eliminación y revoca el acceso, los complementos se limpian de manera idempotente y confirman, luego el host completa la eliminación. Debe cubrir los complementos deshabilitados, desinstalados y no disponibles, con intentos de reintento y un camino manual auditado. Un tiempo de timeout no significa éxito. No utiliza una transacción de dos fases entre bases de datos. Debe ser aceptado antes de que se abra una entrada de eliminación por usuario.

<a id="_6-permissions-and-user-intersection"></a>
<a id="6-permissions-and-user-intersection"></a>

## 6. Permisos e intersección de usuarios

Un referencia de recurso es `(pluginId, resourceType, resourceId)`. El complemento registra su autorizador. El host lo llama. Los servicios de archivos y documentos mantienen sus propias ACLs. Registrar un complemento no otorga el derecho a leer los archivos de un usuario.

El complemento define las acciones empresariales y los mapas de roles, como mailbox.read. Las acciones del complemento no se obligan a ser iguales a la editora de documentos. Un autorizador ausente, un complemento deshabilitado o un resultado incierto impiden el acceso. La lectura de cuerpo, la descarga de archivos adjuntos, las herramientas de IA y la búsqueda hidratan el recheck.

El host conserva todas las reglas del administrador, las reglas relacionadas y las sobrerreglas por usuario. Los candidatos relacionados son la unión de las fuentes de documentos y archivos integradas y las fuentes de intersección de plugins activos. El host sigue filtrando el estado del usuario, la visibilidad de los campos y la navegación por páginas. Las reglas de “none” no requieren que un plugin amplíe las reglas.

Un origen de intersección indica qué usuarios de sitios pueden ser descubiertos debido a una relación comercial autorizada. Miembros de buzones o calendarios compartidos pueden ser un punto de intersección. La correo de un desconocido, el mismo dominio de correo electrónico o un nombre en el cuerpo de un mensaje no lo son. El complemento no escribe la política de directorio del administrador.

El protocolo de origen soporta un id de origen, versión de esquema, lotes candidatos y cursores, id y versión de relación, así como un recheck de hechos actuales. El complemento mantiene grandes índices de relación y su outbox. La búsqueda de usuarios no escanea la base de datos del complemento. Los candidatos caducados se revisan antes de ser devueltos. Una falla de origen no amplía la búsqueda. Deshabilitar un complemento elimina su origen de inmediato. Volver a habilitarlo calibra primero las versiones y las relaciones válidas.

El hecho de ser buscable no otorga permiso para operaciones comerciales y no revela el perfil completo. Los usuarios duplicados de varias fuentes se eliminan antes de realizar la paginación. El total de filtros previos no debe revelar usuarios ocultos.

<a id="_7-files-plugin-data-and-transactions"></a>
<a id="7-files-plugin-data-and-transactions"></a>

## 7. Archivos, datos de complemento y transacciones

Los complementos utilizan archivos injectados.v1 y almacenan IDs estables. Una asociación de archivo adjunto es `(ownerPlugin, ownerType, ownerId, role)`No cree una tienda de archivos privados ni guarde una URL temporal firmada como referencia permanente. Una “owner binding” representa la propiedad, no el acceso. Leer un archivo adjunto por correo vuelve a verificar la bandeja de correo y la “owner binding”. Abrir el archivo original sigue siguiendo las políticas de ACL del mismo archivo.

Toda la persistencia de negocios es gestionada por el host. Los complementos definen tablas, índices, semántica de trabajos/outbox y autorización, pero nunca seleccionan un servidor de almacenamiento, se conectan directamente a una base de datos o persisten en directorios del sistema. La base de datos lógica es `plugin:<pluginId>`, vinculado a la identidad de la instalación. Los archivos de usuario utilizan files.v1; los binarios privados, credenciales y trabajo temporal aprovechan las capacidades correspondientes del host. Las API de base de datos gestionada/objetos privados se exportan a través de plugin-sdk/storage; las credenciales se exportan en el código fuente SDK 0.1.9; las API de espacio de trabajo y data.v1/data.v2 no están disponibles. Las capacidades faltantes no pueden ser reemplazadas por almacenamiento autogestionado. Las estructuras coinciden exactamente; no hay conversión implícita ni fallback de datos antiguos. El host es responsable de la limpieza de managed-store, coordinada entre instancias, en lugar de la eliminación del sistema de archivos del complemento.

En las bases de datos y el servicio de archivos, utilice idempotencia, compensación y calibración. No hay transacción compartida.

<a id="_71-durable-file-creation"></a>
<a id="71-durable-file-creation"></a>

### 7.1 Creación de archivos duraderos

`files.v1.folders.create` y `files.v1.files.create` aceptar opcionalmente `idempotencyKey`, no vacía, máximo 200 caracteres, sin caracteres de control. El alcance es el id del plugin inyectado, el usuario actual y el tipo de operación. La misma clave y los mismos parámetros devuelven el primer resultado. La misma clave y parámetros diferentes lanzan 409. La fila del archivo o carpeta y el commit de la recepción completada se combinan. Las recepciones no caducan. Desactivar e desinstalar no las elimina. Reproducir después de que el resultado fue eliminado devuelve 404 y no recrea el archivo. Reproducir y consultar vuelven a verificar la cuenta y los permisos de escritura.

Retorna la finalización del cargamento `contentIdentity: {sha256, size, mime}`. Una subida idempotente debe pasarla. El host verifica los bytes subidos. El huella de solicitud incluye el directorio de destino, el nombre y la identidad del contenido, no el ID de subida temporal. Copiar utiliza sourceFileId y no necesita contentIdentity. El complemento almacena la clave de operación, los parámetros comerciales y la identidad del contenido en su propio outbox.

`files.receipts.get(context, {operation, key})` devuelve null o `{status: "pending" | "completed", operation, result}`“En espera” significa que los parámetros originales pueden ser intentados de nuevo. No significa que la tarea esté en curso. “Completado” devuelve la imagen histórica. Si la respuesta es desconocida, lea el mensaje de recepción y luego vuelva a ejecutar la operación de creación original. Una falla no se convierte en un mensaje de éxito.

El host reserva el ID del objeto y la configuración de almacenamiento, luego escribe bytes. Las escrituras locales utilizan una sustitución atómica. Las escrituras en S3 crean un objeto completo. El inicio y una búsqueda horaria recuperan objetos sobrantes de intenciones completadas, bytes de intenciones sin completarse durante más de 24 horas y archivos temporales. La recuperación y la reintentación de subida comparten un bloqueo de usuario de base de datos y verifican las referencias del objeto. Un objeto registrado no se elimina como basura.

<a id="_72-search-and-external-knowledge"></a>
<a id="72-search-and-external-knowledge"></a>

### 7.2 Búsqueda y conocimiento externo

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

<a id="_8-ai-tools-skills-and-usage"></a>
<a id="8-ai-tools-skills-and-usage"></a>

## 8. Herramientas, habilidades y uso de la IA

La fuente SDK 0.2.0 exporta el servidor `ai.continuations.v2`: registro de fuente en el ámbito de la instalación, espera de herramienta autenticada, puntos de control duraderos, notificaciones de despertar sin duplicados y reconciliación de reinicio. Los trabajos empresariales y la autorización siguen siendo propiedad del complemento; el host libera la ejecución del modelo mientras espera. Solo los registros de espera explícitos de versión 1 participan; no hay migración de base de datos ni conversión histórica. Véase [contrato de continuación](plugin-ai-continuations.es.md).

El SDK web de fuente de energía actual exporta `PluginWebHost.ai.open` Para el lanzamiento del asistente personal con prompt/contexto, documentos y archivos autorizados, una sesión/modelo opcional propia y envío automático explícito. Utiliza los flujos de sesión/mensaje y políticas de ejecución del host existente, sin necesidad de migración de almacenamiento ni adaptador para el host antiguo. Ver [el contrato de lanzamiento](plugin-assistant.es.md)Esto es una capacidad de interfaz de usuario para clientes, no un servicio de ejecución de IA para servidores; la disponibilidad en producción de npm/native sigue sin estar verificada.

Un complemento puede registrar herramientas, habilidades, intenciones, flujos de trabajo, generadores de resultados y verificadores. Una herramienta tiene un ID en espacio de nombres, esquemas de entrada y salida, un ejecutor y un requisito de permisos. Una habilidad es contenido versionado dentro del paquete. No es una forma de evitar la autorización de herramientas.

Una herramienta de complemento recibe el perfil de usuario autorizado y el contexto de llamada de la IA: sesión, turno, tarea, llamada de herramienta, ID del modelo, parámetros, señal de cancelación y referencias de material permitidas. El historial arbitrario y cada prompt no forman parte del contexto predeterminado de la herramienta. Chat y MCP comparten la autorización y la ejecución de la herramienta.

MCP ahora expone las herramientas instaladas que declaran `mcp` Exposición a través del mismo ejecutor y verificaciones de usuario/admisión actuales. Los SKILLs oficiales, plugins instalados y personal habilitados son filtrados por la concesión de servicio y usuario efectivo. La configuración de servicio personal y empresarial es propiedad del host, sin acceso a una nueva exportación de SDK ni a una ruta de origen de plugin. Ver [Servicios MCP](mcp.es.md).

El núcleo no tiene niveles de membresía, puntos, precios, cuotas de regalos ni filtrado de modelos por nivel. El host mantiene la configuración del modelo, los tiempos de espera técnicos, la concurrencia, los límites de contexto y el uso bruto, que pueden ser consultados por usuario, modelo, plugin, trabajo y llamada. Cada modelo tiene tasas de tokens de entrada y salida. La generación de imágenes tiene tokens por imagen exitosa. Esas tasas convierten el uso del proveedor en tokens acumulados. No son una moneda ni un precio final.

Cada intento de proveedor tiene su propia callId y attemptId. Los valores desconocidos son null. No se debe inventar 0. Los tokens de caché o de razonamiento pueden ya estar incluidos en los totales de entrada o salida. No se deben añadir dos veces. El proceso de liquidación congela el snapshot de tarifa desde el inicio de la llamada. La UI y `ai.usage.recorded` Mostrar el uso calificado. El registro mantiene las métricas brutas del proveedor. Las estimaciones y los datos reales permanecen separados. Replay no mide dos veces.

Solo las llamadas que pasan por el ejecutor de IA del host están en el medidor unificado. Un complemento que llama directamente a un proveedor está fuera de esa promesa.

Un plugin de control debe reservar de manera atomica en su propia transacción y devolver un idempotente id de reserva. La finalización o fallo libera o resuelve a través de una repetición de intentos de evento duradero. Comprobar el saldo, llamar y luego deducir no es control de cuota concurrente. Un evento de uso fallido no borra el registro del host. La reproducción duplica por callId y attemptId.

La política v1 también cubre la creación de documentos, la carga de archivos y el compartir. Devuelve "permitir" o "denegar" junto con un código de razón estable. El valor por defecto no tiene restricciones comerciales. Un plugin de política no puede ampliar las ACL de recursos, el estado de la cuenta, el tamaño de la solicitud o los límites de seguridad de ejecución. Una excepción de política no se incluye en "permitir". Si falta un plugin de control requerido, la operación no está disponible y el error es explícito.

<a id="_9-pages-navigation-and-http"></a>
<a id="9-pages-navigation-and-http"></a>

## 9. Páginas, navegación y HTTP

Un plugin empresarial puede contar con navegación global, su propio árbol o barra lateral, páginas, administración, configuraciones personales, acciones del menú de documentos, resultados de búsqueda y visualización de resultados de IA. La posición utiliza un slot, orden y id estables. No edite una rama de ruta del host para agregar un plugin empresarial.

El objetivo web es un ESM de navegador, estilos y recursos creados por el complemento. El host carga una URL versiónada del manifiesto activo. La construcción no debe importar `@web/*`, fuente del host local, o importaciones nulas no resueltas. El host sirve la directoria estática declarada, no todo el paquete npm. Una discrepancia entre la versión del servidor y el cliente hace que la página del complemento no esté disponible. Un renderizador ausente mantiene una visualización histórica genérica. Un error de registro web permanece dentro del límite del complemento. El espacio de trabajo principal puede renderizar mientras se cargan los paquetes del navegador. Las páginas directas del complemento muestran un estado de carga mientras se descubre su ruta.

http.v1 registra `/api/v1/plugins/<plugin-id>/...` Y reutiliza la autenticación del host, las verificaciones de origen y host, el esquema de solicitud, el formato de errores, el límite de velocidad y la cancelación. Un webhook público debe declarar cómo se verifica la identidad externa. El código nativo sigue incluyéndose en la versión de la aplicación. Los plugins compatibles con móviles ahora utilizan el shell WebView del escenario descrito en la guía de integración de correo v1.

<a id="_10-removing-membership-and-moderation"></a>
<a id="10-removing-membership-and-moderation"></a>

## 10. Eliminar la membresía y la moderación

Eliminar la membresía incluye las páginas administrativas, la visualización del nivel, las API de planes y concesiones, los mapas de nivel de proveedores de identidad, las cuotas de recursos, los puntos de IA y el filtrado de modelos por nivel. Es insuficiente ocultar una página mientras se mantiene un límite de nivel. Los registros de uso de IA en bruto permanecen. El proyecto no incluye campos comerciales antiguos ni un layer de migración.

La eliminación de la moderación de contenido incluye puntos de entrada para los informes, la administración de revisiones, proveedores, trabajos de escaneo y llamadas de revisión dedicadas en los flujos del host. La aprobación del administrador para el registro es parte de la política de cuenta. La auditoría de seguridad es fundamental. Ninguno de ellos se elimina, ya que la moderación de contenido se elimina.

Correo, calendario, membresía y moderación son plugins empresariales. Las notas rápidas han sido eliminadas del núcleo y podrían volver como un plugin independiente en el futuro.Tickets, sincronización con terceros, reconocedores y canales de notificación son candidatos a dividirse más adelante, solo después de que se utilice el mismo SDK, datos y aceptación del cliente. No deje un wrapper que siga importando una implementación de host privado.

<a id="_11-development-and-acceptance"></a>
<a id="11-development-and-acceptance"></a>

## 11. Desarrollo y aceptación

- Los IDs públicos, tablas, eventos y herramientas tienen un espacio de nombres complemento. El rango de versiones del SDK es explícito.
- El paquete proporciona JavaScript. `.d.ts`, un manifiesto estático y artefactos de cliente declarados. No depende de los alias del repositorio Doca.
- Los tests unitarios utilizan falsificaciones de capacidades. Los tests de integración utilizan un Doca separado, una base de datos aislada y un directorio de instalación temporal.
- La aceptación utiliza una construcción real del host, el SDK y el archivo tarball del plugin fuera del repositorio, con la clausura de dependencias. La instalación y el inicio no obtienen un registro ni siguen un enlace de fuente.
- Verifique que el directorio de plugins esté vacío, un plugin, varios plugins, una dependencia ausente, un ID duplicado, un conflicto de versiones, un patrón de base de datos no compatible y realice una limpieza al cerrar.
- Verifique que dos instancias de host no compartan servicios de complemento, eventos de usuario o registros de herramientas.
- Verifique las políticas relacionadas y las no relacionadas, la revocación de relación, la desactivación del complemento, el fallo de la fuente, el enlace de archivos y las mismas permisos en búsqueda y IA.
- Verifique las llamadas concurrentes de IA, los fallos y cancelaciones, el uso ausente, la repetición de liquidación y un complemento de control fallido, sin medición doble.
- Verifique que la actualización del host no cambie el registro de complementos, los archivos inmutables, los datos empresariales o los archivos adjuntos. Con los complementos deshabilitados, los documentos y archivos principales siguen funcionando.
- Se sigue la copia de la interfaz [interfaz de idiomas](i18n.es.md). Las extensiones del editor siguen los documentos de colaboración e integración del editor.

<a id="_12-what-exists"></a>
<a id="12-what-exists"></a>

## 12. ¿Qué existe?

Comprobado contra el host 0.2.23 y el SDK 0.1.11, exportado el 2026-10-28. Los objetivos futuros mencionados permanecen sujetos a las deficiencias mencionadas anteriormente.

| Artículo                   | Presente                                                                                                                                                                                                                                                             | Todavía hay que hacer.                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Descubrimiento              | Registro compartido, referencias de archivo y archivos ZIP compartidos, sincronización del caché de instancias, importación de directorios/ZIP, almacén de administradores, verificaciones de manifiesto estático                                                                                                           | Aceptación de un conjunto de paquetes independiente                                                                                                    |
| Inyección              | Servicios, efectos, construcción de SDK público, catálogo de servicios públicos                                                                                                                                                                                                         | Más capacidades empresariales como servicios                                                                                                      |
| Monitoreo | monitoring.v1/telemetry.v1, HTTP windows/histograms, estadísticas del sitio y en línea, logs limitados, auditoría y lecturas de uso duraderas, diagnóstico de colas, estado de salud, snapshots de instancia de Redis y transporte web para el administrador | Los historiales a largo plazo/alertas pertenecen a los complementos; no se ejecutan las pruebas de la red de proveedores externos; la aceptación de npm/production sigue siendo independiente |
| Gestión del almacenamiento de complementos | Declaración requerida, transacciones/schema SQL vinculadas a la instalación, objetos privados e inmutables, credenciales cifradas exclusivas para el servidor, protección contra generación de datos y limpieza de objetos duraderos                                                                                                                          | Espacios de trabajo, clúster para gestionar tareas empresariales y mayor aislamiento de procesos; ver [contrato de almacenamiento](plugin-horizontal-scaling.es.md) |
| Archivos y documentos    | lecturas de snapshots nativas públicas y de recorrido por bibliotecas, paginación de recursos que toma en cuenta las permisos, contrato de archivos públicos, autorización para descargar enlaces, idempotencia en la creación duradera, construcción de paquetes SDK                                                                       | Aceptación total de un paquete de capacidades de documentos independientes. Los objetos de archivo sobrantes se recuperan según un cronograma.                               |
| Usuarios                  | Validación y lectura automática de búsqueda/diseño/selección de directorios con conocimiento de políticas, calibración en pags, creación de eventos por parte del usuario dentro de una transacción, estado y algunos eventos de perfil                                                                                                   | Eliminación del usuario y limpieza asincrónica antes de abrir una entrada de eliminación. Más verificaciones de entrada de perfil.                                                  |
| Intersección           | Registro de relaciones internas compartidas/complementos, fuentes de relaciones paginadas, verificación de hechos actuales, tiempo de espera y denegación de salida                                                                                                                                         | El complemento mantiene su propio índice de relación incremental.                                                                                 |
| Cliente                 | Comandos/vistas/lugares opcionales, cliente público tipado, diálogos/dibujadores/barra lateral y slots Web home/documento/biblioteca/archivo, carga web dinámica, WebView móvil con ámbito definido, navegación configurable, aislamiento de renderizado, caché nativa persistente y guardado/compartir de anexos | Contratos de selección/inserción/ tema; aceptación por parte del cliente independiente y del dispositivo real                                                          |
| Elementos del documento      | Registro web opcional, tipos de SDK públicos, códec/configuración atómica en línea rica, comandos nativos de lienzo de célula completa, marcadores de posición desconocidos de versión opaca, ejemplo de cuenta regresiva/novedades independiente                                                                   | Bloques generales, API de mutación arbitraria del editor, exportación sin pérdida entre formatos y aceptación en dispositivos nativos                                    |
| AI                     | Herramientas/habilidades públicas y ejecución de MCP, servidor `ai.continuations.v2`, parametrizado `host.ai.open` en Web/nativo, uso bruto, conversión de tasa de modelo, política de admisión, eventos de liquidación duraderos                                                                                                                  | Reservas y compensación por fallos, más dimensiones de uso; aceptación del dispositivo de lanzamiento nativo                                 |
| Actividad reciente        | Actividad.v1 registro de fuente, visitas propiedad de complemento, navegación con cursor fusionado, apertura verificada por permisos                                                                                                                                                              | El almacenamiento y la limpieza de visitas específicas del plugin pertenecen al plugin; ver [integración](plugin-activity.es.md)                                       |
| Búsqueda y conocimiento   | Contenido.v1 fuentes, recuperación global de contenido, suscripciones/planificación del conocimiento existente, huellas dactilares de bloques, interfaz de configuración de fuentes y protecciones de contenido derivado                                                                                                   | Integración e aceptación independiente de fuentes de correo; las conexiones de colaboración ya abiertas están fuera de la revocación inmediata                 |
| Correo electrónico                   | Fuente del host, puente, base de datos, herramientas, acceso web y móvil, y pruebas de negocio eliminadas                                                                                                                                                                              | Se desarrolla y acepta un complemento de correo futuro por sí mismo                                                                                   |
| Miembros             | Servidor, interfaz de usuario y definiciones de datos comerciales eliminadas                                                                                                                                                                                                                | Verificación combinada                                                                                                                       |
| Moderación             | Rutas, trabajadores, campos de negocios y restricciones de lectura eliminadas                                                                                                                                                                                                      | Un complemento de negocios futuro                                                                                                                    |

Orden: SDK público y el directorio de instalación, carga del runtime web y verificación independiente de paquetes, usuarios, permisos y extensiones de IA, correo en interfaces públicas, eliminación de membresías y moderación, y luego aceptación de la actualización combinada. Actualice esta tabla en cada etapa. Una capacidad no implementada no debe aparecer en un ejemplo de tutorial que afirme funcionar.

El [Entrega de correos electrónicos](plugin-mail-handoff.md) Registra las interfaces e aceptaciones históricas. Su antigua guía de almacenamiento autogestionado es reemplazada por el contrato de almacenamiento gestionado aprobado.

<a id="_13-delivery-grades"></a>
<a id="13-delivery-grades"></a>

## 13. Calificaciones de entrega

- El contenido del host, los servicios de archivos y los enganches de integración pública mantienen sus límites existentes. Los modelos de negocio, los permisos, los intentos de reconexión y las semánticas de eliminación de archivos siguen siendo propiedad del complemento; la persistencia siempre es gestionada por el host.
- Declaración de paquete requerida `doca.storage: "host"` Se verifica antes de la importación del código servidor para instalaciones con ZIP/npm/store, importación de directorios offline y restauración del inicio. Los valores faltantes/diferentes fallan. No se soportan variables de entorno de directorio de datos de plugin, seleccionador de servidor, adaptador legacy o migración implícita de datos.
- El almacenamiento relacional gestionado y los objetos privados se exportan en SDK 0.1.7. Las credenciales se exportan en el código fuente de SDK 0.1.9; todavía hay trabajo temporal por implementar. La elección del servidor y el despliegue compartido pertenecen al host; los complementos nunca distinguen entre local y remoto. Su estado exacto de exportación se indica en el contrato de almacenamiento y en la sección 12.
- Los nuevos almacenes gestionados aceptan solo la estructura declarada; los desacuerdos impiden el inicio. No se deben abrir almacenes vacíos para las instalaciones autogestionadas existentes, ni utilizar “uninstall” para evitar un plan de migración. Los paquetes y datos antiguos permanecen sin cambios; cualquier conversión requiere un acuerdo separado.
  La gestión del limpiezo de bases de datos/personas privadas corresponde al host. En el caso de una desinstalación exitosa del servicio, la transacción del registro cierra la generación actual y agrupa el limpiezo de tablas/personas privadas con intentos de reinicio duraderos. Se implementa el limpiezo de credenciales y la cierre de la generación; la drenaje de tareas empresariales del clúster sigue siendo no disponible. Los archivos de usuario y otras referencias empresariales se conservan. La falla del hook deja la instalación intacta; los efectos del hook externo no pueden revertirse. Todas las instancias todavía requieren un reinicio manual.
- Salud, registros redactados, errores recientes en el trabajo y el retraso se resumen a través de interfaces de estado públicas, no mediante complementos que leen las rutas de almacenamiento del host.

No proporcionado: SQL arbitrario, transacciones distribuidas entre plugins/hostes, importación automática de archivos antiguos y escrituras duales, acceso predeterminado a la IA para todas las fuentes, o código de plugin npm ejecutado dinámicamente por el proceso nativo.

<a id="_14-plugin-owned-recent-activity"></a>
<a id="14-plugin-owned-recent-activity"></a>

## 14. Actividad reciente propia del complemento

`activity.v1` se exporta a través de `activityServiceToken` en `plugin-sdk/platform`. Una fuente suministra `list` y `get`, etiquetas de tipo localizadas y un icono soportado. El host no persiste las visitas de complementos. Los archivos de visita del núcleo existentes permanecen en su lugar. El registro es de alcance de instancia y se descarta con el complemento; la lista y la apertura requieren la actualidad `activity.read` autorización. El [contrato de actividad](plugin-activity.es.md) Define un orden estricto de claves, consultas limitadas, aislamiento de fallos, comportamiento del cursor y retroceso sin migración de datos.

<a id="_15-content-and-native-implementation"></a>
<a id="15-content-and-native-implementation"></a>

## 15. Contenido e implementación nativa

El SDK de origen exporta `content.v1` a través de `plugin-sdk/content`: lista requerida/read/resolve, búsqueda opcional, validación completa del inventario y lectores de documentos/files integrados. Las suscripciones de conocimiento reutilizan el almacenamiento y la programación existentes, comparan huellas dactilares de bloques y solo leen/analizan los cuerpos modificados. La interfaz de configuración y los protectores de contenido derivado en tiempo real cubren las nuevas lecturas, listas y recuperación de respuestas. No se añaden adaptadores, conversiones de base de datos ni migraciones de esquema de knowledge.sources.v1. La integración independiente de correo y la aceptación de dispositivos nativos siguen siendo requeridas. [Límites de contrato e implementación](plugin-content.es.md).

El contenedor nativo ahora proporciona almacenamiento persistente por origen/usuario/plugin y guardado/compartir de anexos autenticados. `PluginWebHost.native`Se sigue necesitando verificación nativa y un cliente de correo reconstruido de forma independiente. [Contrato nativo](plugin-native.es.md).

<a id="creation-resources-sdk-015"></a>

## Recursos de creación (SDK 0.1.5)

[Contrato de plantilla/material](creation-resources.es.md) Definen los registros de proveedores sin condiciones predeterminadas implementados, el emparejamiento de consumidores con versión, etiquetas/búsqueda/paginación, importación de materiales, inicialización de documentos, clientes públicos y seleccionadores inyectados. La tabla de plantilla retirada se mantiene sin migración ni registro predeterminado; las antiguas API de plantilla y la creación de templateId se eliminan según el plan acordado. Los proveedores externos y la gestión de recursos del almacén siguen siendo tareas separadas.

La revisión de fuente 0.1.6 añade descripciones de fuentes nombradas y múltiples fuentes. `providerIds`, proveedor limitado propiedad del proveedor `retrieve`, metadatos de fuente en los resultados y en los callbacks del selector, así como herramientas de descubrimiento/recuperación de fuentes de IA. El cambio de consulta acordado rechaza el anterior singular `providerId`; las referencias de recursos conservan su `providerId` Y los datos almacenados no se modifican. La recuperación no soportada nunca escanea las páginas de navegación. Ver el estado actual [protocolo de recursos](creation-resources.es.md)La verificación de la fuente no implica la publicación en npm.

<a id="plugin-document-elements-2026-10-02-sdk-016-source"></a>

## Elementos de documento del complemento (2026-10-02, fuente SDK 0.1.6)

El paquete web opcional `elements` registro y `@smartdoca/plugin-sdk/editor-elements` Se implementan para elementos atómicos en línea ricos y vistas de lienzo de hoja de cálculo con celdas completas. Los formularios de configuración se envían a través de operaciones nativas propiedad del host y operaciones de deshacer; no existe un manejo de editor público arbitrario. Los tipos/versiones exactas desconocidas muestran un espacio de texto de error y preservan JSON opaco, sin conversión, migración ni limpieza. Cero proveedores se instalan por defecto. Véase [El contrato de elemento exacto](plugin-editor-elements.es.md) y [Ejemplo independiente de cuenta atrás/novedades](../examples/plugin-elements/README.md)La publicación en npm, la instalación en producción y la aceptación en dispositivos nativos no están implícitas.


Las colecciones de materiales se implementan en el código fuente del SDK 0.1.9: materiales.v2 / proveedores de versión 2, grupos separados de resultados de materiales/colecciones, navegación, etiquetas y recuperación indexada. Los metadatos de la colección nunca incluyen miembros. La revisión acordada no incluye adaptador materiales.v1 ni migración de archivos/documentos existentes. La gestión de colecciones pertenece a los proveedores que utilizan una persistencia gestionada por el host público. Véase [protocolo de recursos](creation-resources.es.md).

<a id="sdk-publication--2026-10-13"></a>

## Publicación del SDK — 2026-10-13

`@smartdoca/plugin-sdk@0.1.11` Está publicado en npm. El consumidor de dependencias del registro importa todos los 16 puntos de entrada públicos y verifica los tokens de monitoreo/telemetría y la versión exacta del SDK. Esto no establece un plugin de monitoreo de producción ni una aceptación en dispositivos nativos.
