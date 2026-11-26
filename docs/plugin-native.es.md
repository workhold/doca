<a id="native-plugin-cache-and-attachments"></a>

# Caché y anexos nativos del complemento

[中文](plugin-native.zh-CN.md)

En el contenedor nativo de complemento. `host.ai.open` utiliza `assistant.open` Para abrir el asistente personal nativo. Los parámetros y errores siguen… [contrato de lanzamiento](plugin-assistant.es.md)Los prompts y el contexto no forman parte de las URLs de navegación; las credenciales de cuenta tampoco se incluyen en WebView. Las solicitudes prellenadas se almacenan en la memoria bajo la cuenta actual y un identificador de lanzamiento único.

Los tipos públicos provienen de `@smartdoca/plugin-sdk/native`, expuestos a través de `PluginWebHost.native`. Esta propiedad es nula en Web. El contenedor de plugin de la App proporciona:

- `storage.get(key)` / `set(key, value)` / `remove(key)` / `clear()`: cadena de caché, hasta 2 millones de caracteres por valor y 20 millones por complemento.
- `attachments.save({path,name,mime})` / `share(...)`: `path` está relacionado con la API del complemento, por ejemplo `/mailboxes/123/attachments/456?download=true`.

El host nativo vincula el espacio de nombres de caché con el ID de usuario verificado en línea y el ID del complemento. Los complementos no pueden elegir otra identidad. Los datos se almacenan en el directorio persistente de la aplicación, sobreviven a reinicios y se eliminan para el servidor correspondiente al salir o eliminar la cuenta. Las escrituras se serializan; una nueva instantánea se completa antes de reemplazar la anterior. El WebView sigue siendo temporal e aislado; las cookies de inicio de sesión no son un mecanismo de caché persistente.

El host nativo verifica la identidad autenticada en línea antes de cargar un complemento. El código existente de IndexedDB de complementos no se migra ni adopta automáticamente; los complementos lo utilizan explícitamente. `native.storage`Los inicios en frío completamente sin conexión no son soportados. La eliminación de la aplicación o la limpieza del almacenamiento del sistema podrían eliminar la caché.

Las descargas de archivos adjuntos utilizan el envío del host autenticado interno. Se prohíbe redirigir a orígenes externos, y el token de sesión nativo nunca se proporciona a WebView. Los archivos adjuntos tienen un tamaño máximo de 32 MiB. Los archivos temporales se eliminan después de guardar o compartir.

Android Save utiliza el selector de directorios del sistema y devuelve `completed` o `canceled`iOS Save and Share presenta la hoja de compartir del sistema y devuelve. `presented`La API del sistema no reporta de manera confiable los resultados finales de guardar/cancelar, así que `presented` No establece una salvación exitosa.

El eliminación de página o cambio de cuenta cancela las solicitudes nativas activas. La vinculación de cuentas de correo se realiza en la web; no existe un flujo nativo de OAuth.

Las comprobaciones de tipo y las pruebas de protocolo/descarga del host se completaron en la implementación registrada. La persistencia de la caché, el uso compartido del sistema y el almacenamiento aún requieren la aceptación de dispositivos iOS/Android.
