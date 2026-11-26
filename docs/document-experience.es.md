<a id="documents-sharing-and-history"></a>

# Documentos, compartición e historia

[中文](document-experience.zh-CN.md)

Descripción del origen del host 0.2.23. Los registros de desarrollo inicial y de paquetes temporales se encuentran en [investigación](research.es.md).

<a id="create-and-edit"></a>

## Crear y editar

El menú de creación ofrece texto enriquecido, Markdown, hojas de cálculo, diapositivas y lienzo. Los cinco tienen editor y códecs de colaboración independientes. Los plantillas requieren proveedores instalados; la creación de documentos en blanco está disponible por defecto. Los documentos personales son páginas independientes; los documentos de la biblioteca utilizan su árbol de biblioteca.

Las imágenes y archivos adjuntos utilizan cargas desde el host, IDs de activos y descargas autorizadas. La edición requiere permiso del editor o superior, y la confirmación de guardado se realiza tras el commit de la base de datos. Los puntos de control originales y las ediciones no reconocidas persisten en IndexedDB cuando el almacenamiento del navegador tiene éxito. Reabrir requiere una réplica local disponible y los activos de la aplicación; siga así. [Límites fuera de línea y recuperación](collaboration.es.md#save-reconnect-and-history) y cualquier retroalimentación de error de almacenamiento. Las herramientas, buscar/reemplazar, presencia y comentarios varían según el formato; véase [integración de editor](editor-integration.es.md).

La fuente de espacio de trabajo offline añade **Menú de cuenta → Documentos sin conexión** Al cliente de escritorio y a los navegadores con la interfaz Doca descargada. La página de inicio muestra esta lista cuando el servidor no está accesible. Abra una réplica para editar bajo la última permisión conocida y sincronice después de que los controles de conexión y acceso se restablezcan. Vea [¿Cómo habilitar documentos sin conexión?](access-offline-events.md#离线文档入口).

La página “Documentos” se desplaza a través de las visitas recientes debajo de sus filtros persistentes. La página “Bibliotecas” y el directorio de documentos sin conexión también pueden desplazarse hasta el último elemento cuando sus listas exceden el área de visualización.

<a id="sharing-and-permissions"></a>

## Compartir y permisos

El panel de compartición gestiona la visibilidad, las invitaciones, las fuentes de autorización de los miembros y los enlaces. Los cambios se verifican en una versión o revisión; se actualiza después de un conflicto 409. Las operaciones de gestión y propiedad siguen sus propias reglas de autorización; ver [permisos](permission-inheritance.es.md).

Los enlaces se usan `#/s/{token}` Para la vista previa y aceptación de contenido firmado. El cambio de enlace global, la desactivación o expiración de enlaces individuales, y la revocación de fuentes de miembros son acciones distintas; eliminar una fuente no afecta a las demás fuentes válidas. La lectura pública, el descubrimiento, las colecciones y los favoritos son separados; la recopilación no otorga acceso, y los administradores del sistema no obtienen automáticamente acceso a contenido privado.

<a id="history-and-restore"></a>

## Historia y restauración

- El menú del documento ofrece historial, vistas preliminares de instantáneas y instantáneas manuales. El historial normalmente requiere permiso del editor; habilitar el historial para lectores permite el acceso según los permisos de lectura de los recursos.
- Los puntos de recuperación recientes siguen siendo detallados; la historia a largo plazo conserva un punto por cada diez instantáneas antiguas. La misma lista y las acciones de vista previa/restauración sirven a todos los puntos conservados, sin revelar su ubicación de almacenamiento. La muestreo elimina deliberadamente los otros nueve puntos; véase [operaciones de almacenamiento](storage.es.md#history-storage-and-offline-upgrade).
- Las instantáneas de texto rico y Markdown restaurables permiten su restauración para gerentes o propietarios. `expectedSeq` Comprueba el contenido actual. Actualiza después de un conflicto para que una vista previa antigua no pueda sobrescribir las ediciones más recientes.
- Hojas de cálculo, diapositivas y lienzo tienen capturas de pantalla y vistas previas de solo lectura. Actualmente, devuelven `canRestore: false` y no mostrar ninguna acción de restauración.
- La historia empresarial y los puntos de control de colaboración se almacenan por separado. Restaurar utiliza el formato, la línea de descendencia y los activos del snapshot; la historia perdida nunca se reemplaza con contenido actual.
- Revisar los registros de visitas y acciones para verificar los permisos actuales. No son copias de seguridad y no pueden reconstruir el historial no guardado.

<a id="move-copy-and-trash"></a>

## Mover, copiar y eliminar.

Verifique los permisos de destino y de descendientes antes de mover, y confirme el restablecimiento de la autorización. La transferencia de propiedad requiere la participación del propietario. La copia crea una identidad de recurso y contenido independiente, vuelve a asignar los activos y excluye las concesiones, comentarios y el historial de deshacer. La eliminación se convierte en basura; la restauración respeta los lotes de eliminación y el estado padre. La eliminación permanente es una limpieza autorizada explícita y no significa eliminar todos los objetos de almacenamiento compartido.

<a id="routes-and-source"></a>

## Rutas y fuente

Estos caminos tienen `/api/v1` prefijo:

| Ruta | Propósito |
| --- | --- |
| `GET /resources/:id/versions` | Lista de historias |
| `POST /resources/:id/versions` | Snapshot manual |
| `GET /resources/:id/versions/:versionId` | Vista previa y secuencia de contenido actual |
| `POST /resources/:id/versions/:versionId/restore` | `{expectedSeq}`, restaurar un formato compatible |
| `POST /share/redeem` | `{token, accept?, consume?}`, previsualizar/aceptar un enlace |
| `GET /resources/:id/info` | Estadísticas, visitas o registros de acciones |

Vea [experience.ts](../apps/server/src/routes/experience.ts), [servicio de historia](../packages/core/src/modules/history/service.ts), y [envío del editor](../apps/web/src/features/documents/document-editor.tsx). El correr `/api/openapi.json` Y la validación del servidor define la API completamente desplegada.
