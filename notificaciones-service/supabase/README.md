# Correo HTTPS mediante Supabase

La función `silvana-mail` recibe solicitudes privadas del servicio de notificaciones y entrega el correo mediante Gmail por TLS (465). No usa las plantillas de Supabase Auth: conserva el HTML, texto y logo CID de Silvana.

Publicar desde esta carpeta, con una sesión de Supabase CLI autorizada:

```sh
npx supabase functions deploy silvana-mail --project-ref uqsrbacoztkdnkorqwld
```

En los secretos de Edge Functions configurar `SMTP_USER`, `SMTP_PASSWORD` (contraseña de aplicación de Gmail) y `MAIL_RELAY_TOKEN` (aleatorio de al menos 32 bytes). No guardarlos en Git.

En Render configurar `MAIL_TRANSPORT=supabase`, `SUPABASE_MAIL_URL=https://uqsrbacoztkdnkorqwld.supabase.co/functions/v1/silvana-mail`, `SUPABASE_MAIL_TOKEN` igual al token privado de la función y `APP_URL` con el dominio definitivo del frontend.

La verificación JWT de la función se reemplaza por un token privado exclusivo del servidor, comparado en tiempo constante. No se permite acceso desde el navegador ni se publica el token en Vercel. La función limita el cuerpo a 128 KiB, fija el servidor y remitente Gmail, valida los campos y no expone errores del proveedor. La cola persistente, preferencias y reintentos siguen perteneciendo a notificaciones-service.

El despliegue y una entrega real deben verificarse antes de considerar activo el correo. Gmail puede filtrar mensajes como spam; aceptar el envío no garantiza la bandeja principal.
