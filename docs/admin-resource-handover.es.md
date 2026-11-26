<a id="administrator-resource-handover"></a>

# Entrega de recursos al administrador

[中文](admin-resource-handover.zh-CN.md)

En **Administración → Usuarios**Un administrador de sistema activo abre **Entregar recursos** Para una cuenta deshabilitada, se selecciona un destinatario activo y entradas de recursos, luego se revisan y confirman los cambios reales. La cuenta de origen permanece deshabilitada. Los usuarios normales no pueden utilizar ninguno de los tres extremos.

<a id="scope"></a>

## Ámbito

El inventario lee los metadatos de gestión de recursos, carpetas, archivos y registros de permisos existentes. No lee los cuerpos de documentos ni las credenciales privadas.

- Documentos, bibliotecas y libros de conocimiento: transferencia de recursos seleccionados y descendientes propiedad de la fuente. Otras personas conservan la propiedad; el contenido relacionado se lista por separado. La autoridad existente del propietario de la biblioteca se aplica al receptor.
- Imágenes de documentos y archivos adjuntos: activos vinculados y elementos de directorio junto con sus documentos. No pueden seleccionarse de forma independiente. Los cargadores originales y los autores históricos permanecen sin cambios.
- Carpetas/files ordinarios: se transfieren los descendientes y archivos propiedad de la fuente. Una carpeta anidada seleccionada o un archivo independiente se mueve a la raíz personal del destinatario cuando su padre no se transfiere ni es propiedad del destinatario. La vista previa muestra este reubicación.
- Grants de documentos/librerías retenidas: las fuentes de subvenciones locales activas seleccionadas explícitamente se convierten en beneficiarios de una subvención directa y se eliminan de la fuente. El alcance de los descendientes se conserva; los tokens de enlace no se copian.
- Grantes de carpeta compartida: fusionar en el grant de la carpeta del destinatario sin degradar un rol existente de nivel superior, y luego eliminar el grant de origen seleccionado.
- Recursos destruidos: la propiedad puede transferirse mientras el estado eliminado permanece intacto.

Archivos personales de IA, conversaciones privadas, credenciales y registros comerciales de complementos están excluidos. Las vinculaciones de archivos de sesiones de IA/conocimiento existentes, los archivos normalmente cerrados y los metadatos no reconocidos permanecen protegidos. El bloqueo del gestor de archivos de un archivo adjunto no impide la transferencia con su documento. Las entradas protegidas explican por qué no pueden seleccionarse; los archivos protegidos dentro de un directorio seleccionado bloquean todo el lote.

<a id="preview-and-permission-checks"></a>

## Previsualización y verificaciones de permisos

La vista previa muestra las modificaciones de propiedad, permisos y archivos adjuntos, los reubicaciones y los elementos relacionados cuya propiedad permanece inalterada. Al seleccionar un padre, se expanden sus descendientes válidos. Cada lote permite hasta 500 entradas del inventario seleccionadas; la expansión puede incluir más descendientes. El inventario y las modificaciones utilizan páginas de 50 filas.

Las permisos existentes para los destinatarios superiores permanecen. Los roles de nodo/hijo incomparables, las restricciones al hijo de la fuente que ampliarían el acceso y las restricciones explícitas para los destinatarios generan conflictos y deshabilitan la confirmación. Revisa esos permisos a través del flujo de trabajo de permisos existente o modifica la selección. La transferencia no anula tales restricciones ni copia derechos heredados no relacionados.

Las invitaciones a la fuente o al destinatario de los documentos/carpetas seleccionados se cancelan, de modo que una aceptación posterior no puede sobrescribir la transferencia. Las invitaciones de documentos se archivan con tickets; las invitaciones de carpetas mantienen sus filas y tickets cancelados. Las invitaciones de otras personas permanecen intactas. La vista previa muestra el número de cancelaciones. La visibilidad pública, las definiciones de enlaces y otros colaboradores mantienen sus configuraciones existentes; el acceso público no se convierte en una lista de bloqueo de usuarios.

<a id="consistency-and-audit"></a>

## Consistencia y auditoría

El inventario y la vista previa utilizan snapshots de base de datos consistentes. La ejecución calcula una huella digital que abarca las cuentas, recursos, subvenciones, archivos adjuntos y contenido de directorios relevantes. Los cambios en el estado hacen que la confirmación sea inválida y devuelven el código 409. Vuelve a refrescar y a ver la vista previa. Las confirmaciones concurrentes del mismo lote solo tienen éxito una vez.

Una sola transacción confirma la propiedad, realiza decisiones de concesión, invitaciones, tareas de índice y auditorías de seguridad. Las políticas de admisión/cuota de los receptores existentes continúan en funcionamiento. Cualquier fallo hace que todo el lote se retroceda. Los objetos almacenados no se mueven ni se eliminan. El contenido del documento, su historial, los cargadores y los autores originales permanecen intactos. Después de la confirmación, los permisos activos se actualizan y las cuentas involucradas son notificadas.

El `user.resources_handed_over` El registro de auditoría de seguridad registra al administrador real, la fuente, el receptor, la huella dactilar, los cambios y los metadatos previos relacionados. Excluye las concesiones privadas de receptores no relacionados. La ejecución es sincrónica; no es un trabajo en segundo plano resumible. Después de una desconexión del navegador o una respuesta perdida, vuelva a escanear el inventario antes de intentar otro lote.

Esta función utiliza tablas existentes y formatos persistentes, sin cambios en el esquema ni conversiones históricas. No hay una transferencia inversa automática ni un rollback de permisos. Las correcciones a una decisión comercial confirmada requieren revisar el registro de auditoría y las permisos actuales.

<a id="api-and-verification"></a>

## API y verificación

- `GET /api/v1/admin/users/:id/resource-handover`: inventario.
- `POST /api/v1/admin/users/:id/resource-handover/preview`: `targetUserId`, `keys`.
- `POST /api/v1/admin/users/:id/resource-handover/execute`: la misma selección más la vista previa `fingerprint`.

Ejecutar `pnpm exec vitest run tests/resource-handover.test.ts` Para pruebas de regresión de servicio/API. Ejecutar `pnpm exec tsx scripts/qa-resource-handover.mts` Para la interfaz de administración real, en relación con SQLite aislado/cuentas/documentos/almacenamiento. Los resultados se encuentran en `artifacts/verification/resource-handover/`Estas comprobaciones no establecen la verificación de ejecución de PostgreSQL.
