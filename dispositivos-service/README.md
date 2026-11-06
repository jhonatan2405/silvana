# Dispositivos Â· Node.js / TypeScript

Inventario por propietario, alta/ediciÃ³n, habilitaciÃ³n, eliminaciÃ³n y rotaciÃ³n de credenciales. Base independiente: conserva `dispositivos.db` o utiliza su propia `DATABASE_URL` PostgreSQL.

```cmd
npm run dev
```

Puerto 8002. Dependencias por separado: `npm install`. ProducciÃ³n: `npm run build` y `npm start`.

Cada peticiÃ³n protegida verifica `monitoreo_session` con la API de autenticaciÃ³n, usando `AUTH_SERVICE_URL`; no lee su base. Si autenticaciÃ³n falla, deniega el acceso. Los estados habilitado/deshabilitado son administrativos, no conexiÃ³n de sensores. La credencial se muestra una vez y solo se almacena su hash.

`GET/POST /devices`, `GET/PUT/DELETE /devices/:id`, `POST /devices/:id/rotate-credential`. El navegador utiliza `/api/devices/*` a travÃ©s del Gateway. `/health` y `/ready` comprueban proceso y base.

Carga `.env` desde esta carpeta. No colocar aquÃ­ la conexiÃ³n de autenticaciÃ³n. Node 22 muestra un aviso experimental al usar su mÃ³dulo SQLite integrado; no impide utilizar la base existente. Respaldo anterior en `legacy/python`.


## Recepción y última comunicación

`POST /internal/devices/verify` permite a recepción verificar `{device_id, credential}` con `x-internal-token` privado. No se publica en el Gateway. Se requiere `INTERNAL_SERVICE_TOKEN` idéntico en ambos servicios. Las credenciales del dispositivo se almacenan como hash SHA-256 y solo se muestran al crear o renovar.

Las respuestas públicas incluyen `last_seen_at` y `online`: activa y con contacto autenticado durante los últimos 120 segundos. Este estado se calcula al consultar, no es detección automática de equipos Wi-Fi. Una estación registrada sin envíos reales figura desconectada.

## Migración independiente a Supabase

Scripts guardados en `scripts/migrate.ts` y `migrations/001_devices.sql`. `DATABASE_URL` controla el servidor; `SUPABASE_DATABASE_URL`, si existe, es el destino de migración. Antes de importar, detener el servicio de dispositivos para evitar cambios durante la copia.

```cmd
npm run migrate -- --import-local --activate
npm run dev
```

Solo después de preparar el esquema e importar los registros, `--activate` actualiza `DATABASE_URL` en `.env`. Conserva IDs, propietarios, hashes de credenciales y el archivo SQLite original. Una repetición con los mismos datos no duplica; diferencias en un ID existente detienen la importación sin sobrescribir. Una conexión fallida no activa PostgreSQL. La base debe pertenecer al proyecto de dispositivos, nunca al de usuarios o recepción.

Estado actualizado: conexión Supabase verificada, esquema ejecutado e importación del dispositivo existente completada. DATABASE_URL apunta ahora al PostgreSQL independiente de dispositivos. Se conserva el archivo SQLite como respaldo. La comprobación por Gateway verificó dispositivos PostgreSQL y recepción PostgreSQL; los datos temporales se eliminaron.


## Vinculación inicial automática

- POST `/api/devices/pairing-codes`, con sesión y cuerpo opcional `{device_id}`: genera código aleatorio de64bits, solo hash en base, válido10min. Invalida el código anterior de esa cuenta. Si se proporciona ID, verifica propietario.
- POST `/api/devices/enroll`, sin cookie de usuario: recibe `{code,hardware_id,credential,sensors}` por Gateway. El ESP32 genera su credencial de32bytes aleatorios y la conserva antes de enviar. Crea la estación automáticamente o vincula la seleccionada conservando su ID/nombre. El código no permite apropiarse de equipos registrados en otra cuenta. Los datos se confirman dentro de una transacción con bloqueo de fila PostgreSQL y restricción única del chip. Repetir el mismo código/chip/credencial tolera una respuesta perdida sin duplicar; otros usos se rechazan. El ID de chip identifica, no es una prueba criptográfica ni reemplaza la credencial.
- GET `/api/devices/pairing-codes/status`, con sesión: indica confirmación del código de esa cuenta sin exponerlo. No basta con otra comunicación periódica de un equipo para mostrar vinculación exitosa.

Límite de enrolamiento20intentos/minuto por IP vista por el servicio, en memoria para una instancia. No hay descubrimiento abierto de equipos ni asociación sin consentimiento de cuenta. 002_pairing_sensors.sql contiene el esquema. El navegador no almacena la credencial del ESP32 para esta modalidad. El secreto interno de microservicios nunca se envía a la placa.

Las respuestas públicas incluyen hardware_id y reporte de sensores. La entrada ADC de lluvia se presenta como señal, no como confirmación eléctrica del módulo. La UI sondea cada5segundos y calcula estado a partir de contacto autenticado de menos de120segundos.
