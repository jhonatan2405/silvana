# Notificaciones de Silvana

Node.js + TypeScript + Fastify. Puerto local 8006, base PostgreSQL independiente y acceso público exclusivamente por API Gateway.

## Ejecución

- `npm run dev`: iniciar en desarrollo.
- `npm run build`: compilar.
- `npm run migrate`: aplicar las tablas de esta carpeta.
- `npm run verify:gateway`: verificar el recorrido con la base real de notificaciones y upstreams temporales; limpiar sus propios registros. No envía correo externo.

El archivo local `.env` contiene la conexión y el token compartido, y está excluido del control de versiones. `.env.example` solo contiene valores de ejemplo. El esquema también se aplica al iniciar. La configuración de TLS valida el certificado de Supabase.

## Gmail y plantilla

La plantilla propia es `templates/alert.html`. Tiene versión HTML y texto, escapa valores dinámicos y evita imágenes externas. El enlace usa APP_URL, que debe apuntar al frontend accesible por el destinatario (en despliegue debe dejar de ser localhost).

Configura SMTP_HOST=smtp.gmail.com, SMTP_PORT=465, SMTP_USER, SMTP_FROM y SMTP_PASSWORD en el `.env` local. SMTP_USER y SMTP_FROM corresponden a la cuenta remitente. Para SMTP con Gmail se utiliza una contraseña de aplicación; no la contraseña habitual. La cuenta requiere verificación en dos pasos y que Google permita contraseñas de aplicación. También se admiten puerto 587 con STARTTLS obligatorio y otros proveedores SMTP compatibles.

Las plantillas de Supabase Auth no envían estas alertas de negocio; sirven para sus propios flujos de autenticación. Este microservicio conserva las notificaciones en Supabase y envía el correo mediante Gmail.

El servicio arranca con el centro web aunque Gmail no esté configurado. La interfaz informa de ello y bloquea activar correo hasta completar la configuración. No se ha marcado ningún correo real como enviado sin una respuesta del servidor SMTP.

## Rutas por Gateway

- GET `/api/notifications?limit=10&offset=0&unread=false&before=...`: historial con diez avisos por página por defecto y contadores.
- GET/PUT `/api/notifications/preferences`: web_enabled, opened_enabled, resolved_enabled y email_enabled. El destinatario siempre se obtiene de la cuenta autenticada; no se acepta un correo arbitrario desde el navegador.
- POST `/api/notifications/:id/read`: marcar un aviso como leído.
- POST `/api/notifications/read-all` con before ISO: marcar lo recibido hasta ese corte.
- POST `/api/notifications/:id/retry-email`: reencolar manualmente un envío fallido cuando el canal está activo.

Todas las rutas validan sesión y propietario. Las tablas notifications y notification_preferences tienen RLS habilitado y acceso revocado a anon/authenticated. No hay una ruta pública para generar mensajes arbitrarios ni enviar a terceros.

## Entrega y recuperación

Alertas almacena una bandeja durable (`alertas-service/migrations/002_notifications.sql`) en la misma transacción que abre o cierra una incidencia. Los avisos de apertura y cierre tienen identificadores únicos. Se recupera también el historial de incidencias que ya existía al aplicar la migración.

Notificaciones consulta ese feed interno cada cinco segundos en lotes de 200, guarda sus registros en su propia base y luego confirma la recepción. Si falla la confirmación, la fuente reenvía el lote; la clave source_id evita duplicados. El feed se protege con el token interno y no se publica por el Gateway. No se comparten conexiones entre bases. Las lecturas consecutivas de una alerta abierta no generan nuevos avisos.

Las preferencias son por cuenta, no por estación. Cambiarlas afecta a los próximos avisos; el historial existente se conserva. Activar el correo no envía una acumulación de avisos anteriores al cambio. Desactivarlo cancela los envíos pendientes; un correo ya en tránsito puede completar su envío. Leer una notificación no reconoce ni resuelve su alerta.

La cola SMTP persiste entre reinicios. Reclama hasta diez trabajos por vuelta, con bloqueo temporal de dos minutos. Los fallos se reintentan hasta cinco veces, con espera creciente desde 30 segundos. Un trabajo interrumpido se recupera al vencer el bloqueo. El registro conserva estado, número de intentos y aceptación por SMTP. Se puede solicitar otro ciclo de reintentos desde el panel. Los errores almacenados no incluyen contraseñas ni respuestas SMTP completas.

La aceptación SMTP no demuestra que el correo haya llegado a la bandeja de entrada. Si el servidor acepta un mensaje y el proceso se interrumpe antes de guardar el resultado, un reintento puede producir otro correo: SMTP no ofrece exactamente una entrega. Cada aviso mantiene un Message-ID estable. Los límites de envío del proveedor siguen aplicando; no se incorporaron webhooks de rebote ni confirmaciones de lectura por correo.

## Validación de esta entrega

- 31 pruebas del proyecto correctas: aislamiento, ciclo de alerta, deduplicación, paginación, preferencias, reintentos y persistencia tras reinicio, además de las pruebas existentes.
- Integración HTTP con PostgreSQL real de notificaciones verificada; los registros temporales se eliminaron.
- Compilación de los ocho paquetes correcta. Docker actualizado, sin ejecutar contenedores.
- Revisión de escritorio y móvil con datos simulados identificados. Detector de estilos ejecutado una vez; avisos de escala tipográfica, colores y radios respecto a DESIGN.md conservados para respetar el diseño existente (work/notifications-detect.json).
- Gmail real pendiente de credenciales y de una prueba al destinatario elegido por el usuario. Las pruebas de reintentos emplearon un transporte controlado que no envía correo.

Fuentes: https://nodemailer.com/smtp · https://supabase.com/docs/guides/auth/auth-email-templates · https://support.google.com/accounts/answer/185833?hl=es

## Plantilla con identidad de Silvana

La cabecera incorpora el símbolo original de hojas y el nombre. El PNG se adjunta como imagen inline CID; no se descarga desde una web externa. El SVG fuente está en templates/silvana-mark.svg; `npm run build:logo` regenera el PNG. El render conserva la versión de texto, escapa datos y mantiene un Message-ID estable. `npm run preview:email` genera una vista local con valores ilustrativos, sin enviar correo. Revisada a 1000 y 390 píxeles; prueba MIME verificada para multipart/related y Content-ID. Seis pruebas del módulo y compilación correctas. Los cambios se aplican a los próximos envíos.

## Activación y frecuencia visibles en el panel

Gmail configurado no activa el correo de todas las cuentas: cada usuario debe habilitarlo en Notificaciones → Activar correo (o Preferencias → Correo electrónico → Guardar). El destinatario es el correo de esa cuenta, no necesariamente la cuenta remitente. El panel informa del estado actual y solicita confirmación con SweetAlert2, con la paleta de Silvana. Los registros antiguos indican que no se solicitó correo para ese aviso; habilitar el canal no modifica ni reenvía ese historial.

Se genera un aviso por transición a incumplimiento, por regla. Si la condición persiste, no se repite cada lectura ni cada hora. Se genera un cierre cuando deja de cumplirse o se cierra por cambio de regla, según las preferencias. Un nuevo incumplimiento tras el cierre genera otro aviso. Varias reglas pueden generar avisos independientes. Los reintentos SMTP corresponden al mismo correo fallido, no a recordatorios periódicos.

## Cambios de estado de las estaciones

Dispositivos mantiene su propia bandeja durable (003_presence.sql) y Notificaciones la consume por HTTP interno cada cinco segundos, independientemente del feed de alertas. La escritura del estado y del evento ocurre en la misma transacción; la confirmación posterior y source_id único impiden duplicados. Los eventos no contienen credenciales de estación.

- Conectada: primera comunicación válida o vuelta a comunicarse después de quedar sin conexión.
- Sin comunicación: transcurren al menos 60 segundos sin comunicación válida, comprobados cada cinco segundos. No significa que se pueda asegurar un corte de corriente: puede fallar la alimentación, Wi-Fi o el acceso al Gateway.
- Habilitada/deshabilitada: cambia el permiso desde el panel. Habilitar no afirma que el equipo esté conectado; se espera una comunicación nueva.

Se conserva un único evento por transición, incluso entre reinicios. Una estación que nunca se ha comunicado no genera un falso aviso de desconexión. No se generan recordatorios horarios. Si los procesos están detenidos no se puede detectar la pérdida hasta volver a iniciarlos. Se utiliza la hora de recepción del servidor, no una fecha inventada del ESP32.

La preferencia station_enabled es independiente de las alertas de umbral y está activa por defecto. Centro web y correo respetan sus canales. Para recibir estos correos activa Correo electrónico y Conexión y habilitación de mis estaciones en Preferencias. Los avisos anteriores no se reenvían. El correo de estado muestra una descripción del cambio, sin presentar valores ficticios de sensores.

Validación: 34 pruebas correctas, incluyendo transición online/offline, ausencia de duplicados, recuperación, deshabilitación, rechazo de credencial deshabilitada, habilitación sin fingir conexión y exclusión por preferencias. Migraciones aplicadas en PostgreSQL; Docker actualizado sin ejecutar contenedores.

El plazo de desconexión es de un minuto desde el último contacto válido, igual que el estado online del dashboard. El trabajador de notificaciones procesa el correo al terminar la sincronización, sin esperar otra vuelta de cinco segundos. El escaneo y el feed siguen teniendo intervalos de cinco segundos; la entrega SMTP añade su propio tiempo.
