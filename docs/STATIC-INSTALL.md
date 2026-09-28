# Primera fase: sitio sin backend

Publicar el contenido de `release-static` como la raíz de GitHub Pages. Incluye el dominio confirmado floridaparamount.com, imágenes, estilos, fuentes y todas las páginas. No hay que instalar Node para servir estos archivos.

Odor Removal: teléfono y correo son los canales operativos. El formulario no envía correo automáticamente. Estimates y su intake siguen visibles; el visitante ve que el envío online todavía no está disponible. No se transmiten datos ni adjuntos, no se consultan horarios y no se simulan confirmaciones. Los borradores descargados voluntariamente permanecen en el dispositivo.

La versión estática bloquea conexiones de datos y envíos nativos mediante su política de seguridad. Para activarla posteriormente no basta con cambiar un booleano: se necesita configurar y probar el backend, orígenes permitidos, protección antispam, antivirus y credenciales nuevas; después publicar la versión conectada. No activar Railway en esta fase.

El repositorio conserva su backend anterior hasta que la migración del servidor se revise por separado. La implementación de backend mejorada está en el paquete local de implementación. No publicar datos, archivos .env, credenciales, evidencia original ni paquetes de auditoría como contenido web.

GitHub: los cambios se preparan en una rama y un pull request revisable. La configuración de Pages debe servir los archivos públicos; si se usa un workflow, el artefacto de despliegue debe contener solamente frontend. Nunca publicar todo el repositorio con el backend/documentación como artefacto.

La credencial Azure que estuvo en el README debe revocarse aunque se haya eliminado el archivo actual. Este cambio no reescribe el historial ni realiza la revocación.

