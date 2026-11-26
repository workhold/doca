<a id="public-resources-discovery-and-collections"></a>

# Recursos públicos, descubrimientos y colecciones

[中文](public-resource-discovery.zh-CN.md)

<a id="administrator-policy"></a>

## Política de administrador

En permisos y visibilidad, permisos de contenido, descubrimiento público, el administrador establece documentos, bibliotecas y carpetas de forma separada:

| Modo | Catálogo de descubrimientos | Búsqueda de texto completo antes de la recopilación | Búsqueda personal después de la recolección |
| --- | --- | --- | --- |
| Solo el enlace | Oculto | Excluido | Incluido |
| Disponible para descubrir, accesible para buscar después de la colección | Mostrado, consulta de título | Excluido | Incluido |
| Sitio completo que es posible descubrir y buscar | Mostrado, consulta de título | Incluido | Incluido |

La política solo cambia la forma en que se distribuyen los recursos que ya son públicos. No publica recursos privados. Si los tres tipos son solo enlaces, la entrada pública y las pestañas “Visited” y “Collected” permanecen, y la pestaña “Discover” está oculta. La API no devuelve un recurso que no pueda ser descubierto.

Hasta que se guarde una nueva política, las configuraciones de distribución anteriores mantienen su significado anterior. Al guardar, se escriben tres valores independientes. `publicModes`La historia de las visitas se conserva.

<a id="personal-scope"></a>

## Ámbito personal

Una visita escribe un registro de visita y no recopila recursos. Automático antiguo `source=opened` Las filas no califican para búsqueda de colección y no aparecen en la lista de colección. Las subvenciones directas, las invitaciones aceptadas y la propiedad siguen siguiendo sus propias reglas.

Los tres tipos de recursos utilizan `resource_collections`, único por usuario, tipo de recurso y ID de recurso. El catálogo público no oculta los recursos públicos que usted posee o que ya puede acceder. Al recopilarlos, se añaden a la lista. No está filtrado por la concesión anterior.

Los candidatos de búsqueda son la combinación del alcance anterior, los favoritos y la lista de colecciones. Los resultados se verifican nuevamente contra el acceso actual. Al eliminar una colección, solo se elimina la fila de esa lista; no cambia la membresía ni las invitaciones. Un recurso que ya era buscable sigue siendo buscable.

El esquema actual crea una tabla de colección vacía; al iniciar el sistema, no se copian las entradas históricas en ella. Las filas de colección existentes permanecen intactas. Los registros de conexiones automáticas, invitaciones o visitas no se consideran colecciones.

La búsqueda puede operar entre todo lo que se puede buscar, mi alcance y el texto público a nivel del sitio. El texto a nivel del sitio incluye únicamente los recursos que el administrador permitió que se pudieran buscar a nivel del sitio. Las consultas de título en el catálogo de descubrimiento no implican búsqueda de cuerpo ni búsqueda de vectores. La búsqueda de archivos y la recuperación de archivos mediante IA también revisan la colección de contenedores y la política de búsqueda pública.

<a id="containers"></a>

## Contenedores

Recopilar una biblioteca o carpeta incluye contenido que ya existe y contenido que se agrega posteriormente. La consulta decide esto de forma dinámica. No se copia una fila de membresía en cada hijo.

Una biblioteca pública establece el alcance de lectura de sus páginas. Una página que desactiva la herencia de colaboradores aún no puede desactivar la lectura pública. La página aún puede configurar edición, comentarios y gestión de derechos. Las búsquedas de puntos y las listas SQL utilizan la misma herencia de lectura pública. Una página dentro de una biblioteca utiliza la política de descubrimiento y búsqueda de la biblioteca. Un documento independiente utiliza la política del documento.

La publicación de la carpeta se almacena en `folder_publications`Los usuarios autenticados pueden leer los contenidos actuales y futuros. No reciben gestión alguna. La gestión de archivos y el descargado requieren actualmente la autenticación. No existe acceso a archivos anónimos. Después de que la publicación se desactive, el acceso sigue las condiciones de la membresía actual. La colección en sí no otorga acceso.

El panel de permisos de página muestra la biblioteca pública como fuente. El panel de compartición de carpetas indica que el alcance público incluye contenido actual y futuro. Moverse a un contenedor público publica el contenido junto con el contenedor. Moverse hacia fuera utiliza la nueva ubicación.

<a id="discovery-ui"></a>

## Interfaz de descubrimiento

La página de recursos públicos incluye visitas, descubrimientos y recopilaciones, filtradas por documento, biblioteca y carpeta. Las visitas incluyen recursos públicos que solo ofrecen enlaces y que el usuario ha abierto y aún puede acceder a ellos. La historia de visitas no determina la elegibilidad para búsquedas. Las listas de negocios ya no tienen un atajo para recursos públicos.

En casa `/home` Resume las visitas recientes en documentos, bibliotecas, carpetas y archivos, además de tickets pendientes y decisiones de la biblioteca. Los documentos fueron movidos a `/documents` Y mantenga las visitas recientes, propiedad mía, colaboración, favoritos y mis colecciones. La vista Toda por defecto para las bibliotecas combina propiedad, colaboración, favoritos y colecciones. No muestra automáticamente el catálogo público de todo el sitio. Las carpetas compartidas no tienen favoritos. Ofrecen todo: compartido por mí, compartido conmigo y recopilado.

Las listas públicas ofrecen la opción de recopilar y no recopilar. El menú de un documento incluye recopilar, no recopilar y eliminar, cuando el usuario puede eliminarlo. Los favoritos y los pin permanecen como atajos. La página de detalle del recurso no añade otra entrada de recopilación.

Inicio estadísticas utilizan datos al que el usuario actual puede acceder. Los tickets reutilizan los pasos de aprobación y aceptación "único en el mundo". Las decisiones de la biblioteca reutilizan el permiso de mantenimiento y la calibración pendiente. Después de ser procesados, se van del sistema. Una falla de fuente se muestra por separado y no se presenta como ítems pendientes en cero. La primera versión utiliza fuentes integradas. Todavía no existe un SDK de casa para plugins externos.

Documentos y bibliotecas utilizan `resource_visits`Los archivos y carpetas se usan `workspace_activity`Las visitas recientes están autorizadas nuevamente, luego se fusionan y se ordenan por tiempo. Abrir una vista previa de archivo cuenta como una visita. Una miniatura de lista no cuenta.

La primera fase proporciona búsqueda de títulos, ordenamiento por tiempo actualizado, navegación estable, recolección y eliminación de lotes. Una biblioteca se muestra como un contenedor; sus páginas no se aplanan en una lista. Las búsquedas utilizan el catálogo de la base de datos. No hay nuevas dependencias de Meilisearch ni feed de recomendaciones.

<a id="verification"></a>

## Verificación

`tests/public-discovery.test.ts` Utiliza una base de datos aislada para la distribución por tipo, visitas que no recogen datos, contenido de contenedores nuevos, revocación, catálogo frente a texto completo, gestión de carpetas, paginación y verificaciones de configuración HTTP. Los tests de herencia de permisos siguen la regla de lectura del contenedor público.
