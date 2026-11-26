<a id="shared-plugin-business-database"></a>

# Base de datos comercial de complementos compartidos

[简体中文](plugin-database-isolation.zh-CN.md)

Todos los complementos comparten una base de datos empresarial gestionada por el host, separada de la base de datos principal. PostgreSQL necesita una configuración de base de datos/cuenta para el despliegue; el host crea automáticamente el esquema y las tablas de cada complemento. SQLite no requiere configuración y crea automáticamente un archivo compartido. Los complementos continúan utilizando lo mismo. `storage.sql.v1` SDK, esquema versión 1 y `dataVersion`, sin cadenas de conexión, controladores o caminos de sistema de archivos.

<a id="configuration-and-isolation"></a>

## Configuración e aislamiento

SQLite se establece por defecto en `<DOCA_SQLITE_PATH>.plugins.db`. `DOCA_PLUGIN_DATABASE_PATH` Se selecciona opcionalmente otro archivo local persistente. El archivo tiene modo 0600. Cada tabla física tiene un `plugin_<SHA256(plugin ID), first 56 hex>__` Prefijo; los nombres de tablas del SDK permanecen sin cambios. Los hosts en memoria utilizan una base de datos compartida en memoria para cada conexión del host. Realice una copia de seguridad del archivo compartido junto con la base de datos principal y el almacenamiento de archivos privados. SQLite sigue siendo una opción para un solo host.

PostgreSQL utiliza una base de datos empresarial provista por un operador y una cuenta de inicio de sesión. Los privilegios de la cuenta son elegidos por el operador de despliegue; se aceptan cuentas ordinarias, superusuarios, roles con atributos administrativos o afiliaciones, y la misma cuenta utilizada para el core. La cuenta debe ser efectiva. `CONNECT` y `CREATE` privilegios en esa base de datos de negocios para crear esquemas de complemento, además `USAGE` y `CREATE` en él `public` Esquema para inicializar el marcador compartido. A nivel de base de datos `CREATE` no otorga nivel de esquema `CREATE`PostgreSQL 17/18 no otorga este privilegio a los roles no propietarios comunes por defecto. Véase [Privilegios del esquema de PostgreSQL](https://www.postgresql.org/docs/18/ddl-schemas.html#DDL-SCHEMAS-PRIV). Configúrelos una vez antes de activar los complementos de SQL:

```dotenv
DOCA_PLUGIN_DATABASE_URL=postgresql://doca_plugins:replace-me@postgres:5432/doca_plugins
DOCA_PLUGIN_DATABASE_POOL_MAX=4
```

Para una nueva implementación, las siguientes disposiciones opcionales para cuentas dedicadas preparan la tienda. `psql` (sustituir la contraseña). También se puede configurar directamente un cuenta existente y autorizada adecuadamente:

```sql
CREATE ROLE doca_plugins LOGIN PASSWORD 'replace-me';
CREATE DATABASE doca_plugins;
REVOKE ALL ON DATABASE doca_plugins FROM PUBLIC;
GRANT CONNECT, CREATE ON DATABASE doca_plugins TO doca_plugins;
\connect doca_plugins
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO doca_plugins;
```

Para una implementación existente, mantenga su rol, base de datos y datos. Si los informes de inicialización están ausentes `USAGE`/`CREATE` en `public`, conectarse como propietario de la base de datos a **base de datos de negocios complemento** y correr `GRANT USAGE, CREATE ON SCHEMA public TO doca_plugins;`, utilizando el nombre de rol configurado. Si se crea un esquema de plugin, se reporta falta de base de datos `CREATE`, conceder `CREATE ON DATABASE doca_plugins TO doca_plugins` como su propietario. Volver a intentar el inicio después de corregir los permisos; no es necesario desinstalar, restablecer ni convertir datos. El host no otorga privilegios automáticamente. Estas autorizaciones se aplican únicamente a la base de datos empresarial dedicada al complemento. Los marcadores compartidos existentes no requieren `CREATE` en `public` De nuevo. Las cadenas de conexión/passwords y los errores de SQL bruto permanecen ocultos de las respuestas del complemento; estos diagnósticos de configuración del host corregidos se reportan de manera explícita.

El anfitrión crea automáticamente `plugin_<SHA256(plugin ID), first 56 hex>` Esquemas en la primera declaración. Cada complemento comparte un grupo de conexiones por cada instancia de host. `DOCA_PLUGIN_DATABASE_POOL_MAX` Es un número entero entre 1 y 20, por defecto 4. Incluir este conjunto, los conjuntos de core/AI/webhook y el número de instancias en el presupuesto de conexión al servidor. Todas las réplicas deben utilizar la misma base de datos comercial compartida. No se requiere ninguna base de datos, rol ni entrada de conexión al agregar otro plugin. Los plugins sin almacenamiento SQL no necesitan esta URL.

La base de datos empresarial configurada debe ser separada de core, incluso cuando ambas URLs usen el mismo inicio de sesión. El host no inspecciona atributos de rol elevados, afiliaciones de rol ni privilegios de tabla core, y no cambia los permisos de la cuenta de la base de datos. Los operadores deciden si restringir las cuentas con concedimientos de PostgreSQL. El host no crea bases de datos/roles y nunca recurre al almacenamiento core. Las transacciones de PostgreSQL establecen un esquema local a la transacción; las conexiones agrupadas no conservan el alcance de otro plugin. Uninstall inspecciona y elimina solo las tablas declaradas y el marcador de instalación del plugin eliminado; otros esquemas de plugin/datos y el almacenamiento compartido permanecen.

La política de cuenta gestionada por el operador fue aprobada el 2026-10-16. Reemplaza la rechazo de privilegios de cuenta que existía en las versiones 0.1.26–0.1.29. Las declaraciones, marcadores, generaciones y versiones de datos del formato 3 existentes se conservan sin conversión; no se modifican datos ni permisos mediante la actualización. Volver a la versión anterior del sistema restaura las restricciones de cuenta antiguas, por lo que el inicio de sesión de un administrador podría ser rechazado nuevamente. Mantenga la base de datos, los datos y la configuración existentes al planificar la restauración. El procedimiento de actualización al formato 2 que se describe a continuación no cambia.

Esto es aislamiento a través de servicios SDK propiedad del host. Los complementos se ejecutan en un proceso confiable de Node.js; compartir el rol empresarial no es un proceso ni una sombra de sistema operativo.

El núcleo retiene usuarios, documentos, permisos, auditoría de seguridad, uso bruto de IA, referencias al registro/archivo de plugins, registros de espacio de nombres, credenciales encriptadas, referencias a objetos privados y intenciones de reciclaje de objetos duraderos. Propiedad/permisos de archivos y credenciales, DDL del núcleo y `schema_baseline.id` se mantendrá sin cambios.

<a id="exact-storage-format-and-lifecycle"></a>

## Formato de almacenamiento exacto y ciclo de vida

Las declaraciones del anfitrión utilizan el formato 3.`storageVersion: 3`, inicialmente `schema: null`). El marcador raíz compartido es `_doca_shared_plugin_database` con formato 3. Cada complemento `_doca_plugin_store` El marcador registra su ID exacto, generación, versión de datos y esquema canónico. La validación del marcador y la inspección del alcance previenen la adopción de datos no relacionados. Los archivos compartidos, nombres de espacio o tablas declaradas previamente que faltan son rechazados; nunca se crean nuevamente en silencio. Cambiar la URL/archivo no migra los datos, y una sustitución vacía es rechazada una vez que se haya registrado el esquema.

La primera declaración bloquea el espacio de nombres core, crea el espacio de nombres del complemento, las tablas de negocio y el marcador en una sola transacción de negocio, y luego registra la declaración en la transacción core. Una repetición después de una comisión core interrumpida acepta únicamente el marcador de negocio exactamente comisionado y la estructura real. Definiciones diferentes de esquema, tipos/valores por defecto/nulabilidad, restricciones primarias/unicas y tablas inesperadas son rechazadas. Los callbacks de transacción de usuario se ejecutan una vez y se eliminan después de completarse. Una comisión de negocio seguida de un fracaso en la comisión core es un resultado incierto que requiere idempotencia/leerback de negocio; los callbacks no se reproducen.

El bloqueo del espacio de nombres central se mantiene a través de la comisión empresarial, por lo que la desinstalación espera a que se realicen las escrituras aceptadas. El gancho de desinstalación empresarial se ejecuta primero. En caso de éxito, la transacción del registro central cierra la generación, limpia la selección de instalación y las credenciales, y agrupa la limpieza de objetos privados. Los archivos de usuario, permisos, recibos y archivos de liberación permanecen. En caso de fallo del gancho, la instalación se mantiene; no se pueden revertir los efectos del gancho externo.

La limpieza empresarial se realiza mediante el commit principal, utilizando la declaración conservada como intención duradera. Los inicios de proyecto, las limpiezas periódicas, los intentos de desinstalar e instalar vuelven a intentar la operación. La limpieza verifica la generación y los marcadores eliminados antes de eliminar las tablas declaradas. Las tablas desconocidas o los marcadores incorrectos rechazan la limpieza sin una eliminación parcial. PostgreSQL deja el espacio de nombres vacío para que se pueda realizar un intento idempotente; SQLite deja el archivo compartido. La reinstalación espera a que se realice la limpieza, incrementa la generación y crea tablas empresariales vacías. No se promete ningún commit atómico distribuido ni tareas automáticas del clúster; es necesario reiniciar cada instancia.

<a id="approved-upgrade-from-0125"></a>

## Actualización aprobada desde 0.1.25

El propietario aprobó. **Desinstalación normal de la versión anterior seguida de reinstalación, sin migrar los datos del complemento**. La versión 0.1.25 utiliza archivos y bases de datos por plugin y el formato 2. Se rechazan las instalaciones del formato-2, incluidos los plugins sin estado, antes de que se realicen las escrituras de reconciliación del núcleo. El obsoleto `DOCA_PLUGIN_DATABASE_DIR` y `DOCA_PLUGIN_DATABASES_JSON` Los ajustes se rechazan explícitamente. No hay lector de archivos antiguos, conversión automática de datos, escritura dual ni eliminación automática de bases de datos/archivos antiguos.

1. Haga una copia de seguridad de la base de datos principal original, todas las bases de datos y archivos de plugins antiguos, el almacenamiento de archivos privados, la configuración y la clave maestra de credenciales original.
2. En el host anterior, normalmente se desinstala cada complemento empresarial externo y se resuelven todos los procesos de limpieza pendientes. Esto descarta deliberadamente sus registros empresariales privados, credenciales encriptadas y objetos privados. Se vuelven a configurar los complementos y se vuelven a asignar las cuentas externas después de reinstalar. Los datos centrales y los archivos de usuarios comunes permanecen.
3. Detenga todas las instancias de host. Elimine las configuraciones antiguas por plugin. Para PostgreSQL, proporcione/configure una base de datos empresarial compartida vacía y un inicio de sesión seleccionado por el operador; para SQLite, utilice el archivo compartido automático o configure su ruta. Mantenga los almacenes/backups antiguos como evidencia de recuperación.
4. Implemente el nuevo host contra la base de datos central existente, los archivos ordinarios y la clave maestra original. Reinstale los complementos y reinicie cada instancia. El host se unirá automáticamente a cada complemento en la base de datos comercial compartida, comenzando con datos comerciales privados vacíos.

Si la desinstalación falla, resuelva el problema en el host anterior. Si el inicio del sistema rechaza una instalación residual, vuelva al mismo host para completar la desinstalación; nunca restablezca la base de datos principal. El historial del espacio de nombres ya eliminado permanece, y una reinstalación explícita incrementa su generación. El manejo existente del historial de espacio de nombres limpiado antes de la versión 0.1.25 se mantiene; no se leen los datos comerciales antiguos. Lo residual que queda colocado… `plugin_<56 hex>` Las tablas de versiones aún más antiguas siguen requiriendo revisión y no se eliminan automáticamente.

Antes de las nuevas escrituras, la recuperación al estado previo a la desinstalación requiere que se coincidan los respaldos originales de core/plugin/archivo y el código/configuración antiguo. Las autorizaciones externas revocadas pueden necesitar reconfiguración. Después de las nuevas escrituras, mantenga las bases de datos/archivos nuevos y acuerde un plan de recuperación separado; restaurar los respaldos antiguos descartaría los datos posteriores. Los hosts antiguos no pueden leer el formato 3. La operación mixta de hosts antiguos y nuevos no es soportada.

<a id="verification"></a>

## Verificación

`scripts/verify-plugin-database-isolation-upgrade.ts` crea datos de núcleo retenidos sintéticos y datos de plugin privado formato-2 con el contenido real publicado `smartdoca/doca:0.1.25` Imagen. Verifica el rechazo sin modificar las filas/declaraciones principales mantenidas, realiza la desinstalación normal del antiguo host, vuelve a abrir la misma base de datos principal y reinstala en un almacén compartido vacío. Ejecútalo en SQLite y PostgreSQL 17/18 aislados. Los tests de almacenamiento gestionado también cubren los mismos nombres lógicos entre plugins, almacenamiento físico/pool compartido, reinicio, ámbitos concurrentes, rollback, generaciones obsoletas, almacenes ausentes y limpieza repetible. Estas verificaciones no establecen la implementación en producción ni operaciones con versiones mixtas.
