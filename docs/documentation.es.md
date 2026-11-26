<a id="documentation-maintenance"></a>

# Mantenimiento de documentación

[中文](documentation.zh-CN.md)

La documentación utiliza Docsify 5.0.0. La fuente en Markdown se mantiene `docs/`; `docs/site/navigation.json` Define las páginas públicas y su orden de lectura. Los caminos de origen del contrato técnico permanecen estables para las referencias del repositorio y del editor.

<a id="layout"></a>

## Diseño del layout

| Grupo | Contenido |
| --- | --- |
| Empezar | Inicio rápido, configuración, guía de usuario, solución de problemas |
| Guías de usuario | Documentos, compartición, permisos, notas, conocimiento |
| Despliegue y operaciones | Docker, almacenamiento, escalado, autenticación, credenciales de servicio, webhooks |
| Desarrollo | Configuración de la fuente, arquitectura, editores, colaboración, lenguajes de interfaz |
| Plugins | Desarrollo, instalación, servicios públicos, contribuciones |
| Referencia | API, base de datos, SDK y contratos de editor |
| Lanzamientos | Cambios, requisitos y validación específicos de la versión |
| Proyecto | Mantenimiento de documentación e registros de investigación original/aceptación |

Las páginas públicas actuales tienen ocho ediciones en idiomas. La fuente por defecto es `name.md`Los sufijos de idioma, los caminos y el texto de navegación están definidos en `docs/site/languages.json`Los lanzamientos anteriores a 0.3.0, los registros de investigación y de aceptación conservan sus ediciones originales y el alcance de verificación. Se indican las implementaciones retiradas y las propuestas sustituidas en la parte superior de los archivos de origen. Un inventario de implementaciones distingue las API exportadas, las propuestas y el comportamiento no verificado de los servicios externos/dispositivos.

Los nuevos cambios siguen… [Flujo de trabajo SDD en niveles](sdd.es.md). El [módulo index](sdd-module-index.es.md) Conecta la fuente, los contratos autorizados y las verificaciones reutilizables. Las especificaciones describen los cambios individuales; los contratos técnicos actuales mantienen sus caminos de fuente existentes y se actualizan en el mismo PR cuando cambia el comportamiento.

<a id="check-and-preview"></a>

## Verificar y previsualizar

```sh
pnpm install --frozen-lockfile
pnpm docs:check
pnpm docs:dev
```

Abierto `http://127.0.0.1:39140/#/en/` o `http://127.0.0.1:39140/#/zh-cn/`La vista previa solo muestra la documentación y no inicia Doca ni se conecta a sus bases de datos. Vuelva a ejecutar la orden después de los cambios en el código fuente para regenerar el directorio de publicación.

`pnpm docs:build` prepara `.cache/docs-site/` con carpetas como `en/getting-started/` y `zh-cn/operations/`Copia y reescribe los enlaces Markdown; Docsify renderiza el contenido en el navegador. No compila el código de la aplicación ni pre-rendea el Markdown como HTML. El directorio generado es ignorado por Git.

Los enlaces a las páginas públicas permanecen en el idioma actual. Los enlaces de idioma muestran la página correspondiente cuando esa edición está disponible. Los enlaces al código fuente, ejemplos y investigaciones abren los archivos correspondientes en GitHub. Las páginas reciben un enlace al código fuente y enlaces a las ediciones disponibles. Una traducción ausente falla el control, en lugar de sustituir por otro idioma.

`docs:check` Inventarios en Markdown a través de Git, incluyendo archivos nuevos no ignorados y excluyendo `tests/fixtures/`. Verifica los enlaces Markdown/HTML y los objetivos de encabezados en toda la documentación del repositorio, incluyendo los enlaces al branch principal de este repositorio. No se obtienen los artefactos ignorados ni las URLs externas con fecha o etiquetadas. Los anclajes de encabezados publicados también se revisan contra las reglas de Docsify. El control también compara las entradas de la versión actual, las matrices de paquetes del editor, todas las filas de tablas/campos de la base de datos (incluyendo las interfaces de esquema heredadas) y las cinco referencias de habilidades portátiles contra sus documentos originales. Lee los tipos de TypeScript sin abrir una base de datos de aplicación. La disponibilidad de sitios web externos y la corrección semántica de cada afirmación aún requieren revisión.

Ejecutar `pnpm test:docs` Para los casos de regresión de verificador. Después de editar un contrato, ejecute `node scripts/sync-docs-skills.mjs`; conserva el texto original y reescribe los enlaces relacionados para su uso fuera del proceso de compra. Un argumento de directorio opcional, installed-skills, también actualiza las referencias instaladas. Por ejemplo: `node scripts/sync-docs-skills.mjs /absolute/path/to/installed/skills`Mantenga cualquier copia instalada sincronizada según las reglas de mantenimiento de la habilidad correspondiente.

<a id="github-pages"></a>

## GitHub Pages

El `.github/workflows/docs.yml` El flujo de trabajo verifica la documentación en los pull requests y publica los cambios. `main`Configurar el repositorio bajo **Configuración → Páginas → Construcción y despliegue → Fuente → GitHub Actions**El flujo de trabajo utiliza `github-pages` Entorno de despliegue y sus reglas de aprobación. También puede ejecutarse manualmente desde Acciones.

Las entradas previstas son:

- Inglés: <https://workhold.github.io/doca/#/en/>
- Chino: <https://workhold.github.io/doca/#/zh-cn/>

Estas direcciones se ponen disponibles después de que el flujo de trabajo se desplegue con éxito. Los enlaces en el README apuntan a las entradas en el idioma correspondientes. El sitio utiliza el dominio predeterminado de GitHub Pages y no requiere DNS de dominio personalizado ni archivo CNAME del repositorio.

Sirva el contenido de `.cache/docs-site/` Para publicar en otros lugares. El enrutamiento de hash permite un subruta de repositorio y actualizaciones directas sin necesidad de reescribir la ruta del servidor. El generado `.nojekyll` Conserva los archivos de navegación subrayados cuando se aloja a través de Pages.

<a id="assets-and-updates"></a>

## Activos y actualizaciones

Se revisan los resúmenes de verificación y las adjuntaciones de documentación se conservan. [`docs/verification/`](verification/README.md), agrupados por caso de aceptación o liberación. Las entradas de script reutilizables pertenecen a `tests/fixtures/`Los registros generados, capturas de pantalla, informes y cachés se guardan. `artifacts/`, que es completamente ignorada por Git; mantener las nuevas pruebas no requiere cambios en las reglas de ignoración.

El runtime de Docsify, el plugin de búsqueda, los estilos claro/oscuro y la licencia MIT se venden bajo `docs/site/assets/vendor/docsify/`. `README.txt` Registra la versión y verifica la integridad del archivo tarball de npm en el origen. Estos recursos se cargan desde el propio sitio de documentación. Los diagramas Mermaid se cargan lentamente con la versión ESM de Mermaid asegurada. `site.js`Requieren acceso a ese CDN.

Al agregar una página pública, crear todas las ocho ediciones, y añadir la página a `navigation.json`, y ejecutar `pnpm docs:check` y `pnpm docs:build`Vincula un registro técnico/diseño no público. [investigación](research.es.md), y un resumen de verificación revisado del [índice de verificación](verification/README.md). Mantenga alineados los ejemplos de código y los requisitos de versión. Al actualizar un contrato, siga las habilidades del repositorio correspondiente y actualice sus referencias empaquetadas según sea necesario. Los recursos en tiempo de ejecución y los plugins adicionales requieren una selección explícita de versión y verificación en el navegador.

El cuarto valor en la entrada de navegación de una publicación es `true` Cuando tenga todas las ocho ediciones en idioma. Mantén ese valor después de que se lance una versión posterior. Coloca las capturas de pantalla revisadas en el subdirectorio de idioma. `docs/images/` Así, el sitio y el README pueden referirse a la interfaz correspondiente.
