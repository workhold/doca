<a id="architecture-and-implementation-boundaries"></a>

# Límites de arquitectura e implementación

[中文](architecture.zh-CN.md)

Línea base: host 0.2.23 / SDK 0.1.11, la documentación se verificó con la fuente el 2026-10-28. Esto describe la asamblea implementada y los límites; los servicios específicos del despliegue y el comportamiento del dispositivo requieren aceptación separada. Comenzar con [capacidades y limitaciones](features.es.md).

<a id="application-and-modules"></a>

## Aplicaciones y módulos

Doca es un monolito modular en TypeScript. El desarrollo utiliza React/Vite y Fastify en puertos separados detrás de una misma origen de navegador. En producción, se sirve la aplicación web y la API construida a través de Fastify. Cordis administra los servicios y el ciclo de vida en proceso; el SDK público define los límites del complemento.

```text
Browser: React + five document editors
  │ same-origin HTTP / WebSocket; host-authenticated sessions
Fastify: Host/Origin validation, routes, security, static files
  │
Host composition: accounts, documents, files, search, AI, knowledge
  │ trusted business plugins discovered in the installation directory
Core domain rules / Kysely database access
  │
SQLite single instance, or shared PostgreSQL + Redis + file backend
```

El host por defecto contiene texto enriquecido, Markdown, hojas de cálculo, diapositivas, lienzo, permisos de documento, descubrimiento, archivos, suscripciones de fuente y libros de conocimiento, autenticación, revisión de registro, auditoría de seguridad y datos brutos de uso de IA. Notas rápidas, correo, calendario, membresía, facturación, cuotas empresariales y moderación son asuntos comerciales independientes; no existe un proveedor de este tipo instalado por defecto. Plantillas/materiaslementos exponen interfaces sin proveedores por defecto.

<a id="directories"></a>

## Directorios

| Camino | Responsabilidad |
| --- | --- |
| `apps/server/src/main.ts` | Startup, escuchando, apagado |
| `apps/server/src/bootstrap/config.ts` | Origen, base de datos, proxy, configuración de Redis |
| `apps/server/src/app/create-app.ts` | Rutas HTTP, límites de sesiones y seguridad |
| `apps/server/src/plugins/composition.ts` | Servicios integrados y montaje de complementos instalados |
| `apps/server/src/routes` | Anfitrión de extremos HTTP |
| `apps/server/src/services` | Realtime, búsqueda, IA y otros servicios de aplicaciones |
| `apps/web/src/app/app.tsx` | Enrutamiento del espacio de trabajo y ensamblaje de características |
| `apps/web/src/features/documents/document-editor.tsx` | Envío a los cinco paquetes de editor instalados |
| `packages/core/src` | Reglas de dominio, autorización y transacciones |
| `packages/db/src/create-schema.ts` | DDL actual objetivo para la creación nueva y la reconciliación de inicio de operaciones |
| `packages/plugin-sdk` | Interfases de servidor público/Web/complemento |
| `tests` | Comprobaciones de unidad aislada e integración |

El código web utiliza DTOs HTTP en lugar de importar los datos internos de la base de datos o la contraseña. Los plugins empresariales consumen servicios SDK publicados y nunca importan fuentes de host ni crean puentes de ejecución globales. Ver [arquitectura de complemento](plugin-architecture.es.md) y [inventario de implementación](plugin-sdk-contract.es.md).

<a id="identity-and-security"></a>

## Identidad y seguridad

Una implementación tiene un sistema de cuenta, sin tablas de organización, espacio o inquilino. El registro y los proveedores externos comienzan deshabilitados; no existe un administrador predeterminado. Las contraseñas utilizan scrypt y saltes aleatorios; la base de datos almacena los digests de sesiones. Las sesiones de navegador, QR-login y WebView tienen un tiempo de validez predeterminado de 24 horas; las sesiones móviles de portador tienen un tiempo de validez predeterminado de 180 días. Ambos tiempos de validez son configurables. [configuración de sesión](configuration.es.md#login-lifetime)Los cambios de contraseña y la desactivación de cuentas revocan las sesiones.

Cada solicitud verifica el Host configurado. Las mutaciones también verifican la Origin de origen mismo. Los cookies del sitio son HttpOnly, SameSite=Strict y Secure sobre HTTPS. Los adaptadores de autenticación soportan OIDC externo y proveedores sociales; se implementan verificaciones de contacto y recuperación, y se requieren puertas de verificación. La aprobación de registro tiene un flujo de trabajo de revisión dedicado. Como proveedor de OIDC, Doca no ofrece SAML ni logout a nivel de IdP. Ver [autenticación](authentication.es.md).

La administración no otorga acceso a contenido privado. La falta de acceso para leer generalmente devuelve 404; un lector autorizado que no realiza ninguna acción recibe 403. Las ACLs, las concesiones heredadas, las publicaciones, las colecciones y el intercambio tienen reglas separadas. Los antepasados ocultos no se revelan. Véase [permisos](permission-inheritance.es.md) y [descubrimiento](public-resource-discovery.es.md).

<a id="persistence-and-collaboration"></a>

## Perseverancia y colaboración

Los metadatos del documento utilizan HTTP y verificaciones de versión. Los cinco formatos de editor utilizan un ciclo de vida WebSocket de un único host con codificadores Yjs específicos para cada formato. El servidor valida el contenido, vuelve a verificar la autorización y realiza el commit antes de reconocerlo; la versión de metadatos, la secuencia de contenido, el epoch, el esquema y los IDs de historial son distintos. La historia está disponible para todos los formatos, pero el restauro actualmente solo soporta texto enriquecido y Markdown. Véase [colaboración](collaboration.es.md) y [historia del documento](document-experience.es.md).

SQLite, IA y almacenamiento de webhook, además de archivos locales, forman una única instancia. PostgreSQL utiliza una base de datos de webhook separada y un esquema de IA. Múltiples réplicas requieren una base de datos compartida, un backend de archivos y Redis para eventos, presencia y límites. Sin Redis, dichas implementaciones son locales al proceso. Los fallos en el Redis configurado no se reemplazan silenciosamente. Los trabajos de la base de datos utilizan arrendamientos/outboxes, no solo memoria de proceso. Véase [configuración](configuration.es.md) y [Escalado horizontal](horizontal-scaling.es.md).

Los objetos conservan IDs estables de almacenamiento y referencias de objetos. La configuración del entorno selecciona almacenes físicos; la página de administración de almacenamiento es de solo lectura. Las descargas privadas verifican nuevamente el acceso. Un CDN proporciona URLs autorizadas que expiran y nunca reemplaza el almacenamiento. Los respaldos incluyen toda la base de datos, el servidor referenciado, el archivo del complemento y la configuración protegida. Ver [almacenamiento de archivos](storage.es.md).

Los complementos instalados utilizan registros compartidos del registro y archivos inmutables, además de un caché de escritura por instancia restaurado al iniciar. Un reinicio manual activa las versiones deseadas. Se implementan SQL privado gestionado, objetos y credenciales; la agotación de tareas, los espacios de trabajo temporales y una mayor aislamiento de procesos siguen siendo deficiencias. La validación de versión exacta rechaza las líneas base o estructuras no soportadas; no se añade ninguna migración ni adaptador de compatibilidad aquí. Los datos existentes deben ser preservados. Véase [requisitos de liberación](releases/0.2.23.md) y el [Contrato de actualización de base de datos](database-schema-evolution.es.md).

<a id="current-limits-and-acceptance"></a>

## Límites actuales y aceptación

Los hilos de comentarios y las notificaciones tienen endpoints paginados dedicados; los detalles del documento no constituyen una exportación completa de comentarios. Se implementan réplicas locales persistentes y buzones de correo; no está disponible un shell de aplicación offline completo. La integración nativa con dispositivos, los proveedores de identidad/IA en tiempo real, los S3/CDN de producción y el failover de infraestructura de destino requieren aceptación separada. Las pruebas automatizadas y aisladas demuestran su alcance declarado; una compilación no prueba que todos los servicios externos estén operativos.
