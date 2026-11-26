<a id="content-providers-contentv1"></a>

# Proveedores de contenido: content.v1

[中文](plugin-content.zh-CN.md)

La entrada pública es `@smartdoca/plugin-sdk/content`. El host define el contrato y los límites de invocación; los complementos implementan el comportamiento empresarial. Los documentos y archivos integrados se registran a través de la misma interfaz. Registrar una fuente no expondrá automáticamente todas las fuentes a la IA.

<a id="contract"></a>

## Contrato

- `sources(context, purpose)` descubre las declaraciones de fuente.
- Las fuentes requieren `list`, `read`, y `resolve`. Opcional `search` Debe coincidir exactamente con la declaración de capacidades.
- `list(context, {config, cursor, limit})` devuelve ligero `{items,nextCursor,snapshot}`Cada artículo incluye `ref:{sourceId,resourceId,blockId}`, `fingerprint`, y `title`, opcionalmente `order`, `anchor`, y un breve `excerpt`. Cuerpo `text` está prohibido.
- `read(context, {config,ref,fingerprint})` devuelve los campos de la lista más el bloque seleccionado `text`O nulo cuando está actualmente ilegible. Un huella dactilar modificada produce un conflicto y requiere reenumeración.
- `resolve(context,ref)` reautoriza y devuelve `{path,fingerprint}` O nulo. Los caminos deben estar dentro de la aplicación.
- `search(context, {config,cursor,limit,query})` Devuelve la misma lista ligera. Las fuentes implementan búsqueda; el host no realiza una escaneo de todo el cuerpo.

Las llamadas para listar/leer/buscar servicios también se transmiten `sourceId` y `purpose`Los callbacks reciben el valor real. `principalId`, `purpose`, y `signal`Cada invocación verifica la cuenta, el alcance configurado y los permisos actuales; los IDs de usuario proporcionados por el cuerpo son no confiables. El host verifica el ciclo de vida del usuario/source antes y después de las llamadas y aplica un tiempo de timeout de 20 segundos.

```ts
const content = context.inject(contentServiceToken);
content.register({
  id: "example.tasks.content", pluginId: "example.tasks", version: 1,
  title: { zh: "待办", en: "Tasks" }, contentTypes: ["task"],
  purposes: ["analysis", "knowledge"], capabilities: { search: false },
  configSchema: { type: "object", additionalProperties: false, properties: {} },
  list: listAuthorizedTaskBlocks,
  read: readAuthorizedTaskBlock,
  resolve: resolveAuthorizedTaskBlock,
});
```

El complemento implementa los tres callbacks. No debe leer tablas de host privadas, fuentes o la base de datos de otro complemento.

<a id="reconciliation"></a>

## Reconciliación

Los consumidores almacenan referencias/ huellas dactilares debajo de la configuración actual de identidad y suscripción. Después de la enumeración completa, los bloques inmutados no necesitan análisis de lectura/IA, mientras que los bloques modificados se leen directamente. Solo una traversación completa exitosa determina la desaparición. Los tiempos de espera, las páginas fallidas, las instantáneas modificadas y las permisos inciertos no pueden tratarse como un conjunto vacío o como huellas dactilares consumidas.

`cursor=null` comienza; `nextCursor=null` Fin. La captura de imagen de una recorrido debe mantenerse consistente. Los cursores enumeran páginas; no son posiciones duraderas del registro incremental. Rechazar los cursores antiguos cuando el contenido, el alcance o los permisos invalidan la completitud. Separar `listChanges`/`readChanges` no son necesarios.

Límites: 100 elementos por página, 2 millones de caracteres en el cuerpo por bloque, 100,000 bloques en un inventario completo. El host valida las referencias, duplicados, cursores y cancelaciones. Los ayudantes de análisis limitan el texto totalmente modificado y fallan explícitamente por desbordamiento, en lugar de truncar y afirmar la completitud.

Las fuentes integradas utilizan direccionamiento de contenido de párrafo. Insertar un párrafo antes de un párrafo sin cambios no modifica su identidad. Editar un cuerpo elimina el bloque antiguo y crea uno nuevo. Estos no son IDs de nodo estables nativos del editor. Las reglas de bloque duplicado, contexto de encabezado y corte de párrafos largos se encuentran en [registro de huellas dactilares](content-fingerprint-reconciliation.md).

<a id="host-apis-and-consumers"></a>

## Anfitriones de APIs y consumidores

HTTP: `GET /api/v1/content/sources?purpose=analysis`; POST `/api/v1/content/list`, `/read`, `/resolve`, `/search`La identidad proviene de la sesión del host, y las respuestas no utilizan el atributo “store”.

La búsqueda global solo llama a fuentes que declaran búsqueda. Los filtros de documentos/biblioteca que no pueden aplicarse a los ámbitos de negocio del complemento excluyen esos resultados del complemento. Hacer clic vuelve a resolver el acceso.

Las bibliotecas nativas conservan el registro del código fuente. `knowledge_subscriptions` y `knowledge_source_groups.config`No crean empleos en cuanto a curaduría, entradas derivadas ni espejos de huellas de consumo. POST `/api/v1/knowledge/libraries/:id/content-subscriptions` toma `{sourceId,config,title}` Y requiere el conocimiento del propósito. Solo el contribuyente puede cambiar el alcance del proveedor.

Los libros de conocimiento capturan de forma independiente los inventarios autorizados completos en el momento de la ejecución y se revalidan antes de la publicación. La evidencia se conserva `contentRef`Versión de origen, hash de contenido y fragmentos citados exactos. El acceso derivado se detiene cuando un proveedor, enlace, contribuyente o permiso de la fuente original deja de estar disponible; los datos conservados no otorgan acceso. No existe un almacén completo adicional de cuerpo del proveedor.

El seleccionador de fuentes proporciona formularios básicos de esquema; la configuración compleja anidada requiere la página propia del plugin. `PUT /api/v1/knowledge/libraries/:id/content-source-groups/:groupId` Toma los parámetros de creación. Solo el principal suscriptor puede cambiar el alcance. Los cambios afectan las lecturas de origen posteriores.

`knowledge.sources.v1` no se adapta automáticamente `content.v1`; los complementos empresariales implementan el estándar público. Los libros de conocimiento utilizan una nueva base; no se proporciona ninguna conversión histórica ni adaptador de protocolo antiguo.
