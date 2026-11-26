<a id="plugin-architecture"></a>

# Arquitectura de complemento

[中文](plugin-architecture.zh-CN.md)

El [Contrato SDK](plugin-sdk-contract.es.md) define la frontera entre los plugins de núcleo y los plugins de negocio. [guía de desarrollo](plugin-development.es.md) lista las interfaces que existen actualmente.

`plugin-contracts` Define el manifiesto y el ciclo de vida. `plugin-sdk` Proporciona inyecciones, eventos, contribuciones y efectos. `plugin-host` Verifica las dependencias y inicia los complementos, luego los desinstala en orden inverso. La composición ensambla los archivos principales, los documentos, la búsqueda y la IA, y luego carga los plugins empresariales desde el directorio de instalación separado.

Un plugin empresarial se comunica con el host a través de archivos públicos, usuarios, permisos, http, políticas, eventos y servicios de IA. La registración pertenece a la instancia del plugin. Un plugin no accede a los tipos de base de datos privados del host ni a un puente a nivel de proceso. Un plugin web envía su propia versión y el manifiesto activo lo carga.

El host mantiene la autenticación, autorización, archivos, colaboración de documentos, auditoría de seguridad, uso original de IA y uso de tokens evaluados por el modelo. La membresía, los puntos, los precios, la moderación de contenido y los correos no son tablas, herramientas o páginas clave. Un futuro plugin de correos posee su servidor, datos y pruebas de aceptación.

Un slot de árbol genérico, más servicios empresariales y un protocolo de reserva de fondos todavía están listados en el contrato según su estado de implementación. Una API propuesta no es una exportación que se pueda llamar.

Todo el estado duradero del complemento es gestionado por el host. Los paquetes deben declarar `doca.storage: "host"`; los modelos/autorización de los plugins, no los controladores, los caminos de almacenamiento o la configuración local/remota. El SQL gestionado y los objetos privados se exportan en SDK 0.1.7; las credenciales cifradas exclusivas para el servidor se exportan en SDK 0.1.9. Véase [contrato de almacenamiento](plugin-horizontal-scaling.es.md).
