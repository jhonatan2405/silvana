# Activar el correo de Silvana desde el navegador

El frontend está publicado en https://silvana-silk.vercel.app y utiliza el Gateway https://silvana-api.onrender.com. El correo en producción sigue pendiente hasta completar estos pasos y comprobar una entrega real.

## 1. Publicar la función en Supabase

Entra con la cuenta propietaria del proyecto de notificaciones (`uqsrbacoztkdnkorqwld`). Si no tienes acceso a esa cuenta, necesitarás recuperarlo o usar un proyecto al que sí puedas entrar; la contraseña PostgreSQL no permite administrar Edge Functions.

En **Edge Functions**, crea una función desde el editor llamada **silvana-mail**. Copia el contenido completo de `notificaciones-service/supabase/functions/silvana-mail/index.ts` en su archivo `index.ts` y publícala.

En los detalles de esa función, desactiva **Verify JWT** (puede aparecer como **Enforce JWT verification**). La función ya exige un token privado propio en cada petición; no acepta solicitudes anónimas ni utiliza la clave pública del frontend.

## 2. Añadir secretos a Edge Functions

En **Edge Functions → Secrets**, guarda:

| Nombre | Valor |
| --- | --- |
| SMTP_USER | supportsilvana@gmail.com |
| SMTP_PASSWORD | Tu contraseña de aplicación de Gmail, sin los espacios de presentación |
| MAIL_RELAY_TOKEN | Un secreto aleatorio nuevo, de al menos 64 caracteres hexadecimales |

Puedes generar el token con un gestor de contraseñas. Guarda una copia privada: debe coincidir exactamente en Render. No uses la contraseña de Gmail como token ni publiques estos valores en GitHub.

## 3. Conectar Render

En el servicio **silvana-api → Environment → Edit**, añade:

| Nombre | Valor |
| --- | --- |
| MAIL_TRANSPORT | supabase |
| SUPABASE_MAIL_URL | https://uqsrbacoztkdnkorqwld.supabase.co/functions/v1/silvana-mail |
| SUPABASE_MAIL_TOKEN | El mismo valor privado de MAIL_RELAY_TOKEN |
| APP_URL | https://silvana-silk.vercel.app |

Si utilizas otro proyecto de Supabase, cambia únicamente el identificador de proyecto en SUPABASE_MAIL_URL. Guarda y despliega. No coloques estos secretos en Vercel: el frontend no los necesita.

## 4. Comprobar

Espera a que Render indique **Live**, inicia sesión en Silvana y activa **Correo** en Notificaciones. Los avisos nuevos de esa cuenta entrarán en la cola; activar el correo no reenvía el historial. Comprueba una alerta nueva o un cambio real de conexión de la estación. El destinatario será el correo de la cuenta que tiene activada la preferencia.

Revisa la carpeta Spam si no aparece en Recibidos. La aceptación de Gmail no garantiza la bandeja principal. Si aparece un error MAIL_RELAY_401, los tokens no coinciden o sigue activa la verificación JWT; MAIL_RELAY_503 indica que faltan secretos; MAIL_RELAY_502 indica que la función no logró entregar a Gmail.

El trayecto será **navegador → Gateway → notificaciones-service → HTTPS de Supabase → Gmail**. Los demás microservicios y sus bases independientes permanecen en Render/Supabase.
