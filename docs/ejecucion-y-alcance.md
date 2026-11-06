# EjecuciÃ³n y alcance Â· Node.js

La guÃ­a vigente estÃ¡ en `../README.md`. Cada carpeta de frontend, Gateway o microservicio se inicia con `npm run dev`. Node.js mÃ­nimo: 22.16. Python no forma parte del runtime actual.

Instala desde la raÃ­z con `npm install`; `npm run dev` en la raÃ­z ejecuta auth (8001), dispositivos (8002), Gateway (8000) y frontend (5173). Por separado, abre una CMD por carpeta y utiliza `npm run dev`; no dupliques puertos ya abiertos. Frontend en http://localhost:5173 .

## Persistencia

Auth conserva el proyecto independiente de Supabase ya configurado. Node utiliza las mismas tablas users/sessions, IDs, Argon2id y tokens opacos; las cuentas no se recrean. Se incluyen `migrations/001_auth.sql` y scripts TypeScript para migrar/verificar. El certificado pÃºblico de Supabase se conserva en cada servicio que admite PostgreSQL para validar CA y hostname. No se deshabilitÃ³ la validaciÃ³n TLS.

Dispositivos mantiene su archivo SQLite original, independiente de autenticaciÃ³n. TambiÃ©n admite una conexiÃ³n PostgreSQL propia. No se configurÃ³ el proyecto Supabase de dispositivos ni se comparte la URL de autenticaciÃ³n.

## SesiÃ³n y acceso

El navegador llama `/api/*`; Vite lo envÃ­a al Gateway. El Gateway dirige la peticiÃ³n al servicio correcto. Auth almacena hashes Argon2id y hashes SHA-256 de sesiones, devuelve cookie HttpOnly y revoca al salir. Dispositivos verifica sesiÃ³n por API, sin consultar las tablas de Auth. Los logs no contienen cuerpos de registro/login ni cookies.

La polÃ­tica de 12 a 128 caracteres, validaciÃ³n estricta de campos, normalizaciÃ³n de correo, permisos por propietario, origen permitido y limitador de intentos se conserva. El limitador es local a un Ãºnico proceso. Antes de mÃºltiples rÃ©plicas se necesita almacenamiento compartido para Ã©l. HTTPS exige COOKIE_SECURE=true y FRONTEND_ORIGIN exacto.

## Pruebas

`npm test` cubre compatibilidad con la implementaciÃ³n anterior, registro/login/rotaciÃ³n/expiraciÃ³n/logout, concurrencia de registro, persistencia SQLite, SSL y flujo HTTP real por Gateway con aislamiento de dispositivos. Usa bases temporales. `npm run verify:gateway` prueba los procesos reales y Supabase con una cuenta temporal que elimina al terminar. `npm run build` compila todas las carpetas.

## Pendiente

Los cuatro servicios futuros se pueden arrancar como bases Node (8003â€“8006), pero `/health` indica planned y `/ready` devuelve 503: no hay recepciÃ³n ni anÃ¡lisis de mediciones, alertas o notificaciones implementadas. No se incluye todavÃ­a recuperaciÃ³n de contraseÃ±a, verificaciÃ³n de correo u OAuth. El paisaje es ilustrativo y la iluminaciÃ³n automÃ¡tica sigue America/Bogota, no clima real.

Dockerfile y Compose se adaptaron a Node 22, con bases en volÃºmenes separados y solo frontend publicado en localhost:8080. Docker no se ha ejecutado aquÃ­. Los archivos de Python se archivaron en legacy/python; no se utilizan.


## Recepción incorporada

El arranque conjunto incluye también recepción :8003. `npm run verify:iot` verifica el flujo por Gateway hasta Supabase de recepción con datos temporales. La prueba física del ESP32 y la pantalla de lecturas aún están pendientes. Dispositivos conserva su SQLite mientras el pooler Supabase devuelva tenant/user no encontrado; la URI destino está en su .env privado. Ver `docs/conexion-esp32.md`.


## Actualización: dispositivos migrado a Supabase

El pooler ya acepta conexión. Se ejecutó la migración SQL, se importó el dispositivo local existente conservando ID, propietario y credencial, y se activó PostgreSQL en .env. SQLite permanece como respaldo. Se verificó el recorrido por Gateway con autenticación, dispositivos y recepción en tres bases Supabase independientes; datos temporales eliminados. La prueba física del ESP32 sigue pendiente. Este estado sustituye la incidencia de conexión descrita anteriormente.


## Estación y sensores automáticos

Se adaptó el sketch probado del usuario: DHT11 GPIO4, lluvia ADC34 (bajo=seco, umbral1200), BMP280 I2C21/22 en0x76/0x77. Vinculación inicial por código temporal de la cuenta; después la estación guarda identidad y credencial y reporta sus sensores sin configurarlos individualmente en la web. Dashboard/resumen y recepción muestran lecturas por estación cada5segundos, reportes y estado conectado/última comunicación. Wi-Fi y URL pueden cambiarse por USB sin reflashear, guardadas en NVS. Firmware compilado para ESP32; carga y envío físico de esta adaptación pendientes. Gateway local escucha interfaces de red; aún no hay URL pública de Internet. Detalles en docs/conexion-esp32.md. Esta actualización sustituye los textos previos que indicaban pantalla de lecturas pendiente.
