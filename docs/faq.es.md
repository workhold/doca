<a id="faq-and-troubleshooting"></a>

# Preguntas frecuentes y solución de problemas

[中文](faq.zh-CN.md)

<a id="is-there-a-default-administrator-password"></a>

## ¿Existe una contraseña de administrador predeterminada?

No. Corre. `bash scripts/bootstrap-admin.sh` Después de que el contenedor esté sano. Las contraseñas deben contener al menos 12 caracteres. Para una cuenta existente, utilice `bash scripts/reset-admin-password.sh`La inicialización no es un restablecimiento de contraseña.

<a id="why-does-the-browser-not-connect-to-port-39120"></a>

## ¿Por qué el navegador no se conecta al puerto 39120?

Compose conecta el puerto con el servidor de bucle cerrado. Utilice la origen HTTP(S) configurada. `DOCA_ORIGIN`, alcanzado a través del proxy inverso configurado. Una URL de IP de servidor funciona solo cuando el origen y el mapeo de puertos coinciden explícitamente con ella. Verifique el mapeo, Host, TLS cuando se utiliza y el reenvío de WebSocket. [despliegue](deployment.es.md).

<a id="which-environment-example-should-i-use"></a>

## ¿Qué ejemplo de entorno debo usar?

Para la imagen Docker publicada, copie `docker.env.example`Para el desarrollo de la fuente, copie `.env.example`Configurar `DOCA_ORIGIN`, `DOCA_FILE_STORE_ID`, `DOCA_FILE_STORES_JSON`, y la persistencia requerida `DOCA_CREDENTIAL_MASTER_KEY` Antes de iniciar Compose. Reemplaza la clave de muestra pública para una instalación nueva; mantén la clave original para una base de datos existente. Véase [configuración](configuration.es.md).

<a id="why-do-i-get-421-403-or-a-disconnected-editor"></a>

## ¿Por qué obtengo 421, 403 o un editor desconectado?

421 generalmente significa que la solicitud del host no coincide con el origen configurado. Las solicitudes de mutación requieren el mismo origen; una discrepancia genera un código 403. La edición también requiere autorización y una actualización WebSocket funcional. `/api/v1/ws`Verifique la dirección del navegador, la configuración del proxy, el estado de la cuenta y los permisos de los recursos actuales.

<a id="what-should-i-do-if-startup-rejects-the-database-baseline"></a>

## ¿Qué debo hacer si la startup rechaza el estándar de base de datos?

Deténte y lee el [Contrato de actualización de base de datos](database-schema-evolution.es.md) y coincidencia [requisitos de liberación](releases/0.2.38.md). Las generaciones soportadas reciben una reconciliación estructural aprobada; las generaciones no soportadas, cambios semánticos y diferencias que requieren revisión detienen el inicio antes de que se produzcan cambios persistentes. Preserve la antigua implementación, base de datos, archivos y secretos para realizar un rollback. No elimine tablas, restablezca el volumen ni cambie el marcador de línea base para forzar el inicio.

<a id="how-do-i-inspect-startup-problems"></a>

## ¿Cómo puedo inspeccionar los problemas de inicio?

```sh
docker compose config --quiet
docker compose ps
docker compose logs --tail=100 doca
curl -fsS -H 'Host: doca.example.com' http://127.0.0.1:39120/health
```

Ejecuta estos en el servidor en el checkout que contiene `compose.yaml`No publique registros que contengan secretos. Para el desarrollo de fuentes, utilice `http://127.0.0.1:39130` y la configuración de desarrollo.

<a id="are-github-pages-and-the-doca-application-the-same-deployment"></a>

## ¿GitHub Pages y la aplicación Doca son el mismo despliegue?

GitHub Pages aloja este sitio web de documentación estática. La aplicación Doca requiere su contenedor/servidor, bases de datos, archivos persistentes y un origen HTTP(S). Una actualización del sitio de documentación no inicia ni actualiza una aplicación Doca.

<a id="can-i-update-or-restart-without-deleting-my-files"></a>

## ¿Puedo actualizar o reiniciar sin eliminar mis archivos?

Una cosa normal `docker compose restart` conserva el volumen persistente. Los cambios de configuración se aplican `docker compose up -d`Antes de cambiar las versiones de la imagen, lea las notas de lanzamiento y haga copias de seguridad de cada base de datos, almacén de archivos referenciados y configuración protegida. Evite `docker compose down -v`, que elimina el volumen.

<a id="why-is-a-plugin-or-an-external-service-unavailable"></a>

## ¿Por qué un complemento o un servicio externo no está disponible?

Los paquetes de plugins deben cumplir con el contrato actual del SDK y el almacenamiento. Reinicie manualmente cada instancia después de los cambios en la instalación. Los plugins que utilizan credenciales encriptadas necesitan la misma clave maestra persistente en cada réplica. La disponibilidad de IA, SSO, búsqueda y almacenamiento en la nube también depende de credenciales reales y conectividad de red; las pruebas de origen no establecen la aceptación del servicio en vivo. Véase [despliegue de complemento](plugin-deployment.es.md).

Utilice el host real configurado en el comando health mencionado anteriormente. Un 421 indica una discrepancia entre el host, incluso cuando se realiza el análisis de loopback. No hay proxy confiable por defecto; los límites de IP del proxy compartido requieren una configuración estricta. `DOCA_TRUST_PROXY`.

<a id="where-do-i-get-the-desktop-client"></a>

## ¿Dónde puedo obtener el cliente de escritorio?

Descargue los instaladores de Windows y macOS. [GitHub Releases](https://github.com/workhold/doca/releases)La construcción no está firmada ni notarizada: en macOS, haga clic derecho en la aplicación y seleccione **Abierto** La primera vez, Windows puede mostrar un mensaje de SmartScreen. Su servidor debe ejecutar 0.2.37 o una versión más reciente. Vea [Guía del cliente de escritorio](desktop-client.es.md).
