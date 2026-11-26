<a id="plugin-templates-and-materials"></a>

# Plantillas y materiales de complemento

[中文](creation-resources.zh-CN.md)

Línea base del contrato: SDK `0.1.9`, contratos `0.1.7`. La creación de documentos, los clientes de complementos públicos, los seleccionadores de host y el uso de IA utilizan los mismos servicios de recursos. Verifique las exportaciones reales de paquetes y las versiones de despliegue antes de la integración. Los servicios y dispositivos externos requieren una aceptación separada.

<a id="existing-data-handling"></a>

## Manejo de datos existentes

El modelo de recursos implementado elimina la entrada de gestión de plantillas del administrador. `/api/v1/templates` y `/api/v1/admin/templates`El campo de creación del old templateId y el CRUD de la tabla antigua. La tabla document_templates, los índices, las definiciones y los registros permanecen sin cambios. No hay migración, eliminación, conversión, lectura/escritura dual ni registro automático de esa tabla como proveedor. Los campos antiguos desconocidos son rechazados. Los documentos existentes conservan su contenido y activos persistidos. Una versión anterior puede leer la tabla antigua después del rollback; los documentos generados por el nuevo servicio siguen utilizando los modelos nativos actuales.

El anfitrión no instala ningún proveedor de plantillas o material por defecto. `doca.documents.create` Es un consumidor de documentos; los consumidores de correo o publicación pertenecen a plugins empresariales. Los almacenes, bibliotecas empresariales, servicios remotos y envolturas de carpetas requieren plugins de recursos instalados. Este servicio no implementa por sí mismo un protocolo de almacenamiento de recursos remoto, la administración de almacenamiento de recursos o contenido oficial.

<a id="services-and-public-boundary"></a>

## Servicios y límites públicos

Importación `templatesServiceToken` (`templates.v1`), `materialsServiceToken` (`materials.v2`), y tipos de proveedor/consumidor de `@smartdoca/plugin-sdk/creation-resources`. Declarar un rango mínimo actual de SDK, como `^0.1.9` y inyectar a través de `injections.required`. Los contratos ligeros se encuentran en plugin-contracts; los servicios host se encuentran en el módulo creation-resources del core.

- Plantillas: register / proveedores / etiquetas / búsqueda / recuperar / describir / leer / registerConsumer / consumidores / consumir.
- Materiales: registro / proveedores / etiquetas / búsqueda / recuperar / describir / colección. Describir / colección. Elementos / importar.
- Regístrese en el servidor de montaje; el dispositivo devuelto será automáticamente propiedad del ciclo de vida del escenario. Los IDs de contribución se utilizan `${pluginId}.…`. Zero proveedores es válido.
- Los servicios están aislados por el alcance del tiempo de ejecución del banco de datos; las transacciones heredan ese alcance. Detener/descargar una fuente libera las contribuciones sin limpiar los documentos o archivos consumidos.
- Los consumidores declaran combinaciones exactas de versiones de contrato/tipo de contenido, inputSchema y ejecutan el proceso. Ellos poseen permisos empresariales y efectos secundarios; el host verifica la correspondencia, los parámetros y el estado de la cuenta. Los plugins empresariales autorizan el envío/publicación de correos a través de sus propios flujos.

La versión de contrato y la de contenido son independientes, por ejemplo `{contract:{id:'doca.document.rich_text',version:1}, contentType:{id:'doca.native.rich_text',version:1}}`. Los consumidores de documentos soportan rich_text, markdown, hoja de cálculo, lienzo y presentación. Todos los contratos son v1; el contenido nativo de presentación es v2 y los demás son v1. Los contratos y tipos de contenido personalizados utilizan el espacio de nombres complemento y un acuerdo explícito entre ambas partes. Una extensión sola no establece la capacidad de consumo.

<a id="provider-contract"></a>

## Contrato de proveedor

Los proveedores de plantillas declaran la versión:1. Los proveedores de materiales declaran la versión:2 y colecciones. Otras declaraciones incluyen id/pluginId/título, contratos y tipos de contenido/ordenamientos soportados, así como implementaciones de etiquetas/búsqueda/descripción, además de la lectura de plantillas o importación de materiales. Cada llamada recibe el principal del host, requestId y señal de cancelación.

La entrada de búsqueda es contract/contentType/query/tags/providerIds/sort/cursor/limit. La query tiene un máximo de 1000 caracteres. Los proveedores realizan coincidencia de palabras clave, filtrado de todos los tags, verificaciones de descubrimiento actuales y ordenamiento solicitado, devolviendo metadatos ligeros sin contenido. Describe el acceso y la revisión de rechecking, y devuelve null para recursos ocultos/eliminados. Los tags deben provenir únicamente de recursos que el llamante pueda descubrir.

Las tarjetas requieren revisión. `{providerId,id,revision}`, título, resumen, etiquetas, fecha de actualización, contrato, contenido de tipo, parámetros y licencia. Se requiere una vista previa del plantilla; la vista previa del material, el uso y la popularidad son opcionales. Una vista previa del plantilla muestra el estilo real en lugar de un icono genérico. El selector lo muestra en la tarjeta; al hacer clic, se amplía y, si es necesario, se carga una vista previa nativa. La vista previa acepta únicamente URLs de datos PNG/JPEG/WebP, con un máximo de 180000 caracteres codificados. Los proveedores remotos obtienen y validan las vistas previas en lugar de exponer imágenes remotas arbitrarias directamente en los navegadores. Los parámetros utilizan el subconjunto ObjectConfigSchema del SDK, no un esquema JSON arbitrario. El host rechaza campos desconocidos y valida los valores requeridos, tipos, enumas y límites. La interfaz de usuario básica utiliza entradas simples o JSON para los parámetros compuestos; los plugins empresariales pueden crear su propia interfaz de usuario.

Las etiquetas tienen IDs estables. `{zh,en}` Títulos. Los IDs compartidos se utilizan `doca.tag.…`, por ejemplo doca.tag.report/proposal; los IDs privados utilizan el espacio de nombres complemento. El host elimina duplicados de IDs en lugar de mostrar nombres. Utilice etiquetas public-tag consistentes sin exponer etiquetas invisibles.

<a id="sorting-and-pagination"></a>

## Clasificación y paginación

Cada proveedor soporta los tipos actualizados/nombre y puede declarar el uso/popularidad. Entre los proveedores, los tipos actualizados se ordenan por tiempo y los tipos de nombre se ordenan por nombre, con providerId/id como criterios estables para determinar la orden; el host fusiona los flujos ordenados. El uso/popularidad requiere exactamente un proveedor seleccionado. Sus cifras no representan una popularidad comparable entre proveedores o el uso global del host.

Las consultas de UI tienen un límite predeterminado de 24 elementos, con un máximo de 48; cada proveedor puede cargar al menos 24 elementos. Los cuerpos se cargan después de la selección. Los cambios en palabras clave, etiquetas, tipos, ordenes o fuentes hacen que la consulta se reinicie. El host no descarga todo el catálogo para filtrado local.

Los cursores de host son estados locales de instancia opacos vinculados al usuario, a la consulta normalizada y a los proveedores. Duran 15 minutos; la expiración, el reinicio o los cambios en los proveedores devuelven 410 y requieren una nueva consulta, sin garantías de continuidad entre instancias. Límites: 500 cursores no expirados, 100 proveedores, 10 000 elementos recorridos por proveedor y 100 búsquedas por agregación. Cada llamada a un proveedor dura 15 segundos y una búsqueda dura 30 segundos. Antes de devolver los candidatos en caché, se describe el acceso a recheck y la revisión. Cursores/recursos repetidos, ordenación incorrecta y errores de fuente producen fallos o “complete:false” en lugar de un éxito vacío.

Este protocolo de navegación no es un inventario congelado, un feed de sincronización de eliminaciones o un registro de cambios persistente. Los proveedores que requieren esas capacidades definen contratos separados. El host no mantiene reflejos del catálogo de recursos, tablas de uso o migraciones de mejoras de recursos de forma persistente.

<a id="reading-importing-and-applying-templates"></a>

## Leer, importar y aplicar plantillas

El plantilla de lectura acepta `{ref,parameters}` y regresa `{contract,contentType,content,assets}`, como máximo 768 KiB; el host añade la fuente. Una revisión modificada es un conflicto y no puede devolver contenido nuevo bajo la revisión anterior.

La importación de material es aceptada `{ref,operationKey}`El proveedor verifica nuevamente el acceso y utiliza files.v1 para importar o seleccionar un archivo autorizado, devolviendo `{fileId}`Las importaciones remotas utilizan operationKey como clave de idempotencia para la creación de archivos y el protocolo contentIdentity/upload-receipt. Las repeticiones conservan la misma clave; las URLs temporales no son referencias persistentes. El host verifica nuevamente las ACL del archivo actual y devuelve fileId/nombre/mime/tamaño/fuente.

Los recursos del plantilla contienen al menos 100. `{key,ref}` Registros que apuntan a los proveedores de material. El contenido utiliza exactamente `material:<key>` Cadenas; las imágenes en Markdown utilizan `](material:<key>)`. La creación del documento obtiene/revisa recursos fuera de la transacción de escritura, ya que los complementos pueden llamar a otros servicios de base de datos. Dentro de la transacción, verifica que la instancia de registro sigue siendo válida, crea asociaciones de host y referencias de archivos para el nuevo documento, reemplaza los espacios en blanco con IDs de activos locales, verifica los permisos, la mención, el tamaño y el formato actual, y inicializa la persistencia. En caso de fallo, el nuevo documento y sus referencias se reverten. Los archivos de usuario importados por el proveedor permanecen, sin eliminación implícita, y mantienen su ciclo de vida normal.

La aplicación de plantillas solo inicializa nuevos recursos, sin sobrescribir documentos ni cambiar la colaboración. La eliminación de un proveedor no elimina los activos vinculados gestionados por el host ni los documentos generados. La vista previa nativa admite plantillas sin dependencias de activos; las plantillas dependientes utilizan imágenes de vista previa del proveedor sin importar activos de forma implícita.

`POST /api/v1/resources` acepta `template:{ref,parameters}`, mutuamente excluyentes con markdown/initialContent; omite el plantilla para la creación de espacios en blanco. Los plantillas del consumidor de documentos consumen la entrada: título, con opcionales parentId/libraryId (omiten en la raíz), devolviendo id/título/formato. La creación ordinaria mantiene el endpoint resource-create. Los consumidores empresariales pueden utilizar lecturas o consumo y poseen idempotencia de operación empresarial.

<a id="browser-plugins-and-ai"></a>

## Navegador, complementos y IA

Llamadas de UI internas autenticadas `POST /api/v1/creation-resources/{templates|materials}/{operation}`. Los complementos utilizan plugins `host.platform.templates` / `host.platform.materials` A través de la lista de permisos de la plataforma de plugins existente y la identidad WebView del alcance. No existe un despachador de servicios arbitrario; host.request sigue estando restringido a la API del plugin.

El presentador inyecta React. `host.TemplatePicker` / `host.MaterialPicker` Como FilePicker. TemplatePicker acepta close/contract/contentType?/select(selection,resource)/blank?; su segundo argumento de callback es la tarjeta completa con la fuente. MaterialPicker acepta close/contentType?/select(file)/accept? y devuelve la fuente con la selección. Los pickers recogen selecciones/parámetros; los callbacks o la interfaz de negocio realizan el consumo. Los pickers de plugins utilizan su propio canal público sin llamar a la ui.openView de otro plugin.

La creación de documentos siempre ofrece la opción de creación en blanco, seguida de plantillas de complemento correspondientes, filtros de fuente/palabra clave/etiqueta/orden, cargar más, vista previa y parámetros. El cierre no crea nada. La creación en blanco sigue estando disponible sin proveedores ni proveedores fallidos. Los diálogos de subida/carpeta ofrecen la biblioteca de materiales y pasan los materiales seleccionados al flujo existente de subida/inserción del negocio.

La IA utiliza creation_resource_providers / creation_resource_retrieve / creation_resource_search / creation_resource_tags / template_describe / template_read / material_import; document_create acepta plantillas. La creación de plantillas requiere aprobación de la IA, alcance de recursos y recibos. La importación de material conserva la aprobación de creación de archivo y devuelve un ID de archivo estable, separado de los recibos de generación de imágenes o el ID de activo image_insert. Las plantillas empresariales utilizan las herramientas correspondientes del plugin. El host no implementa un motor de búsqueda ni un modelo semántico; la recuperación pertenece a los proveedores.

<a id="verification-scope"></a>

## Ámbito de verificación

Los controles aislados cubren cero proveedores y la preservación de tablas antiguas, la rechazo de rutas antiguas, la inicialización en cinco formatos, el ACL/material de unión, la deduplicación de etiquetas, la fusión/paginación, el fallo del proveedor, cuentas inactivas, conflictos de revisión, parámetros/consumidores, la propiedad/despachadores de plugins, la aislación en tiempo de ejecución y la identidad HTTP. La construcción del SDK/consumo independiente cubre nuevos puntos de entrada, clientes públicos y tipos de UI. Los almacenes externos, servicios empresariales y dispositivos físicos requieren integración separada.

<a id="multiple-providers-and-retrieval"></a>

## Múltiples proveedores y recuperación

La revisión implementada el 2026-10-02 reemplaza providerId por providerIds. El antiguo campo de consulta singular es rechazado por los servicios, HTTP, clientes y herramientas de IA, sin adaptación ni conversión implícita. Referencias de recursos `{providerId,id,revision}` No hay cambios. Los parámetros de plantilla, archivos, documentos, datos empresariales y document_templates no se migran ni se eliminan. No se introduce ninguna persistencia basada en preferencias del proveedor. El rollback también debe revertir a los clientes de consultas; los cursores locales a nivel de instancia requieren una nueva consulta después del reinicio o cambios en el proveedor.

Cada proveedor es una fuente con un ID estable y un título declarado como plugin; la descripción bilingüe opcional tiene un máximo de 1000 caracteres por idioma. Un plugin puede registrar múltiples fuentes. Doca no infiere la implementación de la fuente a partir de las categorías de red/store/generación. El valor omitido providerIds selecciona todas las fuentes correspondientes; &#91;&#93; selecciona ninguna. Varios IDs usan OR, combinados con tipo/tags por AND. Los IDs desconocidos/no cargados devuelven 404 sin ampliar el alcance. El descubrimiento/lista/tags/recuperación comparten esta selección; los cursores vinculan IDs ordenados y sin repeticiones. usage/popular requiere un único proveedor explícito.

Listas y descripción de la devolución CreationResourceResult: la tarjeta original más la generada por el host `source:{id,pluginId,title,description?}`. Los complementos no pueden falsificar la fuente. Los resultados de lectura/importación del host también incluyen la fuente; los contratos devueltos por el proveedor permanecen sin cambios. Los metadatos de la fuente reflejan el registro actual y no se escriben en el contenido del recurso/documento. La interfaz de usuario muestra los nombres de las fuentes, descripciones y atribución de la tarjeta.

`templates.retrieve` / `materials.retrieve` acepta:

```ts
{
  query: "找一份适合向管理层汇报季度经营情况的模板", // 非空，最多 1000 字符
  providerIds: ["example.templates.web", "example.templates.company"], // 可省略
  contract: {id: "doca.document.rich_text", version: 1}, // 可选
  contentType: {id: "doca.native.rich_text", version: 1}, // 可选
  tags: ["doca.tag.report"], // 可选，AND
  mode: "auto", // auto | keyword | semantic | hybrid，默认 auto
  topK: 8, // 默认 8，最多 20
}
```

Los proveedores declaran `retrieval:{modes:["keyword","hybrid"]}` Y implementar retrieve(context, input). En el caso de auto, eligen un modo declarado y devuelven el modo real; un modo explícito no puede degradar silenciosamente. Una capacidad no declarada devuelve “no soportado” en lugar de realizar una búsqueda exhaustiva. Los proveedores son responsables de la base de datos, Meilisearch, vector y recuperación remota, así como de sus índices, modelos, claves y sincronización.

El proveedor recupera los retornos `{items,mode,hasMore}` Ordenado por relevancia local. Los candidatos contienen ref/title/summary/tags/contract/contentType y matchText opcional (hasta 500 caracteres), excluyendo el cuerpo, la miniatura y el esquema de parámetros. El host verifica fuente/type/tags/duplicados/acceso actual/revisión, y luego añade la fuente y el rango local. Los resúmenes y las explicaciones de coincidencia son datos, no instrucciones de IA.

Cada fuente seleccionada recibe al menos una llamada de recuperación, sin recorrido del cursor. Una fuente devuelve al menos topK; múltiples fuentes devuelven al menos min(topK,5) cada una. Límites: 4 fuentes concurrentes, 15 segundos en total, 100000 bytes de respuesta por fuente. La presentación entre fuentes equilibra el rango local y los IDs estables, sin comparar las puntuaciones del motor ni reclamar relevancia global. La salida final es al menos topK. Las fuentes registran éxitos, modos reales, cantidades de candidatos y candidatos restantes. Los fracasos utilizan códigos estables como no soportado/fracaso/timeout. “Completo” significa que todas las fuentes seleccionadas tuvieron éxito; “truncado” significa que los candidatos fueron omitidos. Los resultados vacíos no amplían el alcance.

Los recopiladores básicos muestran filas de fuente/etiqueta en línea con "Todos seleccionados" por defecto. Las fuentes permiten selección múltiple; las etiquetas usan selección única; el desbordamiento se desplaza horizontalmente. Un icono de filtro expande la búsqueda inteligente por palabras clave y ordenación. La presentación cierra el panel y muestra una consulta removible junto al título de los resultados. Las consultas vacías mantienen la navegación paginada. La recuperación inteligente devuelve candidatos limitados y carga vistas previas de tarjetas cuando se necesita, sin importar los activos importados. Los fallos y los límites de resultados son explícitos. Las fuentes pueden eliminarse; las etiquetas provienen únicamente de fuentes seleccionadas. Los recopiladores aceptan `initialProviderIds` y `onSourcesChange` (undefined=todos, &#91;&#93;=ninguno), permitiendo que los plugins transmitan la selección a sus propias consultas de IA/negocios.

La IA resuelve los nombres en IDs de origen a través de creation_resource_providers, y luego envía palabras clave o una solicitud completa a creation_resource_retrieve. Ambos tipos de recursos comparten herramientas y identidad actual. La recuperación no incluye thumbnails; las herramientas de navegación también eliminan los esquemas de parámetros. Después de la selección, describe/leer/importar obtiene los detalles. Las comprobaciones cubren exclusiones, resultados vacíos, fuentes no soportadas/fallidas, cancelación, verificaciones de acceso, cursores vinculados, canales de plugin y llamadas a herramientas reales de IA.

<a id="material-collections"></a>

## Colecciones de materiales

La revisión implementada el 2026-10-03 utiliza `materials.v2` / MaterialsServiceV2. Los proveedores requieren la versión 2 y las colecciones. Los proveedores de materiales antiguos v1, versión 1, que carecen de colecciones, y el antiguo cursor de material singular son rechazados sin adaptadores, valores por defecto, lecturas dobles o conversión. Los plantillas permanecen como plantillas v1. Los archivos, el contenido de documentos y las referencias de recursos no cambian. No se introduce ninguna tabla de materiales empresariales ni migración/eliminación de datos. El rollback debe coordinar al host, el SDK, los pickers y las herramientas de IA, y reiniciar las consultas locales de la instancia.

Los materiales pertenecen a cero o más colecciones dentro de la misma fuente, mediante referencia, sin copiar archivos. Las colecciones/elementos tienen etiquetas separadas, sin herencia. Los proveedores gestionan cargas masivas, la administración de colecciones, las suscripciones, la autorización y la persistencia de datos a través de servicios SQL/objetos/archivos gestionados públicamente; no pueden elegir bases de datos independientes ni evitar el cargamento desde el directorio de instalación. Las colecciones fusionadas entre fuentes diferentes están fuera de este protocolo.

Las tarjetas de material/candidatos de recuperación requieren `collections: CreationResourceRef[]`; &#91;&#93; significa ninguno. Los proveedores devuelven solo colecciones visibles para el llamador. Los metadatos de la colección incluyen ref/title/summary/tags/updatedAt/contracts/contentTypes y opcionalmente preview/count/usage/popularity. count debe reflejar los miembros visibles, no el inventario total. Las colecciones no contienen cuerpo, parámetros, licencia ni elementos incrustados. Los candidatos de recuperación omiten preview/updatedAt/usage/popularity y pueden incluir matchText. El host añade la fuente y, para la recuperación, el rango local.

`collections: null` Se declara explícitamente a los proveedores que solo ofrecen elementos. Los proveedores de colecciones implementan `{tags,search,describe,retrieval?,retrieve?}` Con identidad/ señal. El soporte para listas y recuperación de colecciones es independiente; la recuperación de material no puede reemplazarlo. Los contratos de colección/tipos de contenido describen los tipos de miembros consumibles. Los filtros de tipo coinciden con cualquier declaración; las etiquetas usan AND y los referencias a colecciones usan OR. Los cambios en la pertenencia actualizan la revisión de la colección y las referencias a colecciones de material. La descripción de la colección impone el acceso/versión; el host verifica nuevamente antes y después de las consultas de miembros y continuación, además de la pertenencia/membresía/acceso/revisión del miembro.

Ejemplo:

```ts
const page = await host.platform.materials.search({
  query: "夏日配色", providerIds: ["example.palette.library"],
  tags: ["doca.tag.color"],           // 只筛素材
  collectionTags: ["doca.tag.theme"], // 只筛素材集
  target: "all",                    // all（默认）| materials | collections
  limit: 24,                        // 各组独立上限，最多 48
  cursors: { materials: null, collections: null },
});
// { materials: {items,nextCursor,complete,failures}, collections: {...} }
const members = await host.platform.materials.collectionItems({
  ref: page.collections.items[0].ref, limit: 24, cursor: null,
  query: "红色", tags: ["doca.tag.color"],
}); // 单一素材分页，不内嵌后续成员
const related = await host.platform.materials.retrieve({
  query: "适合夏日海报的暖色背景", target: "materials",
  collectionRefs: [page.collections.items[0].ref], topK: 8,
});
```

La búsqueda/recuperación devuelve grupos de materiales y colecciones fijos, cada uno con su propio estado de completación/fallos y cursor/truncación, sin mezclar ni incrustar repetidamente miembros. Con un único objetivo, el otro grupo está vacío/completo y su búsqueda no se llama. Los cursores no pueden cruzar grupos; el objetivo puede continuar con solo uno. La limitación/topK se aplica por separado a cada grupo. Omitir collectionRefs selecciona todos los materiales, &#91;&#93; selecciona ninguno; collectionRefs requiere un objetivo explícito:materiales. Los proveedores explícitos no pueden excluir la fuente de una colección referenciada (400); las fuentes desconocidas devuelven 404. tags devuelve grupos separados. `{materials,collections}` Groups. collectionDescribe(ref) devuelve únicamente metadatos; collectionItems({ref,...}) devuelve una página de material utilizando la consulta base/tags/contract/contentType/providerIds/sort/cursor/limit contract.

La recuperación admite etiquetas de fuente/ tipo/elemento y de colección, además de consultas/modo/topK/objetivo/referencias a colecciones. Cada grupo llama a una fuente una vez, máximo 4 en simultáneo por grupo (8 en ambos casos), con un máximo de 20 resultados finales por grupo. Los candidatos de fuente única actualizados también se rigen por el límite de 100000 bytes. El presupuesto total es de 15 segundos, incluyendo las verificaciones de colecciones. Las recuperaciones de colecciones no soportadas no se reportan sin un recorrido de listas. La paginación de búsqueda/miembros tiene un tiempo de 30 segundos. Los grupos tienen sesiones/presupuestos independientes sin reclamaciones unificadas de relevancia entre tipos.

El recopilador de material tiene pestañas “Materiales/ Colecciones”. Dentro de una colección, muestra la fuente/nombre, las páginas de los miembros, permite consultas con palabras clave/consultas inteligentes y permite volver a las colecciones. La navegación/vista previa no importa archivos; seleccionar un elemento activa la importación. Los detalles muestran el número de miembros de la colección. La recuperación por IA devuelve ambos grupos: las colecciones ayudan a temas coherentes, los elementos ayudan a solicitudes precisas, sin necesidad de realizar consultas dobles obligatorias. Están disponibles las funciones material_collection_describe y material_collection_items; los elementos relacionados dentro de una colección utilizan la recuperación con collectionRefs en lugar de escanear todos los miembros.

Los cheques aislados cubren múltiples/ninguna membresía, cursor/tags independientes, exclusiones de fuentes, filtrado de miembros, acceso a colecciones/cambios de revisión, declaraciones inválidas, recheques de membresía, recuperación limitada sin traversal, tanto dispositores de directorios como herramientas de IA, tanto canales HTTP como artefactos independientes de SDK. También incluyen tarjetas de colecciones verificadas en una página de navegador aislada, navegación de miembros, consultas inteligentes de colecciones y navegación de regreso sin editar documentos de usuario.
