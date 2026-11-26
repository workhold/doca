<a id="single-instance-and-horizontal-scaling"></a>

# Instancia única y escalado horizontal

[中文](horizontal-scaling.zh-CN.md)

Doca mantiene un modo de única instancia sin infraestructura adicional. SQLite, un directorio de subida local y un bus en tiempo real en el proceso ajustan para una persona, un pequeño equipo o una prueba. Configurar PostgreSQL, almacenamiento de objetos compartidos y Redis solo se hace cuando se ejecutan más de una réplica de aplicación. Ambos modos utilizan el mismo protocolo de negocio. No hay una transferencia de datos o un camino de escritura dual integrado entre SQLite y PostgreSQL. Las actualizaciones de base de datos soportadas siguen el… [Contrato de actualización de base de datos](database-schema-evolution.es.md).

<a id="capability-matrix"></a>

## Matriz de capacidades

| Capacidad | Instancia única | Múltiples réplicas |
| --- | --- | --- |
| Base de datos | SQLite o PostgreSQL | PostgreSQL; cada réplica utiliza el mismo base de datos |
| Documento de colaboración y notificaciones | Transmisión y presencia en proceso | Redis Pub/Sub y Redis Presence |
| Inicio de sesión, subida de archivos y límites de velocidad para bots públicos | Contadores en proceso | Contadores de Redis |
| Archivos | Directorio persistente local | Almacenamiento compatible con S3, o un sistema de archivos realmente compartido por todas las réplicas |
| CDN | Opcional | Opcional. Solo acelera las lecturas y no reemplaza el almacenamiento compartido. |
| Trabajos en segundo plano | Arrendamientos de base de datos | Los mismos arrendamientos; cualquier réplica puede reclamar un trabajo, y un fracaso puede ser intentado de nuevo |
| Push móvil | Base de datos fuera de la caja | El mismo proceso de salida y arrendamiento; no mantenga la cola solo en un proceso |
| Esquema | El primer inicio crea la línea base actual. | Una instancia crea la línea base vacía antes del primer despliegue |
| Salud | `/live` y `/ready` | `/ready` También verifica la base de datos y Redis. |

<a id="single-instance"></a>

## Instancia única

Cuando `DOCA_REDIS_URL` No está establecido; los eventos en tiempo real, la presencia y los límites de velocidad permanecen en el proceso. No se necesita Redis. `pnpm dev`, `pnpm start`Y un único contenedor Compose crea la base actual en una base de datos vacía, luego reconcilia las estructuras existentes compatibles con el DDL actual.

No ejecute dos réplicas en este modo. Los WebSockets pegajosos en un balanceador de carga ocultan el problema por un tiempo. Las notificaciones, la revocación de permisos, los usuarios en línea y los límites globales siguen estando divididos.

<a id="minimum-multi-replica-configuration"></a>

## Configuración mínima de múltiples réplicas

Cada réplica necesita los mismos ajustes:

```dotenv
DOCA_DATABASE=postgres
DOCA_DATABASE_URL=postgresql://user:password@postgres:5432/doca
DOCA_DATABASE_POOL_MAX=10
DOCA_REDIS_URL=redis://redis:6379
DOCA_REDIS_PREFIX=doca-production
DOCA_TRUST_PROXY=10.0.0.10/32
```

El orquestador puede establecer `DOCA_INSTANCE_ID` Al nombre del pod o contenedor. De lo contrario, cada proceso genera un ID aleatorio. `DOCA_REDIS_PREFIX` Debe separar los entornos que comparten un Redis. `DOCA_TRUST_PROXY` Lista solo las direcciones de proxy inverso o CIDRs. Un rango más amplio permite que los clientes falsifiquen las IPs y violen los límites de auditoría y de tasa.

Orden de liberación:

1. Iniciar una instancia contra una base de datos vacía para que cree la línea base. No permitir que varias réplicas inicialicen una base de datos vacía al mismo tiempo.
2. Iniciar las otras réplicas con la misma versión y configuración. Los cambios estructurales aprobados se reconcilian bajo el bloqueo del esquema; las diferencias no soportadas o que requieren revisión detienen el inicio sin escrituras parciales.
3. El balanceador de carga utiliza `/ready` por tráfico y `/live` Para la salud del proceso. Se deben permitir las actualizaciones WebSocket y un drenaje normal.
4. Disponibilidad para drenaje y permitir que las conexiones HTTP/WebSocket se cierren dentro del período de gracia de detención. Se deben seguir los requisitos de lanzamiento para el orden de detención/iniciación; la implementación continua no establece compatibilidad entre diferentes versiones de host.

Una vez que Redis está configurado, es necesario utilizarlo. Una conexión fallida al iniciar, una interrupción posterior o un control de preparación fallido no se revertirá silenciosamente al bus local. Esto evita que el clúster se divida en varias instancias individuales que aún parezcan saludables.

<a id="consistency"></a>

## Consistencia

Una actualización de colaboración se almacena en una transacción de PostgreSQL y se confirma, luego Redis informa a las otras réplicas. Redis no es el registro de documentos. Los eventos duplicados se eliminan mediante el protocolo. Una pérdida breve se repara desde la base de datos después de reconectar. La presencia expira, por lo que una instancia caída desaparece.

Reconocimiento de archivos, extracción de texto, flujos de trabajo basados en conocimiento y libros, y uso móvil de push utilizan tareas y arrendamientos de base de datos. Una clave de ocurrencia asegura que varias réplicas que escanean juntas creen solo una ocurrencia comercial. Los manejadores deben ser idempotentes, porque otra réplica puede intentar nuevamente después de que un arrendamiento expira.

<a id="capacity"></a>

## Capacidad

- El total de conexiones a la base de datos es aproximadamente replicas × `DOCA_DATABASE_POOL_MAX`Manténgase bajo el límite de PostgreSQL o de pooler, y deje espacio para las operaciones y los trabajos en segundo plano.
- El disco local no puede almacenar subidas para varios hosts. Un CDN solo almacena las lecturas. Los objetos permanecen en S3 o en un sistema de archivos compartido. El almacenamiento se nombra según un nombre existente. `storage_profile` debe permanecer disponible.
- Meilisearch, S3 y gateways de mensajes deben mostrar a todas las réplicas la misma configuración y los mismos datos. Las credenciales se almacenan en la base de datos compartida. El acceso a la red, las listas de permisos y las claves siguen siendo responsabilidad del proceso de despliegue.
- La base de datos compartida registra las versiones deseadas del complemento y referencia archivos ZIP inmutables en el almacenamiento compartido. Cada réplica necesita su propio directorio de instalación/caché escritible.`DOCA_PLUGINS_DIR`); la startup lo valida y lo restaura del archivo. Las operaciones entran en efecto después del reinicio manual de cada réplica. Mantenga las versiones en funcionamiento consistentes; véase [despliegue de complemento](plugin-deployment.es.md).
- Redis debe utilizar autenticación, TLS o una red privada, un límite de memoria y alertas. La base de datos y el almacenamiento de objetos todavía necesitan sus propios respaldos. Al perder Redis, no se debe perder el texto del documento, pero deja de funcionar en tiempo real, la presencia y los límites globales.
- `/ready` Solo demuestra que esta réplica puede acceder al banco de datos y al clúster en tiempo real. No reemplaza las verificaciones de punta a punta de colaboración, almacenamiento de objetos, búsqueda y mensajería.

<a id="still-needs-an-external-rehearsal"></a>

## Todavía se necesita una práctica externa.

El código cubre las actualizaciones de documentos, los punteros, la presencia, los límites compartidos y los arrendamientos de base de datos o los outboxes en dos instancias de aplicación. Antes de la producción, ensaye PostgreSQL, Redis gestionado, S3, el drenaje de WebSocket y las actualizaciones sucesivas en la infraestructura objetivo. Inyecte fallos: pausa Redis, elimine la réplica que ejecuta una tarea, revoque el acceso durante una edición, presente un patrón de base de datos no compatible y expira el almacenamiento de objetos.
