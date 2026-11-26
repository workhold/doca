<a id="configuration"></a>

# Configuración

El cliente de escritorio Tauri incluye la interfaz web y se conecta a un host remoto configurado por separado. No proporciona un host local empresarial ni modifica la configuración de despliegue del host remoto. Ver [cliente de escritorio](desktop-client.es.md).

[中文](configuration.zh-CN.md)

Elija `docker.env.example` para Compose y `.env.example` Para el desarrollo de la fuente, luego copíelo al root del repositorio `.env`Usan orígenes y caminos de base de datos diferentes; ambos muestran `/data/storage` Para el volumen de archivo persistente del contenedor. Para el desarrollo de fuente, cambie la raíz de almacenamiento a un directorio absoluto y accesible en su máquina. No intercambie los orígenes ni cometa secretos.

<a id="required-compose-settings"></a>

## Configuraciones de composición requeridas

| Variable | Requisito | Ejemplo de servidor único |
| --- | --- | --- |
| `DOCA_ORIGIN` | Debe establecerse explícitamente como origen HTTP(S). | `https://doca.example.com` |
| `DOCA_FILE_STORE_ID` | Debe ser no vacío; debe identificar una tienda en el JSON | `local` |
| `DOCA_FILE_STORES_JSON` | Debe ser no vacío; configuración válida de versión 1 con backend físico | Véase abajo |
| `DOCA_CREDENTIAL_MASTER_KEY` | Necesario en cada inicio; exactamente 64 caracteres hexadecimales (32 bytes) | Generar con `openssl rand -hex 32` |

```dotenv
DOCA_ORIGIN=https://doca.example.com
DOCA_FILE_STORE_ID=local
DOCA_FILE_STORES_JSON='{"version":1,"stores":{"local":{"provider":"local","root":"/data/storage"}}}'
```

Para una instalación con un nuevo servidor único, **Cambiar el origen público y reemplazar la clave de credencial del ejemplo público** con el resultado `openssl rand -hex 32`; los valores de almacenamiento de archivo requeridos ya están proporcionados. PostgreSQL, Redis, claves de modelo y credenciales SSO son condicionales. Las implementaciones existentes deben mantener su clave maestra original.

Utilice una origen HTTP(S) sin credenciales, subrutas, consultas o fragmentos. El guion final en la raíz se normaliza. La producción acepta tanto HTTP como HTTPS. El proxy conserva la configuración. `Host`; una solicitud dirigida únicamente a `127.0.0.1` falla la verificación del Host. Ver [exámenes de salud](deployment.es.md#start).

<a id="defaults-depend-on-the-entry-point"></a>

## Los defaults dependen del punto de entrada.

| Punto de entrada | Origen | Base de datos / archivos | Clave maestra de credenciales |
| --- | --- | --- | --- |
| Repositorio Compose | Requerido en `.env` | SQLite `/data/doca.db`; se requiere el ID de archivo/JSON `.env`; `doca_data` montado en `/data` | Requerido; utilice la clave de despliegue persistente |
| Imagen publicada sin Compose | Debe proporcionar una origen HTTP(S). | La imagen indica explícitamente los valores por defecto para SQLite y almacenamiento local. `/data`; montar persistente `/data` tú mismo | Requerido; utilice la clave de despliegue persistente |
| Desarrollo de fuentes | `http://127.0.0.1:39130` | SQLite `./data/v1/doca.db`; se requiere ID de archivo/JSON, proporcionado por `.env.example` | Requerido; reemplaza la clave de ejemplo pública |

El analizador de archivos-store de origen no tiene un valor por defecto implícito; los valores por defecto de la imagen son valores explícitos en el entorno Dockerfile. El almacenamiento local requiere una raíz persistente y escritible. S3 requiere `bucket`, `region`, booleano `forcePathStyle`, y explícito `credentials:{accessKeyId,secretAccessKey,sessionToken?}`Un punto de extremo opcional debe ser una origen raíz HTTP(S) sin credenciales, un subruta, una consulta o un fragmento. Los puntos de extremo HTTP explícitos soportan el almacenamiento de objetos internos confiables, como RustFS; el operador controla el acceso a la red, y los orígenes de sitio, activos y CDN también aceptan HTTP(S). Las credenciales de shell de AWS no reemplazan estos campos JSON. Véase [almacenamiento de archivos](storage.es.md) Para un ejemplo de configuración de RustFS.

Los IDs de tienda y las ubicaciones físicas deben permanecer disponibles después de que se escriban los objetos. El ID de tienda actual configurado debe coincidir con el ID activo registrado; editar el ID, la ruta o el bucket no mueve los datos. No cambie estos valores como un atajo de migración.

<a id="conditional-settings-and-optional-backends"></a>

## Configuraciones condicionales y servidores opcionales

| Variables | Cuando sea necesario / por defecto |
| --- | --- |
| `DOCA_DATABASE=postgres`, `DOCA_DATABASE_URL` | La selección de PostgreSQL requiere su URL; la base de datos por defecto es SQLite |
| `DOCA_DATABASE_POOL_MAX` | Conexiones de base de datos principales por proceso; valor por defecto: 10 |
| `DOCA_WEBHOOK_DATABASE_URL` | Base de datos de entrega explícita opcional de PostgreSQL; de lo contrario, se deriva como se describe a continuación. |
| `DOCA_REDIS_URL` | Necesario para eventos entre instancias, presencia y límites de velocidad; si no se establece, se utilizan implementaciones locales al proceso. |
| `DOCA_REDIS_PREFIX`, `DOCA_INSTANCE_ID` | El prefijo se establece por defecto `doca`El ID de instancia se establece por defecto en un ID de proceso aleatorio |
| `DOCA_TRUST_PROXY` | IPs/CIDRs de proxy confiables separados por comas; **Ningún proxy es confiable por defecto.**, incluyendo loopback |
| `DOCA_PLUGINS_DIR` | Directorio de instalación/caché editable; Compose por defecto `/data/plugins` |
| `DOCA_PDF_PYTHON` | Ejecutable de Python con dependencias de WeasyPrint fijadas para la exportación de PDF; por defecto `python3`, `/opt/doca-pdf/bin/python` en Docker. Obsoleto `DOCA_PDF_CHROMIUM` es rechazado |
| `DOCA_PLUGIN_STORE_URL` | Origen HTTP(S); valor por defecto `https://store.smartdoca.cc` |
| `DOCA_PLUGIN_NPM_REGISTRY` | Registro de paquetes preconstruidos; por defecto `https://registry.npmjs.org` |
| `DOCA_ASSET_BASE` | Prefijo opcional de activos construidos; vacío. `/assets` de Doca |
| `DOCA_AI_IMAGE_MAX_ATTEMPTS_PER_PAGE` | Se presentan solicitudes de imágenes pagadas por página de origen; por defecto, 5 cuando no se establece. Se requiere un número entero decimal positivo y válido; valores 0, vacíos o mal formados causan fallos al iniciar. |
| `DOCA_AI_IMAGE_SEGMENT_PROFILE` | Ruta absoluta opcional para un perfil local SAM2 de versión 1 confiable y estricto; si no se establece, la segmentación se desactiva. Una configuración explícita mal formada hace que el inicio falla; un entorno de ejecución verificado inaccesible no expone la herramienta. Véase [segmentación local](ai-image-segmentation.md) |

Los límites de solicitudes de imagen se fijan al iniciar el servidor. Por ejemplo, establezca `DOCA_AI_IMAGE_MAX_ATTEMPTS_PER_PAGE=10` en la fuente o Compose `.env` Y reiniciar el servidor o recrear el contenedor. Todas las réplicas deben usar el mismo límite. La repetición, la continuación, los cambios en los prompts o el reregistro de un lote no eliminan los intentos acumulados. Se cuentan las solicitudes enviadas que están en espera o inciertas; las exportaciones de referencia y la recompilación local no lo hacen. Las imágenes existentes, los registros de solicitud y el uso permanecen sin cambios. La reducción del límite rechaza nuevas solicitudes pagadas, incluyendo el reutilización de un recibo de intento pagado cuyo orden ahora excede el límite; nunca omite ni convierte esos registros. La versión 3 del lote y la versión 1 del intento pagado permanecen sin cambios; los formatos de lote más antiguos siguen siendo rechazados sin migración.

Una clave maestra ausente, vacía o mal formada rechaza el inicio, incluyendo los despliegues sin complementos. El runtime no tiene una clave por defecto. El valor público en los archivos de ejemplo debe ser reemplazado para una instalación nueva. Genere una una vez con `openssl rand -hex 32`, respaldarlo por separado, y usar la misma clave en cada réplica/reinicio. Ver [Credenciales gestionadas](plugin-credentials.es.md).

La entrega de webhook siempre utiliza un banco de datos separado. SQLite crea `webhooks.db` además de la base de datos principal. PostgreSQL por defecto. `<main_database>_webhooks`Una base de datos ausente activa una tentativa de creación. Si la cuenta carece de privilegios para crear bases de datos, cree esa base de datos dedicada de antemano y otorgue acceso, o establezca `DOCA_WEBHOOK_DATABASE_URL` a una base de datos dedicada y accesible. El almacén de IA utiliza `ai.db` en Compose y el `doca_ai` Esquema en la base de datos principal de PostgreSQL; las permisos de PostgreSQL deben permitir su inicialización. Estas bases de datos necesitan copias de seguridad, incluso cuando no se configura ningún modelo de IA externo.

Las múltiples réplicas requieren un almacenamiento compartido de PostgreSQL, Redis y archivos. Cambiar una variable no transfiere los datos existentes. Leer [Escalado horizontal](horizontal-scaling.es.md) y [requisitos de liberación](releases/0.2.24.md).

<a id="passing-environment-variables-through-compose"></a>

## Procesar variables de entorno a través de Compose

`.env` Suministra composición de interpolación; no transfiere automáticamente cada variable al contenedor. Solo las configuraciones declaradas en `compose.yaml` Alcanzar el servicio. La dirección de enlace de contenedor, el puerto, los caminos SQLite/AI y la carpeta de datos están fijados en el archivo actual. Al personalizar esos valores, cambie su entorno, las asignaciones de puertos y los montajes persistentes al mismo tiempo.

Las variables de entorno adicionales deben ser enviadas explícitamente en el entorno del servicio Compose y configuradas en el directorio de despliegue. `.env`.

<a id="administrator-settings-and-applying-changes"></a>

## Configuración del administrador y aplicación de cambios

El sistema Logo se gestiona bajo **Sitio y servicios → Información del sitio → Logotipo del sistema**Los administradores pueden previsualizar y guardar una imagen PNG/JPEG/WebP de hasta 5 MB, o restaurar el icono predeterminado. Aparece en los iconos de navegación, de inicio de sesión y en los iconos no relacionados con documentos; las pestañas de documentos mantienen sus propios iconos. La imagen PNG normalizada se almacena en `settings.site_logo`, utilizando la misma revisión que los otros ajustes del sitio. El estado histórico NULL conserva el icono predeterminado. Véase [Requisitos de actualización 0.2.24](releases/0.2.24.md) antes de actualizar una instalación existente.

Registro, proveedores de identidad, puertas de verificación, búsqueda, modelos de IA y suscripciones de webhook utilizan sus páginas de administración. Las credenciales del backend de archivos permanecen en el entorno; la página de almacenamiento es de solo lectura. Las credenciales de servicio de la plataforma y las credenciales encriptadas del plugin son servicios separados; consulte [Credenciales de servicio](service-credentials.es.md).

`docker compose config --quiet` Verifica la interpolación sin imprimir los secretos resueltos. No verifica el JSON de la aplicación, accede a bases de datos o comprueba que las credenciales en la nube funcionan. Reiniciar con `docker compose up -d`Inspeccionar los registros y el estado de salud, luego ejercer los servicios configurados. Ver [despliegue](deployment.es.md) y [desarrollo](development.es.md).

<a id="login-lifetime"></a>

## Duración de inicio de sesión

`DOCA_SESSION_TTL_SECONDS` Controla las sesiones del navegador, QR-login y WebView, incluyendo la expiración de la base de datos y los cookies de sesión. `Max-Age`El valor por defecto es `86400` segundos (24 horas). `DOCA_MOBILE_SESSION_TTL_SECONDS` Controla las sesiones móviles de portador y su flujo de renovación existente; el valor por defecto es `15552000` segundos (180 días). Ambos aceptan números enteros decimales desde 1 hasta 2147483647. Valores vacíos, cero, negativos o mal formados impiden el inicio. Compose explícitamente pasa ambas variables.

```dotenv
DOCA_SESSION_TTL_SECONDS=86400
DOCA_MOBILE_SESSION_TTL_SECONDS=15552000
```

Reiniciar para aplicar los cambios de despliegue. Las sesiones de navegador ya emitidas conservan su fecha de expiración almacenada; los nuevos inicios de sesión utilizan el nuevo período de vida, y las renovaciones móviles aplican el período de vida móvil configurado. No se convierten filas de sesión ni formatos persistentes. Los cookies de sesión y de flujo de autenticación se usan `Secure` En HTTPS, mientras que HTTP sigue `HttpOnly` y la política actual de SameSite. Los sitios HTTP utilizan `ws` Para conexiones en tiempo real.

El adaptador de navegador HTTP aprobado proporciona UUID v4. `crypto.getRandomValues` cuando `crypto.randomUUID` Está ausente, y solo proporciona SHA-256 `crypto.subtle.digest` a través de los anclados `@noble/hashes` cuando `crypto.subtle` está ausente. Las implementaciones nativas permanecen en uso cuando están presentes. El digest coincide con los bytes nativos; los IDs existentes, los sumas de cálculo de hoja de cálculo y los formatos de documento no se convierten. Esto no permite otras operaciones de WebCrypto.

Los botones de copia de texto utilizan un helper compartido. Utiliza el Portapapeles nativo cuando está disponible; de lo contrario, el adaptador HTTP aprobado realiza la copia a través de un área de texto temporal. `document.execCommand("copy")`Restaura el enfoque y la selección, y reporta los fallos. Nunca lee el portapapeles del sistema ni considera una copia fallida como un éxito.
