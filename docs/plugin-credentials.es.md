<a id="host-managed-plugin-credentials"></a>

# Credenciales del complemento gestionadas por el host

[中文](plugin-credentials.zh-CN.md)

Lanzamiento: host 0.1.10 y SDK 0.1.9, incluyendo la API de credenciales previamente agregada en el código fuente del SDK 0.1.8. El SDK 0.1.7 no la exporta. Los plugins de correo deben declarar `^0.1.9` Y consumir el token del servidor público, en lugar de importar la fuente del host o persistir las contraseñas en sí.

```ts
import { pluginCredentialToken } from '@smartdoca/plugin-sdk/storage';

// Declare pluginCredentialToken in injections.required.
const credentials = ctx.inject(pluginCredentialToken);
const created = await credentials.create({value: JSON.stringify({password: 'example'})});
// Store created.id in the plugin database with the business account and grants.
const metadata = await credentials.inspect(created.id); // No plaintext.
const stored = await credentials.get(created.id); // Server plaintext or null.
if (stored) {
  const refreshed = await credentials.update({
    id: stored.credential.id,
    expectedRevision: stored.credential.revision,
    value: JSON.stringify({accessToken: 'new', refreshToken: 'new-refresh'}),
  });
  await credentials.remove({id: refreshed.id, expectedRevision: refreshed.revision});
}
```

Los metadatos son `{id, revision, createdAt, updatedAt}`. El host genera IDs; los complementos no pueden proporcionar IDs, ámbitos, nombres de base de datos o configuración de servidor. `get` devuelve `{credential: metadata, value: string} | null`; `inspect` Devuelve metadatos o null. Los valores son cadenas Unicode válidas no vacías, de hasta 64 KiB en UTF-8. Los complementos serializan explícitamente los objetos OAuth; no hay conversión de formato implícita.

Las actualizaciones y eliminaciones requieren un número entero positivo. `expectedRevision`Solo una actualización simultánea tiene éxito. Una revisión obsoleta se devuelve `conflict`; vuelva a leer y aplicar las reglas de negocio, en lugar de sobrescribir un token de actualización más reciente. La eliminación de un registro faltante es idempotente. La entrada inválida devuelve `invalid-input`; instalaciones inválidas, registros corruptos, fallos en el servicio/database, o actualización de un registro ausente. `unavailable`Los errores incluyen ausencia de entradas, SQL, configuración de conexión o excepciones de cifrado subyacente.

La cifre de autenticación AES-256-GCM vincula los registros a `plugin:<pluginId>`, generación de instalación, UUID y revisión. La base de datos almacena registros encriptados y cada escritura utiliza un nonce aleatorio fresco. Otros plugins no pueden leer/actualizar/eliminar estos registros. Deshabilitar o apagar preservalos. La desinstalación explícita elimina las credenciales de esa generación en la transacción del registro y anula los handle antiguos; la reinstalación utiliza una nueva generación. Realice cualquier revocación externa necesaria en texto plano antes de completar la desinstalación. El SDK no decide la autorización de la cuenta empresarial: los plugins verifican los permisos del usuario/cuenta antes de leer y nunca devuelven texto plano a los navegadores, el contexto de IA, los registros o las API de configuración ordinarias.

Las operaciones de credenciales y las transacciones comerciales de complementos se realizan por separado. Si falla guardar una referencia comercial después de la creación de la credencial, se compensa eliminando la credencial. Los complementos recuperan los refrescos de OAuth externos, los comités de base de datos y las respuestas perdidas según sus propias reglas. No hay transacciones entre servicios, clave de idempotencia, coordinador de trabajos general o rotación automática de claves. Véase [Ejemplo de almacenamiento](../examples/plugin-storage/README.md). Los complementos se ejecutan en un proceso confiable de Node.js; las API de alcance no son una sombra de sistema operativo.

<a id="deployment-environment"></a>

## Entorno de despliegue

`DOCA_CREDENTIAL_MASTER_KEY` Debe ser 32 bytes aleatorios codificados como 64 caracteres hexadecimales; genéralos con `openssl rand -hex 32`. Configúrelo una vez, manténgalo después de reinicios y realice copias de seguridad por separado. La clave es necesaria para el inicio de cada host, incluso sin plugins; una configuración ausente, vacía o mal formada rechaza el inicio. Los archivos de ejemplo contienen un valor de muestra público solo para ilustración; reemplécelo para una instalación nueva, y mantén la clave original para una implementación existente. La base de datos conserva un huella dactilar de clave; una clave incompatible rechaza el inicio sin volver a cifrar los datos. Eliminar el último plugin no elimina esta identidad de clave. Cada proceso que utiliza la base de datos utiliza la misma clave.

Los operadores seleccionan la base de datos y el almacenamiento de archivos: SQLite/archivos locales para una instancia; configuran la base de datos compartida y el almacenamiento en la nube para múltiples instancias. La API del complemento no selecciona la topología de despliegue. Compone las configuraciones de la base de datos, el pool, la base de datos Webhook, Redis e instancia; véase [docker.env.example](../docker.env.example).

El almacenamiento de archivos se configura únicamente por `DOCA_FILE_STORE_ID` y versión estricta 1 `DOCA_FILE_STORES_JSON`, incluyendo las credenciales S3/CDN. La página de administración de almacenamiento es de solo lectura; las presentaciones de configuración de almacenamiento antigua son rechazadas. Véase [registro de implementación](unified-storage-implementation.md) Para ejemplos. La clave maestra del complemento y las credenciales de conexión al almacenamiento en la nube son independientes. La configuración existente de la plataforma de identidad, mensajería y búsqueda no se convierte ni se vuelve a cifrar con este incremento.

El nivel de referencia de la base de datos es `doca-2026-10-03-credentials-v2`. Bajo la política de versión acordada anteriormente, se rechazan las bases de datos host de 0.1.9 y versiones anteriores. Se conservan las bases de datos, objetos y despliegues antiguos; no se proporciona ninguna reparación automática de tablas, migración, importación o restablecimiento. Se utilizará una nueva base de datos vacía. El rollback utiliza los datos originales del despliegue y conserva los datos del despliegue nuevo por separado. El servicio de credenciales ausente del SDK 0.1.7 no debe ser evitado mediante archivos locales gestionados por el usuario.
