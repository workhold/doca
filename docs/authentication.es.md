<a id="authentication-registration-approval-and-account-linking"></a>

# Autenticación, aprobación de registro y vinculación de cuentas

El cliente de escritorio solo a distancia añade una credencial de host aprobada por el navegador, sin fecha de expiración. Véase [Contrato de cliente de escritorio](desktop-client.es.md)Las sesiones existentes en el navegador/móvil mantienen sus reglas de vencimiento y almacenamiento.

[中文](authentication.zh-CN.md)

Esto se aplica a la versión actual de Doca, que no tiene espacios ni un árbol de organización. Cubre cuentas locales, proveedores de identidad externos, aprobación de registro y métodos de inicio de sesión alternativos.

<a id="boundary"></a>

## Límite

Un usuario de Doca puede vincular varias identidades de inicio de sesión. Los documentos, permisos, avatares y preferencias siempre pertenecen a una entidad estable. `users.id`Los cuentas no se fusionan por correo electrónico, nombre de presentación o teléfono. La persona se conecta a la cuenta original y vincula intencionadamente la nueva identidad.

El diseño separa los datos de perfil de las identidades de inicio de sesión y utiliza enlaces explícitos, en lugar de una correspondencia implícita por correo electrónico. La creación de una cuenta y su activación son procesos separados, por lo que es posible un estado de revisión pendiente. Las cuentas existentes no se migran a otro producto de autenticación, y Doca no depende de un servicio externo de authentik.

El administrador utiliza su propio shell de toda la página: su navegación, su área de desplazamiento y una forma de volver al espacio de trabajo. Los ajustes de cuenta utilizan su propia navegación. El lenguaje visual sigue siendo el de Doca.

<a id="three-registration-policies"></a>

## Tres políticas de registro

En Administración, Inicio de sesión y registro, cada entrada se configura de forma separada:

| Entrada | Ningún nuevo usuario | Registro automático | Se requiere aprobación. |
| --- | --- | --- | --- |
| Contraseña del sitio | La inscripción está cerrada. | El inicio de sesión sigue a la registración | Se crea un usuario pendiente. |
| Enterprise OIDC | Solo una identidad ya vinculada puede iniciar sesión | El primer inicio de sesión crea un usuario | La primera iniciación de sesión crea un usuario en estado pendiente |
| Google, GitHub, WeChat, QQ | Solo una identidad ya vinculada puede iniciar sesión | El primer inicio de sesión crea un usuario | La primera iniciación de sesión crea un usuario en estado pendiente |

Un usuario activo que ya está vinculado no es bloqueado por “registro cerrado” y puede vincular otra identidad. Un usuario creado por un administrador se vuelve activo de inmediato. Un usuario en estado pendiente no tiene sesión en el sitio y no puede abrir documentos ni usar WebSocket. El administrador utiliza la página dedicada a la revisión de registros para aprobar o rechazar. Los cambios de habilitación/deshabilitación realizados por un usuario común no permiten aprobar una cuenta en estado pendiente. Después de la aprobación, la persona se conecta nuevamente. El antiguo flujo de autorización no está activo.

El registro externo y todos los proveedores de identidad están deshabilitados por defecto. La entrada de contraseña sigue siendo disponible, así que una interrupción en el proveedor de identidad no puede bloquear al administrador. Existen verificaciones de contacto, inicio de sesión con código telefónico y recuperación de contraseña. Los límites en el envío de códigos y los intentos utilizan la base de datos compartida. Los límites en el inicio de sesión con contraseña y las IP de bots públicos utilizan contadores locales almacenados en el proceso, sin Redis y con contadores compartidos cuando Redis está configurado. El SMS tiene su propia regla de admisión. Una fuente de terceros puede anular la política de categoría.

Cuando los métodos de inicio de sesión cambian, el servidor verifica a todos los usuarios y administradores activos contra los métodos habilitados, los contactos verificados, los identificadores de contraseña y las credenciales del proveedor. Si alguien no tiene ningún método útil después del cambio, la solicitud de guardar será rechazada. Un administrador puede elegir primero un nuevo método en “requerir que los usuarios agreguen un método de inicio de sesión”. La próxima vez que esos usuarios abran el sitio, deben verificar o vincularlo. El antiguo método se cierra solo después de que todos hayan terminado. Añadir un método no obliga su uso por defecto.

<a id="identity-providers"></a>

## Provedores de identidad

- **OIDC SSO.** Descubrimiento estándar, por ejemplo Keycloak o authentik. `openid-client` 6.8.8, código de autorización más PKCE S256, estado, nonce, verificaciones de firma del token de ID, y verificaciones de emisor, audiencia y vida útil. La autenticación del cliente es `client_secret_post`Las JWT con clave privada, mTLS y SAML no son compatibles. El OAuth 2 puro no es una configuración OIDC.
- **Google.** Descubrimiento corregido en `https://accounts.google.com`, alcance `openid profile`, además, correo electrónico cuando la fuente lo declara.
- **GitHub.** Código de autorización más PKCE S256 y `read:user`El identificador numérico estable proviene de `/user`Cuando se declara el correo electrónico, `user:email` lee el correo electrónico principal verificado.
- **WeChat.** Sitio web QR `snsapi_login`El binding utiliza OpenID bajo el ID de la aplicación. UnionID no combina cuentas. Esto no es una página de cuenta oficial, un mini programa ni un inicio de sesión de aplicación móvil.
- **QQ.** Sitio web OAuth. Token y `me` Usar JSON; entonces, el perfil se lee. `me.client_id` Debe coincidir con la configuración.

Se implementaron y probaron los adaptadores de WeChat y QQ con respuestas simuladas. No son aceptados en las plataformas en vivo. Cada proveedor externo necesita una aplicación y credenciales de esa plataforma. WeChat y QQ, en este flujo, no envían PKCE y no son equivalentes al PKCE de OIDC.

Doca es un cliente SSO únicamente. Al actuar como proveedor de OIDC, no se implementan SAML ni la sincronización de cierre o revocación del SSO global. Deshabilitar una cuenta en el proveedor de identidad no revoca una sesión Doca ya emitida. Las sesiones del navegador tienen una duración predeterminada de 24 horas, que puede configurarse mediante [Duración de inicio de sesión](configuration.es.md#login-lifetime)Las sesiones existentes mantienen su fecha de expiración almacenada. Un administrador del sitio desactiva al usuario, o se requiere un evento del ciclo de vida del IdP posterior.

<a id="deployment"></a>

## Despliegue

1. Registra la aplicación en cada plataforma. Utiliza el protocolo HTTP(S) configurado. `DOCA_ORIGIN`El proxy mantiene el host configurado.
2. En Configuraciones de plataforma, Credenciales de servicio, SSO, agregue un nombre de credencial y un secreto de cliente, y establezca los orígenes personalizados permitidos para SSO. El secreto se almacena en la base de datos, entra en vigor al guardar y no se repite.
3. Agregar un proveedor de identidad: nombre de visualización, emisor solo para OIDC, ID de cliente o aplicación, y el ID de credenciales. Dejelo deshabilitado, guarde y copie la URL de llamada de retorno.
4. Coloca esa URL en la lista de permisos de la plataforma, exactamente así. `https://doca.example.com/api/v1/auth/providers/<UUID>/callback`Cada proveedor tiene su propia URL. No se acepta una URL de retorno arbitraria.
5. Configurar la política de registro y habilitar al proveedor. Vincular o cerrar sesión desde la página de perfil y probar el inicio de sesión. Mantener el método original del administrador hasta que funcione.

Google, GitHub, WeChat y QQ permiten los hosts HTTPS por defecto. Cada host en un emisor OIDC y en las URLs de autorización, tokens y JWKS devueltas por el proceso de descubrimiento deben estar listados en la lista de orígenes SSO personalizados, una oríjen en cada línea. Los redirecciones están prohibidas. Un proveedor autohosted que esté explícitamente en la lista de permisos puede utilizar HTTP; OIDC también permite el descubrimiento y los endpoints en HTTP en este caso. El operador mantiene la lista de permisos junto con la política de egress. No confíe en DNS mutable o no confiables, ni en direcciones privadas arbitrarias abiertas.

El tipo, el emisor y el ID del cliente son un espacio de nombres inmutable. Un nuevo emisor o aplicación es un nuevo proveedor. Los usuarios lo vinculan ellos mismos. No utilice un ID antiguo con otro proveedor. El nombre, el ID de credenciales y el estado habilitado utilizan un bloqueo optimista de versión y anulan los flujos de autorización antiguos. Deshabilitar un proveedor puede bloquear a los usuarios que solo tenían esa fuente. Organice primero otro enlace. Un nuevo método de inicio de sesión no se obliga a utilizar a menos que un administrador reemplace uno antiguo y establezca “requiere que los usuarios agreguen un método de inicio de sesión”.

<a id="security-flow"></a>

## Flujo de seguridad

1. Un POST de origen mismo inicia el proceso con un estado aleatorio, una credencial del navegador, un nonce y un verificador PKCE. El enlace previo completa la verificación de seguridad independiente configurada por el administrador. Esa credencial es de uso único dentro de cinco minutos.
2. El servidor almacena los hashes del estado y las credenciales del navegador, además de un cookie de flujo de diez minutos. El cookie de flujo es HttpOnly y SameSite=Lax. El cookie principal sigue siendo HttpOnly y SameSite=Strict, y Secure en HTTPS.
3. El callback verifica el proveedor, el estado y las credenciales del navegador, realiza una solicitud y valida la identidad. Los registros no almacenan los parámetros de consulta del callback, los códigos, los tokens o los cuerpos de errores del proveedor.
4. El navegador se redirige a `/#/auth/complete`Un POST de origen mismo se completa y restaura la sesión Strict. La conexión debe seguir ser el usuario y la sesión que la inició, y la credencial de verificación de seguridad debe seguir ser válida.
5. Una transacción consume el flujo y verifica la versión del proveedor, la propiedad de identidad única, la política de registro y el estado del usuario. El estado “en espera” no emite una sesión. El estado “activo” solo emite una sesión Doca.

Los tokens de acceso y de actualización de terceros no se almacenan. Se almacenan el sujeto, el nombre de visualización en ese momento y los metadatos del enlace. Puede mostrarse una URL de avatar HTTP(S) declarada por la fuente. El servidor no la obtiene al azar. El avatar subido sigue utilizando el almacenamiento del sitio.

Para desvincularse se requiere una verificación reciente y no se puede eliminar el último método utilizable. Un proveedor deshabilitado o uno que falte credenciales no cuenta como ese último método. Una cuenta sin contraseña puede establecer una contraseña para el sitio después de una verificación reciente. Una cuenta que ya tenga contraseña utiliza el cambio de contraseña normal. El ID de usuario público y el inicio de sesión local son una única cadena significativa. Si la fuente no proporciona un ID adecuado, el usuario debe proporcionar uno. Un UUID no se genera como nombre. El UUID de usuario interno permanece estable.

<a id="database"></a>

## Base de datos

La línea base actual incluye estas estructuras de identidad. No crea un usuario ni restablece una contraseña por sí sola:

- `settings.registration_review` con el interruptor de registro existente. `sso_registration` y `social_registration` Están cerrados, automáticos o con aprobación. Comparten un bloqueo de revisión.
- `account_flows` Almacena una credencial de verificación de seguridad única. La sesión no es esa prueba.
- `auth_providers` Almacena la configuración, el espacio de nombres inmutable y la versión. No almacena secretos. `type` Además, el identificador del emisor y del cliente es único.
- `auth_identities` mapas `user_id` a `provider_id` además `subject`Ese par es único. `user_id` además `provider_id` Permite una identidad por usuario por proveedor.
- `auth_flows` Es un flujo de uso único de diez minutos. `stage` Se inicia, se intercambia o se verifica. La finalización lo elimina. La expiración se limpia cuando comienza un nuevo flujo.

<a id="http"></a>

## HTTP

El prefijo es `/api/v1`Las escrituras deben coincidir con la versión original.

| Ruta | ¿Quién? | Comportamiento |
| --- | --- | --- |
| GET /auth/providers | Público | Activar proveedores que tengan credenciales: id, nombre, tipo |
| GET /admin/auth | Administrador | Las tres políticas, revisiones, proveedores, preparación, URLs de llamada de devolución. Sin secretos. |
| GET/PUT /admin/accounts/policy | Administrador | Inicio de sesión con contraseña, teléfono y correo electrónico, tipo de cuenta con contraseña, y `forcedLoginMethod`Guardando comprobas que cada usuario activo mantiene un método útil. |
| PUT /admin/auth/policy | Administrador | `{revision,local,sso,social}` con cerrado, automático o aprobado |
| POST /admin/auth/providers | Administrador | `{type,name,issuer,client_id,credential_ref,enabled,version:0}` |
| PUT /admin/auth/providers/:id | Administrador | Mismos campos, versión actual. Los campos inmutables no pueden cambiar. |
| POST /auth/providers/:id/start | `{intent:"login"\|"link"\|"security"\|"replace"}` | Devuelve `{url}` Y el cookie de flujo. El enlace necesita una verificación reciente. |
| GET /auth/providers/:id/callback | El proveedor | Intercambia y verifica la identidad, luego redirige desde esta fuente. |
| POST /auth/complete | Consume el flujo verificado | Estado: activo, vinculado o en espera. Problemas activos: sesión en curso. |
| GET /me/identidades | Iniciado sesión | Inicio de sesión local, si existe una contraseña, los enlaces y si son utilizables. Sin sujeto ni token. |
| POST /auth/reauth | Iniciado sesión | `{password}` Actualiza el tiempo de verificación reciente de esta sesión |
| POST /auth/password/setup | Verificación reciente | `{password}` De 12–128 caracteres, solo para la configuración inicial, revoca otras sesiones |
| DELETE /me/identidades/:id | Verificación reciente | Desvincular. El último método útil está protegido. |
| GET /admin/users?status=pending | Administrador | Filtro y página activa, en espera o deshabilitada |
| GET /admin/registration-reviews | Administrador | Reseñas paginadas pendientes/aprobadas/rechazadas |
| POST /admin/registration-reviews/:id | Administrador | `{decision:"approved"\|"rejected",message?}` |
| PATCH /admin/users/:id | Administrador | Solo usuarios activos/incapacitados comunes; devoluciones pendientes 409 |

`POST /auth/register` Añade `status`“Pending” indica a la persona que espere y no la registra.

<a id="tests"></a>

## Pruebas

`tests/identity.test.ts` Utiliza respuestas OIDC simuladas firmadas con RSA a través del real `openid-client` Ruta. Cubre PKCE, firmas, nonce, emisor, cookies, callbacks repetidos y caducados, enlace de sesiones, políticas, aprobación y desenlace. Los adaptadores sociales utilizan HTTP simulado. Esto no es una revisión de proveedores ni un test en red pública.

SQLite y una base de datos PostgreSQL aislada ambas ejecutan la regresión completa contra el esquema actual. Un proveedor de identidad real, un proxy HTTPS y la recuperación de cuentas necesitan su propia aceptación.

<a id="september-2026-module-split"></a>

## División del módulo de septiembre de 2026

La identidad vive en `packages/core/src/modules/identity`Los adaptadores de protocolo están en funcionamiento. `apps/server/src/adapters/identity-providers.ts`Un adaptador de código de autorización OAuth 2 personalizado y PKCE puede configurar endpoints y un campo de identidad estable, que sigue estando en la lista de permisos de origen HTTP(S). Es independiente de OIDC. Un token OAuth ordinario no se trata como un token de identidad.

Cada fuente `profile_config` Se declaran los campos de registro, su origen y si pueden ser editados o sincronizados. Si el perfil está incompleto, `/auth/complete` devuelve `needs_profile` Y no crea una sesión completa. La registración o aprobación continúa después de que se envíen el perfil requerido y las credenciales de verificación de contacto. La unicidad del nombre de usuario y la vinculación entre proveedor y sujeto son independientes. Un nombre duplicado no fusiona las cuentas. Una configuración de protocolo personalizada no puede ser dirigida a otro espacio de nombres de identidad después de su creación.
