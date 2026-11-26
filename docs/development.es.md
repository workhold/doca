<a id="development-deployment-and-checks"></a>

# Desarrollo, despliegue y verificaciones

[中文](development.zh-CN.md)

<a id="plan-a-change"></a>

## Planifica un cambio

Usa el [Flujo de trabajo SDD en niveles](sdd.es.md) para trabajo nuevo y el [módulo index](sdd-module-index.es.md) Para encontrar la fuente, los contratos actuales y las verificaciones. Los cambios completos utilizan los registros del Spec Kit; el trabajo estándar puede utilizar un solo spec; los cambios ligeros utilizan el registro PR. Las decisiones de compatibilidad todavía requieren el acuerdo previo separado en AGENTS.md. Ejecutar `pnpm sdd:check` junto con las verificaciones relevantes para el cambio.

<a id="start-locally"></a>

## Comenzar localmente

Node.js 22.12 o posterior, o Node.js 24 LTS, y pnpm 11.25.0. Las versiones están fijas. `pnpm-lock.yaml`. El `better-sqlite3` La construcción nativa está permitida. `pnpm-workspace.yaml`.

```sh
pnpm install --frozen-lockfile
cp .env.example .env
# Set the storage root in .env to an absolute writable local directory.
pnpm dev
```

Abre http://127.0.0.1:39130. La API escucha en 39120 y el servidor de desarrollo lo proxya en la misma origen. Abre 39120 directamente, o utiliza `localhost` en lugar de `127.0.0.1`, no coincide con la configuración.

Copiar `.env.example` Antes de comenzar: son necesarias las variables file-store. Su raíz de almacenamiento es `/data/storage` Para Docker: configure ese directorio raíz como un directorio absoluto y con permisos de escritura en tu máquina antes de ejecutarlo desde el código fuente. Mantén el origen local y la ruta de SQLite, y nunca cometa secretos.

`DOCA_CREDENTIAL_MASTER_KEY` También es necesario, incluyendo el desarrollo sin complementos. Para una base de datos nueva, reemplaza el valor de ejemplo público con `openssl rand -hex 32` Salida: Mantener la misma clave en todos los reinicios y hacer una copia de seguridad por separado; una base de datos existente debe conservar su clave original.

<a id="pdf-rendering-for-source-development"></a>

## Renderizado de PDF para el desarrollo de fuentes

La exportación de PDF en texto rico y Markdown utiliza WeasyPrint 70.0 en un proceso de Python desechable. Instale Python 3.10+ y Pango, y luego las dependencias fijas:

```sh
python3 -m venv .local/pdf-renderer
.local/pdf-renderer/bin/pip install -r docker/pdf-requirements.txt
export DOCA_PDF_PYTHON="$PWD/.local/pdf-renderer/bin/python"
```

En macOS, instale Pango con `brew install pango`; si la detección de bibliotecas lo necesita, establece `DYLD_FALLBACK_LIBRARY_PATH` a `$(brew --prefix)/lib`Debian/Ubuntu requieren `python3-venv`, `libpango-1.0-0`, `libpangoft2-1.0-0` y `libharfbuzz-subset0`El Dockerfile instala estas dependencias. `DOCA_PDF_CHROMIUM` Es obsoleto y explícitamente rechazado; elimínelo antes de iniciar el sistema. No hay fallback para el navegador.

Las imágenes de lienzo de IA utilizan el exportador SVG del SDK de Canvas instalado en un DOM de Node aislado, con medición de texto nativa, seguido de rasterización resvg y fuentes CJK incluidas. Ejecutar `pnpm build:canvas-render` Después de los cambios en las dependencias. La lectura/importación de PDF sigue utilizando PDF.js; la conversión a Office sigue utilizando LibreOffice.

`playwright-core` Es una dependencia de desarrollo que solo requiere la aceptación del navegador. Instale su navegador. `pnpm exec playwright-core install chromium`, o establecer `DOCA_QA_BROWSER` para `scripts/qa-document-pdf.mts`Ejecuta ese script para exportación/reimportación aislada y regresión visual; los artefactos se eliminan. `artifacts/verification/document-pdf/` (sobreescribir con `DOCA_QA_OUTPUT` bajo `artifacts/`). No se abren documentos de usuario. Ver [intercambio de archivos](editor-file-exchange-contract.es.md#rendered-pdf-and-editable-import).

<a id="create-the-administrator"></a>

## Crear el administrador

No hay una cuenta por defecto. En el directorio del proyecto:

```sh
bash scripts/bootstrap-admin-local.sh
```

El script transmite el inicio de sesión y la contraseña únicamente a esa orden. La base de datos almacena un hash.

El despliegue de contenedores está en… [Desplegar Doca](deployment.es.md), incluyendo el proxy inverso, `DOCA_ORIGIN`, el primer administrador y restablecimiento de contraseña.

<a id="reset-an-administrator-password"></a>

## Restablecer la contraseña del administrador

Si el administrador todavía tiene un teléfono o correo electrónico verificado, utilice el código en la página de inicio de sesión. De lo contrario, utilice la orden de recuperación local en la máquina de despliegue. Solo acepta a un administrador existente. No crea uno, y no está expuesto a través de HTTP:

```zsh
read "DOCA_RESET_ADMIN_LOGIN?Administrator login: "
read -s "DOCA_RESET_ADMIN_PASSWORD?New password (at least 12 characters): "
export DOCA_RESET_ADMIN_LOGIN DOCA_RESET_ADMIN_PASSWORD
pnpm admin:reset-password
unset DOCA_RESET_ADMIN_LOGIN DOCA_RESET_ADMIN_PASSWORD
```

La orden verifica que la cuenta sea un administrador habilitado, actualiza la contraseña y revoca todas las sesiones. PostgreSQL necesita `DOCA_DATABASE_URL` en el mismo entorno. SQLite utiliza `DOCA_SQLITE_PATH`No escriba el secreto de recuperación. `.env`, historial del shell, o la imagen.

<a id="configuration"></a>

## Configuración

| Variable | Predeterminado | Propósito |
| --- | --- | --- |
| DOCA_ORIGIN | http://127.0.0.1:39130 | El único origen del navegador: HTTP(S) está soportado en producción |
| DOCA_HOST | 127.0.0.1 | Dirección de enlace |
| DOCA_PORT | 39120 | API y puerto de servidor publicado |
| DOCA_WEB_PORT | 39130 | Puerto web de Dev |
| DOCA_DATABASE | sqlite | sqlite o postgres |
| DOCA_SQLITE_PATH | ./data/v1/doca.db | El archivo de base de datos actual |
| DOCA_DATABASE_URL | nada | URL de PostgreSQL para la base de datos configurada |
| DOCA_BOOK_BATCH_CHECKPOINTS | en | Solo on/off; el estado off deshabilita la recuperación de lotes, preservando los puntos de control y objetos almacenados |
| NODE_ENV | desactivar | La producción sirve a los activos ya construidos y desactiva el desarrollo. |
| DOCA_ASSET_BASE | vacío | Prefijo HTTP(S) para los recursos compilados. Servicio vacío. `/assets` localmente |

<a id="static-asset-urls"></a>

## URLs de activos estáticos

La producción de HTML siempre proviene de Doca, y la API utiliza la misma origen. `DOCA_ASSET_BASE` solo reescribe `/assets/...` URLs dentro del HTML.

Cuando no está configurado, el contenedor sirve JS, CSS y otros archivos de construcción. `/assets`Cuando se establece, esas URLs HTML utilizan el prefijo, por ejemplo `https://cdn.example.com/doca/0.1.10/assets/index-abc.js`El prefijo es una URL HTTP(S) sin información de usuario, consulta o hash. Utilice HTTPS para un sitio público o HTTP en una red interna confiable. `/assets` Se mantiene en el contenedor. Los fuentes e imágenes referenciadas en CSS con una ruta raíz todavía llegan a Doca.

Una etiqueta oficial como `v1.2.3` Hace que GitHub Actions construya la aplicación web y cree una versión de lanzamiento. El archivo adjunto es `doca-web-assets-v1.2.3.tar.gz`Manténlo. `assets` directorio después de desempaquetar, y establecer `DOCA_ASSET_BASE` a un prefijo HTTP(S) que lo contenga. Una etiqueta de prelanzamiento, como `v1.2.3-rc.1` no crea una liberación. Un empujón a `main` Tampoco. No se utilice. `github.com/.../releases/download` como `DOCA_ASSET_BASE`Ese URL redirige y no envía encabezados de origen cruzado para módulos ES. Coloque lo desempaquetado. `assets` Directorio en un CDN o almacén de objetos que permite lecturas de scripts de diferentes orígenes.

<a id="production-process"></a>

## Proceso de producción

```sh
pnpm check
NODE_ENV=production DOCA_ORIGIN=https://docs.example.com pnpm start
```

`check` Ejecuta la verificación de tipos, las pruebas y la construcción web. `start` Sirve a la aplicación web construida y a la API sin Vite. Reemplaza el nombre del ejemplo, termina el TLS en un proxy inverso, mantén Host y Origin, y redirige. `DOCA_PORT`.

El servidor no confía en lo arbitrario. `X-Forwarded-*` Cabecas. No se confía en ningún proxy, incluyendo el loopback, por defecto. Establezca `DOCA_TRUST_PROXY` solo a las IPs/CIDRs reales del proxy. Los límites de tasa de autenticación utilizan la IP de conexión, por lo que los usuarios detrás de un proxy pueden compartir una cuota. Un proxy de producción debe configurarse como confiable. No active. `trustProxy` para Internet público.

<a id="ai-job-logs"></a>

## Registro de trabajos de IA

El contenedor de producción escribe los registros de acceso de Fastify y los errores de los trabajos de IA en segundo plano en stdout:

```sh
docker compose ps
docker compose logs -f --tail=200 doca
```

Para evitar los fallos de la IA:

```sh
docker compose logs --since=30m doca | grep -E "AI job failed|AI 工作流|模型|图片"
```

Solo con Docker, reemplaza `doca` con el nombre del contenedor. En Kubernetes, lea el stdout del pod. `kubectl logs`La API de sesión del navegador devuelve `jobs[].id`, `jobs[].status`, y `jobs[].error`Asigna ese ID de trabajo. `AI job failed`Los registros guardan una clase de error redactada. No imprimen las claves del modelo ni el prompt completo.

Esta es una base de desarrollo operable, pero no es una versión terminada para aceptación de producción. La recuperación de cuentas está implementada y requiere puertos de verificación configurados para la recuperación basada en contacto. Actuar como proveedor de OIDC sigue siendo no disponible; el monitoreo de la infraestructura objetivo y la ajuste de consultas grandes necesitan aceptación separada. El público [servicio de monitoreo](plugin-monitoring.es.md) está implementado. Existen adaptadores de inicio de sesión OIDC y social externos. Las credenciales en tiempo real se encuentran en [autenticación](authentication.es.md)Los límites están aquí. [arquitectura](architecture.es.md).

<a id="data-protection"></a>

## Protección de datos

- Se crean bases de datos vacías a partir del objetivo actual; las bases de datos existentes que estén soportadas reciben adiciones revisadas al iniciar. La ruta predeterminada de SQLite es `data/v1/doca.db`.
- Los archivos estáticos son solo `apps/web/dist`. `.archive`, `data`, y `.env` no son públicos.
- La startup reconcilia la estructura instalada con el objetivo actual. Si la revisión o validación falla, el servidor no escucha y la transacción de actualización se deshace. Realice una copia de seguridad y pruebe la restauración antes de ponerla en producción.
- Un respaldo de SQLite sin conexión detiene todos los escritores, y luego copia todo el directorio. Un respaldo en línea utiliza la API de respaldo. Copiar el archivo principal y saltarse el WAL no constituye un respaldo.
- PostgreSQL utiliza su propio proceso de respaldo y restauración. La recuperación ante desastres es tarea del operador.
- SIGINT y SIGTERM cierran HTTP, Vite y la base de datos. En producción, se utiliza un gestor de procesos para reiniciar.

<a id="database-changes"></a>

## Cambios en la base de datos

Lea y siga. [Contrato de actualización de base de datos](database-schema-evolution.es.md) antes de modificar la estructura principal o los formatos persistidos. Este es el estándar del proyecto en curso: las creaciones y actualizaciones nuevas utilizan la última DDL. `schemaEvolution` Declara las adiciones acordadas, y las adiciones ordinarias mantienen la generación de compatibilidad. Los valores históricos del campo y los cambios semánticos/destruktivos requieren un plan concreto de preservación, validación y recuperación acordado. [AGENTS.md](../AGENTS.md).

Los cambios en la base de datos requieren una regresión del esquema antiguo de SQLite y PostgreSQL 17/18, con aislamiento, incluyendo filas conservadas, valores por defecto, inicio y revisión repetidos/concurrente sin escrituras parciales. La aceptación del lanzamiento también actualiza una base de datos creada con la versión antigua afectada y lanzada. La matriz de CI de PostgreSQL `.github/workflows/database-upgrade.yml`Complementa la suite por defecto. Actualice el contrato y las notas de actualización con cualquier cambio acordado en el comportamiento o el soporte.

<a id="checks"></a>

## Comprobaciones

El trabajo de colaboración comienza desde `skills/doca-collaboration/SKILL.md`. `AGENTS.md` cuándo se aplica. El lenguaje de interfaz es `docs/i18n.md`.

`docs/collaboration-sdk-contract.md` Es la fuente del contrato. Publicar la habilidad actualiza. `references/contract.md`Una API propuesta en el contrato no es una exportación que el paquete actual ya tiene. Después de una actualización del paquete, instale el nuevo artefacto, verifique las exportaciones y el esquema, y verifique el reconocimiento de guardado. Reconecte, restaure los datos existentes y realice selecciones en tiempo real. Cambiar el número de versión no es suficiente.

```sh
pnpm typecheck
pnpm test
pnpm build
```

`tests/cloud.test.ts` Utiliza una base de datos SQLite temporal y cuentas temporales, y luego elimina ese directorio. No afecta a la base de datos de usuarios reales.

La cobertura incluye aislamiento privado, incluyendo administradores, lectura pública, herencia y antepasados ocultos, conflictos de versión, transferencia de propiedad, ciclos de árbol, restablecimiento de subvenciones mediante movimiento, restauración por lotes, copia independiente, permisos de comentario, reacciones idempotentes, aislamiento de notificaciones, Host y Origin, registro y deshabilitación, revocación de sesiones, persistencia de reinicio y rutas OpenAPI.

El inicio de sesión, la página inicial, la apertura de un documento desde la búsqueda, la visita a los registros y las estadísticas administrativas han sido verificados en un navegador local. Los navegadores específicos para cada caso y las verificaciones de PostgreSQL 17/18 aisladas se registran en [registro de verificación](verification/README.md)Se sigue necesitando una cobertura completa en el navegador, una infraestructura de destino basada en PostgreSQL, accesibilidad para teclado, límites de velocidad de proxy, carga y capacidad de aceptación para procesos de larga duración. El uso de SQLite no los reemplaza.
