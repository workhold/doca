<a id="file-storage-and-uploads"></a>

# Almacenamiento de archivos y subidas

El cliente de escritorio Tauri utiliza el almacenamiento del host remoto seleccionado. Cualquier prueba anterior `local-v1` El perfil se conserva sin abrirlo ni migrarlo. Véase [cliente de escritorio](desktop-client.es.md).

[中文](storage.zh-CN.md)

Este módulo almacena avatares, cubiertas de biblioteca, imágenes de documentos y archivos adjuntos. Las páginas de editor y administrador comparten la API de subida. Los cuerpos de documentos almacenan un identificador de activo estable. Un adaptador de recursos resuelve una URL autorizada. Las firmas de CDN de corta duración no se almacenan en el documento.

<a id="environment-configuration"></a>

## Configuración del entorno

Se selecciona el almacenamiento de archivos según lo requerido `DOCA_FILE_STORE_ID` y `DOCA_FILE_STORES_JSON`Ambos ejemplos de entorno utilizan `/data/storage`, que coincide con el volumen persistente del contenedor publicado. Para el desarrollo de la fuente, copie `.env.example` y establezca la raíz local en un directorio absoluto y escritible en su máquina. Compose utiliza `docker.env.example`. La base de datos registra IDs de almacenamiento estables y referencias de objetos, no credenciales de servidor. La página de administración es de solo lectura.

```dotenv
DOCA_FILE_STORE_ID=local
DOCA_FILE_STORES_JSON='{"version":1,"stores":{"local":{"provider":"local","root":"/data/storage"}}}'
```

Utilice un directorio persistente dedicado, accesible únicamente por el usuario del servicio y fuera del árbol web estático. Varias instancias deben compartir el mismo servidor físico. Los respaldos cubren la base de datos, todos los almacenes de archivos referenciados y la configuración protegida del despliegue. Un ID de almacenamiento referenciado debe permanecer configurado; cambiar su ruta física o bucket no mueve sus bytes.

La startup actual reconcila las generaciones de bases de datos soportadas con el último DDL. Las generaciones no soportadas y los formatos de servidor gestionados por la base de datos retirados permanecen cerrados sin conversión automática. Las implementaciones existentes deben seguir las… [Contrato de actualización de base de datos](database-schema-evolution.es.md) y [requisitos de liberación](releases/0.2.23.md), preservando sus almacenes, filas y la clave maestra de credenciales originales.

<a id="docker-uploads-fail-with-eacces"></a>

## Los subidios de Docker fallan con EACCES

Si `/api/v1/assets` devuelve HTTP 500 y los logs del contenedor informan `EACCES: permission denied, mkdir '/app/data'`, verifica la tienda local activa `root` en `DOCA_FILE_STORES_JSON`La imagen se ejecuta como `node` con `/app` Como su directorio de trabajo; Compose monta su volumen persistente en `/data`Una raíz de desarrollo como `./data/v1/storage` resuelve en `/app/data/v1/storage`, fuera de ese volumen escritible.

Para una tienda que nunca ha tenido archivos subidos con éxito, establezca su raíz en `/data/storage`Manteniendo el mismo ID de tienda y todas las demás entradas de tienda. Aplicar el cambio de entorno recreando solo el contenedor de aplicación:

```sh
docker compose up -d --no-deps --force-recreate --pull never --no-build doca
```

Si la tienda ya contiene archivos, inspeccione y realice una copia de seguridad del directorio y la base de datos antes de cambiar su raíz. Acuerden un plan que preserve los bytes del objeto y sus claves existentes en la ubicación configurada, luego verifiquen una descarga existente y una nueva carga. Cambiar la configuración no mueve los archivos. No elimine el volumen de datos ni restablezca la base de datos para reparar un error de ruta o permisos.

<a id="namespaces-and-access"></a>

## Espacios de nombres y acceso

El anfitrión genera rutas de objetos bajo `host/`; los archivos ordinarios creados por plugin utilizan `plugins/<pluginId>/`. Los objetos privados de plugin y los archivos ZIP de instalación inmutables utilizan rutas de generación/objeto separadas. `host/plugin-releases/<sha256>.zip`Los nombres de archivo de usuario no determinan los caminos físicos. Los IDs estables de archivo/carpeta y la autorización del host siguen en uso. `GET /api/v1/assets/:id/content` Verifica el acceso; el servicio estático no puede evitarlo. Véase [La implementación exacta de almacenamiento](unified-storage-implementation.md).

<a id="s3-and-cdn"></a>

## S3 y CDN

Una tienda con `provider:"s3"` requiere `bucket`, `region`, `forcePathStyle` y `credentials:{accessKeyId,secretAccessKey,sessionToken?}` en el entorno JSON. Opcional `endpoint` Es una origen raíz HTTP(S) sin credenciales, subruta, consulta o fragmento. HTTP está diseñado para un extremo configurado explícitamente en una red interna confiable; la aplicación no resuelve DNS para clasificar un destino como privado. El operador controla estos destinos y el flujo de red; no se configuran credenciales ni extremos a través de la interfaz de administración. El bucket permanece privado; se otorgan solo las operaciones de lectura/escritura/eliminación necesarias para los prefijos del host y del complemento. La validación de configuración no demuestra conectividad real.

Para RustFS en una red de contenedores compartidos, cree un bucket privado y configure su escuchador de API S3 (puerto por defecto `9000`, puerto de consola `9001`) con direccionamiento de estilo de ruta. coincidir `region` a `RUSTFS_REGION`, que por defecto es `us-east-1`:

```dotenv
DOCA_FILE_STORE_ID=cloud
DOCA_FILE_STORES_JSON='{"version":1,"stores":{"cloud":{"provider":"s3","bucket":"doca-files","region":"us-east-1","endpoint":"http://rustfs:9000","forcePathStyle":true,"credentials":{"accessKeyId":"replace-me","secretAccessKey":"replace-me"}}}}'
```

Usa un nombre de host o una dirección interna accesible desde el contenedor Doca. Los orígenes de sitio, activos y CDN también aceptan HTTP(S). Véase [Documentación de RustFS S3](https://docs.rustfs.com/zh/administration/protocols/s3)Este ejemplo es para una instalación nueva; cambiar el punto de acceso de una tienda existente no mueve sus objetos.

Opcional `cdn:{domain,keyPairId,privateKey}` Utiliza el protocolo de URL firmada de CloudFront. Configure un origen S3 privado con OAC y un grupo de claves confiable que requiere URLs firmadas; el CDN debe preservar las claves de los objetos, el tipo de contenido y su disposición. El entorno contiene el origen de distribución HTTP(S) y la clave de firma PEM. Después de verificar la ACL más reciente, el host emite una URL válida por 60 segundos. La revocación impide la creación de nuevos enlaces; un enlace existente puede seguir siendo utilizable hasta que expira. Los bytes descargados no pueden ser recuperados.

Sin un CDN, el host proxya los archivos del cloud privado. Los secretos de almacenamiento nunca se devuelven al navegador. Un protocolo de firma de CDN diferente requiere un adaptador; no se proporciona un fallback de URL pública permanente. Se debe mantener configurado cada ID de almacén referenciado y preservar el acceso a sus bytes durante las rotaciones de credenciales. La rotación no es una migración de datos.

<a id="browser-image-caching-and-the-file-cdn"></a>

## Caché de imágenes en el navegador y CDN de archivos

Los documentos/comentarios, las imágenes asistentes y los avatares/capas proxy de anfitrión utilizan la versión estable. `/api/v1/assets/:id/content` URL. Las respuestas exitosas de imágenes en línea, incluyendo miniaturas, envían:

```http
Cache-Control: private, max-age=3600, must-revalidate
Vary: Cookie, Authorization
ETag: W/"object-and-variant-identity-digest"
```

El navegador puede reutilizar su copia local durante una hora. Una vez que se vuelve obsoleta, `If-None-Match` Lo vuelve a validar: el anfitrión verifica el acceso actual antes de devolverlo. `304` Sin bytes de imagen. Los originales y las miniaturas tienen ETags distintos. Las claves de los objetos son inmutables; para reemplazar una imagen se necesita un nuevo recurso. Los cambios en cookies/autorización seleccionan una respuesta almacenada separada al cambiar de cuenta. La revocación no se verifica nuevamente durante la frescura; los bytes descargados no pueden ser recuperados. Los navegadores pueden eliminar entradas y forzar una recarga/DevTools. **Deshabilitar el caché** puede evitarlos. Esto utiliza el caché de HTTP sin una copia adicional de IndexedDB o Service Worker. Véase [Caché HTTP de MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching) para revalidación en comparación con `no-store`.

Adjuntos de IA sin imagen, `download=1`, los vistas preliminares y los errores persisten `no-store`Una solicitud no autorizada no puede obtener nada. `304` Con un ETag conocido. Las imágenes de documento tienen un resourceId y, actualmente, permanecen detrás del proxy del host, incluso cuando se configura un CDN de archivos S3. Las imágenes asistentes también permanecen detrás del proxy del host. Las tarjetas de imágenes generadas y las imágenes asistentes integradas solicitan la miniatura WebP de 480 píxeles existente; al hacer clic en ellas, se abre la imagen original, y las descargas conservan los bytes originales. Mientras el trabajo asincrónico de la miniatura esté en espera o no esté disponible, la imagen integrada puede mostrar la imagen original.

Los redireccionamientos de archivos firmados en CDN permanecen `no-store` Así que el navegador no reutiliza una firma caducada de 60 segundos. Los encabezados de respuesta de archivo finales pertenecen al CDN o al origen de S3; los encabezados de redirección no se transfieren. Los nuevos objetos de S3 actualmente utilizan `Cache-Control: private, max-age=60`Este cambio no reescribe los objetos existentes.

Para el comportamiento de archivo privado de CloudFront, mantenga el origen S3/OAC privado, el grupo de claves confiable y la ventana de firma de 60 segundos. Establezca **Política de encabezados de respuesta → Encabezados personalizados** a `Cache-Control: private, max-age=60, must-revalidate` con **Anulación** Estandarizar las respuestas del navegador para objetos existentes y nuevos. Usar **CachingDisabled** A menos que el caché de bordes haya sido planificado por separado; una política personalizada debe tener un TTL mínimo de 0. Un valor mínimo positivo puede anular la política de origen. `private/no-store`Las políticas de encabezados de respuesta afectan las respuestas dirigidas al navegador, de manera independiente del TTL de borde. Consulte la documentación de AWS. [Políticas de encabezados de respuesta](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/modifying-response-headers.html), [TTLs de política de caché](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cache-key-understand-cache-policy.html) y [URLs firmadas](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-signed-urls.html)Nunca aplicar caché pública de larga duración al sitio o `/api/*`.

Cambiar los parámetros de consulta de firma crea una URL de navegador diferente; la adición de encabezados por sí sola no garantiza la reutilización entre firmas. Las URLs estables de imágenes de documentos evitan esta limitación. Los hits del Edge-cache y los hits del cache del navegador son medidas separadas.

Para aceptación, apague DevTools **Deshabilitar el caché**Revisar un documento y examinar los hits en la caché de memoria/disco. Verificar que las lecturas condicionales no devuelven ningún cuerpo. `304`, luego verifica el cierre de sesión, la denegación de permisos, las miniaturas, la descarga y la vista previa de la basura. Inspeya la respuesta final del CDN, así como el redireccionamiento. Mantenga las cookies y las URLs firmadas fuera de los registros públicos:

```sh
curl -I -H 'Cookie: doca_session=<session>' https://doca.example.com/api/v1/assets/<asset-id>/content
curl -I -H 'Cookie: doca_session=<session>' -H 'If-None-Match: W/"<first-response-digest>"' https://doca.example.com/api/v1/assets/<asset-id>/content
curl -I 'https://files.example.com/<object-key>?<valid-signature-parameters>'
```

El código JS/CSS público en formato hash necesita una política separada de un año. [despliegue: recursos estáticos](deployment.es.md#static-assets).

<a id="history-storage-and-offline-upgrade"></a>

## Almacenamiento de historial y actualizaciones sin conexión

La base de datos guarda los 20 últimos snapshots completos de negocio. Cada grupo completo de diez snapshots antiguos conserva su punto más reciente en el almacén de archivos configurado (almacenamiento en la nube cuando se configura S3). Un punto es un archivo JSON gzip que conserva su checkpoint y metadatos de recuperación independientes, junto con un pequeño índice de base de datos. Solo el éxito de la carga imutable y la lectura con SHA-256 permite una comisión atómica del índice y la eliminación de las diez filas de la base de datos; los otros nueve puntos se eliminan deliberadamente y no pueden ser restaurados. Los grupos incompletos y los fallos de almacenamiento conservan los originales de la base de datos. Una lista normal con paginación combina ambas fuentes sin revelar los tipos de almacenamiento, las claves de objetos o las URLs firmadas.

Los puntos de control en tiempo real, las incrementaciones y anexos de colaboración descubiertos no se muestran. El desecho preserva la historia; las colas de eliminación permanente explícita de recursos archivan la recuperación después de una hora y un recheck de referencia. Ningún old recovery_json se decodifica en un nuevo esquema ni se rellena desde la línea base actual. Los metadatos de recuperación ausentes y las versiones de recuperación desconocidas todavía rechazan las vistas previas. Los archivos requieren envelope v1, un hash correspondiente, descompresión limitada y acuerdo de índice. Los trabajos duraderos en segundo plano intentan nuevamente los fallos sin bloquear los commits de contenido.

La generación actual es `doca-2026-10-12-book-payload-storage-v1`El siguiente paso de mantenimiento histórico se aplica únicamente a exacto `doca-2026-10-08-knowledge-books-v2` Bases de datos (versión 0.1.13): primero registra `doca-2026-10-09-history-storage-v1`, después de lo cual la startup actual puede realizar el alineamiento estructural aprobado. Detener cada host, hacer copia de seguridad de la base de datos, el almacén de archivos y la configuración, conservar la clave maestra, y luego ejecutar:

```sh
pnpm history:upgrade                 # Show requirements; no mutation
pnpm history:upgrade --apply         # Add structure, update baseline and queue work; no immediate sampling
```

No reconstruya la base de datos en lugar de actualizarla. Una transacción de actualización fallida conserva la base de datos original. El retorno directo de historial solo acepta `doca-2026-10-09-history-storage-v1` o su marcador especializado de rollback interrumpido, no la generación actual de contenido del libro. Para una base de datos de generación actual, primero revisa [Recuperación de almacenamiento de libros](knowledge-book-storage-verification.es.md); las referencias al punto de control almacenadas pueden bloquear ese rollback anterior. No reetiquete una línea base para evitar la validación. Para una base de datos apta para la generación de historial, detenga todas las instancias antes de importar los puntos conservados:

```sh
pnpm history:rollback --apply --manifest /backup/history-cloud-references.json
```

El manifiesto debe ser un archivo nuevo y se escribe con modo 0600. El rollback guarda las referencias en la nube, valida e importa los puntos conservados, y luego vuelve al nivel base anterior; los archivos en la nube se conservan. Un rollback interrumpido utiliza un marcador especial que impide el inicio del host, evitando que los puntos importados sean muestreados nuevamente. Solucione el problema de almacenamiento y vuelva a ejecutar el rollback con una nueva ruta de manifiesto. Los puntos eliminados por muestreo requieren una copia de seguridad completa de la base de datos de pre-muestreo. La restauración para el usuario aplica aún las verificaciones de época actual, permisos y expectedSeq; la restauración con texto enriquecido y Markdown, mientras que otros formatos permanecen solo para visualización.

<a id="checks-and-permissions"></a>

## Comprobaciones y permisos

- Los avatares y las portadas tienen un tamaño máximo de 5 MB. Los formatos PNG, JPEG, WebP y GIF se reconocen a partir de la cabecera del archivo y se decodifican. El límite es de 25 millones de píxeles. Los metadatos se eliminan y la imagen se almacena en formato WebP. Los avatares son recortados en forma cuadrada, con un tamaño máximo de 512 px. Las portadas tienen una anchura máxima de 1600 px. Un GIF conserva el primer cuadro.
- Los archivos adjuntos de documentos/IA tienen un tamaño máximo de 20 MiB y conservan los bytes originales; las imágenes raster reconocidas se validan con un límite de 25 millones de píxeles. Las rutas de las imágenes de avatar/cover/comentarios normalizan las imágenes a WebP con límites específicos para cada propósito. Los archivos de usuarios comunes utilizan una API de carga de streaming separada con un límite de 2 GiB. SVG y HTML no se incluyen como imágenes ejecutables. Los archivos ordinarios se sirven como archivos adjuntos. `nosniff` Y un sandbox. No hay escaneo de virus.
- No más de 4 subidas concurrentes, y 60 intentos por usuario por 10 minutos. La API también verifica los registros de subidas recientes. Un proxy inverso debería añadir sus propios límites de tamaño del cuerpo, conexión y almacenamiento. Aún no existe una cuota de disco por usuario.
- Un borrador de avatar solo es legible para el creador. Una vez que se vincula, los usuarios autenticados del sitio pueden verlo. Los usuarios anónimos no pueden. Una portada sigue las políticas de acceso de la biblioteca. Un borrador de portada no vinculado solo es legible para el creador. Un archivo adjunto sigue las políticas de acceso del documento. Un administrador del sistema no tiene derecho adicional de lectura. Una portada requiere un gerente. Un archivo adjunto requiere un editor.
- El objeto se escribe primero. Luego, la transacción verifica nuevamente los permisos del usuario y del recurso y registra el activo. Si el registro falla, el objeto no comprometido se elimina cuando sea posible. Las ediciones de cobertura utilizan la versión del recurso. Las ediciones de avatar utilizan la versión del perfil.
- El avatar y los borradores de cobertura están terminados, pero no están vinculados. Se han guardado por ahora. La limpieza de los borradores de activos, las cuotas por usuario y el escaneo de virus aún no se han realizado. Los carga de archivos de usuarios ordinarios tienen soporte multipart en S3 desde 32 MiB con partes de 8 MiB; esto es independiente del endpoint de activos vinculados. Un crash puede dejar un objeto no registrado. La limpieza debe verificar cada referencia de activo. No elimine un objeto compartido solo porque se eliminó un documento.

<a id="verification"></a>

## Verificación

Los pruebas automatizadas abarcan cargas locales, permisos privados, verificaciones de imágenes, vinculación, conflictos, IDs de almacenamiento estable, espacios de nombres de plugin y integridad del archivo inmutable. La integración con PostgreSQL aislada y las verificaciones locales del navegador con dos instancias pasaron. Se simularon llamadas al SDK de S3 y firmas de CDN; no se utilizaron credenciales de la nube reales. El cargamento/descarga del bucket real, la aplicación de origen privado, la expiración de la firma, la revocación, la falla de red y la restauración del respaldo aún requieren aceptación específica del servicio. Ver [Informe de aceptación del navegador](storage-browser-acceptance.md).
