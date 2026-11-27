<a id="deploy-without-github-access"></a>

# Desplegar sin acceso a GitHub

[简体中文](deployment-without-github.zh-CN.md)

El servidor empresarial no necesita un checkout de fuente, Git, Node.js o pnpm. Instale Docker Engine, el complemento Docker Compose, Bash y OpenSSL de antemano, luego transfiera los archivos de despliegue, prepare la imagen, inicie Doca e inicialice al administrador. Esta guía instala Doca 0.3.1 en un servidor único nuevo con SQLite y almacenamiento de archivos local. Las instalaciones existentes deben revisar… [requisitos de liberación](releases/0.3.1.es.md) y preservar sus bases de datos, archivos, configuración y clave maestra de credenciales.

<a id="fresh-installation-from-one-yaml"></a>

## Instalación nueva desde un YAML

`node scripts/pack-deployment.mjs` también genera resultados `doca-compose-vVERSION.yaml` y su checksum. Transfiera el YAML, guárdelo como `compose.yaml` En un directorio de despliegue permanente, edita `DOCA_ORIGIN` y tu generación `DOCA_CREDENTIAL_MASTER_KEY`, protegerlo con `chmod 600 compose.yaml`, entonces ejecuta `docker compose up -d`. No `.env`Se necesita un archivo JSON o un script de administrador externo. Utilice la imagen 0.3.1 correspondiente; el YAML independiente y el checksum también se encuentran en el repositorio GitHub.

Después de que el servicio esté sano, ejecuta. `docker compose exec doca bash docker/admin.sh bootstrap`; usar `reset-password` Para el restablecimiento de contraseña. La entrada de contraseña está oculta y no se incluye en el YAML. Este ejemplo es solo para instalaciones nuevas de SQLite/local-storage. Los sitios existentes conservan su nombre de proyecto, volúmenes y clave. Los respaldos incluyen el YAML protegido. Los requisitos del reverse-proxy siguen siendo los descritos a continuación.

<a id="_1-transfer-deployment-files"></a>
<a id="1-transfer-deployment-files"></a>

## 1. Transferir archivos de despliegue

Alguien con acceso al repositorio clona main y genera el paquete de despliegue:

```sh
git clone --branch main --depth 1 https://github.com/workhold/doca.git
cd doca
node scripts/pack-deployment.mjs
```

Los nombres de los archivos y las etiquetas de imagen a continuación utilizan 0.3.1 como ejemplo. Utilice los nombres de archivo impresos por el paquete y la imagen especificada en el archivo Compose generado.

Transferencia `doca-deploy-v0.3.1.tar.gz` y su `.sha256` Verificación de checksum a través de un servicio de archivos empresarial, una URL de descarga interna o almacenamiento extraíble. El empaquetador solo lee archivos de despliegue públicos y no incluye ningún contenido local. `.env`Datos de usuario o imagen de contenedor. La publicación de GitHub para la etiqueta correspondiente incluye el paquete y el checksum.

Coloque ambos archivos en el mismo directorio del servidor empresarial, verifíquelos y extraiga los datos:

```sh
sha256sum -c doca-deploy-v0.3.1.tar.gz.sha256
tar -xzf doca-deploy-v0.3.1.tar.gz
cd doca-deploy-v0.3.1
```

En macOS, utiliza `shasum -a 256 -c doca-deploy-v0.3.1.tar.gz.sha256`. Ejecute los comandos de despliegue siguientes desde este directorio:

```text
doca-deploy-v0.3.1/
  compose.yaml
  docker.env.example
  README.zh-CN.md
  README.md
  LICENSE
  scripts/
    bootstrap-admin.sh
    reset-admin-password.sh
```

El paquete conserva las variables de entorno y los montajes persistentes, elimina las configuraciones de compilación de origen y utiliza `pull_policy: missing`. La imagen reconstruida contiene el runtime PDF/lienzo; no se transfiere JSON de seccomp. Las instalaciones existentes conservan su proyecto Compose, volúmenes, configuración y clave maestra. Estos cambios requieren una imagen reconstruida; las imágenes antiguas publicadas siguen sus requisitos originales de despliegue.

<a id="copy-compose-and-env-manually"></a>

### Copiar, compor y .env manualmente

Para una transferencia de texto, guarde esta configuración de un solo servidor. `compose.yaml` y utilizar el anfitrión correspondiente `scripts/` Si se desea, o mediante el comando integrado de administrador de imágenes. El paquete incluye ajustes opcionales adicionales; en este ejemplo se utiliza únicamente SQLite y almacenamiento local.

```yaml
services:
  doca:
    image: docker.io/smartdoca/doca:0.3.1
    pull_policy: missing
    restart: unless-stopped
    init: true
    stop_grace_period: 30s
    environment:
      NODE_ENV: production
      DOCA_ORIGIN: "${DOCA_ORIGIN:?Set DOCA_ORIGIN in .env}"
      DOCA_HOST: 0.0.0.0
      DOCA_PORT: "39120"
      DOCA_DATABASE: sqlite
      DOCA_SQLITE_PATH: /data/doca.db
      DOCA_BOOK_BATCH_CHECKPOINTS: "${DOCA_BOOK_BATCH_CHECKPOINTS-on}"
      DOCA_AI_SQLITE_PATH: /data/ai.db
      DOCA_DATA_DIR: /data
      DOCA_FILE_STORE_ID: "${DOCA_FILE_STORE_ID:?Set DOCA_FILE_STORE_ID in .env}"
      DOCA_FILE_STORES_JSON: "${DOCA_FILE_STORES_JSON:?Set DOCA_FILE_STORES_JSON in .env}"
      DOCA_CREDENTIAL_MASTER_KEY: "${DOCA_CREDENTIAL_MASTER_KEY:?Generate and set the key in .env}"
    ports:
      - "127.0.0.1:39120:39120"
    volumes:
      - doca_data:/data

volumes:
  doca_data:
```

Guarde lo siguiente como `.env`, establezca la ubicación real del navegador y complete la clave maestra generada en el siguiente paso:

```dotenv
DOCA_ORIGIN=https://docs.example.com
DOCA_CREDENTIAL_MASTER_KEY=
DOCA_FILE_STORE_ID=local
DOCA_FILE_STORES_JSON='{"version":1,"stores":{"local":{"provider":"local","root":"/data/storage"}}}'
```

<a id="_2-configure-the-environment-and-proxy"></a>
<a id="2-configure-the-environment-and-proxy"></a>

## 2. Configurar el entorno y el proxy

Para el paquete, ejecute lo siguiente; omite la copia si lo creaste. `.env` manualmente:

```sh
cp docker.env.example .env
openssl rand -hex 32
chmod 600 .env
```

Escriba el valor hexadecimal de 64 caracteres generado. `DOCA_CREDENTIAL_MASTER_KEY`, reemplazando el ejemplo público. Establecer `DOCA_ORIGIN` Los usuarios de origen HTTP(S) se abrirán. Genera la clave una vez, guarda la copia de seguridad de forma segura y por separado, y manténla entre reinicios. Mantén la raíz de almacenamiento local en `/data/storage`No coloque las credenciales de administrador. `.env`.

Compose se une solo a `127.0.0.1:39120`, así que configure un proxy inverso en el mismo servidor. Para HTTPS público, Caddy puede usar:

```caddyfile
docs.example.com {
    reverse_proxy 127.0.0.1:39120
}
```

Indique el punto DNS al servidor y permita la emisión de certificados, o utilice certificados empresariales existentes. Para una red interna de confianza sin acceso a Internet, establezca `DOCA_ORIGIN=http://doca.internal`Configurar entradas de DNS interno o de hosts de cliente, y utilizar este proxy HTTP sin emisión de certificado público:

```caddyfile
http://doca.internal {
    reverse_proxy 127.0.0.1:39120
}
```

Otros proxies deben preservarse. `Host` y transmitir actualizaciones HTTP y WebSocket `/api/v1/ws`. El entorno empresarial debe proporcionar Docker, el proxy y sus paquetes de instalación de antemano; estos no están incluidos en el paquete de despliegue.

<a id="_3-prepare-the-image"></a>
<a id="3-prepare-the-image"></a>

## 3. Preparar la imagen

<a id="docker-hub-is-reachable"></a>

### Docker Hub es accesible.

Si GitHub está bloqueado, pero Docker Hub es accesible, extrae la imagen preconstruida:

```sh
docker compose pull doca
```

<a id="registries-are-also-unreachable"></a>

### Los registros también son inaccesibles.

El proveedor prepara un archivo de imágenes en una máquina con acceso al registro. Primero, confirme la arquitectura de la CPU objetivo. Este ejemplo utiliza Linux x86-64.`linux/amd64`); para ARM64, utilice `linux/arm64` Y etiqueta los archivos entregados correspondientemente:

```sh
docker pull --platform linux/amd64 docker.io/smartdoca/doca:0.3.1
docker image inspect docker.io/smartdoca/doca:0.3.1 --format '{{.Os}}/{{.Architecture}}'
docker save -o doca-image-v0.3.1-linux-amd64.tar docker.io/smartdoca/doca:0.3.1
sha256sum doca-image-v0.3.1-linux-amd64.tar > doca-image-v0.3.1-linux-amd64.tar.sha256
```

Transfiera la imagen `.tar` y el checksum juntos. De su directorio en el servidor empresarial:

```sh
sha256sum -c doca-image-v0.3.1-linux-amd64.tar.sha256
docker load -i doca-image-v0.3.1-linux-amd64.tar
docker image inspect docker.io/smartdoca/doca:0.3.1 --format '{{.Os}}/{{.Architecture}}'
```

Confirme que la etiqueta cargada está `smartdoca/doca:0.3.1` Y si la arquitectura coincide con el objetivo, luego regresar al directorio de despliegue. Un registro interno es otra opción de entrega: el proveedor empuja la misma imagen de lanzamiento y el equipo de negocios modifica Compose. `image` A la dirección de registro interno antes de extraerlo. Mantenga el paquete, la imagen y los scripts de inicialización en la misma versión.

<a id="_4-start-and-initialize-the-database"></a>
<a id="4-start-and-initialize-the-database"></a>

## 4. Iniciar e inicializar la base de datos

Después de extraer o cargar la imagen, ejecute desde el directorio de despliegue:

```sh
docker compose config --quiet
docker compose up -d --pull never --no-build
docker compose ps
```

`--pull never --no-build` Utiliza la imagen local y falla si está ausente, sin intentar descargar en línea ni construir desde la fuente. La primera inicialización crea el esquema de base de datos actual y las carpetas de datos de archivo/IA en el espacio vacío. `doca_data` Volumen. No se necesita un manual de instalación de SQL ni de base de datos. Una base de datos existente y antigua no se actualiza automáticamente.

Espera para `docker compose ps` para mostrar `healthy`Una comprobación manual debe utilizar el Host. `.env`, incluyendo cualquier puerto no estándar:

```sh
curl -fsS -H 'Host: docs.example.com' http://127.0.0.1:39120/health
```

Esperar `{"status":"ok","version":"0.3.1"}`Para el ejemplo interno, utilice `Host: doca.internal`Las solicitudes de bucle de retorno en blanco fallan en la validación del host. Inspeccionar los fallos de inicio. `docker compose logs --tail=100 doca`.

<a id="_5-initialize-the-administrator"></a>
<a id="5-initialize-the-administrator"></a>

## 5. Inicializar al administrador

Después de que el servicio esté en buen estado, ejecútelo en el mismo directorio de despliegue.

```sh
bash scripts/bootstrap-admin.sh
```

Ingrese un usuario de inicio de sesión, una contraseña de al menos 12 caracteres y confírmela; la entrada de la contraseña está oculta. El script crea un contenedor único con la imagen preparada y el mismo volumen persistente. Crea una cuenta solo cuando no existe ningún administrador, y la base de datos almacena un hash de contraseña. No hay inicio de sesión ni contraseña por defecto. Abra el configurado `DOCA_ORIGIN` y iniciar sesión.

Para restablecer la contraseña del administrador existente más tarde:

```sh
bash scripts/reset-admin-password.sh
```

Esto no crea una cuenta. Si la base de datos está bloqueada, ejecuta `docker compose stop`Restablecer la contraseña, luego `docker compose up -d --pull never --no-build`.

<a id="preserve-data-and-deliver-later-releases"></a>

## Preservar los datos y entregar las versiones posteriores

Usa `docker compose restart` Para reinicios ordinarios. Mantenga el directorio de despliegue y el nombre del proyecto Compose para que sea el mismo `doca_data` Se utiliza el volumen; cambiar cualquiera de ellos puede accidentalmente iniciar un sitio vacío separado. Realice una copia de seguridad de todas las bases de datos y el almacenamiento de archivos en el volumen persistente, además del contenido protegido. `.env` y clave maestra. `docker compose down -v` Se elimina el volumen y no debe utilizarse para un reinicio o actualización ordinario.

Revisar [requisitos de liberación](releases/0.3.1.es.md) Antes de actualizar, entregue un paquete e imagen correspondiente. Esta guía inicializa sitios nuevos y no convierte datos existentes. El inicio de sesión con contraseña y los servicios de documentos locales no requieren acceso a GitHub; los servicios externos configurados para IA, inicio de sesión externo, instalación de complementos o almacenamiento en la nube deben seguir siendo accesibles. Verifique la renderización de documentos en el host de destino por separado: solo la salud de la aplicación no garantiza la corrección de la renderización de PDF, Canvas y Office. Véase [Renderizado de documentos de Docker](docker-rendering.es.md).
