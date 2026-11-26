<a id="document-and-library-permission-inheritance"></a>

# Herencia de permisos de documentos y bibliotecas

[中文](permission-inheritance.zh-CN.md)

Esta página describe el modelo de permisos actual. Las subvenciones personales se encuentran en `grants`Los grupos viven separadamente. `resource_group_grants` y se evalúan en relación con la membresía del grupo activo, sin crear filas personales. Las definiciones de enlaces públicos se encuentran en `share_links`Los eventos de revocación de enlaces se producen en tiempo real. `share_link_revocations`. Ver [grupos de usuarios](user-groups.es.md) Para invitaciones de grupo, alcance del directorio, propiedad y limpieza.

Cada grupo tiene un límite independiente de otorgamiento/inherencia. Los bloques personales no eliminan las fuentes del grupo; un bloque de otorgamiento local para personas con discapacidad impide la herencia desde ese grupo. Los gerentes de grupos de biblioteca conservan el nivel de gestión existente en los documentos contenidos. La eliminación de miembro, o la disolución o cancelación, invalida esa fuente de inmediato. La transferencia de propiedad preserva los otorgamientos del grupo, incluyendo el acceso que el propietario anterior sigue recibiendo a través del grupo.

<a id="public-reading"></a>

## Lectura pública

Una biblioteca pública`public` o `authenticated`) establece el alcance de lectura de cada página. Una página no puede anular esa línea base con su propia visibilidad ni desactivando la herencia de colaboradores. La edición, comentarios y gestión de derechos se calculan aún según la página y la herencia. Una vez que la biblioteca deja de ser pública, las páginas utilizan sus propias configuraciones y sus antepasados nuevamente. Las consultas de lista y las búsquedas de un solo recurso siguen la misma regla.

Las reglas de descubrimiento, búsqueda y recolección que varían según el tipo de recurso se encuentran en [Recursos públicos, descubrimiento y colecciones](public-resource-discovery.es.md).

<a id="one-grant-table"></a>

## Una tabla de subvenciones

`grants` Almacena una fila por recurso, usuario y fuente de concesión:

- `direct`: una invitación o una concesión desde la página de gestión. Como máximo una por usuario en un recurso.
- `link`: una subvención recibida a través de un enlace de acceso, distinguida por el ID de la cuenta.
- `parent_override`Este nodo sobrescribe o bloquea el resultado padre heredado.

Cada fila almacena el rol, si incluye descendientes, el ID de origen y `active` o `disabled`La página de gestión agrupa las fuentes por usuario y muestra los permisos finales. Los detalles de la fuente operan en una fila específica. Eliminar una concesión directa puede deshabilitar algo. `parent_override` Así que la permisión no se restablece. Eliminar esa sobrerregla restaura la herencia de padre. Revocar un enlace elimina solo esa fuente de compartir.

El rol y “incluir descendientes” son cosas separadas. La autorización de un descendiente se determina a lo largo del árbol. No tome el valor máximo de cada campo e invente una concesión que no existe.

<a id="collaborators-and-inheritance"></a>

## Colaboradores e herencia

La biblioteca es la raíz del árbol de permisos de documentos. Un documento de biblioteca hereda su documento padre, o la biblioteca, si no tiene padre. Un documento personal no tiene ninguno, y utiliza sus propios permisos.

Para un usuario específico, vaya hacia arriba hasta la decisión explícita más cercana. Una concesión en el nodo actual anula una concesión superior a ella. Una deshabilitada `parent_override` Bloquea la concesión parental. La herencia continúa solo cuando este nodo no tiene ninguna decisión. `include_descendants` Decide si una concesión llega a los descendientes. Una decisión de “solo este nodo” impide que la concesión del mismo usuario continúe más arriba. Un descendiente aún puede recibir su propia concesión.

El permiso público y el permiso de usuario designado se calculan por separado, y se utiliza el que sea más alto. La eliminación de un colaborador no coloca a ese usuario en una lista de bloqueo de recursos públicos. El acceso público anónimo es, como máximo, de lectura.

<a id="permission-settings"></a>

## Configuración de permisos

`permission_overrides` Es un conjunto de campos que este nodo sobrescribe explícitamente: ámbito público, rol público, solicitudes de acceso, descubrimiento público, historial de lectores y el interruptor principal para el intercambio de enlaces. Los campos que no son sobrescritos se resuelven a partir de los antepasados. Restaurar la herencia elimina esos bits.

Desactivar la herencia no copia los ajustes del padre. Las sobrerreglas existentes permanecen. Otros campos utilizan los valores predeterminados de este nodo. Volver a activarla resuelve los campos que no han sido sobrerreglados. Los enlaces de compartición, invitaciones y tickets no se copian ni se heredan. Solo el cambio de enlace principal puede ser heredado.

Canjear un enlace escribe `link` Concede con el ID de participación. Cambiar, desactivar o expirar un enlace controla las recompensas posteriores. Las concesiones ya otorgadas se ajustan o revocan a través de la fuente de miembro.

Los enlaces de documentos y bibliotecas pueden otorgar acceso al lector, al comentarista, al editor o al administrador. Solo los propietarios pueden crear, modificar o revocar enlaces de administrador.

<a id="approval-notifications-and-immediate-effect"></a>

## Aprobación, notificaciones y efecto inmediato

El rol solicitado en un ticket de acceso no puede cambiarse. La aprobación puede elegir el rol y el alcance que realmente se otorgan. Solo el propietario del recurso aprueba una solicitud de gestión, y solo el propietario puede otorgar la gestión.

El boleto tiene restricciones. `resource.grant` En una sola transacción. Reverifica el recurso, el manejador y el solicitante, luego escribe el rol, el alcance, el resultado y el evento. Las condiciones de transacción y estado de la base de datos dan al ticket un resultado final.

Las búsquedas y las listas utilizan la misma decisión de cercanía, el alcance de las concesiones y las sobrerreglas de campo. La herencia no copia las concesiones en masa. Después de un cambio de permisos, las habitaciones en línea afectadas se actualizan. Perder el acceso de lectura cierra la conexión de inmediato. Las escrituras se verifican en cada operación.

<a id="verification"></a>

## Verificación

Los tests aislados abarcan la herencia de múltiples niveles, la degradación, el bloqueo, los hijos futuros, la concesión de alcance, el encendido y apagado de la herencia, las sobrerregulaciones de campos, el umbral público, la revocación de una fuente de enlace, la aceptación de una invitación, los resultados de aprobación y la revocación de WebSocket.

Los administradores pueden [entregar recursos](admin-resource-handover.es.md) De cuentas con discapacidad después de revisar la propiedad y las subvenciones retenidas. Este inventario expone metadatos de gestión sin otorgar acceso a los cuerpos de documentos privados.

<a id="shared-permission-components"></a>

## Componentes de permisos compartidos

El módulo Web `apps/web/src/shared/components/permission-grant-row.tsx` y sus filas de subvenciones propias, selección de rol, entrada de fuente, alcance descendente y burbujas de confirmación. Documentos, bibliotecas y libros de conocimiento utilizan `PermissionDialog`; las carpetas compartidas y las autorizaciones de grupo también utilizan lo mismo `PermissionGrantRow`Los llamantes proporcionan identidades, opciones de rol permitidas, estado de lectura/ocupado y llamadas de persistencia. El componente controla el diseño, la copia, el enfoque del teclado y la confirmación. `permissionRoleChoices` Centraliza las categorías de roles de host-resources y carpetas compartidas; los adaptadores de permisos personalizados continúan suministrando sus roles soportados.

Cada fila utiliza dos líneas: identidad y acciones arriba, metadatos/avatar de miembros y alcance descendente abajo. Las vistas de miembros del grupo utilizan `UserBadge` Para los desencadenadores solo de avatar y las tarjetas de perfil; “Más” abre un popover de avatar. La propiedad del popover sigue a los desencadenadores. `aria-controls`Por lo tanto, interactuar con una tarjeta con portales mantiene el panel de permisos abierto.

Las entradas de detalle de fuente también utilizan `PermissionGrantRow`El etiquetado de la fuente permanece en el lado izquierdo, con los controles de permiso y eliminación en el lado derecho. Los límites de la fuente de lectura únicamente permitida no cambian. `PermissionEffectiveAccess` Destaca el papel efectivo en azul brillante cuando el acceso grupal supera al acceso personal e identifica la fuente del grupo en la etiqueta.

Los callbacks de mutación devuelven éxito o fallo: el fallo mantiene la confirmación abierta, y solo el éxito la cierra. Eliminar una fuente y eliminar una sobrerregla de herencia tienen copias de confirmación diferentes; eliminar una sobrerregla reanuda la evaluación del padre y no debe describirse simplemente como la revocación del acceso. La propiedad del lado del servidor, los niveles de gestión, el consentimiento de invitación y las verificaciones de alcance permanecen autorizadas.
