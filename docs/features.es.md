<a id="capabilities-and-limits"></a>

# Capacidades y limitaciones

[中文](features.zh-CN.md)

Esta página fue verificada contra la fuente actual para el host **0.2.25** y SDK de complemento **0.1.11** El 29 de octubre de 2026. Antes de instalar plugins empresariales, el host proporciona las capacidades básicas siguientes. Cada plugin independiente documenta sus propias características, versiones y resultados de aceptación.

<a id="core-capabilities"></a>

## Capacidades básicas

| Capacidad | Estado actual y requisitos | Guía |
| --- | --- | --- |
| Texto enriquecido, Markdown, hojas de cálculo, diapositivas, lienzo | Los cinco editores están integrados; la edición requiere permiso de recursos | [Documentos y compartición](document-experience.es.md) |
| Colaboración y confirmación de salvamento | Todos los cinco formatos utilizan el transporte WebSocket del host y recibos durables; las réplicas requieren PostgreSQL, Redis y almacenamiento de archivos compartidos. | [Colaboración](collaboration.es.md) |
| Historia, instantáneas manuales, restauración | La historia está disponible para los cinco formatos; solo el texto enriquecido/Markdown con permiso del gerente, secuencia actual y un snapshot recuperable. | [Historia del documento](document-experience.es.md#history-and-restore) |
| Bibliotecas y permisos | Árboles, invitaciones, herencia, compartir enlaces, transferencia, mudanza, copia independiente y basura | [Permisos](permission-inheritance.es.md) |
| Descubrimientos, colecciones, actividad reciente | Implementado; la visibilidad en una lista y el acceso a recursos se verifican por separado | [Descubrimiento y colecciones](public-resource-discovery.es.md) |
| Archivos y anexos | Archivos personales, carpetas compartidas, subidas/bajadas autorizadas; se requiere almacenamiento local o en S3 | [Almacenamiento de archivos](storage.es.md) |
| Comentarios y notificaciones en la aplicación | Implementado en cinco formatos, incluyendo anclajes estables de filas/columnas en hoja de cálculo | [Comentarios y notificaciones](comments-and-community.es.md) |
| Búsqueda de documentos | Disponible búsqueda básica en base de datos; los índices de texto completo y vectores requieren Meilisearch y modelos adecuados. | [API HTTP](api.es.md#search) |
| Asistente personal de IA | Se implementan sesiones, herramientas, aprobaciones y registros de uso bruto; se requieren modelos y credenciales disponibles. | [Guía de usuario](user-guide.es.md) |
| Extensión de navegador | Instalación de Chrome/Edge sin paquetes, captura de páginas y selecciones, perfiles de destino y barra lateral de IA compartida; la IA requiere configuración del modelo del sitio | [Asistente de navegador](browser-assistant.es.md) |
| Servicios MCP | Los clientes externos utilizan herramientas y habilidades autorizadas a través de servicios personales o integraciones empresariales con un usuario objetivo específico; las permisos de recursos siguen aplicándose. | [Servicios MCP](mcp.es.md) |
| Cliente de escritorio | Aplicaciones de Windows y macOS se conectan a su propio host a través de la autorización del navegador del sistema; ventanas de espacio de trabajo con múltiples pestañas, varios servidores al mismo tiempo, restauración de páginas por servidor; el host debe tener la versión 0.2.37 o más reciente. | [Cliente de escritorio](desktop-client.es.md) |
| Libros de conocimiento y suscripciones a fuentes | Core: suscripciones de fuentes, libros de conocimiento inmutables, flujos de trabajo editables, proveniencia y retroalimentación humana; los antiguos robots de curaduría y Q&A se eliminaron | [Libros de conocimiento](knowledge-books.es.md) |
| Cuentas locales y inicio de sesión externo | Se implementan contraseñas, códigos de verificación de contacto, recuperación, revisión de registro, OIDC/OAuth y adaptadores sociales; los servicios externos necesitan credenciales reales. | [Autenticación](authentication.es.md) |
| Webhooks | Se implementan entregas asincrónicas, intentos de reintento y registros; se requiere un receptor configurado | [Webhooks](webhooks.es.md) |
| Instalación del complemento y SDK público | Paquetes preconstruidos de confianza, detección de directorios de instalación, activación de reinicio; se implementan SQL gestionado, objetos y credenciales encriptadas. | [Despliegue de complemento](plugin-deployment.es.md) |

<a id="independent-plugins-and-removed-features"></a>

## Plugins independientes y características eliminadas

- **Notas rápidas** ha sido eliminado del host. No tiene nada `#/notes` página, `/api/v1/quick-notes` API, `quick_notes` mesa, o `quick_note_compilations` Mesa. El antiguo guía se mantiene solo en [registro de investigaciones](research.es.md); sus interfaces no pueden utilizarse con el host actual. Este repositorio no proporciona ninguna versión de complemento de quick-notes ni garantía de características actuales.
- Correo, calendario, membresía, puntos, facturación, cuotas empresariales y moderación de contenido pertenecen a plugins empresariales independientes. La imagen por defecto no instala ninguno de estos servicios empresariales. La revisión de registro y la auditoría de seguridad siguen siendo características fundamentales.
- Los plantillas, materiales, colecciones de materiales y elementos de documento de complemento tienen interfaces y seleccionadores de anfitrión, con **Proveedores de defecto cero**Instalar un proveedor que coincida con el SDK por separado. La página de gestión de plantillas de alojamiento del anterior no está disponible. La creación de documentos en blanco sigue siendo posible sin proveedores.
- [Ejemplos](../examples) Apoyo al desarrollo y aceptación aislada. La imagen por defecto no los instala, y sus resultados no verifican plugins empresariales independientes.

<a id="unavailable-or-requiring-separate-verification"></a>

## No disponible o que requiere verificación separada

- Los editores tienen réplicas locales persistentes y colas de actualizaciones no reconocidas, lo que requiere una réplica autorizada disponible y un almacenamiento exitoso por parte del navegador. Esto no constituye una aplicación completamente sin conexión ni una garantía de arranque en frío sin conexión. Doca como proveedor de OIDC y SAML no está disponible. Véase [colaboración](collaboration.es.md).
- Los complementos para espacio de trabajo temporales, la exacción de tareas empresariales a nivel de clúster, SQL arbitrario y transacciones distribuidas entre servicios no están disponibles. Los contratos del SDK objetivo no establecen exportaciones existentes; consulte [estado de implementación](plugin-sdk-contract.es.md).
- El contenedor de WebView, que es un complemento nativo, tiene un protocolo de origen. Las compilaciones para iOS/Android, el comportamiento del dispositivo y la integración independiente de complementos requieren su propia aceptación. La instalación en el servidor no descarga ni ejecuta JavaScript nativo.
- La IA real, SSO, puertas de verificación, Webhook, S3/CDN y otros servicios dependen de la configuración de despliegue. Los pruebas de lanzamiento históricas tienen cada una un alcance definido; no verifican todos los servicios o dispositivos externos.

<a id="evidence"></a>

## Evidencia

La auditoría abarca [Composición de servicios](../apps/server/src/plugins/composition.ts), [rutas de página](../apps/web/src/app/app.tsx), [envío del cinco-editor](../apps/web/src/features/documents/document-editor.tsx), [rutas históricas](../apps/server/src/routes/experience.ts), [rutas de cuenta](../apps/server/src/routes/accounts.ts), [esquema actual](../packages/db/src/create-schema.ts), y [Exportaciones SDK](../packages/plugin-sdk/package.json). `bootstrap.capabilities` y `bootstrap.plugins` Identificar las capacidades del host y los complementos cargados en un despliegue; el primero no constituye un inventario completo de características comerciales.
