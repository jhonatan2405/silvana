# Alertas

Reglas configurables, incidencias, recuperación y reconocimiento.

Node.js + TypeScript + Fastify. Base PostgreSQL independiente; puerto local 8005.

## Comandos

- `npm run dev`: desarrollo.
- `npm run build`: compilar.
- `npm run migrate`: aplicar las migraciones de esta carpeta.
- `npm run verify:gateway`: integración con ambas bases reales y upstreams temporales; elimina sus propios registros de prueba. Requiere el monorepo.

Configura `.env` siguiendo `.env.example`, con DATABASE_URL y el token interno compartido. Nunca publiques este archivo. Las migraciones SQL y el script de ejecución permanecen en esta carpeta.

Consulta [el contrato y funcionamiento](../docs/analisis-alertas.md). El frontend accede mediante API Gateway; el feed interno no es público. Notificaciones es un servicio separado pendiente.
