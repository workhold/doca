<a id="monitoring-and-telemetry"></a>

# Monitoreo y telemetría

[简体中文](plugin-monitoring.zh-CN.md)

Implementado en el código fuente del SDK **0.1.11**. Importación `monitoringServiceToken` (`monitoring.v1`), `telemetryServiceToken` (`telemetry.v1`) y sus tipos de `@smartdoca/plugin-sdk/monitoring`La verificación del SDK 0.1.11 npm se registra en la sección de publicación a continuación; la implementación en producción sigue siendo independiente.

<a id="installation-and-access"></a>

## Instalación y acceso

Declare cada servicio que utiliza. `injections.required` y un rango de SDK que comienza en 0.1.11, por ejemplo `sdkRange: "^0.1.11"`Un servicio ausente o un rango de SDK antiguo falla de forma explícita. Los nuevos servicios no tienen adaptador para host antiguo. Los métodos existentes, `events.v1`La estructura de la base de datos y los formatos almacenados mantienen su comportamiento anterior.

Los plugins del servidor instalados son código confiable, instalados por un administrador. Una inyección de monitoreo requerida permite al plugin del servidor acceder a los datos operativos del sitio para la recopilación en segundo plano. La inyección no otorga a un usuario común acceso a esos registros. Los plugins deben autorizar sus propios rutas, tareas y herramientas de IA; nunca enviar registros globales ni datos de auditoría a usuarios comunes o prompts de modelo de forma automática.

Inyectar monitoreo durante el montaje para activar el acceso web del complemento. `host.platform.monitoring` Llama al mismo método fijo que se ha definido. `/api/v1/plugin-platform/<pluginId>/monitoring.<method>`El anfitrión verifica el alcance de monitoreo en tiempo real y vuelve a leer el estado del administrador activo del cuenta en cada llamada del navegador. Una instalación inexistente/inactiva es rechazada por el portal de la plataforma existente. No se proporciona ningún punto de entrada para el envío de servicios genéricos ni para la escritura de telemetría en el navegador. La eliminación revoca el alcance y los servicios retenidos. Las escrituras de telemetría están vinculadas al ID de la instalación.

```ts
import { definePlugin } from "@smartdoca/plugin-sdk";
import { monitoringServiceToken, telemetryServiceToken } from "@smartdoca/plugin-sdk/monitoring";
import { httpServiceToken } from "@smartdoca/plugin-sdk/platform";
import manifest from "../manifest.json" with { type: "json" };

export default () => definePlugin({
  manifest, // sdkRange: "^0.1.11"; package.json also declares doca.storage: "host"
  injections: { required: [monitoringServiceToken, telemetryServiceToken, httpServiceToken] },
  async uninstall() {},
  async mount(context) {
    const monitoring = context.inject(monitoringServiceToken);
    const telemetry = context.inject(telemetryServiceToken);
    telemetry.log(manifest.id, { level: "info", module: manifest.id, message: "Collector started" });
    await context.inject(httpServiceToken).register(manifest.id, [{
      method: "GET", path: "/metrics", admin: true,
      handle: request => monitoring.metrics({ scope: "cluster", windowSeconds: 60 }, { signal: request.signal }),
    }]);
  },
});
```

El paquete Web puede leer `await host.platform.monitoring.stats({})` o `await host.platform.monitoring.logs({cursor})`Recibe DTOs tipados, incluyendo la cobertura y las lagunas. Las opciones de llamada del SDK aceptan un AbortSignal; las consultas verifican la cancelación antes y después de I/O, sin prometer la cancelación de una sentencia de base de datos ya enviada.

<a id="read-methods"></a>

## Métodos de lectura

| Método | Hechos y limitaciones |
| --- | --- |
| `stats({})` | Cantidades de base de datos compartida: documentos no eliminados, bibliotecas y archivos; cuentas completas/activas; bytes de archivos lógicos; objetos y bytes de almacenamiento de archivos registrados. Los bytes de archivos lógicos pueden contar referencias al mismo objeto. Los bytes de objetos registrados son solo un inventario, no la capacidad del sistema de archivos/buque; los objetos privados de plugin, archivos de liberación y objetos no registrados están fuera de este total. |
| `online({offset?,limit?})` | Conexiones en tiempo real frescas; las personas se filtran según ID de usuario, número de conexiones, número de documentos activos y una lista de IDs de usuario/documentos. Por defecto 100, máximo 200. El alcance es de instancia para presencia local y clúster para Redis. Nunca se utiliza la alternativa de heartbeat antigua; falla en tiempo real si no está disponible. |
| `metrics({scope?,windowSeconds?})` | HTTP completó solicitudes, errores 4xx, 5xx, solicitudes abortadas, solicitudes en tránsito, QPS, histogramas de tasa y duración de errores 5xx; grupos de plantillas de ruta y series de métricas de plugin. Duración por defecto de 60 segundos, soportado de 1 a 300. Escenario de alcance por defecto; si no se configura Redis, el alcance real devuelto es la instancia. |
| `logs({scope?,cursor?,limit?,level?,pluginId?,module?,requestId?,since?})` | Registros operativos estructurados con buffering. Se conserva la secuencia de cada época y se fusionan las cabezas de instancias según el tiempo; la inversión del reloj nunca avanza más allá de las entradas no procesadas. Por defecto 100, máximo 200. Los filtros son precisos, el nivel no es un umbral mínimo. El cursor máximo 64 KiB. Siempre se guarda el cursor devuelto, incluso en páginas vacías. |
| `audit({source,...})` | Auditoría de seguridad o recursos duradera existente. Requerido `source: "security" \| "resource"`; acción exacta opcional/actorId y userId/resourceId específico de la fuente, fecha de inicio/fin en ISO, cursor y límite. Los filtros no aplicables a la fuente fallan. Los detalles de seguridad están redactados; los detalles ilegibles/no relacionados con objetos son `null` con `detailsValid:false`No se reescriben los registros. |
| `jobs({})` | Grupos de estado de bases de datos compartidas, arrendamientos de AI/proyección caducados y objetos privados en espera de eliminación. Los tipos de proyección incluyen las tareas que ya utilizan esa cola. Esto no implica que todos los plugins empresariales usen una cola de host. |
| `jobErrors({source,limit?})` | Últimos errores de IA/proyección/extracción de archivos; sin prompts, payloads o resultados. Este es un ejemplo de diagnóstico reciente, no un archivo completo con páginas de errores. `nextCursor` siempre es nulo. Los registros de proyección no tienen un timestamp fiable para actualizaciones de errores, así que `updatedAt` Es nulo y el ordenamiento utiliza available_at. |
| `aiUsage({...})` | Páginas de snapshot del libro mayor compartido, ID de usuario/ modelo/ estado exacto, fecha de inicio/fin según ISO. IDs de llamada/tarea/modelo, estado, tokens calificados y métricas numéricas del proveedor original. El uso desconocido es null; nunca se estima a partir de las columnas numéricas antiguas del SQL. Las entradas confirmadas que no coinciden con la representación actual son `usageStatus:"invalid"`, conservado sin cambios. Se omiten los secretos, las respuestas del proveedor y las capturas de pantalla del modelo. |
| `health({scope?})` | Versión, instancias, proceso RSS/heap/cpu acumulado/loop de eventos P95, prueba de lectura de base de datos y disponibilidad en tiempo real/caché. Las pruebas de almacenamiento/búsqueda/red de IA son explícitamente `not-probed`Un análisis de salud no llama a un modelo pagado ni escribe un objeto de prueba de almacenamiento. |

La pestaña de auditoría y uso tiene un valor predeterminado de 100 y permite 200 registros. Su cursor establece un límite superior de tiempo, incluye el huérfano de consulta y ordena por created_at, luego por ID; los cursors mal formados o no compatibles fallan. Estas lecturas son inventarios, no fuentes de actualizaciones de cambios. Para el consumo de liquidación de IA duradera, utilice los existentes. `events.v1` / `ai.usage.recorded`Una llamada que estaba pendiente anteriormente puede resolverse después de que se haya leído la página del momento de creación. Todas las interfaces de auditoría y uso originales permanecen disponibles con su comportamiento original.

<a id="request-metrics-and-custom-metrics"></a>

## Métricas de solicitud y métricas personalizadas

Las métricas HTTP cuentan con todas las rutas HTTP normales, incluyendo las solicitudes de administrador/plataforma/estado. Los intercambios de mensajes de WebSocket se excluyen; se utiliza la presencia en tiempo real para sus conexiones. Los abortos se cuentan por separado de las respuestas completadas. La tasa de errores es 5xx/respuestas completadas, y es nula cuando hay una ventana vacía. La QPS suma las tasas de solicitud de instancia durante su ventana real cubierta, limitada al momento de inicio. Los informes de snapshots indican el tiempo de muestreo y el momento de inicio, para que los consumidores puedan evaluar el retraso en el muestreo.

Las duraciones utilizan intervalos exclusivos en milisegundos: 1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000 y sin límite. P50/P95/P99 son estimaciones de límite superior de los intervalos, limitadas al valor máximo observado; los percentiles de los grupos se combinan en lugar de calcular promedios de los percentiles de las instancias. La distribución vacía tiene valores mínimo/máximo/percentiles nulos. Las etiquetas de ruta utilizan plantillas de ruta registradas, nunca cadenas de consulta o URLs dinámicas de recursos. Los primeros 64 grupos de ruta/método se conservan por época de proceso; los grupos adicionales comparten… `[other-routes]`.

```ts
telemetry.record(manifest.id, {
  name: manifest.id + ".sync.completed", kind: "counter", value: 1,
  labels: { source: "mail" },
});
telemetry.record(manifest.id, {
  name: manifest.id + ".sync.duration_ms", kind: "histogram", value: 120,
});
```

Los nombres de métricas comienzan con el ID del plugin propietario y un punto. Los tipos son contador (incrementos no negativos), medidor (valor finito más reciente) y histograma (observaciones no negativas, utilizando los mismos intervalos numéricos). Los cambios en tipo y clave de etiqueta bajo el mismo nombre fallan con 409. Hasta seis etiquetas, 100 caracteres/valor, 200 series/plugin y 1,000 series personalizadas/instancia; las nuevas series excedentes fallan con 429 y el incremento se rechaza. Las etiquetas similares a secretos y el desbordamiento numérico fallan. Utilice categorías limitadas en lugar de IDs de usuario/solicitud/documento. Las series personalizadas se devuelven por instancia/época; el reinicio del contador y la agregación del medidor siguen siendo decisiones explícitas del consumidor. Sus valores son acumulativos desde el inicio/más reciente, independientes de la ventana de desplazamiento HTTP. Los autores de plugins pueden exponer sus propios datos de dependencia/trabajo a través de métricas personalizadas.

<a id="logs-retention-and-cluster-coverage"></a>

## Registro, retención y cobertura del clúster

Los registros del host incluyen los registros estructurados de la aplicación Fastify cuando el registro de host está activado, además de errores HTTP, abortos y solicitudes que duren al menos dos segundos, independientemente del registro de stdout. Las líneas de solicitudes exitosas ordinarias se representan mediante métricas. Los registros del plugin contienen un pluginId vinculado al host, epoch, instanceId, secuencia, tiempo de creación y, opcionalmente, requestId. Claves sensibles, cuerpos de solicitud, prompts, payloads, snapshots de modelos y estructuras de errores se eliminan o redactan; URL userinfo/query/hash y cadenas comunes de credenciales se eliminan. El registro de texto secreto arbitrario no puede ser seguro mediante el matching de patrones: los autores nunca deben incluir secretos o cuerpos de documentos en mensaje/module/requestId/fields.

Cada instancia conserva como máximo 2,000 registros y 2 MiB de datos de registro serializados. El conteo/byte de eliminación aumenta el marcador de secuencia y el número de registros eliminados. Un cursor guardado detrás de ese marcador reporta una brecha de eliminación explícita, incluyendo el número de registros perdidos. Las instancias tienen una nueva época al reiniciarse, incluso si el instanceId se reutiliza. Una época anterior ausente reporta una brecha de disponibilidad de la instancia; las representaciones de caché nuevas mal formadas se marcan como no disponibles, se conservan hasta su expiración y nunca se adaptan ni se devuelven como contenido.

Con Redis configurado, los hosts publican snapshots de versión 1 cada cinco segundos en un archivo separado `monitoring:v1` Nombre de espacio clave. Las instancias o snapshots cerradas con antigüedad superior a 15 segundos son obsoletas y excluidas de los totales de métricas actuales, mientras que los registros conservados aún pueden ser eliminados. Los snapshots y los registros de instancias conocidas expiran después de una hora; las instancias obsoletas, faltantes o mal formadas… `complete:false`Una lectura de clúster actualiza la instancia que responde y lee las otras instantáneas. Hasta 128 épocas conservadas y 16 MiB por instantánea; inventarios más grandes fallan explícitamente. Los fallos de Redis no reducen la solicitud de un clúster configurado a datos locales. El ámbito local sigue siendo una opción de diagnóstico explícita. Esta caché es efímera y no garantiza una entrega duradera ni el descubrimiento de flotas con versiones mixtas: los hosts que no tienen el nuevo publisher no forman parte de su inventario.

Los plugins de monitoreo almacenan agregados históricos, registros de logs, cursores, marcadores de brechas y estado de alertas a través de un almacenamiento gestionado por el host. Elimina duplicados de logs por ID, confirma los registros junto con su cursore en una única transacción del plugin, y reconoce/reporta las brechas como tales. La muestreo no reconstruye una ventana de solicitud perdida. El host conserva los registros de auditoría de seguridad y los hechos originales de uso de IA; los plugins no pueden eliminarlos a través de este SDK.

<a id="upgrade-rollback-and-verification"></a>

## Actualización, rollback y verificación

Esta adición no modifica ninguna tabla de la base de datos del host, la línea base, el formato de auditoría, el formato del libro mayor de IA ni la estructura de datos del plugin existente. Las alternativas online-heartbeat y de lectura histórica de IA existentes permanecen en sus rutas originales. Los nuevos hechos de ejecución comienzan con el inicio del proceso actualizado; el salida de consola histórica no se importa. Los nuevos plugins requieren SDK 0.1.11 y fallan en hosts anteriores. Retroceder el código preserva los datos persistentes existentes y los registros históricos del plugin; desactivar los plugins que requieren nuevos servicios antes de iniciar un host antiguo. La caché de monitoreo puede caducar sin afectar los datos autoritarios.

Los pruebas utilizan bases de datos/documentos aislados y un espacio de nombres único de Redis. La aceptación abarca la fusión de solicitudes/histogramas, la deduplicación de usuarios, los filtros/paginación/desecho de cursor, la ocultación de secretos, la denegación por parte de usuarios comunes y administradores revocados, la aplicación de normas de espacio de nombres/versión/ciclo de vida, las cachés obsoletas/sin datos/invalideces y las épocas de reinicio, además de la construcción del SDK y un consumidor independiente de JavaScript/declaraciones. La publicación en npm, un plugin de monitoreo de producción y el despliegue de producción son entregas separadas.

<a id="sdk-publication--2026-10-13"></a>

## Publicación del SDK — 2026-10-13

`@smartdoca/plugin-sdk@0.1.11` Está publicado en npm. El consumidor de dependencias del registro importa todos los 16 puntos de entrada públicos y verifica los tokens de monitoreo/telemetría y la versión exacta del SDK. Esto no establece un plugin de monitoreo de producción ni una aceptación en dispositivos nativos.
