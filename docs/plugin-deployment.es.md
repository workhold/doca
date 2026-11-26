<a id="install-and-deploy-plugins"></a>

# Instalar y desplegar complementos

0.1.26 utiliza un [base de datos comercial de complementos compartidos](plugin-database-isolation.es.md), separado del núcleo, con espacios de nombres automáticos. Reemplaza a las bases de datos por plugin lanzadas en 0.1.25. La actualización requiere desinstalar normalmente en el host anterior y reinstalar; los datos del plugin no se migran.

[中文](plugin-deployment.zh-CN.md)

El aprobado [Contrato de almacenamiento gestionado](plugin-horizontal-scaling.es.md) requiere `doca.storage: "host"` Y la persistencia propia del host. Se implementan rechazo estático, SQL gestionado y objetos privados. Las credenciales se exportan en el SDK versión 0.1.8; persisten brechas en espacios de trabajo temporales y la eliminación de tareas en el clúster. Los complementos no seleccionan backend locales/remotos ni reciben directorios de datos de negocio.

Los administradores usan **Admin → Complementos** Para navegar por la tienda oficial, subir un archivo ZIP local, instalar, actualizar, activar, desactivar o desinstalar complementos. Los cambios se guardan como la instalación deseada y surten efecto en el próximo reinicio de cada instancia. La página muestra la versión en ejecución de la instancia de respuesta por separado del objetivo global. La desinstalación actual llama al gancho de limpieza empresarial requerido, luego elimina el marcador de estructura. Si el gancho falla, la instalación permanece intacta. La limpieza de la tienda privada gestionada por el host utiliza cerramiento de generación y registros de basura de objetos duraderos; la tarea empresarial de drenaje sigue sin implementarse; la eliminación del sistema de archivos de complementos está prohibida. Las actualizaciones de un complemento instalado todavía requieren lo mismo. `doca.dataVersion`. Los complementos verifican la estructura real de la base de datos durante la inicialización.

```dotenv
DOCA_PLUGIN_STORE_URL=https://store.smartdoca.cc
DOCA_PLUGINS_DIR=/data/plugins
```

La dirección de la tienda es una origen HTTP(S) configurable. Verifique la disponibilidad del servicio remoto por separado; una tienda no disponible permite que los plugins locales subidos e instalados sigan funcionando. Vacío `DOCA_PLUGINS_DIR` vuelve a `${DOCA_DATA_DIR:-./data}/plugins`, en relación con el directorio de trabajo. Solo el host configura el almacenamiento de base de datos/objetos duradero. No existe la variable de entorno plugin business-data-directory; las API de plugin nunca revelan si el host almacena localmente o remotamente.

Para la implementación Compose proporcionada, ejecute en el directorio de implementación:

```sh
docker compose restart doca
```

Aquí, `doca` Es el nombre del servicio bajo `services` en `compose.yaml`; el nombre del contenedor puede variar. Si renombró el servicio, reemplace `doca` En la orden, con el nombre de tu servicio.

Reiniciar cada instancia en un despliegue con múltiples instancias; utilizar el supervisor adecuado para otros tipos de despliegue. La interfaz de usuario no reinicia procesos. Durante un reinicio gradual, reducir el tráfico o utilizar la afinidad si las APIs de complemento han cambiado. La versión V1 no promete APIs de versiones mixtas sin interrupción de servicio.

<a id="implemented-storage-revision-2026-10-03-sdk-source-018"></a>

## Implementada revisión de almacenamiento (2026-10-03, fuente SDK 0.1.8)

`@smartdoca/plugin-sdk/storage` Ahora exporta productos destinados a instalaciones. `pluginDatabaseToken` (`storage.sql.v1`) y `pluginObjectStorageToken` (`storage.objects.v1`). El subconjunto de la base de datos es la versión de esquema 1, con columnas texto/int32/double, restricciones primarias/únicas, operaciones de selección/inserción/actualización/eliminación estructuradas y transacciones con llamadas de callback ejecutadas una vez. La fuente SDK 0.1.8 también exporta `pluginCredentialToken` (`storage.credentials.v1`): CRUD encriptado exclusivo para servidor, metadatos y verificaciones de revisión. Ver [API de credenciales](plugin-credentials.es.md). Los vínculos, claves foráneas, SQL genérico, upsert y espacio de trabajo no se exportan. El SQL empresarial utiliza una base de datos gestionada por un host compartido, separada del núcleo: un archivo SQLite con prefijos de tabla, o una URL/cuenta de PostgreSQL con esquemas de complemento automáticos y un grupo de conexiones compartido. La aislación de procesos sigue sin estar implementada. Véase [Configuración de almacenamiento y contrato de desinstalación antes de la actualización](plugin-database-isolation.es.md).

Los bases de datos lógicas utilizan `plugin:<pluginId>`Atribución de archivos de usuario y uso de objetos privados `plugins/<pluginId>`, y el uso de ZIPs liberados `host/plugin-releases/<sha256>.zip`Los bytes ZIP inmutables completos se almacenan en un archivo de almacenamiento configurado en el entorno; la base de datos compartida contiene la versión 2 del registro, referencias de archivo y índices de hash de archivo confiables. Los hits de caché verificados no descargan los ZIP de nuevo. Todas las instancias se reinician manualmente. El nuevo estándar de host rechaza los bases de datos/formatos/paquetes SDK más antiguos y preserva sus datos, sin necesidad de migración ni fallback. Ver [Implementación exacta y limitaciones](unified-storage-implementation.md).

<a id="distribution-and-filesystem"></a>

## Distribución y sistema de archivos

Todas las instancias utilizan la misma base de datos de host. PostgreSQL es la opción de despliegue distribuido. La base de datos almacena un registro deseado atómico y referencias de archivo inmutable; los ZIP completos, incluidos los cargas locales, se encuentran en el almacén de archivos compartido configurado. Cada instancia tiene un caché privado y writable:

```text
/data/plugins/
  .releases/<sha256>/          verified immutable releases
  .staging/                   temporary extraction
  .imports/                   retained offline folder imports
```

El servidor verifica cada archivo contra el archivo compartido, restaura los archivos faltantes o corruptos y solo entonces importa los complementos. Nunca instala dependencias de npm, compila el código fuente ni contacta con la tienda. Un archivo compartido faltante o corrupto impide el inicio. Haga copias de seguridad tanto de los metadatos de la base de datos compartida como de los almacenes de archivos configurados que contienen versiones inmutables. El host también realiza copias de seguridad de los registros de plugins gestionados, objetos privados, referencias de archivos de usuario y credenciales. Los backend persistentes multi-instancia deben ser compartidos; un nombre de directorio no es una base de datos distribuida.

No compartir el directorio de caché de plugin entre instancias en vivo. Instalarlo en una instancia no requiere copiarlo manualmente a otra. Los activos del navegador con versiones históricas también pueden restaurados cuando sea necesario desde los archivos compartidos para manejar el enrutamiento del balanceador de carga.

Instalación sin conexión: mientras una instancia esté detenida, realice una liberación completa. `<DOCA_PLUGINS_DIR>/<plugin-id>/`Al iniciar, se empaqueta y se publica en el registro compartido, luego se mueve a `.imports/`Otros casos se sincronizan al reiniciar. La administración rutinaria debe utilizar carga por ZIP. No existe un manifiesto npm raíz ni un camino de compatibilidad para carga de fuentes.

Los códigos postales locales y los códigos postales de las tiendas tienen el mismo diseño y verificaciones. Utilice [Protocolo de almacenamiento y especificación de paquetes](plugin-store-protocol.es.md)Los archivos de programa, los datos empresariales y las credenciales pueden escribirse por separado. No se ejecutan scripts durante la extracción. Las dependencias completas de ejecución deben enviarse como archivos reales; los enlaces de pnpm no son artefactos distribuibles.

<a id="lifecycle-and-retention"></a>

## Ciclo de vida y retención

El anfitrión verifica el rango del SDK, los IDs duplicados, la versión de datos y las dependencias del complemento antes de importar el código. La configuración es global; la identidad y los permisos de la solicitud permanecen en manos del anfitrión. La gestión realiza comprobaciones de revisión para que los administradores conflictivos vuelvan a intentar en lugar de sobrescribirse mutuamente. Las operaciones crean eventos de auditoría de seguridad.

Desactivar e desinstalar se realiza al reiniciar. Hasta entonces, el proceso antiguo sigue sirviendo al complemento antiguo. Los cachés de código antiguo y los archivos inmutables se conservan para las instancias en ejecución y la reinstalación; en la versión 1 no hay recolección automática de basura de archivos. Desactivar/cerrar preserva el estado duradero. Los adjuntos de usuario, los payloads de documentos, las referencias de otras empresas y los recibos de archivos no se eliminan automáticamente; la limpieza del estado privado gestionado es propiedad del host y todavía requiere un coordinador de clúster. La cancelación restaura la selección de inicio de la instancia de respuesta; es un nuevo cambio de estado deseado global, no un despliegue instantáneo de otros procesos.

Los fallos actuales en la inicialización del complemento aún impiden el inicio del sistema. Los fallos de compatibilidad entre el SDK y las dependencias están aislados, como se describe a continuación, manteniendo disponible la gestión del complemento. No existe desinstalación rápida, panel de control de finalización del clúster ni instalación de código dinámico nativo para móviles.

La validación utiliza bases de datos aisladas y directorios temporales. Véase [Aceptación del almacenamiento](plugin-store-protocol.es.md#cross-repository-acceptance).

<a id="compatibility-failure-isolation"></a>

## Isolación de fallos de compatibilidad

Un rango de SDK incompatible o una dependencia requerida no disponible aísla el plugin de negocio afectado. El host y los plugins no relacionados se inician, y Admin → Plugins explica el motivo y solicita una actualización. La selección de instalaciones, los archivos, los datos de negocio y las credenciales se conservan. Los paquetes antiguos no se convierten y el código del SDK antiguo no se ejecuta. Las nuevas instalaciones en línea aún rechazan los paquetes incompatibles. Las carpetas de instalación completamente offline conservan su identidad original y reciben la misma aislación.

Los paquetes antiguos no declaran estáticamente todas las políticas comerciales que registran. Mientras que en esta instancia hay un complemento activo pero no disponible, los datos cubiertos por las verificaciones de la política de complementos existente devuelven 503. Iniciar sesión, leer y la gestión de complementos siguen siendo disponibles. Actualice a un paquete compatible, o desactive explícitamente los complementos afectados, luego reinicie todas las instancias para eliminar esta protección. Las fuentes de permisos del complemento ausente continúan denegando la autorización. El código SDK incompatible no puede ejecutar ganchos de desinstalación; primero actualice. Una actualización compatible en etapas no puede cancelarse de nuevo a un paquete incompatible con el SDK. Los paquetes de reemplazo deben mantener dataVersion y la estructura comercial existente.

La aislamiento es un estado de diagnóstico local en la instancia, y no constituye un cambio en el esquema de registro o base de datos. Archivos corruptos, metadatos inválidos, fallos en el núcleo y errores reales en el ciclo de vida siguen fallando de manera explícita. No se introduce ninguna migración de datos ni una degradación de la aplicación.
