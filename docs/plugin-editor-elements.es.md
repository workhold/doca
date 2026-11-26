<a id="plugin-document-elements-sdk-016-source"></a>

# Elementos de documento del complemento (fuente SDK 0.1.6)

Implementado el 2026-10-02 en el host source 0.1.8, SDK 0.1.6, contracts 0.1.6 y Web registry 0.1.3. Esto registra las exportaciones del source y la aceptación aislada, pero no la publicación en npm, la instalación en producción o la aceptación en dispositivos nativos. La política de almacenamiento acordada es el soporte de versiones exactas: los tipos y versiones desconocidos muestran un marcador de error y conservan su JSON original. No se introducen adaptadores, conversiones automáticas, migraciones ni restablecimiento de datos. Los lectores de referencias de documentos internos existentes permanecen sin cambios.

<a id="public-registration"></a>

## Registro público

Importación `PluginElementContribution`, `PluginElementPayload`, `createPluginElementPayload`, `pluginElementState`, `isPluginElementPayload` y `validatePluginElementPayload` desde `@smartdoca/plugin-sdk/editor-elements`. Regresar opcional `elements` desde el paquete normal de complementos de plugin instalado. El host registra cada contribución. `WebPluginRegistry.elements` Dentro del espacio de nombres de complemento propietario y lo gestiona junto con el bundle. Los IDs duplicados y las declaraciones inválidas impiden el registro y revierten los registros del bundle.

```ts
import type { PluginElementContribution } from "@smartdoca/plugin-sdk/editor-elements";

// Return this contribution from the injected Web plugin factory.
const element: PluginElementContribution = {
  id: "example.elements.countdown", pluginId: "example.elements",
  title: { zh: "倒计时", en: "Countdown" }, dataVersion: 1,
  formats: ["rich_text", "spreadsheet"],
  validate: data => typeof data.targetAt === "string" &&
    Number.isFinite(Date.parse(data.targetAt)),
  text: data => `Countdown: ${data.targetAt}`,
  renderEditor: context => /* injected React configuration form */ null,
  render: (payload, context) => /* injected React inline view */ null,
  renderCell: context => { /* draw within context.rect using context.canvas */ },
  refreshIntervalMs: 1000,
};
```

Esta declaración ilustra las firmas exportadas; [el ejemplo independiente](../examples/plugin-elements/README.md) Incluye formularios de trabajo, renderizadores y archivos de instalación. Los complementos utilizan React del host inyectado y agrupan sus propias dependencias. No deben importar rutas de fuente del host ni usar puentes de editor globales.

Cada contribución requiere una ubicación específica. `title`, un número entero positivo `dataVersion`, al menos un formato soportado, `validate`, `text` y `renderEditor`. `rich_text` requiere `render`; `spreadsheet` requiere `renderCell`. Opcional `onCellClick` Recibe el payload y el contexto público. Opcional `refreshIntervalMs` Es un entero entre 1000 y 60000 y solo actualiza la vista del lienzo.

El contexto contiene `documentId`, `format`, `locale` (`zh` o `en`), `readOnly` y un `AbortSignal`El contexto de formulación también proporciona clonados. `initialData` o nulo, `submit(data)` y `cancel()`. El contexto de lienzo proporciona un clon `payload`, el lienzo y el rectángulo de celda cortada. La configuración se envía a través del host; los complementos no reciben ningún manejo de editor mutable, canal de ejecución privado ni canal de persistencia independiente. Los errores de renderizado producen un marcador de posición localizado. Los complementos gestionan sus propios fallos de eventos/asincronía y cancelan el trabajo cuando el señal se interrumpe.

<a id="stored-content"></a>

## Contenido almacenado

```json
{
  "version": 1,
  "pluginId": "example.elements",
  "type": "example.elements.countdown",
  "dataVersion": 1,
  "data": { "label": "Launch", "targetAt": "2026-10-04T00:00:00.000Z" },
  "text": "Launch · 2026-10-04T00:00:00.000Z"
}
```

`version` es la versión con sobre. `dataVersion` Es la versión de datos exacta de la contribución. `data` Contiene una configuración en JSON sencilla. `text` Es una proyección estática limitada para consumidores basados en texto. No se deben persistir funciones de renderizado, credenciales, URLs temporales, valores en tiempo real o temporizadores. Los payloads opacos deben ser objetos JSON simples, de hasta 32 KiB en formato UTF-8, con una profundidad de 20 y 4096 nodos. Las claves prototipos inseguras y los valores no finitos/no en JSON son rechazados antes de su persistencia.

El reconocedor de envolturas actual acepta solo los seis campos declarados. Un envoltura desconocida estructuralmente válida, un proveedor desinstalado/deshabilitado, un tipo desconocido, un formato no soportado o una versión incompatible genera un espacio de contenido no soportado. Un proveedor actual que rechaza la configuración genera un espacio de contenido inválido. Ninguna de estas condiciones reescribe ni elimina datos. El host no llama al renderizador o al editor de configuración del proveedor incompatible. Los usuarios pueden eliminar explícitamente un elemento no soportado mediante la edición nativa y el deshacer esa eliminación. Volver a habilitar el proveedor exacto puede mostrar nuevamente la configuración conservada.

<a id="native-editor-integration"></a>

## Integración con el editor nativo

- El texto enriquecido utiliza una extensión atómica en línea permanente. `custom:plugin-element`, y su códec compartido. Su códec almacena todo el payload opaco incluso cuando no hay plugins de negocio cargados. La inserción captura una gama Slate en vivo, y la edición localiza el nodo por ID. La inserción/configuración/eliminación utilizan operaciones nativas y deshacer nativo. Esta versión soporta átomos en línea; los diseños de bloques arbitrarios no se exportan.
- Hoja de cálculo utiliza el público `cellRenderers` extensión de lienzo `custom.docaElement` en nativo `ICellData`La célula `v` Es la proyección de texto estático. Los comités de inserción/configuración conservan el estilo de celda actual y establecen el ajuste nativo de texto en modo CLIP para que la proyección no sobrepase las celdas adyacentes. La inserción reemplaza el valor/formula/texto enriquecido/datos personalizados de la celda seleccionada, como se indica explícitamente en el diálogo. No hay objetos flotantes ni posiciones en línea dentro del texto de la celda. Una ancla estable de una sola celda sigue las ediciones de fila/cuadro mientras el formulario está abierto; un objetivo eliminado o cambiado simultáneamente no se puede enviar. Los comandos de rango nativos permiten copiar, eliminar, deshacer y colaboración.
- Cerrar el diálogo, cambiar el contexto del editor o salir del modo de edición cancela la sesión. La presentación verifica nuevamente el proveedor activo, el manejo, el estado de lectura y el destino. Los cambios en la renderización/registro no vuelven a montar el editor de documento. La actualización de la vista del complemento no genera una escritura de documento.

El esquema rico existente 3 y el esquema de hoja de cálculo 6 mantienen sus puntos de control nativos y la colaboración confiable en el área de salida. No hay una segunda autosave en JSON, transporte, vía de reproducción de Yjs ni base de datos de complemento empresarial para el contenido de elementos. Los puntos de control nativos y el portapapeles del mismo modelo preservan los payloads; las limitaciones existentes en la conversión de texto/Markdown/Office siguen aplicándose. Las exportaciones atómicas ricas se degradan a etiquetas con la advertencia de conversión existente; los consumidores de hoja de cálculo pueden leer el valor estático de la celda. La exportación de texto plano no constituye una copia de seguridad sin pérdida del complemento-elemento.

<a id="lifecycle-installation-and-rollback"></a>

## Ciclo de vida, instalación y rollback

No se instala el proveedor de elementos por defecto. Descubre complementos únicamente a través del mecanismo de directorio de instalación existente o ZIP. El manifiesto de ejemplo actual requiere SDK. `^0.1.7`Publicar/instalar un SDK y un entorno de alojamiento que contenga este incremento antes de su uso en producción independiente. La fábrica de servidores no posee datos de negocio, y la desinstalación no elimina el contenido de los documentos.

Deshabilitar/desinstalar el plugin desregistra los renderadores, pero no los elementos persistentes. Reinstalar un proveedor de coincidencia exacta no requiere conversión de datos. No se admite volver a un host más antiguo que carece del codec nativo permanente para editar estos documentos; mantenga las copias de seguridad de la base de datos/punto de control y utilice el host implementante para acceder a ellas. No se proporciona ninguna reescritura de degradación ni limpieza destructiva.

<a id="acceptance"></a>

## Aceptación

Los tests aislados en `tests/plugin-editor-elements.test.ts` Coverizar la propiedad/eliminación/retroceso del registro, versiones estrictas y límites JSON, un clon de área de trabajo complejo para copiar/eliminar/deshacer y viajes de ida y vuelta de CRDTs opacos, persistencia nativa/recuperación de ACK/ comportamiento sin eco de dos réplicas, anclas estables de hoja de cálculo/inserción de fila/copiar/eliminar/deshacer/recarga/convergencia, autorización de lectura única y rechazo de carga excesiva atómica. Crean bases de datos y documentos aislados. El script de verificación del SDK también verifica un consumidor de declaraciones de JavaScript y NodeNext independiente en estilo packado, sin rutas de host.

La aceptación del navegador utiliza una base de datos aislada y una instalación temporal del complemento independiente de cuenta regresiva/noticias. Los contenedores nativos reales y los complementos de terceros requieren su propia aceptación. Los elementos de bloque generales, la exportación sin pérdida de formatos cruzados y los comandos de mutación arbitraria del editor público siguen siendo trabajo futuro.

Las operaciones de navegador verificadas incluyen inserción/configuración/deshacer/rehacer/recarga/lectura única, configuración de hoja/inserción/deshacer/rehacer/recarga, y marcadores de posición de tipo desconocido con configuración de solo eliminación. El clip de proyección de hoja fue verificado después de guardar y recargar. Verificación final combinada: TypeScript pasó; 171 archivos de prueba pasaron (1,066 pruebas pasadas, 3 omitidas); la construcción del SDK y el uso independiente pasaron; la construcción para producción web y las verificaciones de espacios en blanco pasaron.

<a id="performance-acceptance-2026-10-02"></a>

## Aceptación de rendimiento (2026-10-02)

Ejecutar `node --import tsx scripts/benchmark-plugin-elements.mts`. En esta máquina macOS arm64 con Node 24.15.0, la proyección mediana nativa de 1,000 párrafos comunes fue de 0.513 ms con los dos códecs inline originales y 0.515 ms con el códec de elementos añadido. El delta mediano correspondiente estuvo dentro del ruido de medición. La verificación de elementos dispersos añadidos para 10,000 celdas ocupadas costó 0.039 ms; con 100 elementos configurados, costó 0.111 ms. La primera validación de 100 cargas de payload de cuenta regreso costó 0.188 ms, mientras que la clonación y invocación de 100 callbacks de canvas de ejemplo costaron 0.101 ms. El benchmark de callbacks utiliza un canvas simulado y no mide la pintura nativa.

Células ordinarias salen después de verificar la propiedad personalizada. La validación avanzada se memoriza, y la validación de canvas se almacena en caché por payload/provider y se invalida al producirse cambios en el registro. Un único temporizador de vista coalescida se rearma solo al dibujar una célula con tiempo visible, con un período mínimo de 1 segundo. Las páginas ocultas lo cancelan. Una hoja sin células con tiempo visible no tiene un temporizador de actualización recurrente. Las pruebas del planificador cubren tiempos de inactividad cero, coalescencia de 100 elementos, salida de la ventana de visualización, ocultamiento y eliminación. La observación del navegador de documentos en tiempo de inactividad superior a 60 segundos no mostró ningún nuevo contenido o historial; los temporizadores nunca entran en el área de persistencia.

Estas mediciones muestran un trabajo adicional mínimo en la CPU del host para los casos probados. No garantizan un coste nulo para el renderizado de terceros arbitrario, el acceso externo, los grandes números de elementos visibles o cualquier dispositivo. Un proveedor de producción debe validar su propio trabajo de renderizado/asincronía.
