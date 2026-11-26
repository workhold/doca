<a id="mcp-services"></a>

# Servicios MCP

[简体中文](mcp.zh-CN.md)

Doca expone sus herramientas asistentes y manuales de habilidades a clientes externos a través de `POST /api/v1/mcp`. Configuraciones personales → El MCP gestiona los servicios que actúan como el usuario autenticado. Administrador → Los servicios del MCP de la empresa gestionan las integraciones que nombran explícitamente al usuario efectivo `userId` En cada operación. Los tokens de la compañía requieren un administrador creador activo; no heredan los permisos de recursos del creador cuando operan como otro usuario.

Cada servicio tiene un token independiente, una opción de conmutación, una expiración opcional y un `all` o `selected` concesión. `all` Se basa en el catálogo de herramientas/habilidades disponibles, incluyendo las adiciones posteriores. `selected` Solo muestra los IDs de herramienta y habilidad registrados. Una concesión de herramienta es un consentimiento permanente para ejecutar esa acción; no amplía las ACLs de recursos, los límites de almacenamiento, las restricciones de descarga, el estado de la cuenta o las políticas de admisión de host/plugin. Un habilidad nunca otorga permisos de herramienta. Los manuales oficiales, de plugin instalado y personal habilitado se filtran para el usuario efectivo.

<a id="connect-a-client"></a>

## Conectar un cliente

Cada servicio muestra un comando Codex. `config.toml`Ejemplos de inicialización/descubrimiento de HTTP y instrucciones copiables para que una IA lo instale. Los tokens aparecen solo después de la creación/reset; las listas contienen solo sus ocho caracteres finales. La base de datos almacena hashes de tokens SHA-256. No coloque un token en una URL ni lo cometa en un archivo de configuración.

```toml
[mcp_servers.doca]
url = "https://docs.example.com/api/v1/mcp"
bearer_token_env_var = "DOCA_MCP_TOKEN"
```

Establecer `DOCA_MCP_TOKEN` en el entorno que inicia al cliente. Para la CLI:

```sh
codex mcp add doca --url 'https://docs.example.com/api/v1/mcp' --bearer-token-env-var DOCA_MCP_TOKEN
```

Una oración para una IA: “Instalar un Streamable HTTP MCP llamado doca”. `https://docs.example.com/api/v1/mcp`, leer su token de portador `DOCA_MCP_TOKEN`, luego verifique la inicialización y enumere las herramientas y habilidades disponibles”. Para un servicio empresarial, agregue: “Transmita al usuario objetivo `userId` en cada uno `doca_*` “Operación”.

El Codex tiene su propia política de aprobación de herramientas. La interfaz de usuario también proporciona… **opcional** Configuración sin supervisión: `[mcp_servers.doca.tools.doca_call]` con `approval_mode = "approve"`Úsalo solo cuando tengas la intención de preautorizar el uso por parte del cliente de las acciones otorgadas por el servicio. Los ejemplos de conexión por defecto no lo permiten. Véase [configuración oficial de MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli) y [Configuración de aprobación de herramientas](https://learn.chatgpt.com/docs/config-file/config-reference).

<a id="discover-and-execute"></a>

## Descubra y ejecute

1. Llamar `doca_tools` con la tarea completa en `purpose`. Opcional `resources`, `files`, `currentResourceId` y `currentFolder` Proporcionar un contexto explícito utilizando los UUIDs de documentos/archivos existentes. Las referencias de archivo reciben el mismo snapshot de entrada autorizada utilizado por el asistente. El resultado contiene `contextId`, independiente `taskId`, y un catálogo conciso. No se crea ninguna conversación.
2. Llamar `doca_describe_tools` con eso `contextId` Y hasta cuatro IDs de herramienta para obtener sus esquemas de entrada completos. Solo se recuperan los esquemas necesarios para la siguiente operación.
3. Lea el manual correspondiente. `doca_skills`/`doca_load_skill`o el estándar `doca_skill` Prompt MCP. Estos leen el catálogo actual; una habilidad privada deshabilitada deja de estar disponible.
4. Llamar `doca_call` secuencialmente con `contextId`, un nuevo UUID `requestId`, `tool` y `input`Las ediciones nativas utilizan la versión actual. `seq`, `epochId`IDs y comandos devueltos por las herramientas de documento normales. Esta es la misma implementación de asistente, con los mismos códecs nativos, transacciones, notificaciones y registro original de uso de IA cuando se llama a un proveedor de Doca. El uso del modelo de cliente externo no se inventa en el registro de Doca.
5. Llamar `doca_context_close` Cuando termine. Los documentos/files guardados permanecen. Los búferes de carga pendiente y el estado de inspección visual local se liberan.

Operaciones personales omitidas `userId`Se rechaza el suministro. Las operaciones de la empresa deben proporcionar el UUID de un usuario objetivo activo cada vez. Un contexto no puede cambiar al servicio o al usuario efectivo. La búsqueda, las lecturas, las escrituras y las descargas verifican los permisos del usuario. La auditoría registra al creador del servicio, al usuario efectivo, al contexto, al ID de la solicitud, al herramienta y al resultado, sin registrar los secretos de entrada.

`requestId` Proporciona una ejecución máximo una vez dentro de su contexto. Un ID repetido genera un conflicto HTTP/tool con su estado registrado, y los parámetros diferentes no pueden reutilizarlo. No reproduce el contenido privado almacenado ni intenta ciegamente volver a realizar una escritura que podría haberse completado. Inspeccione el recurso guardado antes de realizar una nueva escritura después de un resultado incierto. Los flujos de trabajo nativos y de archivos normales conservan sus registros duraderos existentes.

<a id="files"></a>

## Archivos

El nativo `file_browse`, `file_manage`, `file_folder_manage`, `file_read` y `file_create` Las herramientas siguen disponibles. `file_download` Mantiene el significado de su asistente: obtener un archivo web público **en** Doca.

Para las transferencias reales de clientes:

- `file_upload_begin`: nombre de archivo, MIME, tamaño declarado y opcionalmente SHA-256; máximo 20 MiB y límite de usuario configurado más estricto.
- `file_upload_chunk`: base64 canónico, desplazamiento de bytes continuo; chunk máximo decodificado: 128 KiB.
- `file_upload_complete`Guarde la carga completada en una carpeta de usuario con UUID, o `folderId:null` Para la raíz del usuario. Los cargas están vinculados al contexto de servicio y al usuario efectivo.
- `file_upload_abort`: liberar un cargamento pendiente.
- `file_content`Descarga de rango de bytes autorizada con base64, hash SHA-256 de archivo completo/segmento, versión del archivo y `nextOffset`Transmita esa misma versión a los bloques siguientes; rechaza los archivos modificados en lugar de combinar las versiones.

Estos métodos reutilizan el servicio de archivos del host. No necesitan ni cookies del navegador ni una ruta de sistema de archivos del servidor, y nunca convierten una URL de contenido leída en una autorización de descarga evasiva.

<a id="transport-and-lifetime"></a>

## Transporte y vida útil

El punto de finalización utiliza HTTP Streamable sin estado desde la versión 1.30.0 del SDK, con versiones de protocolo aceptadas explícitamente. `2025-11-25`, `2025-06-18` y `2025-03-26`La inicialización debe especificar una versión compatible; las solicitudes posteriores deben incluir `MCP-Protocol-Version`GET/DELETE devuelve respuestas 405 autenticadas. Se aplican los controles de host existentes y se rechaza una origen inválido. Los protocolos HTTP+SSE y los adaptadores de tokens antiguos están descontinuados.

Los contextos de ejecución tienen una vida útil de 15 minutos en reposo, un máximo de 16 contextos activos/pendientes por servicio y 128 por instancia. Las llamadas dentro de un mismo contexto son secuenciales. Se vuelven a verificar las concesiones de herramientas/habilidades, los tokens y los usuarios activos; el restablecimiento/revocación de un token, la desactivación de un servicio o el desactivación del MCP personal anulan sus contextos en ejecución. El límite de solicitudes HTTP es de 600 por minuto por servicio, utilizando el limitador de velocidad del host. Los cuerpos de solicitud están limitados a 1 MiB.

La ejecución de contextos y las pruebas visuales son locales a la instancia. Enviar un contexto activo a la misma instancia. Después del reinicio, la expiración o el enrutamiento a una instancia diferente, abrir un nuevo contexto e inspeccionar los artefactos existentes; no se afirma ninguna continuación automática ni recuperación de pruebas visuales. Los datos de documentos nativos permanecen en el almacenamiento duradero normal. Las credenciales del proveedor, los valores secretos, las sesiones del navegador y los historiales de chat previos no se exportan como configuración MCP.

<a id="execution-history-and-upgrade"></a>

## Historial de ejecución y actualizaciones

MCP y chat comparten arrendamientos de tareas, cancelaciones, autorización de recursos, implementaciones de herramientas, recibos de operación, datos de uso por parte del proveedor y auditoría de seguridad. MCP crea un `ai_jobs` ejecución con NULL `session_id` y `model_id`; no crea nada `ai_sessions` filas, mensajes de chat o hilos de memoria. Las llamadas del proveedor real todavía registran su modelo y uso real. `ai_calls`.

Configuraciones personales → MCP → Historial de ejecución muestra las tareas del usuario efectivo, incluyendo las tareas de servicio empresarial ejecutadas por ese usuario. Soporta enlaces de recursos autorizados, estado de llamadas, detención y eliminación del historial de ejecución cerrado. Al eliminar el historial, se conservan los documentos guardados, los archivos generados, los recibos de operaciones, el uso del proveedor original y los hechos de auditoría de seguridad. Las imágenes generadas conservan las restricciones del directorio de salida de IA y llevan una indicación explícita. `aiTaskId` Vínculo, sin una carpeta de conversación. Una tarea solo lee sus propios registros; las asociaciones de conversación NULL nunca agrupan ejecuciones no relacionadas.

El propietario aprobó la separación directa el 2026-11-01. El DDL actual es… `ai_jobs.session_id`, `ai_jobs.model_id` y lo retenido `mcp_contexts.session_id` válido a través del reconciliador de columna nativa existente. El nuevo `ai_task_resources` El registro comienza vacío y se declara en `schemaEvolution`No hay ningún cambio en el relleno o en la generación de compatibilidad. Las conversaciones, contextos, archivos, concesiones y filas de auditoría históricas del MCP permanecen inalteradas, se excluyen de los puntos de entrada del chat y no se convierten ni se reanudan. Los campos/tablas instalados anteriormente siguen protegidos por el footprint instalado.

La fuente del SDK de plugin 0.2.0 expone `ai.v2` / `ai.continuations.v2`: `jobId` es necesario y `sessionId` Solo existe para la ejecución basada en conversación. Reconstruye los paquetes de plugin. `sdkRange: "^0.2.0"`. El host, la web y los complementos deben actualizarse juntos. Los antiguos contratos de servicio y los rangos de SDK son rechazados; no hay adaptador de interfaz antigua ni downgrade automático. Mantenga copias de seguridad de la base de datos y archivos antes de la actualización y preserve las escrituras posteriores de tareas y archivos para una recuperación revisada por separado antes de revertir los binarios de la aplicación. Véase [verificación](verification/mcp-execution-decoupling-2026-11-01.md).

<a id="storage-and-retired-mcp"></a>

## Almacenamiento y MCP retirado

El propietario aprobó retirar la implementación antigua no utilizada el 2026-10-20. `/ai/mcp-keys` Y el antiguo adaptador de cuatro herramientas se elimina. `doca_mcp_…` Las credenciales son rechazadas; se utilizan nuevos tokens `doca_mcp_v1_…`. El inerte `ai_mcp_keys` Las tablas/filas permanecen únicamente para preservar los datos almacenados; no se les leen durante el ejecución del programa, y no se convierten credenciales ni permisos.

`mcp_user_settings`, `mcp_services`, `mcp_contexts` y `mcp_tool_calls` tablas aditivas vacías declaradas en el DDL actual y `schemaEvolution`Los usuarios existentes comienzan con el MCP personal deshabilitado, ya que no existe ninguna fila de configuración nueva; el uso del servicio de la empresa es independiente de ese cambio. Los documentos existentes, archivos, ACLs, sesiones de IA, valores configurados y la generación de compatibilidad se conservan. La rechazo de la revisión estructural y la falta de reconciliación no causan cambios persistentes parciales. La eliminación de una tabla MCP previamente instalada puede provocar pérdida de datos y no se crea nuevamente silenciosamente.

Mantenga los respaldos previos a la actualización y actualice el servidor/Web al mismo tiempo. Los binarios antiguos no aplican el nuevo contrato de token/gratitud/contexto. No hay una reducción automática de la aplicación ni eliminación de datos; preserve los registros nuevos y revise la recuperación antes de volver a una implementación más antigua. Véase [Contrato de actualización de base de datos](database-schema-evolution.es.md) y [pruebas de aceptación](verification/mcp-2026-10-20/README.md).
