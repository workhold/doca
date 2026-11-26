<a id="editor-collaboration-contract"></a>

# Contrato de colaboración con el editor

[中文](collaboration-sdk-contract.zh-CN.md)

Aplica para texto enriquecido, Markdown, hojas de cálculo, lienzo, diapositivas y tipos de documentos futuros. Establecido el 2026-09-11; las incrementaciones de implementación a continuación mantienen sus propias fechas y versiones. Utilice el [matriz de editor actual](editor-integration.es.md) para los paquetes instalados.

La plataforma posee una conexión, permiso, almacenamiento de incrementos, confirmación de commit, reconexión y sesión en línea. Cada componente tiene su propio modelo de datos y renderizado. El comportamiento compartido no significa convertir una hoja de cálculo en una estructura de texto enriquecido.

El protocolo de servicio actual también se describe en [colaboración y búsqueda](collaboration.es.md)Este documento es el siguiente contrato compartido. Un campo aquí no es automáticamente una API publicada.

<a id="_1-layers-and-versions"></a>
<a id="1-layers-and-versions"></a>

## 1. Capas y versiones

| Capa o campo | Deber compartido | Diferencia de componentes |
| --- | --- | --- |
| Transporte | WebSocket de mismo origen, un envoltura, autenticación del servidor | Ninguno |
| Guardar | Incremento local, salida del archivo, commit en la base de datos, ACK | Ninguno |
| formato / codec / schemaVersion | Identifica el tipo y si la estructura es compatible. | Nodo de texto enriquecido CRDT; comandos estables de fila, columna y celda en hoja de cálculo |
| epochId | Una línea de CRDT. Solo cambia cuando ocurre una reconstrucción incompatible. | Un hoja de cálculo también necesita una base de libro inmutable vinculada a la época |
| secuencia | Número monótono de commits válidos en la época actual | Ninguno |
| punto de controlSeq | La secuencia de commits de un punto de control completo de Yjs ya está cubierta. | No elimine los comandos lógicos, ya que la componente aún necesita reproducirlos. |
| resource.version | Bloqueo optimista para metadatos empresariales | No estoy acostumbrado a fusionar Yjs |
| ID de versión de historia | Una vista rápida de negocios que el usuario visualiza o puede revertir | No todas las actualizaciones de red. |
| vector de estado | Resumen de la diferencia de sincronización | No es una confirmación completa de guardado, especialmente para la confirmación de eliminación. |

Cada formato utiliza epochId como línea de descendencia. Un punto de control periódico de Yjs no cambia la época. Una hoja de cálculo utiliza la sesión actual de Yjs y la secuencia de puntos de control.

<a id="_2-platform-and-component"></a>
<a id="2-platform-and-component"></a>

## 2. Plataforma y componentes

La plataforma tiene una sesión en tiempo real por página: socket, ACL, cola de incrementos, ACK, reconexión, snapshots de negocio, comentarios, notificaciones y permisos de activos. Un componente no abre una segunda autosalva HTTP ni socket.

Un componente crea el Y.Doc y el editor una vez por sesión de documento. Las ediciones locales se asignan a Yjs. Las transacciones remotas se proyectan en la vista. Expose las condiciones de disponibilidad, errores, estado de formato, selección y anclajes. Al cambiar props, readonly, cursores, tamaño o el indicador de guardado, no se debe reconstruir el documento compartido.

El servidor puede ocultar las diferencias de formato detrás de un complemento de codec: inicializar, validar una fusión, construir la proyección empresarial, importar y exportar, y revertir el historial. La sala genérica, los permisos y la ruta de almacenamiento no entienden una barra de herramientas ni un DOM de celda.

<a id="_3-messages-and-lifecycle"></a>
<a id="3-messages-and-lifecycle"></a>

## 3. Mensajes y ciclo de vida

Envoltura sugerida: protocolVersion 1, tipo, id, room (UUID de recurso) y epochId. La primera unión puede omitir epochId. Después de que el servidor lo devuelva, los escritos posteriores deben incluirlo. La identidad, sessionId, nombre y color son determinados por el servidor.

1. join envía el codec y schemaVersion soportados, la época conocida y el vector.
2. La respuesta de sincronización devuelve epochId, codec, schemaVersion, seq, checkpointSeq, rank, update y vector. Una hoja de cálculo también devuelve el valor inmutable de referencia vinculado a esa respuesta.
3. La vista queda lista solo después de verificar la línea base, completar Yjs y realizar la proyección. No muestre un documento vacío editable y luego lo reemplace.
4. La actualización incluye id, room, epochId y bytes de Yjs (en formato base64 según el canal JSON actual). Solo se envía el incremento del contenido local real.
5. ACK utiliza el mismo ID y epochId, así como la secuencia después de la confirmación, opcionalmente con metadatos modificados y de negocio. Se envía después de que la transacción se confirma.
6. Una actualización válida se difunde a otras sesiones que aún tienen permiso. La aplicación de una actualización remota no debe generar una escritura local.
7. La solicitud y la respuesta de sincronización solo cubren la diferencia. No son un ACK. No deben limpiar la cola no aceptada ni subir datos incondicionalmente después de cada intento de sincronización.
8. Salir y desconectar: aclara la selección de esta sesión. Los errores de autorización, época y esquema son distintos. No son todos retrasos de red comunes.

Una repetición del mismo escritura no aceptada mantiene los bytes originales y el identificador de mensaje. La fusión de Yjs es idempotente. Una entrega duplicada no aumenta la secuencia, las auditorías, las notificaciones o el historial. Doca elimina duplicados con editor y recibos de Markdown clasificados por resourceId, epochId y messageId. Se rechaza el mismo identificador con un payload diferente.

<a id="_4-save-state"></a>
<a id="4-save-state"></a>

## 4. Guardar estado

El estado de conexión se mueve entre cargando, sincronizando, listo y, en caso de fallo, desconectado o error. El estado de guardado es separado: limpio, sucio, guardando, error.

- Solo una transacción de contenido local entra en el “outbox”. La inicialización, la selección, el desplazamiento, el enfoque, el tamaño, el número de usuarios en línea, el “heartbeat”, el reproductor remoto y el interruptor de lectura única no generan una actualización de contenido.
- “Guardar en la nube” requiere que el archivo de salida esté vacío y que la sincronización esté completada. “Guardar” requiere una escritura que espera confirmación.
- La cola se envía de forma serial. Solo un ACK que coincida con el ID de cabecera puede eliminar el elemento de la cola. Un ACK desconocido, tardío o duplicado no debe eliminar los elementos de entrada posteriores.
- La desconexión mantiene los bytes y el ID. La reconexión se conecta desde el remoto, y luego intenta volver a los incrementos que no han sido reconocidos.
- Un evento offline del cliente retira inmediatamente la conexión en tiempo real y suspende las intentos de conexión. El evento online se reconecta y ejecuta el proceso habitual de unión del documento.
- La notificación offline aparece en una réplica editable cuando el navegador está desconectado o la conexión de colaboración falla. La conexión online inicial y la sincronización del documento mantienen la notificación oculta. Después de una desconexión, la notificación se elimina cuando el documento termina de sincronizarse.
- No trate `encodeStateAsUpdate(doc, vector).length` Tan sucio. El mismo estado aún puede devolver un conjunto de eliminación histórico. Una longitud mayor que 2 no es una escritura nueva.
- Una desincronización de épocas detiene la cola antigua. Se permite exportar o una copia de recuperación separada. Los incrementos antiguos no se aplican al documento nuevo.
- Los adaptadores de host actuales mantienen los puntos de control originales y los IDs de mensajes pendientes. `offline-replica.ts`La edición sin conexión requiere una réplica autorizada y un almacenamiento local exitoso. El paquete para escritorio y la interfaz web descargada pueden iniciarse a partir de la lista de documentos local.

Ambos anfitriones usan `apps/web/src/features/documents/update-outbox.ts`La cola no depende del tipo de documento. Mantiene el incremento real de la transacción local. Una respuesta de sincronización no activa una carga incondicional.

<a id="_5-suggested-component-api"></a>
<a id="5-suggested-component-api"></a>

## 5. API de componentes sugerido

Cada componente proporciona funciones como connect, setReadOnly, dispose, onSelectionChange, renderRemoteSelections, clearRemoteSelections y onError, con códigos de error distintos. El texto enriquecido también ofrece estado de formato: marcas, tipo de bloque, alineación, canUndo y canRedo. Las barras de herramientas fijas y flotantes comparten ese estado. No adivine el formato a partir del DOM.

Los orígenes de las transacciones son locales, remotos y bootstrap. Solo las locales son escritas por el usuario. No vuelva a envolver comandos al aplicar una transacción remota y genere un nuevo ID de operación.

<a id="_6-live-selections"></a>
<a id="6-live-selections"></a>

## 6. Selecciones en vivo

La unión de selección es texto (ancla y enfoque relativo), celdas (sheetId, rango de fila y columna cerradas desde cero, y edición), o null.

El ID de sesión es por conexión. El conteo en línea elimina duplicados del ID de usuario. El dibujo excluye la sesión actual e incluye otras páginas del mismo cuenta. Editar como verdadero significa que el usuario está escribiendo. Una selección que no está escribiendo es falso. Los cambios en la hoja y el inicio o final de la edición envían un evento. Los valores de celda, fórmulas y teclas no se envían. La publicación se limita a 100–150 ms y se elimina duplicados. No escribe en la base de datos, no actualiza una versión ni afecta a los deshace. Ambos modos de edición publican la selección de esta sesión. La edición sin distracciones oculta los cursores y selecciones de otras sesiones en la vista del documento actual. Salir del editor, salir del documento, desconectarse y revocación limpian la selección. El servidor verifica las ACL en cada mensaje. Cambiar pestañas del navegador mantiene la posición de edición final de una sesión que sigue en línea. Las hojas de cálculo dibujan solo un borde coloreado y una etiqueta de nombre en la hoja actual. Las coordenadas numéricas son de presencia temporal y pueden estar temporalmente inestables mientras se insertan filas y columnas. Un ancla de comentario de vida larga utiliza IDs estables de fila y columna.

El editor de hoja de cálculo publica, recibe y muestra su presencia a través de su estado de selección y la API en tiempo real. Si esa capacidad se traslada a un paquete separado de hoja de cálculo, mantenga esta unión de selecciones y su ciclo de vida. El host no debe depender de los detalles de la faceta para siempre.

<a id="_7-snapshots-rollback-and-region-comments"></a>
<a id="7-snapshots-rollback-and-region-comments"></a>

## 7. Capturas de pantalla, rollback y comentarios de región

Un punto de control Yjs almacena la codificación CRDT original. No reconstruir desde una proyección JSON y eliminar la identidad. Una hoja de cálculo almacena una línea base inmutable más comandos en la misma época. No tomar la última hoja de trabajo guardada como línea base y reproducir nuevamente los comandos antiguos en ella.

Un punto de control periódico mantiene la época. La historia del usuario se crea en puntos significativos. Un registro de historia almacena su propio formato, codec, época, línea base y dependencias de activos. No interpretar una versión antigua con la línea base actual. El rollback prefiere un cambio nuevo en la época actual y mantiene la historia anterior al rollback. Si un componente solo puede reconstruirse, debe cambiar explícitamente de época, gestionar escrituras no reconocidas y luego cargar la nueva línea de historia.

Los registros clave toman snapshots de escrituras exitosas de manera independiente de la membresía. Los snapshots automáticos, manuales, de IA y de pre-rollback comparten persistencia y el límite de transacción. Una escritura fallida se deshace. La política de retención del host acordada explícitamente mantiene los 20 últimos snapshots completos en la base de datos y, para cada grupo completo de diez snapshots antiguos, conserva el más reciente como un punto de recuperación respaldado por archivo privado. Solo una carga útil inmutable verificada permite registrar atomicamente su índice y eliminar ese grupo de la base de datos; los otros nueve son deliberadamente eliminados. Los grupos incompletos y los fallos de almacenamiento conservan los originales de la base de datos. El usuario recibe una lista de snapshots paginada normal con IDs inmutables y sin campos de ubicación de almacenamiento. Los bytes de snapshot, los metadatos de recuperación y los archivos adjuntos permanecen inmutables; los checkpoints en tiempo real y los incrementos de colaboración no son muestrados. Una política empresarial no puede añadir eliminaciones implícitas fuera de esta política de retención acordada. Las capacidades existentes de deshacerse de escrituras permanecen específicas del formato. Ver [operaciones de almacenamiento](storage.es.md#history-storage-and-offline-upgrade).

Comentarios, cuerpo, respuestas y resoluciones se almacenan en la base de datos de la plataforma. El componente proporciona funciones como captureAnchor, resolveAnchor, renderAnchors y onAnchorClick. El texto enriquecido utiliza una posición de texto relativa. Una hoja de cálculo debe utilizar un rango de filas y columnas estable que se transforme con inserciones y eliminaciones. Un ancla completamente eliminada o resuelta no se resalta.

El paquete y el host actual de hoja de cálculo implementan comentarios de región con identidades estables de fila/cuadro, capturan/resuelven/revelan APIs, renderizado de marcadores, validación de epoch y manejo de objetivos eliminados. La inserción de filas/cuadros, ordenación y cambios en hojas son cubiertos por pruebas aisladas. `tests/editor-sessions.test.ts`, `tests/sheet-axis-sizes.test.ts` y `tests/sheet-collection.test.ts`Este protocolo permanente está separado de la presencia temporal de las células.

<a id="_8-shared-acceptance"></a>
<a id="8-shared-acceptance"></a>

## 8. Aceptación compartida

1. Abrir los datos existentes, esperar 60 segundos, seleccionar, desplazar y ajustar el tamaño. Ningún contenido nuevo se commite ni se registra en la historia.
2. A edita, B recibe, B no hace eco de un commit, y las proyecciones coinciden.
3. Dos páginas de un mismo cuenta tienen colores y nombres diferentes. Las selecciones de texto y el estado de edición de celdas son precisos. Readonly no publica ni muestra nada.
4. ACKs perdidos, duplicados y retrasados, además de la escritura durante la reconexión; no se pierden datos y no se muestran los datos guardados previamente.
5. La sincronización repetida después de una eliminación pura no vuelve a subir el conjunto de eliminaciones.
6. Se rechaza una base de datos, una época o un esquema que no coincida. La inicialización repetida no crea contenido nuevo.
7. La inserción y eliminación de filas y columnas en la hoja de cálculo, la edición de celdas, las fórmulas, la fusión, el ordenamiento y filtrado, y el deshacer se aceptan uno por uno. Una operación no soportada se declara o deshabilita. No pretenda que todo converge.
8. Después del reinicio, los incrementos de punto de control coinciden con la proyección en línea, incluso después de la compresión de registros.
9. La revocación, la desactivación, el acceso anónimo, una habitación extranjera, una identidad falsificada y una selección fuera del rango se aislan durante la edición.
10. Las barras de herramientas fijas y flotantes coinciden en el formato. Una actualización del estado de guardado no reconstruye la editora ni pierde el enfoque.

<a id="_9-what-is-implemented"></a>
<a id="9-what-is-implemented"></a>

## 9. ¿Qué se implementa?

El host actual integra texto enriquecido, Markdown, hojas de cálculo, lienzo y diapositivas con una cola de commit compartida y confiable y ACKs duraderos. La sincronización ociosa no refleja el contenido; las selecciones y nombres utilizan adaptadores de formato. Los cinco formatos permiten leer el historial; la restauración por parte del administrador solo está soportada para texto enriquecido y Markdown. Las vistas previas de hojas de cálculo, lienzo y presentaciones informan `canRestore:false`Esto no establece una API unificada de rollback de componentes para cada formato.

La plataforma implementa verificaciones de época y protocolos, recibos de commit y metadatos para la recuperación de historial. Sin Redis, la difusión y la presencia son un solo proceso. Con Redis, las actualizaciones de documentos, la actualización de servidores, la anulación de permisos, las notificaciones y la presencia se distribuyen entre las instancias. El commit en la base de datos sigue siendo el límite de ACK y la fuente de la verdad del documento. Después de que Redis se reconecta, el servidor envía nuevamente el estado autoritativo a las salas activas de esta instancia. Pub/Sub no es un registro duradero, y un fallo de Redis no se recupera silenciosamente al bus local.

Las API de selección formal y el retorno unificado entre diferentes formatos siguen siendo un trabajo compartido entre el componente y la plataforma. El host es responsable del inicio de los documentos sin conexión y de su cola persistente. Las capacidades del componente aún requieren verificación de las exportaciones del paquete instalado.

Listas de documentos autorizados en modo offline para el hogar **Editaciones recientes**. Un documento se añade al directorio después de abrirlo en el nuevo cliente cuando su réplica local correspondiente esté disponible. El escritorio muestra su frontend incluido. El espacio de trabajo web almacena automáticamente los recursos de compilación de mismo origen después de iniciar sesión. Una réplica editable muestra un mensaje de edición sin conexión cuando el cliente detecta una pérdida de conexión. La reconexión verifica el acceso y la línea de descendencia antes de enviar los cambios en cola a través de la ruta duradera de ACK existente. Un documento cerrado reanuda la sincronización al volver a abrirse. Ver [documentos fuera de línea y recuperación](access-offline-events.md#离线文档入口).

<a id="plugin-elements-increment--2026-10-02"></a>

## Elementos del complemento aumentan — 2026-10-02

El anfitrión ahora implementa el registro de elementos web opcional SDK 0.1.6. El texto enriquecido almacena un envoltorio JSON opaco a través de un recurso permanente. `custom:plugin-element` Código de compresión en línea que utiliza el esquema rico existente 3. La hoja de cálculo almacena JSON opaco en formato nativo `ICellData.custom.docaElement` Usar el esquema existente 6 y la ruta de comando de rango público. No se realizan cambios en el transporte, la versión del protocolo, la época, la identidad del punto de control, los recibos de ACK ni la salida confiable. No hay segunda autosave en JSON ni base de datos de contenido propiedad de la empresa.

Los tipos desconocidos y las versiones exactas de hoja de cálculo muestran un marcador de posición no soportado y conservan su JSON original con límites definidos. No se proporciona ningún adaptador, migración, conversión ni eliminación. Los lectores de referencia internos existentes permanecen sin cambios. La inserción, configuración y eliminación nativa participan en el portapapeles, el deshacer y la colaboración. Las formas de configuración vuelven a verificar un rango enriquecido en tiempo real o un ancla de celda única en hoja de cálculo estable, y fallan en un objetivo eliminado o cambiado simultáneamente. Los temporizadores de lienzo son solo de visualización, máximo una vez por segundo y programados solo después de que una celda con tiempo visible se dibuje; las páginas ocultas se detienen. Los cambios de renderizado, selección o inactividad no deben aumentar la secuencia de contenido ni la historia.

La aceptación automatizada aislada cubre la persistencia nativa y el recarga, los payloads desconocidos y opacos, el borrado/deshacer/pegar del átomo, la inserción de filas de hoja/anclaje/copiar/borrar/deshacer, la reproducción de ACK duplicados, la convergencia de dos réplicas sin eco remoto, la denegación de lectura única y el rollback de payloads de tamaño excesivo. Las pruebas no editan documentos de usuario. Este incremento no afirma soporte universal para bloques, todas las operaciones de hoja de cálculo, exportación sin pérdida de formato, colas offline permanentes o aceptación con dispositivo nativo. Los campos y límites precisos de los elementos se encuentran en la fuente del repositorio. `docs/plugin-editor-elements.md`.

<a id="markdown-bootstrap-correction--2026-10-03"></a>

## Corrección de Bootstrap Markdown — 2026-10-03

El host restaura el punto de control autoritativo en una réplica vacía antes de llamar a la fábrica de sesión Markdown enviada. Ya no imprime metadatos locales en una réplica de carga: los relojes CRDT no enviados causaron que la primera actualización de texto dependiera de elementos ausentes en el servidor. Las instantáneas de estado de la sesión conservan los mismos objetos doc/text/awareness/undo. No hay cambios en adaptadores de esquema, epoch o formato persistente; las ediciones pendientes existentes se conservan y no se convierten ni eliminan silenciosamente. La aceptación de regresión incluye la restauración duradera de la primera edición, sin eco de remote/bootstrap y manejo de estado estable; la verificación del navegador abarca la escritura, las actualizaciones entre instancias, el recarga y las comprobaciones de inactividad en documentos aislados.

<a id="rich-text-diagram-anchors--2026-10-10"></a>

## Anclas de diagramas de texto rico — 2026-10-10

Con lo instalado `@smartdoca/slate` 0.4.13: El host captura los diagramas de flujo y mapas mentales nativos utilizando el ancla de bloque completo existente.`kind:"block"`, estable `blockId`, y el actual `epochId`). Las cifras del servidor provienen de etiquetas de nodo autorizadas o del tema raíz. Los comentarios y referencias de IA se dirigen al diagrama completo, permanecen válidos después de ediciones de estilo nativo y restauraciones de punto de control, y dejan de resolverse después de la eliminación de bloque. Los IDs de nodo/borde del diagrama no son anclas permanentes de comentarios de sub-diagrama. La captura, selección, resaltados y referencias de IA son de solo lectura con respecto al contenido del documento; utilizan la salida actual y el transporte sin cambios en el esquema o la línea de historia. No se introduce ninguna conversión de documento almacenado o comentario histórico.

<a id="published-spreadsheet-package-integration--2026-10-10"></a>

## Integración del paquete de hojas de cálculo publicado — 2026-10-10

El host 0.1.18 bloquea el artefacto del registro `@smartdoca/sheet` 0.2.0-rc.19. La acción de la barra de herramientas de validación de datos es distinta de Insert → Lista desplegable. Las declaraciones públicas y los puntos de entrada Yjs/model/XLSX son byte-idénticos a rc.18; el host continúa utilizando las extensiones de menú, recursos, anclas estables y las API de colaboración incluidas. El host sincroniza lo incluido `session.setReadOnly` API y actualiza el snapshot de capacidades antes de pintar después de cambiar el modo, sin reconstruir el libro de trabajo o Y.Doc. La inserción de elemento-plugin ahora utiliza `SPREADSHEET_MENU_PATHS.toolbarEnd` A través de las extensiones de menú nativas. Se trata de una integración de UI/paquete sin codec, esquema, epoch, outbox, conversión de datos persistentes o nuevos comportamientos de compatibilidad. Los lectores de historial existentes y los comandos de mantenimiento de línea base del host son inmutables. Las regresiones de paquete y host utilizan hojas de trabajo o documentos aislados; el éxito de la construcción por sí solo no establece la aceptación de todas las operaciones de hoja de cálculo.

<a id="cached-document-startup--2026-10-12"></a>

## Inicio del documento en caché — 2026-10-12

El cambio de host aprobado por el usuario añade metadatos de visualización de versión exacta-1. `doca.document-startup.v1` Para la cuenta de inicio de sesión actual y sus doce documentos más recientemente almacenados en caché. Contiene campos de inicio de sesión públicos, metadatos de documentos y metadatos de la biblioteca contenida, sin credenciales, comentarios, subvenciones o una segunda proyección de contenido. No modifica ni convierte los puntos de control Yjs existentes, las líneas base inmutables, las épocas, los protocolos de esquema/codificador, los IDs de mensaje ni los ACKs duraderos. Los hosts antiguos no tienen metadatos de inicio de sesión: se necesita un host activo para crearlos. Los formatos de inicio de sesión desconocidos o corruptos no se utilizan, convierten ni sobrescriben; el rollback deja intacto el contenido y el trabajo pendiente.

Una actualización en caché monta el shell y restaura la réplica original antes de que finalicen las solicitudes de descubrimiento de complementos, inicio de sesión o detalles. El usuario eligió explícitamente permitir la edición sin conexión según los permisos conocidos anteriormente. La validación en tiempo real y los intentos de reconexión se realizan en segundo plano; una falla transitoria de red preserva el mismo editor. La reconexión fusiona los cambios remotos y vuelve a intentar los bytes/IDs originales pendientes, y solo los ACKs del servidor correspondientes los eliminan. El cierre de sesión/cambios de cuenta y la negación explícita de sesión/recursos ocultan los metadatos de visualización relevantes sin eliminar el contenido duradero o las ediciones pendientes. Las líneas de historia no coincidentes siguen detenidas bajo los controles exactos del protocolo existente.

Esto requiere metadatos en caché, almacenamiento exitoso por parte del navegador y recursos estáticos disponibles de la aplicación; no se trata de un inicio completo sin conexión de PWA. Comentarios, subidas de archivos y cambios de permisos siguen siendo acciones en línea. Los parámetros predeterminados de la réplica existente del host y los lectores históricos no cambian, sin un nuevo adaptador de formato antiguo. La aceptación aislada se registra por `tests/document-startup-cache.test.ts` y `scripts/qa-document-startup.mts`El restauro básico de la caché no establece la convergencia de todas las operaciones en cada formato. Véase [el límite de almacenamiento y recuperación](access-offline-events.md#页面缓存先展示--2026-10-12).

<a id="published-slate-and-canvas-integration--2026-10-13"></a>

## Publicado: Integración con Slate y Lienzo — 2026-10-13

El host 0.1.23 bloquea los artefactos del registro. `@smartdoca/slate` 0.4.14 y `@smartdoca/canvas` 0.4.3. El códec Slate/Yjs/headless y los bytes de punto de control público permanecen sin cambios; el modelo Canvas/IO y los mapas de punto de control público también permanecen sin cambios. La parchea DOCX está vinculada al nuevo artefacto Slate. Las sesiones estables del host, los callbacks de recursos, las permisiones, la presencia, los anclajes, los puntos de control originales, las épocas y los IDs de actualización pendientes mantienen su propiedad existente. El paquete regenera las vistas previas de diagrama estancadas en el estado de vista sin escrituras de contenido.

El usuario eligió explícitamente no hacer ninguna promesa de compatibilidad con los diagramas de flujo antiguos. No se introducen adaptadores de nodos antiguos, conversiones automáticas, relleno de campos históricos ni eliminación de datos. Formas nuevas, geometría de flechas rellenas, manual… `routeMode`/`vertices` Y los anclajes de punto final utilizan el modelo nativo desplegado; la validación y orientación de IA aceptan/reservan esos campos. Un editor anterior puede no renderizar los nuevos campos correctamente. Se conservan los despliegues anteriores y la copia de seguridad previa a la actualización; el rollback de la base de datos de alojamiento se realiza por separado, siguiendo el procedimiento aprobado de almacenamiento del libro de conocimientos. Los lectores históricos existentes y los ayudantes de normalización permanecen en sus rutas establecidas y no son rediseñados por esta actualización del paquete.

Las regresiones del host aislado abarcan la validación de campo nativo, ACK duradero/duplicado, reproducción remota sin eco, deshacer/rehacer, restauración de punto de control, registro del singleton del motor de lienzo y los viajes de ida y vuelta de DOCX. La verificación del navegador y las comprobaciones de lanzamiento final se registran en el archivo de verificación 0.1.23; las pruebas del modelo no establecen cada gesto de diagrama nuevo ni cada operación de lienzo.

Lienzo 0.4.3 también contiene una regla de vista aprobada por el usuario: las alturas de líneas de texto numéricas desde 0.8 hasta 3 se muestran como multiplicadores de tamaño de fuente; otros valores numéricos permanecen en píxeles. Carga, selección, ajuste de tamaño y estado inactivo no reescriben el modelo. La edición de texto normal conserva el campo numérico original; una edición explícita de altura de línea almacena el valor porcentual nativo. No se añaden migraciones de host, relleno ni eliminación de datos almacenados. La aceptación del navegador verifica que 1.5 en 32 px sea considerado como 48 px, los bytes numéricos originales después de las ediciones de texto, sin escrituras en estado inactivo, convergencia entre pares y recarga. La renderización anterior de la interfaz no está garantizada en el rollback.

<a id="slate-and-spreadsheet-package-upgrade--2026-10-14"></a>

## Actualización del paquete Slate y hoja de cálculo — 2026-10-14

El proceso de pago actual bloquea los artefactos del registro real. `@smartdoca/slate` 0.4.15 y `@smartdoca/sheet` 0.2.1. Los mapas de punto de entrada público y las dependencias no cambian. Los bytes del códec Slate/Yjs/headless/conversion no cambian; la actualización de estilo DOCX está vinculada a 0.4.15. La validación del nodo de IA acepta números finitos. `angle` Los valores en grados y el manual de edición conservan este campo. La interacción con la imagen nativa selecciona al hacer clic primero y muestra un vistazo al siguiente; hacer clic en otro lugar restablece la selección.

El usuario aprobó explícitamente la altura de fila por defecto de 18 px y el ancho de columna por defecto de 72 px para las hojas de trabajo con CRDT, incluyendo aquellas creadas antes de esta actualización, así como las hojas de trabajo de recuperación virtual vacías. Las hojas de trabajo de línea base inmutables conservan sus campos de tamaño originales, incluyendo la omisión; los tamaños explícitos por eje permanecen como sobrerreglas nativas. Las hojas de trabajo del host recién creadas utilizan los mismos dimensiones de 18/72. Esta es una decisión de proyección/visualización por defecto: las semillas existentes, líneas base, puntos de control, épocas, comentarios y IDs de actualización pendientes no se reescriben, convierten ni eliminan. El esquema 6 y la rechazo exacta del protocolo permanecen sin cambios. La recuperación virtual de última hoja existente, los lectores de historia y los ayudantes de normalización siguen en sus rutas establecidas y no se rediseñan.

El usuario mantiene la ausencia previamente acordada de la promesa de compatibilidad con los diagramas de flujo antiguos. No se añaden adaptadores de nodos antiguos ni relleno de campos. La nueva rotación utiliza el modelo nativo que se entrega; el editor anterior puede ignorar los ángulos, y las hojas de cálculo anteriores pueden mostrar valores por defecto diferentes. Se mantienen los artefactos del registro anterior, los pin de dependencias, los parches y los archivos de bloqueo para el rollback del paquete, y se actualizan el servidor y la Web al mismo tiempo. El rollback de la base de datos de host sigue estando sujeto a sus procedimientos de almacenamiento aprobados por separado.

La verificación utiliza un elemento inmutable generado por el paquete real rc.19, bases de datos de host aisladas y documentos de navegador. Cubre la preservación de los bytes originales, dimensiones aprobadas, validación de rotación/ACK/replay/undo/restore, anclas estables, protecciones de solo lectura, viajes de archivo de ida y vuelta y estado de inactividad/selección sin escrituras. Los resultados de la auditoría y verificación del paquete se registran en `docs/verification/editor-package-upgrade-2026-10-14/report.json`; el registro de actualización de la fuente es [la nota de lanzamiento pendiente](releases/pending-editor-package-upgrade.md)Esto no establece todos los gestos de diagrama, todas las operaciones de hoja de cálculo o la aceptación por parte del dispositivo nativo.

<a id="spreadsheet-hyperlink-patch--2026-10-15"></a>

## Parche de hipervínculo para hoja de cálculo — 2026-10-15

Host 0.1.25 pintea el artefacto real del registro. `@smartdoca/sheet` 0.2.2. En relación con 0.2.1, los puntos de entrada públicos, los contratos y declaraciones de dependencias no cambian; el JavaScript de ejecución de Yjs/model/XLSX es byte-identicamente igual (algunos mapas de fuente difieren). Los diálogos de hipervínculo ahora cancelan y restauran correctamente el borrador nativo, y los comandos nativos de desvínculo pasan por la capacidad de enlace en línea existente y la protección de lectura únicamente. El host continúa utilizando su editor/sesión estable, los callbacks de recursos, las mutaciones nativas y el outbox duradero. Esta parcheta no modifica el codificación del esquema 6, la línea base imutable, el epoch, el punto de control o la identidad de actualización pendiente, ni introduce ninguna conversión de datos o adaptador de compatibilidad. Se mantiene el pin y el archivo de bloqueo del paquete anterior para el rollback. Las auditorías y las verificaciones aisladas se registran. `docs/verification/sheet-package-upgrade-2026-10-15/`.

<a id="native-editor-upgrade--2026-10-16"></a>

## Actualización del editor nativo — 2026-10-16

Host 0.1.27 pintea los artefactos reales de npm. `@smartdoca/slate` 0.4.18 y `@smartdoca/sheet` 0.2.3. Los puntos de entrada y los contratos de dependencia no han cambiado. Los bytes del códec Slate/Yjs/headless/conversion coinciden con 0.4.15; la versión inalterada del DOCX está vinculada a 0.4.18. El host acepta los formas adicionales de diagrama nativas, los estilos de nodo y borde, y las opcionalidades. `canvasSettings`; Las órdenes de la IA validan y preservan estos campos. La edición gráfica nativa incluye el nuevo espacio de trabajo, la expansión automática del papel, el guardado con Ctrl/Cmd+S para borradores enfocados y una barra de herramientas de selección flotante corregida.

El usuario aprobó explícitamente los valores predeterminados nativos de 19.8/79.2 para hojas de cálculo y el comportamiento de los gráficos. Los documentos nuevos del host, las hojas de cálculo con CRDT-appended (incluyendo las hojas de cálculo históricas con appended) y las hojas de recuperación virtual utilizan filas de 19.8 píxeles y columnas de 79.2 píxeles. Los campos de referencia inmutables originales, incluidos los valores predeterminados omitidos, permanecen sin cambios; las dimensiones explícitas por eje se mantienen. No se convierte ningún valor de referencia, semilla, punto de control, época, secuencia, identidad de mensaje pendiente ni datos de celda. Los campos de diagrama existentes permanecen intactos al abrirlos; los valores predeterminados nativos para las configuraciones ausentes del lienzo afectan la vista, y solo una guardia explícita de gráfico escribe los campos/configuraciones nativas de gráfico. La regeneración de vista previa es solo para visualización. El esquema de texto rico 3, el esquema de hoja de cálculo 6 y las semánticas duraderas ACK/outbox permanecen sin cambios. Los lectores e normalizadores históricos existentes se conservan sin rediseño.

Mantenga las dependencias originales, el archivo de bloqueo, el parche y el despliegue para el rollback. Los editores anteriores pueden mostrar dimensiones y estilos por defecto diferentes o ignorar los campos recién guardados; no se introduce ninguna garantía de compatibilidad con el historial de flujo. Preserve todas las escrituras nuevas al recuperar; restaurar los backups antiguos descartaría las ediciones posteriores. Una verificación aislada, incluyendo una base de datos realmente lanzada 0.1.26, está registrada. `docs/verification/editor-package-upgrade-2026-10-16/`.

<a id="mind-map-workspace-upgrade--2026-10-16"></a>

## Mapa mental sobre actualización del espacio de trabajo — 2026-10-16

Host 0.1.29 pinea el artefacto real de npm. `@smartdoca/slate` 0.4.20, incluyendo las correcciones de interacción entre diagramas y medios de 0.4.19. Los puntos de entrada públicos, las dependencias y las declaraciones de componentes/controladores del host no cambian. Los bytes del códec, Yjs, el modo sin servidor y el runtime de conversión son los mismos que en 0.4.18; la actualización DOCX idéntica está vinculada a 0.4.20. La guía de IA conserva la completa hoja de ruta mental nativa, incluyendo `structure`, `theme`, `background`, nodo `fontSize`/`bold` y `style:"underline"`.

El usuario aprobó explícitamente los nuevos valores predeterminados de visualización del mapa mental nativo para los documentos existentes. Abrir un mapa antiguo o regenerar su vista previa de versión 6 solo modifica el estado de la vista; no reescribe los nodos originales, los puntos de control, las épocas ni las identidades de actualizaciones pendientes. Abrir y cerrar el espacio de trabajo sin guardar no produce ninguna comisión de contenido. La guardia explícita comite el borrador nativo y la vista previa derivada a través de la salida existente Slate/Yjs y el ACK duradero. No se introduce ninguna migración, relleno de campos ni adaptador de estilo antiguo. Los lectores históricos existentes y los ayudantes de normalización permanecen en sus rutas establecidas sin rediseño. El esquema 3 y los controles de protocolo exactos permanecen sin cambios; no hay cambios en SQL.

Mantenga el despliegue 0.1.28, el artefacto de paquete original, el pin de dependencia, el parche y el archivo de bloqueo para el rollback. Los editores anteriores pueden ignorar los nuevos estilos/configuraciones o mostrar valores por defecto diferentes. Preserve las escrituras posteriores al recuperar; restaurar un disco de respaldo antes de la actualización descarta las ediciones posteriores. Las pruebas utilizan documentos/sistemas de datos sintéticos aislados; la verificación y los límites se registran en `docs/verification/slate-workspace-upgrade-2026-10-16/`.

<a id="three-editor-upgrade--2026-10-17"></a>

## Tres actualizaciones del editor — 2026-10-17

Doca ahora fija los artefactos reales del registro. `@smartdoca/slate` 0.4.22 y `@smartdoca/slides` 0.3.0-alpha.3. Lienzo utiliza lo inmutable `vendor/smartdoca-canvas-0.5.0-75e637df1a75.tgz`: El árbol de compilación de la biblioteca 0.5.0 del registro hizo temblar los módulos de registro del editor interno de Slate/texto simple. Las marcas de reparación del código fuente de AidCanvas consideran ambos módulos como efectos colaterales; el host consume el artefacto reconstruido. Este artefacto y la reparación del código fuente no han sido publicados en npm.

Slate añade cinco páginas de presets de color de elementos y selecciona el etiquetado completo del diagrama cuando comienza la edición. Los bytes Codec/Yjs/headless coinciden con 0.4.20. La versión de patch DOCX sin cambios se rebaja a 0.4.22. Canvas permanece `aidcanvas-yjs` Esquema 1. Los callbacks de imagen y archivo almacenan IDs estables de activos, transmiten el progreso real y la cancelación, y abren vistas previas autorizadas propiedad del host, incluyendo superficies de historial, basura y auditoría de solo lectura. El servidor valida las nuevas referencias de medios en línea contra los activos del documento actual. La presencia transitoria del lienzo transmite posiciones de texto relativo validadas y punteros de coordenadas de escena con identidad/color propiedad del servidor; soporta mensajes únicamente con punteros y nunca reutiliza anclajes permanentes de comentarios.

Los diapositivas requieren una revisión del códec 6. Tanto el cliente como el servidor ahora negocian. `eppt-yjs-v6` con esquema de documento 2/protocolo 1. El usuario seleccionó explícitamente **Solo documentos nuevos**: existente `eppt-yjs-v5` Los documentos y clientes antiguos son rechazados, manteniendo intactos los puntos de control originales, los registros de actualización, las épocas, la historia y las identidades de mensajes pendientes. No se introduce ningún lector de códec antiguo, reetiquetado de metadatos, conversión automática, migración ni cambio en la estructura de SQL. El host acepta el texto inserido nativo actual y los campos de la tabla, y los comandos de tabla de IA exponen merge/split, estilos, ajuste de tamaño, borrado, pegar y eliminación de ejes de lote a través del controlador nativo. Las celdas de la tabla conservan texto plano con formato de célula completa.

Actualizar el servidor y la Web al mismo tiempo. Mantener la implementación anterior, los pin de paquetes, el parche, el archivo de bloqueo y el artefacto. Volver al código antiguo no puede garantizar la legibilidad de los nuevos escritos; preservar los datos posteriores antes de la recuperación. No se modificó la base de datos de usuarios y no se realizó ninguna implementación. La aceptación aislada, los hashes, las capturas de pantalla y los límites se registran. `docs/verification/three-editor-upgrade-2026-10-17/`.

<a id="canvas-052-registry-integration--2026-10-17"></a>

## Integración del registro de Canvas 0.5.2 — 2026-10-17

Doca 0.1.31 pintea lo publicado `@smartdoca/canvas` Artefacto del registro 0.5.2. Esto sustituye al archivo tarball temporal 0.5.0 anterior, que se elimina del camino de dependencias/compilación del tiempo de ejecución y se conserva en la instantánea de código fuente anterior para recuperación. Las exportaciones públicas, las dependencias y las firmas de declaración coinciden con ese artefacto; la única diferencia en la declaración es un comentario sobre el diseño de tabla. El tiempo de ejecución del modelo es byte-idéntico. No se introducen ninguna conversión de lector histórico, ningún relleno de campos, ningún cambio en el códec/schema ni ninguna sustitución de punto de control/outbox.

El paquete corrige la composición en chino consecutiva, el seguimiento de la barra de herramientas durante el movimiento de panorámica/zoom, y el crecimiento de filas de tabla basado en el contenido. La geometría de las filas y los cambios de texto utilizan la misma transacción de deshacer colaborativa nativa. El host continúa con su modelo estable, los callbacks de recursos/presencia autenticados y la cola de ACK duradera. La verificación de fuente, navegador, imagen y publicación se registra `docs/verification/release-0.1.31/`Las pruebas del versión 0.5.0 anterior siguen siendo pruebas, y no evidencia, de cada operación de la versión 0.5.2.

<a id="canvas-inline-integration-and-slate-upgrade--2026-10-18"></a>

## Integración en línea de Canvas y actualización de Slate — 2026-10-18

Doca 0.1.32 instala el Slate 0.4.23 publicado y el artefacto del registro publicado. `@smartdoca/canvas` 0.5.4, que incluye Canvas 0.5.3. Las declaraciones públicas de Slate, los bytes del codec/Yjs/headless/conversion coinciden con 0.4.22; el parche IDOCX idéntico se vuelve a aplicar. El propietario aprobó los ajustes actuales de visualización de mapas de mente Leafer para las mapas existentes. Abrir/cerrar y la regeneración de vista previa permanecen solo para visualización; el guardado explícito utiliza el árbol nativo.

Lienzo `richTextExtensions` Ahora es compatible `inline:true`, opcional `suggestions:{trigger,search(query,{signal})}` y `matchPaste`/`paste(text,{signal})`Los nodos en línea almacenan `{type:'inline',inline:{id,type,label,data},children:[{text:''}]}` En el esquema-1, se utilizan párrafos ricos y un marcador U+FFFC en el texto nativo. El paquete incluye funciones de selección, rangos de inserción en tiempo real, debouncing, teclas de menú, clippers/eliminación/deshacer atómicos, renderizado de etiquetas/exportación y un JSON opaco desconocido. Doca proporciona verificaciones de directorios/ACL, tarjetas de usuario, UUIDs de referencia estables, búsqueda de títulos de documentos del mismo origen, notificaciones e índices de referencia. Las búsquedas/pastas pendientes, la interfaz de usuario y las URLs resueltas permanecen en estado de vista. Los objetos cerrados/eliminados/lectura única no pueden aceptar inserciones posteriores. El formato y los metadatos en línea conservan las semánticas completas de LWW existentes.

Las superficies activas y de lectura solamente/historial/deshecho/auditoría proporcionan datos estables `onAttachmentPreview` Llamadas a los espectadores autorizados compartidos; las imágenes se conservan `onResourcePreview`, y los URLs de descarga permanecen autorizados por el host. No se introduce ningún nuevo transporte, autosave, esquema/codificador, DDL, migración, backfill, adaptador histórico ni reescritura de epoch/punto de control/outbox. El propietario no aprobó ninguna garantía de renderizado para clientes antiguos para los nuevos metadatos en línea. Se preservan los datos existentes y posteriores, y se mantiene el despliegue 0.1.31, los pins, el parche y el archivo de bloqueo para la recuperación. La verificación se registra en `docs/verification/release-0.1.32/` y los pruebas del navegador nativo Canvas; no se utilizan documentos ni bases de datos de usuarios.


<a id="canvas-055-host-integration--2026-10-18"></a>

## Integración con host Canvas 0.5.5 — 2026-10-18

Doca 0.2.1 vincula el npm oficial `@smartdoca/canvas` 0.5.5. Esta versión elimina la acción de código de bloque del menú de párrafo enriquecido y los escenarios CSS inline/sugerencia bajo la raíz de canvas. Las exportaciones públicas, dependencias, declaraciones, modelo y codec permanecen sin cambios desde 0.5.4. El host continúa con los callbacks inline y de recursos existentes; esta integración no añade ningún adaptador, conversión de formato persistente, reescritura de historial ni nuevos comportamientos de compatibilidad. Los cambios en el título/emoji y la etiqueta de acceso son solo para la presentación del host. Los hashes de paquetes publicados y las verificaciones aisladas de navegador/imagen se registran. `docs/verification/release-0.2.1/`.

<a id="canvas-056-and-sheet-024-integration--2026-10-20"></a>

## Integración entre Canvas 0.5.6 y Sheet 0.2.4 — 2026-10-20

Los pines de pago actuales incrustan los artefactos oficiales de npm. `@smartdoca/canvas` 0.5.6 y `@smartdoca/sheet` 0.2.4. Las mapas de punto de entrada público y las declaraciones orientadas a host no han cambiado. Los bytes del modelo Canvas y los bytes del modelo Sheet/Yjs/XLSX coinciden con los artefactos anteriores. El modelo Canvas ha modificado las declaraciones de renderizado privado y las referencias del paquete de IO; el modelo Sheet añade explícitamente… `@univerjs/drawing-ui` y `@univerjs/sheets-filter` En la versión 0.25.1 ya en estado bloqueado. No se introducen importaciones de origen host ni un segundo canal de salvado.

El propietario aprobó explícitamente las reglas de la vista Canvas en la capa superior para los diagramas existentes: un nombre `frame`/`diagram-node` envoltorio con un `diagram-body`, sin un rol de tipo/contenedor explícamente contradictorio, se reconoce como un diagrama; su envoltura de relleno/borde duplicado y el generado `Frame` Las etiquetas se suprimen y la geometría del cuerpo/texto sigue al envoltorio. Los contenedores explícitos nativos y las rutas personalizadas sin nombre mantienen su función/borde. Los anclajes de extremo de la elipse/diamante existentes siguen el borde actual; los cuatro índices de puertos de punto medio originales permanecen estables mientras se añaden ocho nuevos puertos. Abrir, seleccionar, cambiar la vista y cerrar no deben reescribir el modelo/ponto de control original. Las operaciones explícitas de ajuste de tamaño/editar utilizan la pila de transacciones colaborativas y deshacer nativa. No se autoriza ninguna conversión en lotes, relleno de campos, DDL, adaptador de esquema/codificador, sustitución de epoch/ponto de control o restablecimiento de mensajes pendientes. El lienzo permanece `aidcanvas-yjs` Esquema 1; La hoja permanece `exlsx-cell-registers` Esquema 6, con rechazo exacto al esquema actual.

Las imágenes en lienzo seleccionan la primera y se muestran en vista previa al siguiente clic. La copia en el portapapeles PNG utiliza el dispositivo anfitrión. `resolveDownloadUrl` Autorización, incluyendo vistas de solo lectura; los adaptadores de vista previa de snapshot/trash conservan sus flags de acceso existentes, y el servidor continúa rechazando el acceso al recurso de auditoría no soportado. La hoja utiliza el renderizador de filtros nativo incluido y la geometría/preview de imagen en línea; el renderizado de imágenes no repara los datos del documento recibido. Los UUID de activos, las verificaciones de ACL, la presencia transitoria, los anclajes permanentes, los ACKs duraderos y las actualizaciones originales conservan su propiedad existente.

Los lectores históricos existentes, la recuperación de hoja virtual, los ayudantes de normalización y los valores predeterminados de visualización aprobados permanecen en sus rutas establecidas; fueron auditados, pero no se rediseñan ni se amplían aquí. Se mantienen los artefactos del registro Canvas 0.5.5 / Sheet 0.2.3, los pin de paquetes y los lockfile de la revisión de origen. `589a3589820770d218bea418fe7c93cd10583f95`Las identidades de los artefactos se registran. `docs/verification/editor-packages-2026-10-20/package-audit.json`. Actualizar el servidor y la Web al mismo tiempo. Preservar las escrituras posteriores antes del rollback; la interfaz de usuario anterior no se garantiza que renderice las interacciones del diagrama más reciente de manera idéntica. No se utiliza ninguna base de datos de usuarios ni documento para la verificación, y no se realiza ninguna implementación. Véase el [verificación de integración](verification/editor-packages-2026-10-20/README.md) Para casos y límites superados.

<a id="canvas-058-and-sheet-025-integration--2026-10-21"></a>

## Integración entre Canvas 0.5.8 y Sheet 0.2.5 — 2026-10-21

Doca pintea el npm oficial. `@smartdoca/canvas` 0.5.8 y `@smartdoca/sheet` 0.2.5 artefactos. En relación con Canvas 0.5.6 / Sheet 0.2.4, las declaraciones públicas, los mapas de punto de entrada y las dependencias no han cambiado. El modelo de Canvas y el modelo de Sheet/XLSX de bytes de ejecución no han cambiado. La sesión de Yjs de Sheet restaura los filtros nativos antes de calcular las actualizaciones combinadas de celdas/filtros y refresca los criterios sin cambios después de la recuperación o ordenación; esto modifica la proyección, pero no la codificación de schema-6 ni las líneas base inmutables.

Canvas incluye las mejoras de estilo de 0.5.7, wheel, mention y redo, controles de vista integrados, y la traducción del cuerpo nativo de unbound-connector de 0.5.8. Las opciones de cuadrícula/fondo permanecen en el estado de la vista. Los gestos de edición nativos utilizan el modelo existente, undo, host outbox y ACKs duraderos. Canvas sigue siendo `aidcanvas-yjs` Esquema 1; La hoja permanece `exlsx-cell-registers` Esquema 6. Se introducen un adaptador de API sin host, un nuevo comportamiento de compatibilidad, la conversión de datos almacenados, un valor por defecto para campos históricos, y la reescritura de DDL o de punto de control/mensajes pendientes. Los lectores históricos existentes, la recuperación de hojas de trabajo virtuales, las ayudas para normalización y las reglas de visualización previamente aprobadas permanecen en sus rutas establecidas sin rediseño.

La verificación utiliza documentos y bases de datos sintéticos aislados. Las identidades de los artefactos publicados, las comparaciones durante el ejecución, los controles y límites superados se registran en [la verificación de integración](verification/editor-packages-2026-10-21/README.md). Mantener los pines anteriores, el lockfile, la configuración del espacio de trabajo y los artefactos de la revisión de origen `31fca12f48a54f1c2ce3caeec6a0d976e164ac4e` Para el rollback del paquete; reconstruir el servidor y la Web juntos y preservar las escrituras posteriores. No se utiliza ningún documento de usuario, base de datos ni despliegue.

<a id="issue-tracker-integration-and-personal-canvas-preferences--2026-10-22"></a>

## Integración con el seguimiento de issues y preferencias personales de Canvas — 2026-10-22

El último nivel base oficial auditado de npm es Slate0.4.24, Markdown0.4.4, Sheet0.2.9, Canvas0.5.13 y Slides0.3.0-alpha.4; el checkout actual prueba temporalmente el candidato 0.5.14C1file descrito a continuación. Las auditorías comparan los archivos reales y los archivos instalados, no solo las API de fuente. Los códecs/schemas existentes, los niveles base inmutables, las épocas, los puntos de control, las actualizaciones de documentos pendientes originales y la propiedad duradera de ACK se conservan. El modelo/IO/preferences/declarations/exports de Canvas0.5.13 coinciden con 0.5.12; su declaración interna de ayuda para teclado no añade ninguna API pública de SDK. Sheet 0.2.9 incluye correcciones para la eliminación del portapapeles y la validación de desplegables, mientras que los bytes de ejecución del modelo/Yjs/XLSX siguen siendo idénticos a 0.2.7. Los callbacks de la galería resuelven el estado de vista autorizada sin comprometer los borradores del editor. Los lectores históricos aprobados existentes, las normalizaciones y las reglas de visualización no cambian; no se introduce ninguna conversión de datos antiguos, adaptador de esquema, migración ni DDL.

El usuario aprobó explícitamente las preferencias del navegador Canvas, relacionadas con el origen del sitio web, la cuenta y el documento. Los registros independientes de versión 1 se validan con los validadores puros publicados y pasan por los propiedades de visualización/creación controladas. Los registros ausentes mantienen el comportamiento existente; los registros desconocidos o mal formados se conservan y no se consumen ni se sobrescriben. La falla de almacenamiento solo conserva la elección explícita de vista actual. Las actualizaciones de preferencias, la navegación en el menú y el movimiento de la miniatura no afectan al deshacer del documento ni a la colaboración; los valores predeterminados de creación afectan solo a los elementos interactivos futuros, nunca al contenido existente, a la inserción de API/AI, a las importaciones o a la proyección remota. La caché de estilo de sesión en memoria no se convierte en un registro de preferencia. El rollback desactiva la consumación y deja intactos los registros y el contenido posterior.

El anfitrión todavía posee un modelo/sesión y transporte. El candidato 0.5.14C1file instalado temporalmente pasa por native17/preferences7 en exact155archivos, pero la aceptación de la compilación oficial/final sigue siendo separada. Las reparaciones de enfoque mantienen las interacciones explícitas de objeto/herramienta distintas de la completación automática, sin debilitar la propiedad de la entrada/exclusión externa. Las actualizaciones de paquete no añaden autosave, migración, reconstrucción de línea base ni reemplazo de epoch/mensaje-ID. La evidencia de sitios web aislados y los límites restantes se rastrean. [Verificación del rastreador de problemas](verification/issue-tracker-2026-10-21/README.md)Mantenga los artefactos/manifests/lockfile anteriores y reconstruya el servidor y la Web juntos para realizar un rollback del paquete; nunca restaure una base de datos antigua después de ediciones posteriores.

<a id="native-input-and-authorized-append-boundaries--2026-10-22"></a>

## Entrada nativa y límites de añadido autorizados — 2026-10-22

El despacho nativo del editor debe verificar la propiedad del evento antes de actuar sobre una selección retenida. Los comentarios del host/entradas de IA mantienen su teclado, portapapeles y comportamiento de composición sin escrituras en el documento. Canvas 0.5.12 repara el camino nativo; el host conserva los borradores de comentarios a través de cambios adyacentes de IA/diagramación y carga marcadores permanentes autorizados de forma independiente del cajón. No hay nuevo ancla, codec, modelo, comando ni formato de presencia. El archivo oficial coincide con el candidato de teclado/comentarios C3 probado; los recibos completos de interacción de la versión anterior 0.5.11 mantienen su alcance exacto.

La nota rápida para navegador de texto rico/Markdown aprobada añade texto plano explícitamente proporcionado a un destino de agregación existente autorizado y explícitamente seleccionado. Utiliza la fecha de epoch nativa existente, la transacción de contenido y el camino de recepción/delivery. La respuesta perdida vuelve a intentar el ID de ticket/solicitud original y el payload; la reproducción aceptada no añade dos veces ni incrementa la secuencia. La selección del destino, los tickets de cinco minutos de entrada y proceso local son temporales, sin cola de borradores persistente ni promesa de recuperación entre procesos. El documento original y las ediciones posteriores permanecen intactos; los destinos no soportados fallan sin conversión. Véase [el contrato de nota rápida](browser-quick-note.md) y sus recibos de MV3 de dos páginas/realmente aislados.

<a id="approved-ai-pending-send-storage--2026-10-22"></a>

## Almacenamiento de envíos pendientes de aprobación por IA — 2026-10-22

Esta es la cola de envío de la IA anfitriona, separada de la salida de colaboración de documentos. El usuario aprobó el plan de preservación/retroceso concreto dos veces. Los envíos listos nuevos utilizan IndexedDB independiente. `doca-ai-pending` Versión 1, almacenar `entries`, marcado por `[docaOrigin,userId,connectionId,messageId]`, con una identificación/profiltro de extensión explícita de revisión. Las transiciones condicionales se completan solo después de que se confirme la transacción de lectura-escritura corta; los bloqueos web serializan la entrega en red, no las escrituras de almacenamiento. Los monumentos de origen aceptados/retirados permanecen. Las versiones/registros desconocidos y los almacenamientos denegados o fallidos se conservan y se rechazan sin localStorage o un fallback basado únicamente en memoria.

La cola de localStorage de la versión 0.2.7 sigue siendo de solo lectura y no se reproduce automáticamente. Cada elemento reconocido requiere una continuación o retirada explícita y las configuraciones actuales; los payloads completos conservan los IDs originales y los hashes de origen, y los trabajos aceptados se reconcilian sin necesidad de reenviarlos. Antes de actualizar o realizar un rollback, deje de enviar y cierre todas las páginas/extensiones de sitios web antiguos: los emisores antiguos y nuevos mezclados no son soportados, ya que los emisores antiguos no pueden ver los tombstones nuevos. El rollback detiene al emisor nuevo y conserva ambos almacenes: los tombstones y los datos posteriores; no copia de vuelta ni reinicia automáticamente el envío antiguo. No se convierten las tablas de servidor, el historial de chat/documentos, los permisos ni los puntos de control del editor. Las reglas exactas y las pruebas de dos páginas/actualización/fracaso/legacy se mantienen intactas. [el registro de cola aprobado](verification/issue-tracker-2026-10-21/ai-pending-idb.md).

<a id="approved-spreadsheet-dimensions-and-personal-zoom--2026-10-23"></a>

## Dimensiones aprobadas de hoja de cálculo y zoom personal — 2026-10-23

El propietario aprobó explícitamente una altura de fila por defecto de 21.78 CSS-pixel y un ancho de columna por defecto de 87.12 CSS-pixel, lo que representa un aumento del diez por ciento. Las hojas de trabajo nuevas utilizan estos valores. Las hojas de trabajo históricas adjuntas y de recuperación virtual que no tienen dimensiones por defecto almacenadas también utilizan los nuevos valores de visualización por defecto. Los valores por defecto explícitos de línea base, los sobreescalados de fila/columna, los bytes originales de línea base, las semillas de hoja de trabajo, los puntos de control, los épocas y las actualizaciones pendientes se conservan; no se autoriza ningún relleno de campos históricos, ninguna conversión de datos persistentes ni ningún cambio en el esquema. Al volver al paquete anterior, se restauran sus antiguos valores de visualización de campos faltantes, manteniendo al mismo tiempo las ediciones posteriores. El ajuste manual existente de fila/columna sigue siendo colaborativo y reversible.

El pie de página sigue asignándose por defecto al 100%. El host solo almacena las opciones explícitas de zoom nativo en registros independientes del navegador versión 1, clasificados por origen, cuenta y documento. Se trata de una relación de visualización a nivel de documento, que incluye los cambios en hojas de trabajo, y no es una modificación de tamaño de fila/columna. Abrir sin un registro no genera una relación de visualización. Las versiones desconocidas, los registros mal formados y los campos no reconocidos se conservan y no se sobrescriben; el almacenamiento fallido solo conserva la opción explícita en la vista montada. Las vistas anónimas no conservan ningún registro. El retroceso detiene la lectura/escritura de los nuevos registros y deja intactos tanto ellos como todo el contenido posterior.

El paquete posee renderizado de zoom nativo y callbacks; el host posee almacenamiento en el navegador e identidad. Al aplicar la preferencia, arrastrar el pie de página, usar plus/minus, cambiar hojas de trabajo, cambios en modo lectura, redimensionar y proyección remota no deben afectar al deshacer, al archivo de salida, a las actualizaciones de contenido ni a la historia del documento. El zoom personal no debe filtrarse en las instantáneas exportadas ni en XLSX. Esta política es un límite acordado, no prueba de que un paquete instalado exporte los propiedades requeridas; la integración debe verificar el artefacto publicado y los recibos aislados de dos páginas/navegador.

<a id="approved-spreadsheet-filter-expansion--2026-10-23"></a>

## Expansión de filtro de hoja de cálculo aprobada — 2026-10-23

El propietario aprobó explícitamente la conservación de un rango de filtro almacenado en estado abierto, extendiéndolo hacia abajo hasta la última fila de contenido en sus columnas existentes cuando se confirman los criterios activos, e incluyendo automáticamente los registros contiguos que se añaden inmediatamente debajo de él. Los encabezados, los límites de las columnas y los criterios seleccionados permanecen sin cambios. Los estilos, el contenido en otras columnas y los criterios de borrado no expanden el rango. La expansión de rango nativa debe realizarse con el contenido añadido en una transacción compartida y paso de deshacer; la proyección remota y la recuperación deben aplicar el rango creado antes de derivar filas ocultas, sin eco local.

La hoja oficial 0.2.12 implementa esta política utilizando los registros de celda schema-6 y características estables existentes. No introduce ningún esquema de editor, API pública, adaptador histórico, conversión de datos almacenados, DDL, reemplazo de línea base/época ni reescritura de actualizaciones pendientes. Los lectores históricos y valores por defecto previamente aprobados permanecen sin cambios. Las áreas cortas existentes solo se reparan mediante una confirmación explícita, nunca al abrir un documento. El rollback conserva las áreas nativas guardadas y todo el contenido posterior; los paquetes anteriores pueden leer esas áreas, pero no pueden autorizar de forma duradera las extensiones implícitas posteriores.

Doca 0.2.11 vincula la hoja oficial de npm 0.2.12. La aceptación de paquetes y hostes aislados sigue siendo separada de la implementación en producción. Véase [Verificación de filtros](verification/sheet-filter-range-2026-10-23.md).

<a id="runtime-boundary-for-comment-backgrounds--2026-10-28"></a>

## Límite de tiempo para los fondos de comentarios — 2026-10-28

Hoja 0.2.14 `commentHighlightAnchor` y Slides 0.3.0-alpha.5 `activeCommentId` Son propiedades de vista controladas por el anfitrión. El anfitrión solo proporciona el comentario actual autorizado que se haya seleccionado explícitamente. Al abrir el cajón, los clics de navegación de enlace y marcadores de contenido nativos no activan un fondo de comentario. Al hacer clic en otro lugar, la resolución o el cierre del cajón lo elimina; cambiar los comentarios lo reemplaza y volver a abrirlo no lo restaura. Los SDKs utilizan la resolución de ancla existente/geometría actual para fondos no interactivos sin escribir modelos, anclas permanentes, transacciones, deshacer, presencia, outboxes o almacenamiento. La visibilidad de la tabla-port en Canvas 0.5.16 también es estado de vista. Este cambio de límite no modifica el formato de ancla ni la política de resolución de objetivo eliminado existente; los esquemas desconocidos todavía fallan en la negociación exacta, sin lector de formato antiguo ni conversión.
