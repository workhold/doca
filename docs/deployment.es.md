<a id="deploy-doca"></a>

# Desplegar Doca

El paquete de escritorio Tauri incluye la interfaz web y se conecta a un host desplegado por separado con rutas de autorización de escritorio. No incluye un host Node incluido. Se construye y verifica cada paquete para cada sistema operativo/arquitectura de forma independiente. Ver [cliente de escritorio](desktop-client.es.md).

[中文](deployment.zh-CN.md)

Un servidor puede ejecutar la imagen especificada por `compose.yaml` En el principal. Un único contenedor utiliza SQLite y no necesita PostgreSQL o Redis. Utilízalos solo cuando se ejecutan más de una réplica de aplicación. Véase [instancia única y escalado horizontal](horizontal-scaling.es.md).

<a id="requirements"></a>

## Requisitos

- Motor Docker y el complemento de Docker Compose.
- Un origen HTTP(S) alcanzable por los usuarios. El HTTPS público requiere DNS y un certificado TLS; también se soporta el HTTP interno confiable.
- Un proxy inverso en la misma máquina que el contenedor. Compose publica Doca solo en `127.0.0.1:39120`.

El proxy debe reenviar HTTP y la ruta WebSocket. `/api/v1/ws`Mantén el original. `Host` Cabeza de página.

<a id="files"></a>

## Archivos

Clonar los archivos de despliegue desde el principal o transferirlos [Paquete de despliegue para servidores sin acceso a GitHub](deployment-without-github.es.md)El servidor empresarial no necesita un checkout de fuente. La imagen reconstruida incluye `docker/admin.sh`: Después del inicio, ejecuta `docker compose exec doca bash docker/admin.sh bootstrap`o utilizar `reset-password` Para restablecer un administrador existente. Los scripts de envoltorio del host conservan sus puntos de entrada existentes. El nuevo renderizador no necesita JSON de seccomp del host. El paquero también emite un YAML de instalación nueva independiente con valores editables de origen/clave. Estos cambios requieren una imagen reconstruida y no pueden utilizarse directamente con una imagen antigua publicada sin modificar.

```sh
git clone --branch main --depth 1 https://github.com/workhold/doca.git
cd doca
cp docker.env.example .env
```

Editar `.env` antes del primer inicio.

<a id="required-settings"></a>

## Configuraciones requeridas

El almacenamiento de archivos también requiere `DOCA_FILE_STORE_ID` y `DOCA_FILE_STORES_JSON`, según lo estipulado `docker.env.example`. Los caminos y credenciales del backend se leen del entorno; la página de administración es de solo lectura. Ver [almacenamiento de archivos](storage.es.md).

El anfitrión actual utiliza generación `doca-2026-10-12-book-payload-storage-v1`La startup alinea automáticamente las bases de datos 0.1.22 liberadas. `doca-2026-10-09-history-storage-v1` A través de la revisión/reconciliación de DDL actual y registra la nueva generación. Todas las filas antiguas permanecen, incluyendo los resultados del libro SQL; no se añaden conversiones, limpiezas ni adaptadores para cuerpos antiguos. Los registros residuales del libro antiguo pueden requerir manejo manual. Los datos de objetos de la versión 0.1.23 existentes permanecen. Ver [Evolución de la estructura de la base de datos](database-schema-evolution.es.md) y [Requisitos de lanzamiento actuales](releases/0.3.0.es.md)La base exacta 0.1.13 `doca-2026-10-08-knowledge-books-v2` Todavía se necesita la actualización explícita de historial a continuación. Preserve las bases de datos, los objetos privados, la configuración y la clave maestra de credenciales original.

`DOCA_ORIGIN` Es el origen de los usuarios que se escribe en el navegador. Se aceptan HTTP y HTTPS, incluso en producción. Se debe usar únicamente el origen sin subruta, consulta o fragmento; la barra final en la raíz se normaliza.

```text
DOCA_ORIGIN=https://docs.example.com
```

El ejemplo de Docker ya proporciona los valores necesarios para almacenamiento de archivos. Para un servidor único nuevo, cambie el origen y genere una clave. `openssl rand -hex 32`, y reemplazar el muestreo público `DOCA_CREDENTIAL_MASTER_KEY`. La clave es necesaria incluso sin complementos; los despliegues existentes deben mantener su clave original. Conservar los valores almacenados en archivo; PostgreSQL y Redis son condicionales. Véase [configuración](configuration.es.md) Para valores por defecto, campos de S3 y almacenes separados de Webhook/AI.

<a id="start"></a>

## Comenzar

0.1.26 cambia el almacenamiento del complemento a uno [base de datos empresarial compartida](plugin-database-isolation.es.md), separado del núcleo. En la versión 0.1.25, normalmente se desinstala cada complemento comercial externo antes de detener todas las instancias. Los registros comerciales privados, credenciales y objetos se descartan sin migración; los datos del núcleo y los archivos ordinarios permanecen. Elimine las configuraciones obsoletas por complemento, configure una única base de datos/conta de PostgreSQL una vez (SQLite es automático), luego reinstale y vuelva a configurar los complementos. Ver [Requisitos de actualización 0.1.26](releases/0.1.26.md).

Deje de usar todos los hosts antiguos y realice una copia de seguridad de la base de datos antes de actualizar. El esquema 0.1.22 se alinea automáticamente al iniciar el sistema, manteniendo todas las filas de negocio existentes. No se necesita ningún comando manual para gestionar los registros. Los resultados de SQL conservados no están adaptados al formato de objetos nativo; los registros residuales deben gestionarse manualmente según sea necesario. Para conservarlos como resultados útiles, ejecute la opción opcional existente. [conversión sin pérdida](knowledge-book-storage-verification.es.md) Antes del primer inicio. Las generaciones anteriores que soportaban este sistema deben completar la actualización de historial a continuación. Actualice todas las instancias de host y web al mismo tiempo.

<a id="upgrade-from-0113"></a>

### Actualización a la versión 0.1.13

Detener todas las instancias de Doca y hacer copias de seguridad de los bases de datos (incluido SQLite WAL), el almacenamiento de archivos y la configuración. Mantener el original. `DOCA_CREDENTIAL_MASTER_KEY`. Utilice los archivos de despliegue principales actuales y la imagen correspondiente. Extraigalos y ejecute un contenedor de mantenimiento offline con el entorno de despliegue existente:

```sh
docker compose stop
docker compose pull
docker compose run --rm --no-deps doca node --import tsx apps/server/src/bootstrap/history-storage.ts upgrade --apply
```

Solo `doca-2026-10-08-knowledge-books-v2` Es aceptado; la orden nunca crea ni restaura la base de datos. La transacción añade tablas de archivo de historial y tareas, manteniendo todos los bytes del snapshot original. Después de que el nuevo host se inicie, los 20 últimos snapshots completos permanecen en la base de datos. Para cada grupo de 10 snapshots antiguos, solo el más reciente se conserva en el almacenamiento de archivos; los otros nueve se eliminan después de la verificación de escritura/lectura y no pueden ser restaurados desde la aplicación. En caso de fallo de almacenamiento, todo el grupo original se conserva. El historial se muestra como una sola lista; los grupos incompletos permanecen en la base de datos. Véase [Almacenamiento de historial y rollback](storage.es.md#history-storage-and-offline-upgrade).

La orden primero registra `doca-2026-10-09-history-storage-v1`El startup actual luego aplica el alineamiento estructural aprobado. `doca-2026-10-12-book-payload-storage-v1`El comando de rollback de historial directo acepta únicamente la generación de almacenamiento de historial o su marcador de rollback interrumpido, por lo que no puede deshacer un base de datos que ya esté alineada por el host actual. Véase [Límites de mantenimiento de historial](storage.es.md#history-storage-and-offline-upgrade) y [Recuperación de almacenamiento de libros](knowledge-book-storage-verification.es.md) Antes de cualquier rollback. Conservar las escrituras posteriores y los bytes del archivo conservado; el historial muestreado requiere la copia de seguridad previa al upgrade. Nunca dirija una imagen antigua directamente hacia una base de datos más nueva.

```sh
docker compose pull
docker compose up -d
```

`docker compose up -d` tira la imagen especificada por `compose.yaml`. Añadir `--build` Solo cuando quieres una imagen creada a partir de este checkout.

Revisa el contenedor:

```sh
docker compose ps
curl -fsS -H 'Host: docs.example.com' http://127.0.0.1:39120/health
```

Reemplazar `docs.example.com` con el host en su origen configurado, incluyendo su puerto si no es estándar. La sonda de contenedor integrada ya proporciona este host; espere. `docker compose ps` para mostrar `healthy`Un bucle de retorno simple es rechazado con 421.

Un proceso saludable vuelve a funcionar `status: "ok"` y la versión real de la imagen `version`.

La renderización de documentos también necesita verificaciones de despliegue: este proceso de comprobación incluye LibreOffice y Chromium en entorno sandbox, mientras que la opción SAM requiere un entorno de ejecución de Linux confiable independiente. Ver [Generadores de documentos de Docker](docker-rendering.es.md) En cuanto a la disponibilidad de los componentes, se incluye la política de seccomp de Chromium y el montaje explícito de SAM. Un servidor saludable por sí solo no verifica esas herramientas.

SQLite, los archivos subidos y la base de datos de IA se almacenan en `doca_data` Volumen. La base de datos debe estar vacía al iniciar por primera vez. Una base de datos no vacía debe utilizar una generación de compatibilidad soportada; los cambios aditivos revisados se reconcilian automáticamente, mientras que las diferencias destructivas o semánticas se reportan para revisión. No elimine una base de datos que ya contenga usuarios.

<a id="reverse-proxy"></a>

## Proxy inverso

Terminar TLS en Caddy o Nginx en el mismo host y redirigir a `127.0.0.1:39120`.

```caddyfile
docs.example.com {
	reverse_proxy 127.0.0.1:39120
}
```

Los proxies Caddy realizan actualizaciones WebSocket por defecto. Un servidor Nginx necesita `Upgrade` y `Connection` Cabecas en `/api/v1/ws`.

`DOCA_TRUST_PROXY` Está vacío por defecto: no se confían los encabezados reenviados, incluyendo las conexiones desde loopback. Para preservar las IPs del cliente para auditorías y limitaciones, configure solo la IP/CIDR del proxy que la aplicación realmente ve. Un puente Docker puede hacer que un proxy del host aparezca como el gateway del puente, en lugar de `127.0.0.1`; inspeccione la red de despliegue antes de elegir este valor. Sin ella, los usuarios proxy podrían compartir la cuota de IP del proxy.

Si un balanceador de carga en otra máquina se conecta a este host, publique el puerto del contenedor en la interfaz privada en lugar de solo en loopback, y establezca `DOCA_TRUST_PROXY` Al rango de IP del balanceador de carga. No confíe en Internet público.

Para un sitio HTTP interno de confianza, establezca `DOCA_ORIGIN=http://doca.internal` Y sirva esa dirección a través de un proxy inverso HTTP. También puede publicar el puerto del contenedor en una interfaz privada elegida e incluir ese puerto en el origen. La asignación de Compose proporcionada se aplica únicamente a loopback. No es necesario ningún ajuste en modo desarrollo; mantenga el modo de producción. El soporte HTTP no altera la validación de Host o Origin.

<a id="create-the-administrator"></a>

## Crear el administrador

No hay cuenta o contraseña predeterminada. Después de que el contenedor esté en buen estado, ejecute esto en el directorio que contiene `compose.yaml`:

```sh
bash scripts/bootstrap-admin.sh
```

El script solicita el inicio de sesión y la contraseña. La contraseña debe tener al menos 12 caracteres. Se pasa solo a ese comando de contenedor. La base de datos almacena un hash. Si ya existe un administrador, el comando se detiene y no cambia la contraseña actual.

<a id="change-a-password"></a>

## Cambiar la contraseña

Un usuario autenticado abre `#/account` y elige **Cambiar contraseña**La nueva contraseña debe tener al menos 12 caracteres. Después de guardarla, toda sesión para ese cuenta se cierra.

Cuando el administrador no puede iniciar sesión, restablezca la cuenta existente desde el directorio de despliegue:

```sh
bash scripts/reset-admin-password.sh
```

Esto no crea una cuenta y no está disponible a través de HTTP. Si el archivo de base de datos está bloqueado, ejecuta `docker compose stop`Restablecer la contraseña, luego `docker compose up -d`No escriba la contraseña o el usuario de inicio de sesión. `.env`.

<a id="static-assets"></a>

## Activos estáticos

La página HTML y la API permanecen en `DOCA_ORIGIN`. `DOCA_ASSET_BASE` solo cambios `/assets/...` URLs dentro de ese HTML.

El servidor negocia Brotli.`br`), gzip, o bytes originales utilizando `Accept-Encoding` y envía `Vary: Accept-Encoding`Las URLs y los archivos compilados permanecen sin cambios, incluyendo las carpetas de compilación existentes. Las URLs de los recursos HTML se reescriben antes de la compresión. El servidor utiliza una caché de 32 MiB por proceso para los recursos públicos estáticos codificados; no añade copias comprimidas a las imágenes ni comprime las respuestas de la API o archivos privados a través de este método. Los proxies/CDNs deben preservar la negociación de codificación. `Vary`O manejan la compresión por sí mismos. Esto afecta las transferencias del navegador; Docker utiliza su propia compresión y caché de capas de imagen.

El construido `/cad/` Los archivos de trabajador y WASM utilizan la misma negociación de codificación y lo conservan `no-cache` Porque sus nombres no están encriptados. Los caminos fuera de los activos CAD declarados permanecen inaccesibles.

Deje que esté desactivado para servir JavaScript, CSS y los otros archivos compilados del contenedor. `/assets`Cuando lo establezcas, utiliza un prefijo HTTP(S) sin userinfo, query, hash o guion final:

```text
DOCA_ASSET_BASE=https://cdn.example.com/doca/0.1.11
```

Una página que hacía referencia `/assets/index-abc.js` luego se carga:

```text
https://cdn.example.com/doca/0.1.11/assets/index-abc.js
```

Publicar todo `apps/web/dist/assets` directorio con ese prefijo y manténlo `assets` Segmento de ruta. Los nombres de los archivos incluyen un hash de contenido y deben coincidir con el HTML dentro de la misma imagen. Las solicitudes de API permanecen en… `DOCA_ORIGIN`.

Una etiqueta oficial como `v1.2.3` Construye la aplicación web y la conecta. `doca-web-assets-v1.2.3.tar.gz` A la publicación de GitHub. Extrae eso, guarda el `assets` directorio, y coloque ese directorio en un CDN que envíe encabezados de origen cruzado para los módulos ES. No use un `github.com/.../releases/download` URL como `DOCA_ASSET_BASE`Un empujón hacia `main`o una etiqueta de prelanzamiento, como `v1.2.3-rc.1`, no crea ese lanzamiento.

El contenedor mantiene su propio `/assets` Archivos. Fuentes e imágenes referenciadas en hojas de estilo con una ruta raíz todavía se cargan desde Doca.

`index.html` se envía con `Cache-Control: no-cache`Por lo tanto, una nueva visita después de una liberación permite acceder a la página nueva. Archivos hashados bajo `/assets/` se envían con `Cache-Control: public, max-age=31536000, immutable`Sus nombres cambian cuando el contenido cambia, por lo que una caché de un año no conserva un script antiguo después de que se cargue el nuevo HTML. Un CDN delante de `DOCA_ASSET_BASE` Necesita el mismo cache largo en esos archivos hashados.

<a id="configure-static-cdn-response-headers"></a>

### Configurar encabezados de respuesta de static-CDN

`DOCA_ASSET_BASE` Cambia las URLs; no configura el CDN. Establece los objetos de construcción S3 subidos para `Cache-Control: public, max-age=31536000, immutable` y preservar el tipo de contenido (`text/javascript` para JS, `text/css` Para cubrir objetos existentes sin cambiar los metadatos, adjunta un CloudFront **Política de encabezados de respuesta** solo a la estática `*/assets/*` Comportamiento: agregar Cache-Control debajo de **Cabecas personalizadas** con **Anulación**Las módulos ES de origen cruzado también requieren `Access-Control-Allow-Origin: https://doca.example.com`; estos archivos de construcción públicos pueden usarse `*` Sin credenciales. No adjunte esta política a HTML, APIs o archivos privados.

Establece el archivo hash estático. **Política de caché** Por separado: TTL mínimo 0, TTL por defecto/máximo 31536000 segundos. La política de encabezados de respuesta cambia los encabezados del navegador, no el TTL de Edge; ver [Políticas de encabezados de respuesta de AWS](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/modifying-response-headers.html)Publicar nuevos nombres de archivo y mantener las versiones anteriores para cargas parciales posteriores en páginas ya abiertas.

Un CDN Nginx estático puede servir un directorio de lanzamientos de la siguiente manera, con estándares `mime.types` Cargado por el servidor:

```nginx
location /doca/0.2.12/assets/ {
    alias /srv/doca/0.2.12/assets/;
    add_header Cache-Control "public, max-age=31536000, immutable";
    add_header Access-Control-Allow-Origin "https://doca.example.com";
}
```

Cuando se hace proxy de Doca `/assets/`Ocultar el encabezado de origen existente `proxy_hide_header Cache-Control;` antes de añadir su reemplazo. El ejemplo omite `always` Así, los archivos faltantes no reciben una caché 404 que dure un año. Verifique la respuesta final del CDN:

```sh
curl -I https://cdn.example.com/doca/0.2.12/assets/<actual-hashed-JS-filename>.js
```

Verifique Cache-Control, Content-Type y CORS. El HTML se mantiene en Doca con revalidación. Para imágenes de documento y archivos protegidos, utilice [Almacenamiento: caché de imágenes en el navegador y CDN de archivos](storage.es.md#browser-image-caching-and-the-file-cdn).

<a id="knowledge-book-payload-conversion"></a>

## Conversión de carga útil del libro de conocimientos

0.1.25 alinea las generaciones antiguas compatibles a través de una comparación de esquemas normal, manteniendo todos los datos de negocio sin limpieza automática de libros o adaptadores de cuerpo en tiempo de ejecución. Los objetos de generación objetivo existentes permanecen sin cambios. Los existentes [procedimiento opcional sin pérdida](knowledge-book-storage-verification.es.md) Debe ejecutarse antes del primer inicio de operación, para que los resultados antiguos de SQL sigan siendo utilizables. Las conversiones interrumpidas aún requieren su manifiesto original. Preserve todos los datos y las escrituras posteriores al restablecer los respaldos; actualice todos los hosts y las construcciones web al mismo tiempo.
