# Análisis y alertas · 6 de noviembre de 2026

## Ejecución

Desde la raíz, `npm run dev` inicia frontend, Gateway y los cinco microservicios implementados. También puedes ejecutar `npm run dev` dentro de cada carpeta. Análisis utiliza el puerto 8004 y alertas el 8005. El navegador entra por http://localhost:5173 y todas sus peticiones de negocio pasan por `/api` en el Gateway (8000).

Cada servicio tiene su propio `.env`, conexión PostgreSQL independiente, certificado TLS y migraciones en `migrations/`. Las contraseñas no forman parte de los ejemplos. Para aplicar el esquema: `npm run migrate` desde la carpeta correspondiente. Los scripts son idempotentes y también se aplica el esquema al iniciar.

## Flujo y recuperación

Recepción conserva las mediciones originales. Análisis y alertas consultan su feed HTTP interno con token compartido cada cinco segundos, en lotes de hasta 200. Cada consumidor confirma su lote después de persistirlo en su propia base. Las confirmaciones se almacenan en recepción (`003_deliveries.sql`), por separado para cada consumidor. Un fallo se reintenta; las claves únicas y el estado persistido impiden duplicar muestras o incidencias. No hay consultas directas entre bases ni rutas internas expuestas por el Gateway.

El dashboard consulta cada diez segundos mientras está visible. No es transmisión instantánea: normalmente aparecerán cambios en unos segundos, y un histórico grande puede requerir varios lotes. La interfaz informa si hay recuperación de histórico o si falla la sincronización, manteniendo los datos ya procesados.

## Análisis

`GET /api/analysis/summary?device_id=...&period=24h|7d|30d`

Importa mediciones recibidas durante los últimos 31 días. Calcula cantidad, promedio, mínimo y máximo de temperatura DHT, humedad, presión y temperatura BMP280; devuelve series horarias y muestras con agua detectada. Las variables ausentes se excluyen del cálculo y se representan sin valor, nunca como cero. No se estima precipitación en milímetros: la placa resistiva solo informa presencia de agua. Los datos derivados se conservan; no se ha añadido una política automática de borrado.

## Alertas

- `GET /api/alerts?device_id=...&limit=10&offset=0`: reglas, incidencias paginadas y contadores. `before` fija el corte temporal al pasar de página.
- `POST /api/alerts/rules`: crear regla con device_id, name, metric, operator, threshold y enabled.
- `PUT /api/alerts/rules/:id`: actualizar los mismos campos, salvo device_id.
- `DELETE /api/alerts/rules/:id`: desactivar y retirar una regla conservando su historial.
- `POST /api/alerts/events/:id/ack`: reconocer una incidencia.

Las variables admitidas son temperature_c, humidity_pct, pressure_hpa, temperature_bmp_c y rain_detected (0/1). Operadores: gt, gte, lt, lte, eq. Los umbrales son configurados por el usuario: no se han creado límites predeterminados ni se afirma que un rango sea seguro. Máximo 50 reglas por propietario.

La primera lectura que cumple una condición abre una incidencia. Las siguientes lecturas que siguen cumpliéndola no generan otras. Una nueva lectura que deja de cumplirla resuelve la incidencia; si vuelve a incumplir, abre otra. Reconocer significa que el usuario la vio; no equivale a resolverla. Cambiar, pausar o eliminar una regla cierra sus incidencias abiertas y reinicia el criterio desde ese cambio. Solo se evalúan mediciones posteriores a guardar la regla; se omiten variables ausentes y lecturas anteriores al último estado procesado. El estado persiste entre reinicios. Si llegan lecturas atrasadas, se conservan en recepción y análisis, pero no revierten el estado de alerta actual.

**El envío de correo, Telegram u otras notificaciones sigue pendiente del microservicio de notificaciones.**

## Acceso y validación

Cada consulta pública valida sesión y propiedad de la estación mediante autenticación y dispositivos. Las reglas y eventos se filtran por propietario; no se acepta owner_id proporcionado por el navegador. Las tablas nuevas tienen RLS y revocación de acceso para anon/authenticated en Supabase. Los procesos usan la conexión privada PostgreSQL con certificado validado.

## Comprobaciones realizadas

- `npm test`: 26 pruebas correctas, incluidas integración por Gateway, aislamiento entre usuarios, estadísticas, nulos, deduplicación, recuperación y reconocimiento.
- `npm run build`: compilación de todos los paquetes.
- `npm run verify:gateway` en análisis: recorrido HTTP con ambas bases PostgreSQL reales, upstreams temporales y limpieza de los registros de prueba. No cambia la cuenta ni la estación del usuario.
- Interfaz revisada con datos simulados identificados como tales; no se crean reglas reales sin elegir umbrales.
- Archivos Docker actualizados, sin ejecución de contenedores en esta entrega.

La revisión visual cubrió escritorio y móvil, creación de una regla y reconocimiento con datos simulados, sin cambiar umbrales reales. El detector de estilos dejó avisos de tipografía, colores y radios respecto a DESIGN.md en la hoja existente; se mantuvo la identidad visual solicitada. Informe local: work/analysis-alerts-detect.json.
