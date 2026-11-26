<a id="knowledge-book-generation-performance-and-batch-checkpoints"></a>

# Rendimiento de generación de libros de conocimiento y puntos de control por lotes

[简体中文](knowledge-book-generation-performance.zh-CN.md)

2026-10-19. El usuario aprobó explícitamente la nueva tabla de punto de control y el formato de persistencia privada. La implementación fue validada con datos aislados en esa ejecución de aceptación, la cual no se desplegó en producción. El despliegue de producción de 150,000 caracteres en ocho horas reportado no estuvo disponible localmente; estos tests no determinan sus causas específicas ni predicen la duración del despliegue en producción.

<a id="execution-improvements"></a>

## Mejoras en la ejecución

Los tamaños de escritura planificados solicitan lotes en contra del presupuesto de salida del modelo antes de una solicitud pagada. Las asignaciones de caracteres, la cobertura exacta de las solicitudes, la reparación limitada y el fallo explícito siguen siendo aplicados. Las consolidaciones de revisión independientes se realizan con el límite de dos trabajadores existente y preservan el orden y cada hallazgo negativo. Las observaciones individuales no necesitan una llamada de consolidación redundante. La aceptación de todo el libro y los puestos de calidad requeridos permanecen en vigor.

Anteriormente, solo los nodos completos sobrevivían a un reinicio del proceso. Ahora, las solicitudes completamente validadas pueden permanecer dentro de un nodo inacabado, incluyendo los esquemas, la asignación de reclamaciones, la extracción, la escritura, la organización y las revisiones de calidad. Las decisiones de subdivisión de host completas se guardan, de modo que no se necesita solicitar nuevamente un padre de tamaño excesivo. Los flujos de modelo parciales nunca se almacenan.

<a id="approved-persistence-contract"></a>

## Contrato de persistencia aprobado

- Añadir un vacío `knowledge_book_batch_checkpoints` tabla según el último DDL y `schemaEvolution` en el existente `doca-2026-10-12-book-payload-storage-v1` Generación. No se convierten ni rellenan filas antiguas. La reutilización de nodos completos históricos y los límites existentes del cuerpo heredado permanecen sin cambios.
- Usa un espacio privado separado `knowledge_book_batch_checkpoint_ref` Marcador v1 y propietario del lote con el códec de objeto inmutable existente y diario de subida. Los resultados grandes permanecen fuera de SQL. Las restricciones de referencia de nodo/run/release existentes y los formatos de configuración/artículos v1 publicados no cambian.
- Vincular cada solicitud con su ejecución original/nodo, configuración congelada, entrada del nodo, versiones de fuente/casos de hash y pesos, candidato actual, configuraciones del modelo no secretas, versión del algoritmo y alcance exacto de la solicitud. `scope_hash`, `plan_hash`, `input_hash` y `batch_key` Hacer cumplir la identidad. Nunca copie lotes entre ejecuciones.
- Solo se deben persistir los resultados completos validados o las decisiones de subdivisión del huésped completo. Se deben conservar los veredictos negativos y los diagnósticos detallados. La agregación final, la validación del diagrama, la autorización de fuentes, las cuotas y la aceptación de publicación siguen aplicándose.
- Reverificar los permisos de la fuente y el arrendamiento activo antes de leer, producir e instalar transaccionalmente un resultado. Las instancias competidoras instalan un ganador inmutable. La cancelación o la pérdida de permisos/arrendamiento durante el cargamento impide la instalación.
- El interno `evidenceInventory` Almacena localizadores de fuente, versiones, hashes, pesos y referencias de permisos sin copias del título o texto de la fuente. El huella de huella del modelo contiene el proveedor, el modelo, el punto final, el modo/versión de la API, los presupuestos de entrada/salida y la configuración de la herramienta, excluyendo las claves de API, alias y precios.
- La reparación de contenido a través del flujo explícito existente establece un nuevo alcance de contenido y preserva los puntos de control antiguos sin reutilizarlos. Cualquier cambio en un modelo o algoritmo dentro del mismo alcance requiere una nueva ejecución. Versiones desconocidas, corrupción, resultados inválidos o objetos faltantes impiden la recuperación; nunca activan silenciosamente la regeneración o conversión.

Estos son nuevos puntos de control privados, no un adaptador para formatos de resultados antiguos. Las filas existentes sin puntos de control de lote mantienen su comportamiento de nodo completo hasta que un nodo inacabado ejecuta nuevas solicitudes.

<a id="deployment-retention-and-recovery"></a>

## Despliegue, retención y recuperación

Haga una copia de seguridad de la base de datos y del almacén de objetos privados, conserve la clave maestra de credenciales original, detenga a los ejecutores y actualice todos los ejecutores y colectores al mismo tiempo. La reconciliación de esquemas añade las tablas vacías de forma transaccional y registra su huella sin ningún aumento en la generación. Los ejecutores o colectores antiguos/nuevos mezclados no son soportados, porque el código antiguo no puede proteger las referencias nuevas.

`DOCA_BOOK_BATCH_CHECKPOINTS` se establece por defecto `on`; solo `on` y `off` se aceptan, y los valores inválidos fallan al iniciar antes de abrir la base de datos. Reinicie después de cambiarlo. En el binario actual, `off` Revisa los nodos incompletos mientras se preservan todas las filas de punto de control y los pines de objetos. No pasa por las puertas de calidad ni modifica los datos. Los fallos, los eliminados y los alcances no coincidentes no eliminan los puntos de control; la eliminación permanente de libros libera sus referencias a través del camino de eliminación explícito existente.

El rollback de almacenamiento en línea offline rechaza los puntos de control existentes antes de la modificación. La degradación de binarios, la restauración de copias de seguridad o la conversión de puntos de control requiere un plan de preservación y recuperación aprobado por separado. No elimine filas, objetos o la tabla para evitar este límite.

<a id="verification"></a>

## Verificación

La cadena de procesamiento sintético completa falla en su segundo lote de escritura, reemplaza todo el tiempo de ejecución y se reinicia: las solicitudes de escritura total aumentan de dos a tres, no cuatro, y todas las 42 solicitudes pasan por aceptación y publicación. Otras pruebas restauran los planes/asignaciones de formato largo, los diagnósticos negativos y las decisiones de subdivisión. Una prueba real de almacenamiento de archivos comite un lote y termina el proceso con SIGKILL; un proceso nuevo y una concesión de arrendamiento restaura el primer lote con cero llamadas del productor y ejecuta solo el lote faltante una vez.

El producto real lanzado `smartdoca/doca:0.2.3` Imagen creada con SQLite y PostgreSQL 17/18. La actualización conserva todos los hashes de los registros de las 13 tablas antiguas, los bytes del cuerpo del nodo/run/release, los punteros de publicación y la generación; la nueva tabla comienza vacía. Ver [registro de verificación](verification/knowledge-book-checkpoints-2026-10-19/README.md) Para comandos, resultados y límites.
