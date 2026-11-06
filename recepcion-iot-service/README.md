# Recepción IoT · Silvana

Recibe mediciones reales del ESP32 a través del API Gateway. Puerto local 8003, Node.js 22.16+.

```cmd
npm run dev
npm run migrate
npm run verify:gateway
```

`migrate` ejecuta la migración idempotente guardada en `migrations/001_readings.sql`. La base de recepción es independiente de autenticación y dispositivos. Se verifica el certificado PostgreSQL de Supabase usando `certs/supabase-ca.crt`.

## Configuración

`DATABASE_URL`, `DEVICES_SERVICE_URL` y `INTERNAL_SERVICE_TOKEN` en `.env` privado. El token interno debe coincidir con dispositivos; no pertenece al firmware ni al frontend. Gateway usa `RECEPTION_SERVICE_URL=http://127.0.0.1:8003`. Los puertos de los servicios son internos: el ESP32 envía al Gateway 8000.

## Envío

`POST /api/readings` por Gateway, con `Authorization: Bearer CREDENCIAL_DEL_DISPOSITIVO` y `Content-Type: application/json`.

```json
{
  "device_id": "ID_DE_32_CARACTERES_HEXADECIMALES",
  "packet_id": "04ac7247-e11a-47d4-af18-487ea62d4b49",
  "measured_at": "2026-10-22T15:00:00Z",
  "measurements": {
    "temperature_c": 29.4,
    "humidity_pct": 74,
    "pressure_hpa": 1007.2,
    "rain_detected": false,
    "rain_raw_adc": 3900
  }
}
```

Ejemplo ilustrativo, no una lectura física. Usar fecha real del muestreo. `packet_id` es un UUID nuevo por muestra; conservarlo, junto con el cuerpo completo, cuando se reintente el mismo envío. El servidor responde 201 la primera vez, 200 con `duplicate:true` al repetirlo y 409 si se reutiliza el UUID cambiando la lectura. La restricción única en la base evita duplicados incluso con envíos simultáneos.

Se exige al menos una variable válida; los campos desconocidos se rechazan. Temperatura −80..100 °C; humedad 0..100 %; presión 300..1100 hPa; lluvia booleana y valor ADC entero 0..4095. Estos son límites del contrato de recepción, no precisiones del sensor. Si un sensor falla, omitir su variable, no enviar NaN ni números inventados. Fecha ISO con zona horaria y hasta cinco minutos de adelanto para tolerar desfase del reloj. Se permiten muestras históricas reenviadas; no se calcula online a partir de su fecha de muestreo, sino de su recepción.

El sensor resistivo documentado detecta agua; no mide milímetros. No existe campo `rainfall_mm`.

Dispositivos comprueba ID, credencial hash y estado activo por una API interna autenticada. Actualiza `last_seen_at` cuando comprueba una comunicación válida, aunque después falle la persistencia de la lectura; significa contacto, no confirmación de guardado. Solo un 201/200 de recepción confirma almacenamiento. Al renovar credencial o desactivar la estación, los nuevos envíos con la anterior se rechazan. El endpoint interno no está publicado en el Gateway.

Errores: 401 credencial ausente/inválida; 403 acceso prohibido; 422 datos incorrectos; 409 UUID reutilizado; 429 límite; 503 dependencias no disponibles. Límite actual: 120 intentos/minuto por IP vista por recepción; detrás del Gateway todos comparten esta cuota. Está pensado para una estación cada 30 segundos y un proceso; escalado y cuotas distribuidas quedan pendientes.

## Consulta

`GET /api/readings?device_id=ID&limit=50&offset=0`, con la cookie de sesión. Dispositivos verifica la sesión y propiedad por su API; recepción no consulta bases ajenas. Orden de fecha de muestreo descendente. `limit` 1..100. Otra cuenta obtiene 404 para una estación ajena. Un usuario sin sesión recibe 401. La lectura conserva el propietario como dato de auditoría; no existe transferencia de propiedad en esta etapa.

`/health` confirma proceso; `/ready` comprueba la base. No confundir readiness de base con disponibilidad de dispositivos.

## Pruebas y siguiente fase

Desde la raíz: `npm test` y `npm run verify:iot`. Este último crea una cuenta, estación y lectura temporales por Gateway, comprueba persistencia, reenvío y sesión, y limpia los datos al finalizar. Nunca los presenta como sensor físico.

Pendiente: prueba física con ESP32, eventos hacia análisis y retención de históricos. Este servicio no calcula estadísticas ni emite alertas todavía.


## Adaptación al montaje probado

Contrato ampliado con `measurements.temperature_bmp_c` y `sensors:[{type,status}]` opcional. Tipos DHT11/DHT22, BMP280 y RAIN_ANALOG; estados ok/error/unverified. Se conserva compatibilidad con paquetes anteriores sin reporte de sensores. Las respuestas e historial conservan el reporte por muestra; Dispositivos mantiene el último reporte comunicado. `GET /api/readings` admite `since` ISO con zona horaria, además de límite/offset. Las pantallas de resumen y recepción ya consultan las lecturas reales de la estación seleccionada cada5segundos; no simulan nuevas mediciones. Los valores temporales de prueba se eliminan.

Firmware compilado para ESP32; configuración local privada en config.h y cambios posteriores por Monitor serie, guardados en NVS. Ver `docs/conexion-esp32.md`. 002_sensor_report.sql registra la migración de reporte. Lluvia ADC bajo es seco según el montaje aportado, corrigiendo la inversión del primer ejemplo. Las alarmas por umbral pertenecen a fases futuras; no se importaron mensajes/reglas del antiguo envío directo a Supabase como si ya fueran el servicio de alertas.
