<a id="knowledge-book-storage-verification-and-operations"></a>

# Verificación y operaciones de almacenamiento de libros de conocimiento

[简体中文](knowledge-book-storage-verification.zh-CN.md)

El plan completo fue aprobado explícitamente el 2026-10-12. La implementación y la verificación aislada se completaron el 2026-10-13; esa verificación no convirtió una base de datos de usuarios ni implementó la producción. Véase… [plan de implementación](knowledge-book-payload-storage-plan.md).

<a id="automatic-startup-upgrade-in-0124"></a>

## Actualización automática de arranque en 0.1.24

Detén todos los hosts antiguos y realiza copias de seguridad de SQL, almacenamiento privado y configuración. A partir de 0.1.24 de la generación 0.1.22. `doca-2026-10-09-history-storage-v1` Se compara automáticamente todo el esquema con el DDL actual. Una vez que el plan pasa la revisión, la transacción de bloqueo del esquema reconcilia las adiciones declaradas y registra la generación objetivo. Cada fila de negocio y puntero de publicación permanece intacta, incluyendo los resultados generados por SQL antiguo, las ejecuciones y las tareas humanas. Los datos de almacenamiento de objetos de la versión 0.1.23 existentes permanecen exactos en bytes. No se requiere ningún comando manual de libro, ni se necesita limpieza separada, conversión automática o lector de tiempo de ejecución heredado. Los resultados antiguos restantes del libro pueden requerir manejo manual antes de que puedan ser utilizados.

Todas las cambios en la estructura/generación se reverten en caso de fallo. Los inicios de sesión repetidos/concurrente conservan todas las filas. Las generaciones desconocidas, anteriores e interrumpidas, se detienen sin modificar los datos; las tablas desconocidas no relacionadas todavía requieren revisión. Se debe preservar todo el dato y escribir los datos después de la actualización durante cualquier recuperación de respaldo. Actualizar todas las instancias de host y web al mismo tiempo.

Los comandos de mantenimiento existentes a continuación siguen siendo opcionales si es necesario conservar los resultados generados anteriores en un formato nativo útil. Ejecuta la actualización antes del primer inicio; la alineación del esquema cambia la generación de la fuente. La verificación histórica a continuación demuestra que se trata de una conversión opcional, no de una adaptación automática del SQL JSON restante.

Evidencia de alineación automática: se utilizaron los fixtures 0.1.22 realmente liberados para SQLite/PostgreSQL 17/18; se conservaron todas las filas de las 114 tablas de negocio y los 20 cuerpos SQL; los nuevos objetos nativos seguían siendo legibles después de inicios repetidos/concurrente. PostgreSQL 17/18 superaron cada uno 91 casos de regresión, incluyendo rollback y rechazo estricto de cuerpos legacy. Véase [verificación](verification/book-schema-startup-2026-10-13/verification.json).

<a id="maintenance-commands"></a>

## Comandos de mantenimiento

Utilice una nueva versión del host que contenga estos cambios y el entorno de despliegue existente. Publicado `smartdoca/doca:0.1.22` Es la fuente de conversión y no contiene la nueva orden de comandos. Detener cada host y hacer copias de seguridad de SQL (incluyendo SQLite WAL), objetos privados y configuración. Preservar la clave maestra original, almacenar IDs y la configuración del backend. Actualizar todos los hosts y las construcciones web juntos.

La orden abre la base de datos existente sin inicialización. El modo predeterminado realiza una verificación previa de solo lectura. La aplicación requiere `--apply --hosts-stopped` Y una nueva ruta de manifiesto de recuperación. Los manifiestos usan el modo 0600 y preservan el formato original, las identidades de propietario, los tamaños y los hashes, sin necesidad de reflejos en el cuerpo del manifiesto.

```sh
pnpm knowledge-books:storage upgrade
pnpm knowledge-books:storage upgrade --apply --hosts-stopped --manifest /secure/book-upgrade.json
```

Solo `doca-2026-10-09-history-storage-v1` Es aceptado. Las generaciones anteriores deben completar primero la conversión de su historia exacta y soportada. Ejecutar tareas de libro, formatos de cuerpo desconocidos, datos corruptos y conversión de bloques de diferencias estructurales que requieren revisión sin escrituras parciales. Resolver la condición específica en lugar de cancelar trabajos desconocidos, inventar campos históricos o limpiar SQL.

Después de la interrupción, el inicio normal rechaza la generación de progreso. Reinicie el mismo comando con el mismo path de manifesto. Los bytes convertidos deben seguir coincidiendo con ese manifesto; su reemplazo no puede evitar los datos modificados. Al finalizar, el inicio acepta solo `doca-2026-10-12-book-payload-storage-v1`El latido independiente del sistema reconcilia las notificaciones pendientes después del inicio; las tareas históricas completadas no se rellenan. Los resultados y errores históricos se conservan.

El rollback actual rechaza los no vacíos `knowledge_book_batch_checkpoints` Antes de la modificación: sus referencias requieren un plan de preservación/recuperación aprobado por separado. No elimine los puntos de control ni evite las verificaciones de generación/estructura. Véase [Retención y recuperación de puntos de control](knowledge-book-generation-performance.es.md#deployment-retention-and-recovery). El viaje histórico descrito anteriormente es anterior a los puntos de control por lotes y no verifica las reducciones arbitrarias de versión de 0.1.22 a la actual.

Detener todos los hosts nuevamente para un rollback válido y conservar un nuevo manifiesto de respaldo y recuperación. Realizar lecturas de preflight de cada objeto y verificar sus bytes originales. El rollback también restaura las escrituras posteriores a la actualización y mantiene los objetos en la nube y los materiales de recuperación.

```sh
pnpm knowledge-books:storage rollback
pnpm knowledge-books:storage rollback --apply --hosts-stopped --manifest /secure/book-rollback.json
```

El rollback interrumpido se reanuda con su manifesto original. Después de que todo el JSON se restaure y verifique, solo se eliminan las cuatro tablas de extensión de almacenamiento y se registran el rastro revisado y la generación antigua. El objetivo es el host anterior 0.1.22. Se realiza el rollback completo del libro antes de cualquier rollback opcional de la historia de documentos más antigua. Las páginas liberadas de SQLite no reducen automáticamente el archivo; no se realiza un VACUUM automático.

<a id="isolated-evidence"></a>

## Evidencia aislada

La imagen de origen real era `smartdoca/doca:0.1.22`, ID de imagen `sha256:a5316eb01bf25b0d89801139de85d34a35528be376699c4981ab8a09fd14f04c`Su “runner real” generó tareas sintéticas publicadas, fallidas y en espera de publicación. No se accedió a ninguna base de datos de producción ni a ningún documento de usuario.

Cada fixture de SQLite/PostgreSQL 17/PostgreSQL 18 contenía 20 cuerpos originales no vacíos. Una actualización explícita, dos inicios de sesión normales y un rollback explícito verificaron todas las 20 secuencias de bytes y hashes JSON originales, preservando los estados, errores, configuración y tareas humanas. Los registros se encuentran en `docs/verification/knowledge-book-storage-plan-2026-10-12/actual-roundtrip*.json`.

| Métrica | SQLite | PostgreSQL 17/18 |
| --- | ---: | ---: |
| Bytes del cuerpo del SQL original | 3,698,834 | 3,698,834 |
| Nuevos bytes de referencia SQL | 7,170 | 7,170 |
| Bytes de JSON de metadatos serializados | 403,190 | 404,294 |
| Objetos únicos | 266 | 266 |
| Raíces / referencias | 8 / 20 | 8 / 20 |
| Bytes del objeto comprimido registrados | 94,508 | 94,499 / 94,478 |

Los metadatos serializan objetos, referencias, operaciones y aristas de dependencia; no son páginas/índices/WAL ni medidas de respaldo en SQL. Esta prosa sintética se repite en exceso y no puede demostrar ahorros en la producción.

Los casos de regresión abarcan fragmentos limitados, evasión/Unicode, compartición dentro del mismo libro y aislamiento entre libros, subidas competitivas, interrupción/reiniciado, corrupción, rechazo de formatos desconocidos sin DDL parcial, rollback de escrituras más recientes, resúmenes únicamente en SQL, revocación de permisos de caché, eliminación/borrado y limpieza de subidas tardías. La matriz CI PostgreSQL incluye pruebas de libros de conocimiento y de payload.

Evidencia de navegador `lazy-candidate.json` Se muestran cero lecturas del cuerpo, una lectura durante la expansión, reutilización al volver a abrir, eliminación del cuerpo después de la revocación y sin errores en el navegador. La estabilidad de Mermaid se registra por separado. `docs/verification/knowledge-book-reliability-2026-10-12/preview-result.json`.

<a id="operational-boundaries"></a>

## Límites operativos

La configuración local/privada del host se reutiliza sin URLs públicas ni credenciales propiedad de módulos. Se realiza una copia de seguridad de SQL y objetos como un conjunto consistente. Los objetos faltantes o corruptos fallan explícitamente, manteniendo las referencias; los cuerpos vacíos nunca pueden reemplazar el contenido no disponible.

La limpieza elimina solo los objetos inalcanzables. La papelera conserva las referencias; la purga permanente las libera. Las dependencias de carga en tiempo real están protegidas y las cargas fallidas o tardías conservan claves duraderas para intentos de carga. Los diarios completados solo conservan las cargas físicas concurrentes que se pierden, mientras que las dependencias instaladas permanecen en los objetos/aristas. No se añade TTL histórico.

Verificaciones finales: la suite relevante para 126 casos de SQLite pasó, seguida por la suite de libros/payload para 60 casos después de las verificaciones finales de punto final/permisos. Ambas suites relevantes para 68 casos de PostgreSQL 17/18 pasaron, y las últimas suites de payload para 11 casos también pasaron en ambos motores. Las verificaciones de tipo, la construcción web, los enlaces de documentación y las verificaciones de espacio en blanco en el diff pasaron. Ver `docs/verification/knowledge-book-storage-plan-2026-10-12/verification.json`El latido del corazón y la limpieza de objetos utilizan programación independiente, de modo que las solicitudes en la nube no ocupan el tiempo de reconciliación del latido del corazón.
