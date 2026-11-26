<a id="specification-driven-development"></a>

# Desarrollo guiado por especificaciones

[中文](sdd.zh-CN.md)

Este flujo de trabajo se aplica a el trabajo nuevo en todo Doca. GitHub Spec Kit 1.0.4 proporciona las habilidades, scripts y plantillas del Codex que se han marcado; los detalles de instalación y actualización se encuentran en [Especificar/README.md](../.specify/README.md). [AGENTS.md](../AGENTS.md), el [constitución](../.specify/memory/constitution.md) Y los contratos técnicos existentes rigen su uso. Comience con el [módulo index](sdd-module-index.es.md) Localizar la fuente de corriente, contratos y comprobaciones reutilizables.

<a id="choose-the-level"></a>

## Elige el nivel

| Nivel | Impacto semántico | Registro mínimo antes de la implementación |
| --- | --- | --- |
| `full` | Base de datos o formatos persistentes; autenticación/autorización; colaboración; contratos públicos de SDK/API; límites arquitectónicos, de credenciales o de despliegue | `spec.md`, `plan.md`, `tasks.md`, `validation.md` en un directorio de características |
| `standard` | Otras características y cambios en el comportamiento observable dentro de los límites establecidos | Uno `spec.md` con alcance, aceptación, diseño, tareas y validación |
| `light` | Soluciones limitadas, copias, estilos, pruebas o documentación sin ninguno de los impactos anteriores | Problema de PR, comportamiento final, verificación e explicación del impacto |

Juzga el comportamiento, no el número de líneas. Un cambio de autorización de una sola línea es completo. Una corrección que restaura el comportamiento especificado puede ser sencilla si no cambia ningún contrato o línea de alto riesgo. Los cambios que solo afectan el proceso pueden optar por ser completos para documentar su adopción, como [esta instalación](../specs/001-sdd-adoption/spec.md) Sí. Aumente el nivel y actualice el alcance antes de expandir una tarea. Indique el motivo de la clasificación en el PR; las verificaciones automatizadas no pueden establecer el nivel semántico correcto.

<a id="work-on-a-change"></a>

## Trabajo en un cambio

1. Inspeccione el índice de módulos, las exportaciones reales de fuente/paquete y las habilidades aplicables. Registre la versión actual y distinga el comportamiento implementado de las propuestas. La autorización de usuarios existentes continúa durante todos los puntos de control de revisión.
2. Para trabajar a nivel completo/estándar, crea `specs/<number>-<short-name>/spec.md` Antes de la implementación. Utilice el siguiente número de tres dígitos no utilizado; los identificadores son únicos. Las ramas de Git son independientes y normalmente se usan `codex/`. Registro `Level`, `Status`, `Created`, `Decision`, `Scope` y estable `AC-001` IDs de aceptación. El [plantilla de proyecto](../.specify/templates/overrides/spec-template.md) proporciona las secciones.
3. El trabajo completo incluye un plan, tareas con casillas de verificación que referencian IDs de aceptación y un registro de validación inicialmente pendiente. [plan](../.specify/templates/overrides/plan-template.md), [tareas](../.specify/templates/overrides/tasks-template.md) y [validación](../.specify/templates/overrides/validation-template.md) Los plantillas están disponibles. El trabajo estándar se mantiene `Design`, `Tasks` y `Validation` En su especificación. Añada investigación independiente, modelos de datos y contratos solo cuando el alcance lo requiera.
4. Antes de la implementación de la compatibilidad, obtenga por separado el acuerdo concreto requerido por AGENTS.md: versiones/formatos afectados, comportamiento de rechazo/retención/conversión/migración, preservación, validación y recuperación. El estado de aceptación de una especificación no es esa aprobación. Los cambios en la base de datos siguen el [contrato de actualización](database-schema-evolution.es.md).
5. Implemente las tareas del alcance y actualice los contratos actuales afectados en el mismo PR. Asigne los IDs de aceptación a las verificaciones y observaciones. Registre los resultados reales, los casos omitidos, las versiones y las limitaciones. Los resultados se generarán de acuerdo con lo existente. [reglas de artefacto](documentation.es.md#assets-and-updates).
6. Ejecutar `pnpm sdd:check` y comprobaciones de módulos relevantes. Utilice [Plantilla de PR](../.github/PULL_REQUEST_TEMPLATE.md); registre el nivel declarado y una ruta de especificación principal. Se pueden vincular otros elementos de trabajo desde la especificación principal. Revisar explícitamente los límites de alto riesgo, los contratos y las decisiones de compatibilidad separadas.

<a id="codex-skills"></a>

## Habilidades del Códice

El que está registrado `.agents/skills/speckit-*` Las habilidades se ponen disponibles cuando una sesión de Codex descubre las habilidades del proyecto; abra una nueva chat de proyecto si la sesión actual es anterior a la instalación. Invoque las habilidades en la chat del agente, no en el terminal. El trabajo completo puede utilizar esta secuencia:

```text
$speckit-specify Describe the requested behavior and affected users
$speckit-plan State the actual Doca modules, packages and constraints
$speckit-tasks
$speckit-analyze
$speckit-implement
$speckit-converge
```

La constitución ya está establecida. Las habilidades de aclaración y verificación son opcionales cuando son útiles. El trabajo estándar/leve puede utilizar los registros escalonados directamente sin ejecutar todos los comandos del flujo de trabajo completo. El flujo de trabajo genérico de upstream sigue instalado con sus puertas de revisión; la secuencia anterior sigue el flujo de trabajo proporcional de Doca y la autorización de usuarios existente. Los prompts genéricos no otorgan decisiones de compatibilidad ni autorizan mensajes, publicaciones o despliegues.

Seleccione una característica existente explícitamente cuando sea necesario:

```sh
SPECIFY_FEATURE_DIRECTORY=specs/001-sdd-adoption bash .specify/scripts/bash/check-prerequisites.sh --json --require-spec --require-tasks --include-tasks
bash .specify/scripts/bash/resolve-template.sh spec-template
```

El puntero de función en `.specify/feature.json` El estado local del checkout se ignora. No lo comparta como rama o como línea base de proyecto. Los scripts/temas de upstream permanecen sin cambios; personalícelos. `templates/overrides/`El verificador verifica los hashes upstream incluidos. Los plantillas del proyecto están escritas para `specs/<number>-<name>/`Ajuste sus enlaces relativos si se utiliza intencionadamente otra ubicación.

<a id="status-and-evidence"></a>

## Estado y evidencia

| Estado | Significado |
| --- | --- |
| `draft` | El alcance o las decisiones aún se están preparando. |
| `accepted` | El alcance está acordado; cualquier aprobación concreta de compatibilidad se registra por separado |
| `implemented` | Código/tareas de alcance completadas; la verificación aún puede estar pendiente o parcial |
| `verified` | Todos los IDs de aceptación han registrado resultados dentro del alcance de verificación indicado. |
| `superseded` | Registro histórico; señala a su reemplazo |

No marque los elementos verificados con tareas inacabadas, aceptaciones no resueltas o resultados pendientes/fallidos. Una especificación históricamente verificada no vuelve a validar el código actual. Los contratos actuales siguen siendo la fuente del comportamiento actual; etiquete los diseños sustituidos y los reemplazos de enlaces. Las especificaciones existentes, contratos y registros de aceptación conservan sus rutas y fechas. El índice del módulo es un punto de entrada, no una aceptación retroactiva.

<a id="checks-and-prs"></a>

## Verificaciones y PRs

`pnpm sdd:check` Verifica los directorios de especificaciones numerados, los niveles/estados, los registros requeridos, la trazabilidad de la aceptación/tarea, la verificación completada y los hashes instalados en el flujo ascendente. `pnpm test:sdd` Cubre los casos positivos y negativos, así como el uso aislado de scripts/temas en la etapa inicial. `pnpm docs:check` Verifica los enlaces reales de documentos y módulos, incluyendo las habilidades instaladas y los plantillas de proyecto.

Los organismos PR declaran estas líneas independientes, con valores reales:

```text
SDD-Level: full
SDD-Spec: specs/001-sdd-adoption/spec.md
```

Los cambios en la luz se utilizan `SDD-Level: light` y `SDD-Spec: none`Todas las relaciones públicas llenan `Problem`, `Behavior`, `Impacts` y `Verification` Secciones. El flujo de trabajo de SDD en GitHub verifica los metadatos de PRs en solicitudes abiertas, editadas y sincronizadas, y revisa los registros del repositorio en main. Se ejecuta en `pull_request`Con permisos de solo lectura y sin secretos. Verifica la estructura y las referencias, pero no si el riesgo declarado, el acuerdo humano o el resultado del test son verdaderos. Los mantenedores revisan esas afirmaciones. El flujo de trabajo no configura protección de ramas; requerirla para las fusiones es una configuración del repositorio.

<a id="evaluate-the-first-changes"></a>

## Evalúa los primeros cambios

Para los próximos 3–5 cambios reales, agregue una breve observación a la validación o al PR ligero: esfuerzo de investigación, requisitos faltantes detectados durante la revisión, trabajo adicional después de la implementación y costos de mantenimiento de registros. Utilice duraciones si están medidas; de lo contrario, indique que no se midieron. Comparecione cambios similares cuando sea posible y ajuste la profundidad del plantilla según la carga observada. La instalación del Spec Kit en sí no demuestra una reducción en las tasas de defectos ni en la velocidad de entrega.
