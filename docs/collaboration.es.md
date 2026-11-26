<a id="realtime-collaboration-and-saving"></a>

# Colaboración en tiempo real y guardado

[中文](collaboration.zh-CN.md)

Esta página describe el comportamiento de host 0.2.23. Las API de los componentes objetivo y el trabajo restante se encuentran en… [contrato de colaboración](collaboration-sdk-contract.es.md); los registros anteriores de proceso único y paquetes temporales se encuentran en [investigación](research.es.md).

<a id="integrated-formats"></a>

## Formats integrados

Texto enriquecido, Markdown, hojas de cálculo, lienzo y diapositivas están integrados. El host instala public `@smartdoca/slate`, `@smartdoca/markdown`, `@smartdoca/sheet`, `@smartdoca/canvas`, y `@smartdoca/slides` Paquetes, controlados por package.json y el lockfile. No se requiere ningún directorio de fuente privado ni ningún archivo tarball de proveedor antiguo.

Los cinco comparten transporte, autorización y una cola local de actualizaciones pendientes, mientras conservan su propio modelo, codec, esquema, epoch y vista. Los componentes restauran los puntos de control/baselines autoritarios antes de montarlos. Los cambios de idioma, de solo lectura, de selección y de estado de guardado no reconstruyen el documento. Las hojas de cálculo conservan su baseline eje y datos de protocolo inmutables en lugar de usar un modelo de texto enriquecido.

<a id="connection-and-messages"></a>

## Conexión y mensajes

WebSocket utiliza `/api/v1/ws`Los navegadores actualizan sus cookies de sesión desde el mismo origen; los proxies transmiten Upgrade/Connection. Los recursos públicos permiten conexiones de solo lectura dentro de su alcance. Cada pestaña reutiliza la conexión del host para contenido, notificaciones y presencia.

Yjs bytes utilizan Base64 en los envoltures JSON. Los mensajes reales y la validación del formato están definidos por el [puerta de enlace](../apps/server/src/services/realtime/gateway.ts) y [verificaciones de protocolo](../packages/core/src/modules/collaboration/protocol.ts):

| Mensaje | Propósito actual |
| --- | --- |
| listo / unirse | Conexión lista, únete y negocia el codec/schema/protocolVersion |
| sync-request / sync-response | Diferencias autoritarias, epochId, seq, format baseline y acceso; una respuesta de sincronización no es un ACK de guardado |
| actualización / ack | Envíe las ediciones locales; confirme el mensaje correspondiente después de la confirmación en la base de datos |
| presencia / cursor / cursors | Presencia de usuarios y selecciones temporales por sesión |
| documento.changed / notificaciones.changed | Invalidez de contenido/detalle o lecturas de notificaciones persistentes |
| dejar / error | Errores de autorización, protocolo y conexión al dejar o reportar |

Una vez que se conoce la época, las ediciones deben llevar el protocolo correspondiente, el codec/schema y la época. La identidad, el ID de conexión, el nombre y el color provienen del servidor. Las escrituras y las transmisiones revisan nuevamente el acceso actual; nunca se utiliza la identidad reclamada por el cliente.

<a id="save-reconnect-and-history"></a>

## Guarde, reconecte y historial

Solo las transacciones de contenido local reales entran. `update-outbox.ts`La inicialización, la aplicación remota, la presencia, el desplazamiento y el ajuste de tamaño no envían contenido. Las ediciones pendientes conservan los bytes originales y los IDs de mensaje. Un ACK correspondiente elimina su actualización; las respuestas de sincronización y los ACKs desconocidos nunca limpian la cola.

El servidor valida y persiste el contenido y las proyecciones derivadas en una transacción, luego reconoce y transmite. Los recibidos se duplican según recurso, época y ID de mensaje; el mismo ID con bytes diferentes se rechaza. Los puntos de control conservan la identidad de CRDT; los registros de historia independientes mantienen su propio formato, linaje y activos. Ver [historia y restauración](document-experience.es.md#history-and-restore).

Los adaptadores de host actuales conservan los puntos de control originales de Yjs, las líneas base y los mensajes no aceptados en IndexedDB antes de enviarlos. La reconexión recupera el estado autorizado y vuelve a intentar los IDs y bytes originales. Solo los ACKs duraderos que coincidan los eliminan. Un documento almacenado en caché con inicio de sesión restaura sus metadatos de página y réplica antes de la detección del servidor backend, y permite la edición sin conexión bajo la última permisión conocida. Una interrupción temporal mantiene el editor montado. La denegación explícita de sesión o recursos oculta los metadatos en caché y preserva el trabajo pendiente. El paquete de escritorio o la interfaz web descargada anteriormente puede abrir la lista de documentos sin conexión durante una interrupción. Ver [documentos fuera de línea y recuperación](access-offline-events.md#离线文档入口).

<a id="presence-and-comments"></a>

## Presencia y comentarios

Los conteos de usuarios se han eliminado duplicados; las selecciones de edición pertenecen a las conexiones, incluyendo pestañas separadas de un mismo cuenta. La presencia es temporal y no genera escrituras de contenido/historial. El texto enriquecido, Markdown, hojas de cálculo, lienzo y diapositivas utilizan sus propios adaptadores implementados. Las vistas de solo lectura no publican las selecciones de edición.

Los anclajes de comentarios permanentes son separados: anclajes de texto enriquecido, rangos Markdown, identidades estables de filas/columnas en hoja de cálculo y regiones de elementos en lienzo/slides utilizan validación específica para cada formato. Los comentarios en hoja de cálculo siguen los registros estables a través de cambios estructurales soportados; las selecciones temporales en A1 no son su anclaje persistente. Véase [Comentarios y notificaciones](comments-and-community.es.md).

<a id="one-instance-and-replicas"></a>

## Una instancia y réplicas

Sin Redis, la difusión, la presencia y los límites permanecen dentro del proceso. Con Redis, los cambios en el contenido, la anulación de permisos, las notificaciones y la presencia se distribuyen entre las instancias. El contenido del banco de datos compartido sigue siendo autoritativo; Redis Pub/Sub no es un registro duradero. Una falla en Redis configurado nunca se resuelve silenciosamente volviendo al bus local.

Las réplicas también requieren PostgreSQL compartido, almacenamiento de archivos y versiones de complementos deseadas consistentes, con cachés de instalación independientes. Ver [Escalado horizontal](horizontal-scaling.es.md)La carga completa, las matrices de fallo de red y los dispositivos reales requieren la aceptación del entorno de destino; las pruebas automatizadas utilizan datos aislados.
