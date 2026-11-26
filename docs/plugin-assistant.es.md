<a id="launch-the-ai-assistant-from-a-plugin"></a>

# Lanzar el asistente de IA desde un complemento

[中文](plugin-assistant.zh-CN.md)

La versión 0.1.7 del código fuente de SDK introdujo `PluginWebHost.ai.open(input)`. Web abre el asistente personal completo; un plugin de aplicación WebView abre la conversación nativa. La verificación de fuente no establece una publicación en npm ni una versión actualizada de la aplicación. Esta es una API de lanzamiento de cliente; la ejecución en segundo plano del servidor tiene un contrato separado.

```ts
import type { PluginAssistantOpenInput } from "@smartdoca/plugin-sdk/web";

const input: PluginAssistantOpenInput = {
  prompt: "Summarize this email and list action items",
  context: mail.plainText,
  documentIds: [document.id],
  attachmentFileIds: [attachment.fileId],
};
const { sessionId } = await host.ai.open(input);
```

| Parámetro | Comportamiento y límites |
| --- | --- |
| `prompt` | Texto de entrada inicial editable |
| `context` | Texto plano añadido después `prompt`; máximo combinado de 20,000 caracteres, como mensaje de usuario en lugar de instrucción del sistema |
| `documentIds` | No más de 20 UUIDs distintos de documentos del host; el host lee los títulos/formatos autorizados actualmente y muestra chips de referencia. |
| `attachmentFileIds` | Hasta 8 UUIDs distintos de archivos de host, cada uno hasta 20 MiB y en total 25 MiB; copiados a través de APIs autorizadas en archivos de AI. |
| `sessionId` | Un UUID de conversación existente perteneciente al usuario actual; la omisión crea una nueva conversación; las conversaciones archivadas deben restaurarse primero. |
| `modelId` | Un modelo disponible; la omisión utiliza el modelo de conversación, el valor predeterminado del usuario y luego el valor predeterminado del sitio. |
| `autoSend` | Se rellena por defecto; explícito `true` Envía un mensaje y requiere que no sea vacío. `prompt` o `context` |

`host.ai.open()` Puede iniciar una conversación vacía. Devuelve `Promise<{sessionId: string; jobId?: string}>`. `jobId` Existe solo cuando se envía el mensaje de inmediato; eso no significa que el modelo haya terminado. Los lanzamientos duplicados simultáneos en un mismo cliente son rechazados. Cada llamada nueva que tenga éxito es un lanzamiento independiente y no se intenta automáticamente enviar el mensaje de nuevo.

```ts
const { sessionId, jobId } = await host.ai.open({
  prompt: "Draft a reply",
  context: mail.plainText,
  autoSend: true,
});
```

Referencias, archivos, conversaciones, modelos y el envío de datos todo requieren la autorización del host actual. La identidad proviene de la sesión. Las entradas no pueden proporcionar `userId`, tokens o prompts del sistema. Se rechazan campos desconocidos, IDs duplicados, UUID inválidos y entradas excesivas. Los plugins deben asegurarse de que su contenido comercial pueda ser proporcionado a ese usuario y a la IA. El lanzamiento no expande los permisos de recursos ni evita las políticas de ejecución del modelo, las aprobaciones de herramientas o el registro de uso.

Derechos denegados, modelos no disponibles, conversaciones archivadas/para otros usuarios, límites de archivos adjuntos, errores de red y cambio de cuenta rechazan la Promesa. Los archivos adjuntos que aún se están procesando pueden ser prellenados; el envío inmediato de informes indica un error explícito. El plugin puede intentar nuevamente más tarde o abrir una conversación prellenada. El fracaso no elimina los datos de usuario; los archivos adjuntos ordinarios o conversaciones vacías siguen las reglas de retención del host existente.

Prefill existe únicamente en la memoria del proceso de interfaz actual y se pierde al actualizar o salir. Las URLs contienen solo el ID de la conversación y un identificador único de inicio interno de la aplicación, sin parámetros de cuerpo o adjuntos. Nativo `assistant.open` Utiliza el espacio de nombres complemento y las credenciales de cuenta fijas. Dejar de usar el complemento o cambiar de cuenta cancela las solicitudes en curso; las credenciales nunca entran en WebView. Los referencias y archivos adjuntos pueden eliminarse antes de enviarlos en Web y App.

Este incremento no introdujo ningún esquema de base de datos, lector de formato antiguo, migración ni adaptador de host antiguo. Las conversaciones existentes mantienen el formato normal del host; la restauración de la fuente no requiere conversión ni eliminación. Un host que carece de este método, o un contenedor nativo que no lo tiene… `assistant.open`No se puede proporcionar la capacidad. Despliegue los artefactos correspondientes; la publicación independiente en npm y la aceptación del dispositivo requieren verificaciones separadas.
