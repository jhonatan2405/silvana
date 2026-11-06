# Despliegue del backend en Render Free

El Dockerfile de la raíz compila siete componentes del backend y ejecuta infra/start-render.mjs. El frontend se despliega aparte en Vercel.

## Procesos y entrada

El supervisor arranca autenticación, dispositivos, recepción, análisis, alertas y notificaciones secuencialmente, comprobando sus endpoints de disponibilidad. Después expone el Gateway en 0.0.0.0:$PORT (10000 por defecto). Los seis servicios escuchan solo en 127.0.0.1:18001–18006, de forma que el Gateway sigue siendo la única entrada pública.

Cada proceso recibe su propia DATABASE_URL desde las variables prefijadas del alojamiento. Las otras cinco conexiones se eliminan de su entorno. Los certificados, migraciones y plantilla de correo se incluyen en la imagen. Un fallo de arranque o la salida inesperada de un proceso termina el conjunto para que el alojamiento pueda reiniciarlo. Los procesos gestionan SIGTERM para cerrar sus conexiones.

El contenedor no incluye .env, config.h, bases locales, dependencias del equipo, respaldos ni historial de Git. No uses npm run dev en producción: el supervisor usa los JavaScript compilados, con un límite de heap de 64 MB por proceso. La memoria nativa adicional, incluido Argon2, sigue contando contra la RAM de la instancia. La idoneidad de 512 MB debe comprobarse durante el despliegue.

## Configuración

En Render: Web Service, repositorio jhonatan2405/silvana, rama main, runtime Docker, Dockerfile ./Dockerfile, contexto ., plan Free y Health Check Path /health. render.yaml conserva esta propuesta como referencia; las conexiones se configuran únicamente como variables privadas del alojamiento.

infra/render.env.example enumera las seis conexiones privadas, token interno, origen del frontend y APP_URL. COOKIE_SECURE debe ser true con HTTPS. No publiques los valores reales. Para Vercel se necesita un rewrite de /api al Gateway y revisar login/cookies/origen una vez exista su dominio; los permisos de origen no se abrirán con un comodín.

## Pruebas

Tras compilar el backend, `node infra/verify-render.mjs` comprueba el supervisor real con seis bases SQLite temporales: arranque, registro, login, dispositivo, recepción y acceso a análisis, alertas y notificaciones a través del Gateway. No modifica las bases Supabase ni envía correo. El supervisor se detiene y elimina sus propias bases al finalizar.

La prueba del arranque agrupado pasó localmente. La construcción Linux de la imagen terminó correctamente en Render y el servicio quedó Live en el plan Free el 6 de noviembre de 2026. Los seis servicios verificaron sus bases y el Gateway respondió HTTP 200 en https://silvana-api.onrender.com/health. Las rutas protegidas rechazaron consultas sin sesión y la ruta interna pública respondió 404. No se crearon cuentas de prueba en las bases reales para esta comprobación pública. El inicio de sesión desde el frontend definitivo queda pendiente de desplegar Vercel y configurar su origen.

## Límites de la entrega gratuita

Render puede dormir la instancia sin tráfico. Mientras esté dormida no se ejecutan los detectores ni las colas. SMTP está bloqueado en Free: este despliegue inicial no configura las credenciales Gmail SMTP; los avisos web siguen funcionando y el correo requiere una integración HTTPS posterior. Las preferencias de la cuenta se conservan en su base independiente. Una preferencia activada no equivale a que exista un transporte disponible en este alojamiento.

URL del backend: https://silvana-api.onrender.com . El endpoint /health es una comprobación de disponibilidad, no la interfaz web. La raíz del backend no sirve el frontend. Las conexiones PostgreSQL y el token interno se guardaron como variables privadas de Render con autorización del propietario; no están incluidos en la imagen ni en GitHub. El transporte SMTP local no se habilitó en Render Free.
