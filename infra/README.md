# Infraestructura

`npm run dev` desde la raíz inicia seis microservicios, Gateway y frontend. Cada carpeta admite el mismo comando. Los iniciadores `start-*.cmd` permiten abrirlos en ventanas CMD independientes.

Puertos locales: autenticación 8001, dispositivos 8002, recepción 8003, análisis 8004, alertas 8005, notificaciones 8006, Gateway 8000 y frontend 5173.

`start-local.ps1` inicia el conjunto; `-Install` instala antes las dependencias. No se debe iniciar otra copia si esos puertos ya están ocupados.

`compose.yaml` incluye los seis servicios y el frontend. Requiere un INTERNAL_SERVICE_TOKEN compartido. Las conexiones independientes se indican con USUARIOS_DATABASE_URL, DISPOSITIVOS_DATABASE_URL, RECEPCION_DATABASE_URL, ANALISIS_DATABASE_URL, ALERTAS_DATABASE_URL y NOTIFICACIONES_DATABASE_URL. El frontend queda en localhost:8080. Para correo configura SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM y APP_URL. Las conexiones y secretos se configuran fuera del archivo versionado.

Los archivos Docker están preparados, pero no se ejecutaron contenedores en esta entrega.
