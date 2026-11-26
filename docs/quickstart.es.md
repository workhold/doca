<a id="quick-start"></a>

# Inicio rápido

[中文](quickstart.zh-CN.md)

Esta guía instala la imagen especificada en compose.yaml en el servidor principal, SQLite y en el almacenamiento de archivos locales. Necesita Git, Docker Engine, el plugin Docker Compose y un dominio que apunte al servidor. Un proxy inverso en ese servidor puede servir HTTPS o HTTP interno confiable. No necesita Node.js ni pnpm para ejecutar la imagen.

Esto es una instalación nueva. Las instalaciones existentes deben leer… [requisitos de liberación](releases/0.2.38.md) Primero: se revisaron los cambios aditivos y las actualizaciones que se realizan automáticamente dentro de la generación de compatibilidad soportada; las líneas base incompatibles y los cambios semánticos requieren un manejo separado. Se debe preservar las bases de datos, archivos y configuraciones existentes.

Si el servidor no puede acceder a GitHub, transfiera Compose, el ejemplo de entorno, la política de seguridad y los scripts de administrador sin clonar la fuente. Véase [Desplegar sin acceso a GitHub](deployment-without-github.es.md) para Compose fácil de copiar y `.env` archivos, entrega de imágenes sin conexión y inicialización.

<a id="_1-clone-the-repository"></a>
<a id="1-clone-the-repository"></a>

## 1. Clonar el repositorio

Clonar el main para obtener el archivo Compose actual y los scripts de administrador juntos:

```sh
git clone --branch main --depth 1 https://github.com/workhold/doca.git
cd doca
```

<a id="_2-configure-env"></a>
<a id="2-configure-env"></a>

## 2. Configurar .env

```sh
cp docker.env.example .env
```

Para una instalación nueva, genere primero una clave maestra de credenciales:

```sh
openssl rand -hex 32
```

El resultado es 32 bytes aleatorios codificados como 64 caracteres hexadecimales. Editar `.env`reemplazando el dominio de ejemplo con tu propia origen HTTP(S) y `DOCA_CREDENTIAL_MASTER_KEY` con el valor generado:

```dotenv
DOCA_ORIGIN=https://doca.example.com
DOCA_CREDENTIAL_MASTER_KEY=7a52d29ab6db9a08292b9585d0dc5551f4156c2d02953b4262611bc1ad82f9ab
DOCA_FILE_STORE_ID=local
DOCA_FILE_STORES_JSON='{"version":1,"stores":{"local":{"provider":"local","root":"/data/storage"}}}'
```

`DOCA_CREDENTIAL_MASTER_KEY` Es necesario en el inicio, incluso sin plugins; un valor faltante, vacío o mal formado rechaza el inicio. Los archivos de ejemplo contienen un ejemplo público, correctamente formateado; reemplácelo con tu propia clave para una instalación nueva. Haz una copia segura y separada, y utiliza el mismo valor en todas las réplicas y reinicios. Las implementaciones existentes deben mantener su clave original; no la genere nuevamente para una actualización. Una clave de reemplazo es rechazada por la verificación de huella de dato de la base de datos; el cifrado existente no se convierte automáticamente. Véase [Credenciales gestionadas](plugin-credentials.es.md).

Usar solo el origen, sin subruta, consulta o fragmento. Se normaliza el guion final en raíz. Mantener `/data/storage` Dentro del volumen persistente del contenedor. `docker.env.example` Está para Docker; `.env.example` es para [Desarrollo de fuentes](development.es.md).

Configura un proxy inverso en el mismo servidor. Por ejemplo, con Caddy:

```caddyfile
doca.example.com {
    reverse_proxy 127.0.0.1:39120
}
```

Caddy termina el TLS y transmite el tráfico HTTP y WebSocket. El DNS debe apuntar a este servidor y el proxy debe poder obtener su certificado. Los otros proxies deben preservar `Host` y avanzar las actualizaciones WebSocket `/api/v1/ws`. Ver [despliegue](deployment.es.md).

<a id="_3-pull-the-image"></a>
<a id="3-pull-the-image"></a>

## 3. Tira la imagen

```sh
docker compose pull
```

Compose utiliza la imagen especificada por `compose.yaml` En el paso principal. Este paso descarga la imagen preconstruida; no se genera el código fuente.

<a id="_4-start-doca"></a>
<a id="4-start-doca"></a>

## 4. Iniciar Doca

```sh
docker compose up -d
docker compose ps
```

Espera a que el contenedor se vuelva saludable. La respuesta de salud es:

```json
{"status":"ok","version":"<image version>"}
```

Si la startup falla, inspecciona. `docker compose logs --tail=100 doca`El puerto Compose está vinculado a `127.0.0.1`El acceso del navegador utiliza la origen HTTP(S) configurado a través del proxy.

<a id="_5-initialize-the-administrator-password"></a>
<a id="5-initialize-the-administrator-password"></a>

## 5. Inicializar la contraseña del administrador

En el mismo directorio que `compose.yaml`, ejecutar:

```sh
bash scripts/bootstrap-admin.sh
```

Ingrese el inicio de sesión del administrador, una contraseña de al menos 12 caracteres y nuevamente la contraseña. El script actual muestra prompts en chino; la entrada de contraseña está oculta. Doca no tiene cuenta o contraseña predeterminada. El script ejecuta un contenedor único contra el mismo database y almacena un hash de contraseña. Si ya existe un administrador, la inicialización se detiene sin cambiar esa cuenta.

Abierto `https://doca.example.com` y iniciar sesión. No coloque el inicio de sesión o contraseña del administrador. `.env`Para recuperar una cuenta de administrador existente, utilice [Restablecimiento de contraseña](deployment.es.md#change-a-password).

<a id="next-steps"></a>

## Pasos siguientes

- Lee el [Guía de usuario](user-guide.es.md) Crear documentos y bibliotecas.
- Revisión [autenticación](authentication.es.md) Antes de abrir el registro o configurar SSO.
- Lee [configuración](configuration.es.md), [almacenamiento de archivos](storage.es.md), y [operaciones](deployment.es.md) antes de cambiar el almacenamiento o hacer copias de seguridad.
- Usa [Escalado horizontal](horizontal-scaling.es.md) Solo cuando se implementan múltiples réplicas.

SQLite, subidas, complementos y la base de datos de IA utilizan `doca_data` Volumen. Preservearlo entre reinicios e incluir todas las bases de datos, el almacenamiento referenciado y la configuración protegida en los respaldos. `docker compose down -v` Se elimina ese volumen y no debe utilizarse para un reinicio o actualización ordinario.
