<a id="platform-service-credentials"></a>

# Credenciales de servicio de la plataforma

[中文](service-credentials.zh-CN.md)

Abre Admin → Configuración de la plataforma → Credenciales de servicio. El registro de la plataforma gestionada por el host actual abarca:

- Identidad: se nombran secretos de cliente SSO y se permiten orígenes HTTP(S). Los proveedores de identidad se refieren al nombre de credenciales.
- Puerta de verificación: punto de acceso HTTP(S), secreto de bearer y canales de teléfono/email.
- Búsqueda de documentos: Clave de API de Meilisearch y orígenes permitidos.

Las credenciales del backend y las claves de firma de CloudFront se configuran únicamente en `DOCA_FILE_STORES_JSON`La página de administración de almacenamiento es de solo lectura. No son editables en este registro de la plataforma. [Credenciales del complemento](plugin-credentials.es.md) Utilice el servicio cifrado exclusivo para servidores y su clave maestra de despliegue.

<a id="persistence-and-configuration-precedence"></a>

## Persistencia y prioridad de configuración

La configuración de la plataforma se almacena bajo `account_settings`, ID `service-credentials`El código existente solo establece la configuración de identidad/mensajería desde el entorno de ejecución cuando este registro está ausente; posteriormente, el registro guardado tiene prioridad. Cambiar las variables de entorno no sobrescribe los ajustes guardados. Se trata de una ruta de inicialización existente, conservada y documentada aquí sin un nuevo adaptador ni migración. Un registro guardado que contiene la forma de almacenamiento retirada es rechazado explícitamente por el host actual.

Las conexiones a la base de datos, el origen del sitio, los puertos de escucha y el almacenamiento de archivos permanecen en la configuración de inicio. Es necesario conectar la base de datos antes de que se puedan leer los ajustes persistentes. El primer administrador sigue utilizando el comando de inicio explícito.

<a id="api-and-secret-handling"></a>

## API y manejo de secretos

`GET` / `PUT /api/v1/admin/service-credentials` Se requiere un administrador de sistemas; las mutaciones validan Origin. GET reemplaza los secretos configurados por null. En PUT, null conserva el secreto existente y una cadena vacía lo elimina. No se debe enviar una cadena de ocultamiento falsa. Las verificaciones de revisión evitan sobrescrituras concurrentes. El registro de auditoría almacena la acción, no los valores del secreto; las restricciones del protocolo de punto de acceso, el origen y el redireccionamiento permanecen.

El servidor conserva credenciales de terceros utilizables. Trate la base de datos y los respaldos como configuración sensible. Los secretos guardados no se devuelven a los usuarios comunes, al bootstrap público, a los registros de errores o a las respuestas GET del administrador. La encriptación de credenciales del plugin no vuelve a encriptar automáticamente estas configuraciones de la plataforma.

Cada proceso de servicio verifica la revisión de configuraciones antes de las solicitudes de API y actualiza los adaptadores después de un cambio sin reiniciar. Rotar el secreto de verificación anula los desafíos de verificación pendientes. Los cambios en las credenciales de almacenamiento se realizan según lo establecido en el despliegue. [reglas de almacenamiento](storage.es.md), incluyendo la preservación de los IDs de almacenamiento estables y los bytes referenciados.
