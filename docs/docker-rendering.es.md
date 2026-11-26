<a id="docker-document-renderers"></a>

# Generadores de documentos de Docker

[简体中文](docker-rendering.zh-CN.md)

La imagen reconstruida exporta PDFs de texto rico/Markdown con WeasyPrint 70.0 y crea PNGs de lienzo con Node, Canvas nativo y resvg. No incluye runtime Chromium ni Playwright, ni requiere JSON de seccomp del host, memoria compartida adicional del navegador o configuración de espacio de usuario del navegador. Construya la nueva imagen antes de usar el archivo Compose modificado; las imágenes publicadas anteriormente no obtienen este renderizador automáticamente.

La lectura de PDF, el texto e imágenes por página y la importación editable todavía utilizan PDF.js. LibreOffice Writer, Calc, Impress y Math mantienen la conversión visual. `.docx`, `.xlsx` y `.pptx`Se mantienen los fuentes CJK y Liberation. Verifique las fórmulas, diagramas, imágenes incrustadas, tablas largas y la paginación en CJK mediante exportaciones reales; una verificación de estado no puede garantizar la fidelidad visual.

Los trabajos en PDF utilizan el entorno Python fijo. `DOCA_PDF_PYTHON=/opt/doca-pdf/bin/python`. Solo se permiten recursos de datos incrustados; se rechazan las lecturas de red y archivo host. Imágenes o fuentes ilegibles o corruptas fallan en lugar de devolver un PDF incompleto. El límite de entrada de 32 MiB, la concurrencia de dos trabajos, el plazo de 60 segundos y el recheck de permisos después del renderizado permanecen. Los trabajos Canvas conservan el exportador SDK, los activos autorizados, la selección/corte, las advertencias, la cola y la cancelación. Ambos renderadores operan en procesos desechables que se terminan al cancelar/por plazo.

`DOCA_PDF_CHROMIUM` se rechaza explícitamente, sin fallback en el navegador. Los documentos existentes, bases de datos, archivos adjuntos, claves y volúmenes permanecen intactos. Los lectores históricos del SDK mantienen sus rutas existentes sin conversión de datos almacenados. El rollback restaura el código anterior, los bloqueos de dependencias, la imagen y la configuración de despliegue, mientras se preservan las escrituras posteriores. El antiguo `docker/chromium-seccomp.*` Los archivos se mantienen únicamente para fines de trazabilidad y comparación con el antiguo renderer; los nuevos paquetes de despliegue los omiten.

<a id="image-size-and-update-downloads"></a>

## Tamaño de la imagen y descargas actualizadas

Eliminar el navegador ahorra espacio, mientras que Python/Pango/resvg añaden dependencias. LibreOffice, fuentes, dependencias de la aplicación y activos web permanecen. Compare las capas comprimidas de versiones/architecturas equivalentes; el uso local de múltiples arquitecturas de Docker Desktop no es una estimación de descarga.

Los activos web, las dependencias comunes y los editores mantienen capas, rutas y permisos separados. Ver [verificación de capa](verification/image-web-layers-2026-10-23.md).

<a id="container-verification"></a>

## Verificación de contenedores

```sh
DOCA_RELEASE_QA_IMAGE=your-rebuilt-image node scripts/qa-release-render-image.mjs arm64
```

Usa `amd64` Para x86-64. Este ejercicio implica salida real en PDF, píxeles de lienzo y conversión a Office en un contenedor desechable no raíz, sin red y con raíz de solo lectura, sin documentos de usuario. La política de seguridad predeterminada de Docker es suficiente. Verifique el host de producción real por separado; una arquitectura no determina el resultado de otra.

<a id="optional-sam-runtime"></a>

## Tiempo de ejecución opcional de SAM

Las imágenes Doca por defecto no incluyen un entorno de ejecución SAM2/PyTorch, el trabajador de segmentación o los pesos del modelo. La lectura de archivos PDF/Office no requiere SAM. Habilitar la segmentación es una instalación controlada por el administrador, y no una descarga realizada por una tarea de IA.

Utilice una imagen personalizada confiable basada en la versión aprobada exacta de Doca para agregar los interpretadores/librerías del sistema necesarios para su runtime preconstruido. Para un runtime de CPU de Bookworm Python 3.11, el Dockerfile propio del despliegue puede contener:

```dockerfile
ARG DOCA_IMAGE
FROM ${DOCA_IMAGE}
USER root
RUN apt-get update \
    && apt-get install --yes --no-install-recommends python3 python3-venv libgomp1 \
    && rm -rf /var/lib/apt/lists/*
USER node
```

Construya con un digest de imagen aprobado, por ejemplo `docker build --build-arg DOCA_IMAGE=docker.io/smartdoca/doca@sha256:YOUR_APPROVED_DIGEST -t doca-sam-runtime:local .`El “digest” es un dato de lanzamiento seleccionado por el administrador; el ejemplo no proporciona ninguno. Prepara el entorno Python. **dentro de esta imagen de Linux y de su arquitectura**, en el mismo momento `/opt/doca-segment` Ruta utilizada en tiempo de ejecución. Nunca copie un entorno virtual de macOS en ella. En Linux/amd64, el [instrucciones oficiales de la rueda de CPU](https://pytorch.org/get-started/previous-versions/#v251) Proporcione PyTorch 2.5.1 y torchvision 0.20.1; otras arquitecturas necesitan ruedas disponibles verificadas por separado y factores de perfil correspondientes.

El paquete de confianza debe contener el trabajador de lanzamiento exacto, las dependencias instaladas fijas, una copia de ejecución sin enlace simbólico del paquete oficial SAM2 fijado, un punto de control preprovisionado y un perfil estricto con **Caminos, versiones y hashes de bytes/árboles actuales de Linux**. Véase el [Receta para la preparación del perfil de Linux](ai-image-segmentation.md#linux-docker-profile) Y el estricto contrato de instalación/obrero existente. Mantenga el paquete en posesión del administrador y accesible para el UID del contenedor 1000; los archivos/directorios no deben ser escritibles por grupos u otras personas. Los inputs del modelo no pueden elegir o cambiar esos caminos.

Crear `compose.segmentation.yaml` Con Docker Compose 2.24.4 o más reciente. `!reset` Evita que la construcción de aplicación del archivo base sobrepase la imagen de tiempo de ejecución confiable que se construyó por separado.

```yaml
services:
  doca:
    build: !reset null
    image: doca-sam-runtime:local
    pull_policy: never
    environment:
      DOCA_AI_IMAGE_SEGMENT_PROFILE: /opt/doca-segment/profile.json
    volumes:
      - type: bind
        source: /srv/doca-segment-linux
        target: /opt/doca-segment
        read_only: true
        bind:
          create_host_path: false
```

Este soporte es independiente de `/data`, documentos y credenciales subidos. No coloque claves de modelo, el estado de autenticación QA o fotografías familiares en el paquete de ejecución. Establecer la variable en `.env` Solo, ni lo envía a través del archivo de composición básico ni proporciona este montaje. Valide el perfil instalado en un contenedor único sin base de datos de aplicación antes de activarlo; una configuración mal formada hace que el inicio falle, y los archivos de ejecución no disponibles o incorrectos hacen que la herramienta no esté disponible. Utilice todas las sobrerreglas previstas al recrear la aplicación:

```sh
docker compose -f compose.yaml -f compose.segmentation.yaml config --quiet
docker compose -f compose.yaml -f compose.segmentation.yaml up -d
```

Una verificación de tiempo de ejecución/hash confirma la identidad de la instalación, pero no la calidad de la máscara o de la imagen final. Cada candidato real, máscara y entrega todavía requieren las verificaciones visuales actuales y los permisos/bindings de origen. Los mejoras de peso requieren un nuevo perfil de tiempo de ejecución verificado y un reinicio coordinado; ningún perfil antiguo o máscara persistente se convierte automáticamente.

<a id="build-privacy"></a>

## Construye privacidad

`.dockerignore` excluye `.cache`, `.local`, bases de datos, archivos de entorno, pruebas y scripts del contexto de construcción de la aplicación. Mantenga los paquetes de ejecución de despliegue, puntos de control, artefactos de aceptación privados y credenciales fuera de ese contexto. La exclusión no elimina los archivos locales. Una construcción de imagen personalizada de SAM debe usar un contexto mínimo separado que contenga únicamente sus archivos de despliegue aprobados.


La salida Web también tiene capas independientes de CAD, fuentes y entradas, además de ocho grupos de archivos grandes (al menos 512 KiB) y 16 grupos de código más pequeños asignados a nombres de archivo estables. El cambio de nombre de hash de contenido de Vite de un chunk permanece en su grupo existente; todos los caminos, bytes y permisos desplegados permanecen sin cambios. Un experimento real de OCI para Web compilado reutiliza 25 de 27 capas después de una actualización/rename de entrada-chunk, añadiendo 334,554 bytes comprimidos. Una reconstrucción real de CSS de Vite reutiliza 13 de 27 capas y añade 4,489,097 bytes comprimidos (aproximadamente un 77.2% menos que la capa completa de Web anterior). Estos son casos medidos, no un tamaño fijo para cada actualización; las capas completas de Web tienen un pequeño costo adicional de encabezado. Véase [evidencia de capa revisada](verification/image-web-layers-2026-10-23.md).
