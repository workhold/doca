<a id="public-reads-and-ui-extensions"></a>

# Lecturas públicas y extensiones de UI

[中文](plugin-extensions.zh-CN.md)

Esta referencia abarca los servicios de lectura pública y los comandos, vistas y ubicaciones web reutilizables. Las adiciones originales de lectura/UI se incluyeron en el código fuente del SDK. `0.1.4`; elementos de documento ingresados `0.1.6`Para el host actual, utilice el SDK `0.1.9` y declarar un coincidencia `sdkRange` como por ejemplo `^0.1.9`. Verifique el host instalado y los artefactos del SDK construido antes de depender de una API; una implementación de fuente no prueba que un artefacto npm o el despliegue hayan sido actualizados.

<a id="public-services"></a>

## Servicios públicos

| Servicio / exportación | Métodos | Propósito y límites |
| --- | --- | --- |
| `users.v1` / `@smartdoca/plugin-sdk/platform` | `me`, `searchPage`, `resolveDirectory`, `validateSelection` | El administrador de honor supera las políticas de directorio de ninguno/todo/relacionadas; la búsqueda revela las proyecciones de visualización pública; las lecturas de perfil propio son separadas. |
| `permissions.v1` | `registerDirectory` | Módulos internos y complementos comparten `DirectorySource`; solo los llamados de modo relacionado consultan fuentes, verifican candidatos y fusionan IDs de usuario |
| `documents.read.v1` / `@smartdoca/plugin-sdk/documents` | `get`, `readSnapshot`, `capabilities`, `references` | Metadatos del documento, contenido nativo completo y persistido, capacidades actuales y referencias; separado del servicio interno de colaboración `documents.v1` |
| `libraries.v1` / `@smartdoca/plugin-sdk/documents` | `list`, `children`, `path` | Bibliotecas accesibles, contenido paginado directo para niños, y rutas autorizadas para antepasados; el contenido requiere su propia autorización |
| `files.v1` / `@smartdoca/plugin-sdk/files` | folders/files/uploads/bindings/content/receipts | Estructura de carpetas, información de archivos, flujos autorizados, enlaces de archivos adjuntos, subidas y recibos |
| `content.v1` / `@smartdoca/plugin-sdk/content` | `list`, `read`, `resolve`, `search` | Recuperación de contenido, análisis y suscripciones de conocimiento; no reemplaza la estructura nativa de los documentos |

Los tokens son `usersServiceToken`, `permissionsServiceToken`, `documentReadServiceToken`, `librariesServiceToken`, `filesServiceToken`, y `contentServiceToken`. Declarar los requisitos del servidor. `injections.required` y obtener implementaciones a través de `context.inject(token)`. Registrar un origen de directorio solo cuando se contribuya con un origen de relación. Los IDs de origen deben pertenecer al espacio de nombres del complemento. El ciclo de vida es responsable del registro; su administrador libera las contribuciones de tiempo de ejecución únicamente.

`DirectorySource` Mantiene la esquemaVersion 1 y el protocolo relacionado/verificado. Los documentos integrados y las carpetas compartidas también registran fuentes. Ninguna búsqueda devuelve candidatos; utilice `me` Para leer por uno mismo. Todas las consultas se realizan directamente en las cuentas del sitio activo, sin llamar a las fuentes. Los agregados relacionados procesan las fuentes activas en paralelo, verifica los candidatos y filtra el estado de la cuenta. Los candidatos de una fuente son rechazados por errores, cursores repetidos, excesos en los presupuestos o no registro durante la ejecución. Los resultados paginados indican un fallo parcial de la fuente. `complete: false`Cada fuente tiene un presupuesto de 2 segundos, un máximo de 40 páginas y un máximo de 250 candidatos por página.

`searchPage({query,cursor?,limit?})` devuelve `{items,nextCursor,complete}`El límite es de 1–100, por defecto 20. Los cursores vinculan al llamador, a la consulta y al modo de directorio efectivo; cada página se reautoriza. Un cambio en la política durante la paginación devuelve 409: reiniciar desde la página uno. `resolveDirectory({ids})` y `validateSelection({ids})` Aceptar al menos 100 IDs y verificar nuevamente el directorio actual. El descubrimiento de una cuenta no otorga permisos de compartición, asignación o recursos empresariales. Existente `search` Todavía devuelve un array de al menos 20 elementos; el servidor de confianza únicamente. `list` No está expuesto a los navegadores.

`readSnapshot({documentId,expectedRevision?})` devuelve `{documentId,format,codec,schemaVersion,revision,epochId,seq,content,assets}`. Los formatos soportados son texto enriquecido, markdown, hoja de cálculo, lienzo y presentación. El contenido es el modelo nativo del editor (una cadena para Markdown), en lugar de un resumen o actualización de Yjs. La revisión es un identificador de contenido opaco que incorpora el contenido real, el códec/esquema y los datos de epoch/seq; está separado de la versión de metadatos. Una discrepancia en expectedRevision devuelve 409. El texto enriquecido almacenado sin un epoch de colaboración devuelve `epochId: null` Sin crear una época. Los estados persistentes faltantes devuelven 409 sin inicialización. El cuerpo JSON de más de 16 MiB devuelve 413.

Una transacción consistente restaura el contenido persistido sin mezclar cambios no guardados del editor ni escribir contenido, historial o ACKs. Los activos solo exponen los fileId/nombre/mime estables autorizados en ese momento, excluyendo las claves de almacenamiento, los caminos físicos y las URLs temporales persistidas. Las capacidades describen los permisos de recursos actuales y el soporte para snapshots; no implica un servicio público de escritura de documentos.

Lista de libros / devoluciones de niños `{items,nextCursor}`, utilizando las páginas de 100 elementos actuales del anfitrión. Los niños aceptan `{libraryId,parentId,cursor?}` con parentId=null en la raíz; el path acepta `{resourceId}`El descubrimiento y la lectura son distintos: un título visible puede tener role=none, mientras que el acceso al cuerpo del contenido está denegado. Cada página verifica nuevamente el acceso y no representa un inventario congelado. Una traversación incompleta no puede demostrar que el contenido haya sido eliminado.

<a id="browser-and-app-webview"></a>

## Navegador y App WebView

`PluginWebHost.platform` Proporciona clientes tipados para estos servicios de aplicación:

```js
const page = await host.platform.users.searchPage({ query: "张", limit: 20 });
const self = await host.platform.users.me();
const snapshot = await host.platform.documents.readSnapshot(
  { documentId }, { signal: context.signal },
);
const children = await host.platform.libraries.children({ libraryId, parentId: null });
const folders = await host.platform.files.folders.list({ parentId: null });
```

El cliente de los usuarios incluye me/searchPage/resolveDirectory/validateSelection; los documentos y las bibliotecas exponen todas las operaciones de lectura mencionadas anteriormente; los archivos exponen las operaciones folders.get/list y files.get/list. Las escrituras de archivos, los flujos de contenido y las descargas de archivos adjuntos utilizan el servidor. `files.v1` o las capacidades de anexo existentes; los streams no son JSON.

Las llamadas autenticadas utilizan `POST /api/v1/plugin-platform/{pluginId}/{operation}`. Solo se aceptan ejecuciones de espacios de nombres instalado-plugin y operaciones explícitamente listadas. La entrada no puede proporcionar principal, modo o un nombre de servicio arbitrario. Las respuestas no se almacenan en caché. Existente `host.request` se limita al complemento del plugin `/api/v1/plugins/{pluginId}/` API.

Los plugins móviles utilizan sesiones WebView emitidas por el host, delimitadas a un único plugin. Las llamadas públicas deben permanecer dentro de ese espacio de nombres; el servidor sigue verificando los permisos del usuario actual y de los recursos. Los plugins no reciben el token de portador nativo. Las pruebas aisladas cubren los límites de la sesión HTTP. Estas ubicaciones de tarjetas y documentos son implementaciones de la interfaz de usuario web; las ubicaciones nativas móviles aún no han sido implementadas ni aceptadas en los dispositivos.

<a id="commands-views-and-placements"></a>

## Comandos, vistas y ubicaciones

Los renderizadores de rutas de página web reciben un recurso propio del host. `PageHeader` componente en ellos
Contexto de ruta. Renderizar `<context.PageHeader title={title} actions={actions} />`
Colocar el contenido de React en la barra superior del espacio de trabajo junto con los controles globales.
El host posee los objetivos de montaje y elimina el contenido del portal cuando la página
desmonta. Los complementos no deben consultar selectores del DOM del host ni importar fuentes del host. Utilice
Un encabezado integrado en la cáscara del complemento móvil, que no tiene barra superior de espacio de trabajo.
Esta entrada requiere el host de origen actual; no existe un adaptador para host antiguo.

`WebPluginBundle` Incluye tres colecciones opcionales:

- Comandos: acciones reutilizables con id/pluginId/título/contextos soportados/executar.
- Vistas: vistas reutilizables con id/pluginId/título/supportedContexts/render.
- Colocaciones: registros de montaje con id/pluginId/slot/order?/conditions?, que referencian exactamente un commandId o viewId. Un view puede especificar una presentación de diálogo/drawer/sidebar; de lo contrario, se renderiza en el lugar indicado.

Los títulos se usan `{zh,en}`; Los IDs pertenecen al espacio de nombres del complemento. supportedContexts es global/home/document/library/folder/resources. conditions filtran targets, resourceKinds, formatos y capacidades. El soporte y la visibilidad son reglas de visualización, separadas de la autorización del servidor. IDs duplicados, slots inválidos, referencias faltantes y referencias entre complementos rechazan todo el paquete y anulan las contribuciones registradas.

Las entradas de comando/visualización solo con iconos utilizan el mismo branding PNG que el almacén de plugins configurado. El host lo proporciona a través de autenticación. `GET /api/v1/plugin-icons/<id>` Para ejecutar instalaciones de store/npm con activos web; las instalaciones locales conservan el icono genérico. Los detalles del store se validan con el protocolo existente del store, las solicitudes del mismo plugin comparten un estado de lectura pendiente, y los éxitos, fallos y errores se almacenan en la memoria del host solo por 60 segundos. Mientras se carga, si no existe un icono de store o si una imagen no puede cargarse, la entrada conserva su icono genérico y sigue siendo utilizable. Los paquetes de plugin existentes, las versiones de SDK y los datos persistidos no cambian; no se requiere ninguna declaración, conversión o migración de icono. Revertir este cambio en el host restaura la visualización anterior.

| Implementado slot web | Contexto |
| --- | --- |
| global.more | Las acciones globales comparten el ícono de aplicación en la esquina superior derecha con la navegación web.more; las entradas de acción/visualización utilizan íconos con etiquetas al pasar el cursor; se ocultan cuando ambos conjuntos filtrados están vacíos. |
| global.leftMore | Las acciones globales comparten el menú desplegable “leftMore” con la navegación web.leftMore; se ocultan cuando ambos conjuntos filtrados están vacíos. |
| home.cards / home.actions | Cartas de inicio y atajos |
| document.toolbar / document.menu | ID del documento, formato y permisos actuales; la misma acción puede ocupar ambos |
| document.sidebar / document.status | Contenido de barra lateral y estado; en pantallas estrechas, la barra lateral sigue al cuerpo del documento |
| library.toolbar / library.nodeMenu | Nodos de entrada de biblioteca y de directorio |
| folder.toolbar / folder.rowMenu | Recurso de la carpeta o fila actual |
| resource.bulkActions / resource.details | Selección no vacía y extensiones de detalles del documento |

El contexto incluye alcance/objetivo/lugar/recurso?/recursos?/capacidades/signal, sin proporcionar automáticamente el cuerpo o el directorio completo de usuarios. El host proporciona las capacidades de visualización de resource.read/comment/edit/manage. Los lugares de almacenamiento de archivos aún no tienen una proyección unificada de capacidades; la ausencia no establece una autorización de acceso.

Etiquetas de gestión de navegación `web.more` como en la esquina superior derecha: Más y `web.leftMore` Como se muestra a la izquierda. Los administradores pueden colocar una página de complemento en la izquierda solo después de que la navegación del servidor incluya explícitamente slots. `web.leftMore`Las entradas de usuario integradas soportan ambos. `global.leftMore` Es un espacio opcional de comando/cliente separado que admite contexto global. Las vistas sin presentación se expanden dentro del menú.

Las reglas existentes confirmadas el 2026-10-02 permanecen `web.more` y `global.more` En la esquina superior derecha. La configuración existente no se migra y los plugins existentes no obtienen automáticamente los lugares izquierdos. Left More requiere una declaración/configuración explícita y no recibe un desbordamiento automático. Una entrada puede ocupar explícitamente ambos lugares More; otras reglas de deduplicación/desbordamiento permanecen. El almacenamiento de navegación utiliza schemaVersion=1. Antes de revertir a un host sin soporte para slots izquierdos, elimine y publique toda la configuración web.leftMore: el validador estricto más antiguo no puede convertirla. También retire las nuevas declaraciones de slots cliente/servidor o reverta el plugin.

Este ejemplo de navegador ESM no consume rutas de origen de host:

```js
export default host => {
  const pluginId = "example.tools";
  const viewId = "example.tools.preview";
  return {
    manifest: { pluginId, version: "1.0.0", targets: ["web"] },
    views: [{
      id: viewId, pluginId,
      title: { zh: "预览", en: "Preview" }, supportedContexts: ["document"],
      render(context) {
        return host.React.createElement("p", null, context.resource.title);
      },
    }],
    commands: [{
      id: "example.tools.open", pluginId,
      title: { zh: "预览", en: "Preview" }, supportedContexts: ["document"],
      execute(context) {
        host.ui.openView({ viewId, presentation: "dialog", context });
      },
    }],
    placements: ["document.toolbar", "document.menu"].map((slot, index) => ({
      id: `example.tools.placement${index}`, pluginId, slot,
      commandId: "example.tools.open",
    })),
  };
};
```

Las vistas utilizan la instancia React del host y agrupan sus dependencias; el host no resuelve las importaciones npm sin ESM en el plugin. Los errores en Render/child-component están aislados, las promesas de comandos rechazadas muestran retroalimentación, y los botones de ejecución están deshabilitados. Los manejadores de eventos creados por el plugin y el trabajo asincrónico deben manejar los errores y el cancelamiento por sí mismos.

Un comando/ señal de vista previa en el lugar se cancela cuando cambia el contexto o el componente se desmonta. Abrir un diálogo/ventana transfiere el contexto a la sesión propia del panel, por lo que cerrar el menú que lo activó no lo destruye. Cerrar el panel, cambiar de ruta o abrir otro panel cancela esa sesión. Un controlador de cierre antiguo no puede cerrar un panel más reciente. Estas operaciones de recursos no exponen ningún controlador de selección ni contrato de escritura de modelo no guardado.

<a id="capability-boundaries"></a>

## Límites de capacidad

Las posiciones de selección/bloque/inserción, los comandos de mutación de documento, los comentarios/persistencia pública, las invitaciones de compartir, la ejecución pública de IA, los alcances de campos de eventos y las contribuciones temáticas requieren sus propios contratos e implementación. Esta extensión de lectura/UI no otorga mutaciones globales arbitrarias de CSS/DOM, ni introduce persistencia de diseño, migraciones de base de datos o conversión de formato almacenado.

Los plantillas y materiales ahora tienen una sección separada [contrato de recursos de creación](creation-resources.es.md). Reutiliza paquetes públicos, tokens de cadena, espacios de nombres de plugin, ciclo de vida/disposers, contexto autenticado y clientes tipados. No convierte la tabla de document_templates existente en un proveedor. files.v1 y content.v1 mantienen su semántica actual.

<a id="verification-record"></a>

## Registro de verificación

Los controles aislados originales abarcan agregación de directorios/no registro/cambios de política, modelos nativos y revisiones para los cinco formatos, paginación autorizada después de candidatos rechazados, recorrido, regreso de registro, cancelación de panel y manejos obsoletos, la lista de permisos HTTP y rechazo de sesión móvil cruzado entre plugins.

`pnpm build:plugin-sdk` Construye artefactos de lanzamiento. `node scripts/verify-plugin-sdk.mjs` Copia los artefactos en un nodo temporary independente node_modules, ejecuta JavaScript y verifica los archivos .d.ts en un proyecto NodeNext sin mapeos de ruta de host. No publica paquetes npm ni instala en los directorios de plugins del usuario.

Se verificó un ejemplo aislado en un navegador para las tarjetas de inicio, el menú/barra de herramientas de documento en la esquina superior derecha, la barra lateral del escritorio y los diálogos de captura de pantalla. Los dos complementos personales y los dispositivos móviles físicos requieren su propia aceptación. La ejecución registrada del 2026-10-02 pasó la verificación de tipo, 162 archivos de prueba (1021 aprobados, 3 omitidos), la construcción del SDK/consumo independiente, la construcción web y las verificaciones de espacios en blanco. Estos son resultados históricos, no verificaciones realizadas nuevamente al leer esta página.

<a id="document-plugin-elements"></a>

## Documentar elementos del complemento

Fuente del SDK `0.1.6` Introducido el paquete web opcional `elements` y `@smartdoca/plugin-sdk/editor-elements`. Soporta elementos de texto en línea atómicos ricos, renderización de hoja de cálculo de celda completa y formularios de configuración. El host realiza la configuración mediante comandos nativos y deshacer; los complementos no reciben manejo de editor sin restricciones. Los tipos/versiones desconocidas muestran un espacio de texto de error mientras se mantiene el JSON original sin conversión, migración o limpieza. Ningún proveedor está instalado por defecto. Véase el [Contrato de elemento](plugin-editor-elements.es.md) y [Ejemplo de cuenta regresiva/link de noticias independiente](../examples/plugin-elements/README.md)La aceptación de la fuente no establece la publicación en npm, la instalación en producción o la aceptación del dispositivo.
