# Migración a Node.js / TypeScript

Se reemplazaron los procesos FastAPI por Fastify conservando las rutas de negocio del frontend. No se renombraron carpetas para mantener las rutas y configuraciones del equipo.

## Conservado

- Supabase Auth-service: mismas tablas, IDs, hashes Argon2id y sesiones SHA-256.
- Cookie monitoreo_session, HttpOnly, SameSite=Lax y cierre revocable.
- Dispositivos: mismo archivo SQLite, IDs, propietarios y credenciales.
- Frontend React, escenas, transiciones y peticiones por Gateway.

## Runtime actual

Cada servicio es autónomo con package.json, package-lock.json, tsconfig, Dockerfile y fuentes TypeScript. No necesita importar código de otro microservicio. El workspace raíz solo facilita instalar y arrancar procesos; las copias pequeñas de infraestructura (HTTP/DB) evitan una dependencia de despliegue compartida.

## Verificado

Compilación TypeScript y pruebas Node aisladas, compatibilidad Argon2 de Python, formato de fechas de sesiones heredadas, flujo HTTP real entre Auth/Dispositivos/Gateway, permisos por propietario y prueba con PostgreSQL Supabase real. Se preserva TLS con verificación de certificado usando la CA pública de Supabase. Las cuentas temporales se eliminan tras la verificación.

La documentación HTTP previa generada por FastAPI ya no se sirve en /docs; los contratos de negocio y comandos están en los README de cada servicio. No se afirma que los servicios pendientes estén implementados. Docker se adaptó pero no se ejecutó aquí.

El código Python anterior y sus pruebas se preservan en legacy/python como historial y no forman parte del arranque ni de npm test.
