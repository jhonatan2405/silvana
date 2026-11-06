# Auth-service · Node.js / TypeScript

Registro, login, perfil y logout revocable, con Fastify, Argon2id y PostgreSQL Supabase independiente. Las tablas, hashes y cookies existentes se mantienen.

```cmd
npm run dev
```

Puerto 8001 (personalizable con `PORT`); carga `.env` desde esta carpeta. Para instalar solo este servicio: `npm install`. Producción: `npm run build` y `npm start`.

```cmd
npm run migrate
npm run verify:gateway
```

`migrations/001_auth.sql` conserva usuarios/sesiones y activa RLS sin permisos públicos de anon/authenticated. `scripts/migrate.ts` aplica la migración en una transacción. `scripts/verify-gateway.ts` verifica el flujo real por Gateway con una cuenta temporal y limpia sus datos. No usa Python.

`DATABASE_URL` acepta PostgreSQL, la URI anterior con `+psycopg` o SQLite local. La conexión Supabase está configurada en `.env` y no se imprime. Se verifican CA y hostname con el certificado público `certs/supabase-ca.crt`. Se puede sustituir mediante `DATABASE_CA_CERT`.

Rutas: POST `/auth/register`, POST `/auth/login`, GET `/auth/me`, POST `/auth/logout`. El navegador usa únicamente sus equivalentes `/api/auth/*` del Gateway. `/health` identifica el proceso Node; `/ready` consulta la base.

Cookies HttpOnly, SameSite=Lax, expiración predeterminada de 24 horas (máximo 168), revocación inmediata y tokens guardados como SHA-256. Contraseñas Argon2id compatibles con la implementación anterior. `COOKIE_SECURE=true` bajo HTTPS; `FRONTEND_ORIGIN` debe coincidir con el frontend. El limitador por correo permanece en memoria para una sola instancia; no se presenta como limitador distribuido.

Fuente anterior en `legacy/python`, solo respaldo. No ejecutar sus scripts.
