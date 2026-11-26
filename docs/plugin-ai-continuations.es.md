<a id="background-task-continuation"></a>

# Continuación de la tarea en segundo plano

Fuente actual del SDK **0.2.0**, capacidad del servidor `ai.continuations.v2`, exportado desde `@smartdoca/plugin-sdk/ai`. No se implica la publicación ni el despliegue de npm. Esto es común para todos los complementos del servidor instalados; los libros de conocimiento utilizan el mismo mecanismo de alojamiento.

Declarar `aiContinuationsServiceToken` como inyección requerida y `sdkRange: "^0.2.0"`Un host sin esta capacidad rechaza la inicialización. No existe ningún adaptador a través de versiones retiradas de servicios de IA o registro automático de tareas empresariales históricas.

Los contextos de las herramientas MCP no tienen `sessionId`; usar `jobId` para la correlación de tareas. Ellos `wait` Las llamadas pueden devolver instantáneas autorizadas, pero no inician una conversación interna o continuación de un modelo. El cliente externo sigue siendo responsable de las llamadas posteriores.

Los complementos tienen empleos propios, autorización actual, resultados duraderos, IDs de operación estables y entrega de notificaciones/outbox. Almacenarlos a través de un almacenamiento gestionado por el host público. El host posee la identidad asistente, tickets de espera persistentes, cancelación, continuación del modelo y límites técnicos. Un wake no autoriza una acción comercial ni aprueba una tarea humana.

1. Registra una fuente durante el montaje. Su `id` debe comenzar con `<pluginId>.` y su `pluginId` Debe ser igual a la identidad de instalación. El registro se elimina automáticamente al deshacerse del dispositivo.
2. `read(context, {operationId})` Revisa nuevamente la autorización comercial actual y devuelve una captura de snapshot de versión 1, o null para trabajos denegados/incapacitados. Recibe la identidad del host recién leída y una señal de aborto; no devuelve secretos. El ID de operación identifica un trabajo duradero, nunca un principal proporcionado por el usuario.
3. En una herramienta de IA registrada que se está ejecutando actualmente, llama `wait(pluginId, context, {sourceId, operationId})` Con el contexto exacto proporcionado por el anfitrión. Se rechazan los contextos copiados, falsificados o conservados. Inicie el trabajo de negocio de manera idempotente antes de esperar. La herramienta devuelve el recibo.
4. Comparta el resultado antes de llamar. `wake(pluginId, {sourceId, operationId})`. Las notificaciones repetidas solo pueden utilizar un punto de control de asistente almacenado una vez. Una notificación antes de estacionar es segura: la reconciliación periódica y la recuperación de inicio leen nuevamente la fuente duradera.

Un snapshot tiene `version: 1`, `state`, `revision`, `summary` y JSON opcional `result`Los estados son `running`, `waiting_input`, `completed`, `failed`, `cancelled`. Cambiar `revision` Cuando el resultado accionable o la decisión humana cambia. Los latidos cardíacos no despiertan al modelo. Una transición a la entrada humana lo despierta una vez; el asistente puede explicar la tarea pendiente y sigue esperando otra decisión. Las capturas de pantalla terminal reanudan la tarea original con los hechos resultantes. Los resultados de las tareas terminales deben mantenerse estables; una nueva ejecución de negocio requiere un nuevo ID de operación.

El host solo guarda intercambios completos de herramientas. Mientras espera, libera la plaza de ejecución, conserva la tarea original/punto de control y no realiza intentos anormales de recuperación. Las lecturas se reautorizan durante el registro, la notificación y la ejecución. La permisión revocada, los usuarios deshabilitados, las fuentes eliminadas y los registros inválidos impiden la continuación con un error visible y preservan el punto de control. Cancelar el asistente elimina su capacidad de reanudar; cancelar la tarea empresarial es una acción de plugin independiente.

Límites: 20 dependencias por turno del asistente, IDs de fuente de 120 caracteres, IDs/revisiones de operaciones de 200 caracteres, resúmenes de 2,000 caracteres, snapshot serializado de 24,000 caracteres y un plazo de 20 segundos para la lectura de la fuente. La reconciliación utiliza páginas de clave y lecturas paralelas limitadas; una fuente lenta no ocupa las plazas de ejecución normal del modelo. La reconciliación inicial espera a que termine la composición de plugins.

<a id="integration-example"></a>

## Ejemplo de integración

El `jobs` El objeto a continuación es el repositorio propio del complemento, respaldado por `storage.sql.v1`, **No es una exportación de SDK**. `startOnce` debe utilizar una clave de idempotencia de negocio duradera; `readAuthorized` Verifica los permisos de los recursos en tiempo real y devuelve la instantánea actual. La notificación al trabajador sigue su transacción comercial comprometida.

```ts
import { aiServiceToken, aiContinuationsServiceToken } from "@smartdoca/plugin-sdk/ai";

// Inside mount(context):
const pluginId = "example.reports";
const sourceId = `${pluginId}.jobs`;
const ai = context.inject(aiServiceToken);
const continuations = context.inject(aiContinuationsServiceToken);
continuations.registerSource({
  id: sourceId, pluginId,
  read: (request, { operationId }) => jobs.readAuthorized(request, operationId),
});
ai.registerTool({
  id: `${pluginId}.generate`, description: "Generate a report",
  inputSchema: { type: "object", properties: { reportId: { type: "string" } }, required: ["reportId"], additionalProperties: false },
  async execute(input, request) {
    const operationId = await jobs.startOnce(request, input.reportId);
    return continuations.wait(pluginId, request, { sourceId, operationId });
  },
});

// In the plugin worker, after its durable result commit:
await continuations.wake(pluginId, { sourceId, operationId });
```

<a id="persistence-and-rollback"></a>

## Persistencia y rollback

Solo las esperas recientemente explícitas escriben un punto de control de versión 1 estricta. Los existentes `ai_jobs` La restricción estatal permanece sin cambios: las dependencias esperan utilizar su estado “parked” y exponerse `awaiting_dependency` En la API/UI. No hay migración de esquema, escritura dual, tickets antiguos inferidos, conversión de campos faltantes ni despertar de tareas históricas. Los tickets nuevos mal formados son rechazados y conservados para diagnóstico.

El rollback detiene las nuevas registraciones/escrituras y conserva los puntos de control, los resultados de negocio y los registros de auditoría. Un host antiguo no reanuda este nuevo protocolo; no se debe ejecutarlo sobre esperadores activos de la versión 1 sin primero cancelar esos esperadores asistentes o detener los trabajadores y restaurar un host correspondiente. No hay restablecimiento de datos como parte del rollback.

El progreso del conocimiento-book utiliza el almacenamiento de auditoría existente, con contadores compactos de nodos/partes/modelos/reintentos. No se copia el cuerpo del modelo en esos registros. La ventana de ejecución actualiza el estado, el latido, el error actual y los 200 eventos más recientes registrados. Los eventos históricos no se crean; los eventos antiguos conservados permanecen en el almacenamiento.
