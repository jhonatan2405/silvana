# Product
<!-- impeccable:product-schema 1 -->
## Platform
web
## Stack
React requested by the user. Backend vigente: Node.js + TypeScript + Fastify (migrado por solicitud del usuario). Independent databases per service; Supabase PostgreSQL is the intended managed database.
## Users
Academic project team and users monitoring environmental sensors in MonterÃ­a.
## Product Purpose
Monitor real ESP32 environmental measurements through six independently deployed microservices and a dashboard.
## Capabilities and Constraints
First implementation: users/authentication and devices, Gateway and React frontend. Each service owns a separate database. No shared-schema substitution. Start locally without pretending Supabase is connected. Future public weather comparison is conversational backlog only, not a new service now.
## Brand Commitments
Spanish interface. Product name Sistema de Monitoreo IoT. Login/register sliding panel from supplied reference; environmental scene responds to MonterÃ­a time and eventually real sensor conditions. Moderate motion. User approved direct code implementation.
## Evidence on Hand
User-provided login HTML/CSS/JS reference. No live sensors or Supabase credentials supplied.
## Product Principles
Build and verify in phases. Clearly label preview environmental states. Protect backend routes as well as frontend. Keep independent service persistence and documented contracts.

## Updated access commitment
User requests the Three.js landscape as a persistent full-window background, with floating lateral login/registration form in desktop and responsive vertical flow in mobile, following docs/references/acceso-fondo-referencia.png. Preserve account switching, improve living clouds and continuous time transitions. Lower controls redesign is deferred by the user. Actual Ahora mode must remain honest about real local time and demonstration weather.


## Latest access decisions
The user now rejects side swapping: keep one fixed card and fixed camera; only form content changes. Use a single cyclic lighting button, separate rain button, sound icon only, and a compact play/pause icon to support explicit animation activation when the browser requests reduced motion. Cloud and river movement must be visible. Fixed viewport access page with only card-internal overflow for small heights/errors. Keep left scene headline; remove redundant account switches and footer copy. Hover effects must not move the card.


Latest explicit preference: always animate the visible scene, remove pause controls, move icon-only sound to header, upward environment dropdown, blurrier stationary glass form without antenna.



## Estado actualizado Â· 22 de octubre de 2026
Auth-service ya usa PostgreSQL Supabase y fue verificado por API Gateway. Dispositivos conserva su almacenamiento independiente local; no se conectÃ³ a la base de autenticaciÃ³n. El dashboard general implementa navegaciÃ³n para todos los mÃ³dulos previstos, dispositivos funcionales y cuenta. RecepciÃ³n, anÃ¡lisis, alertas, notificaciones y lecturas de sensores permanecen pendientes y se indican asÃ­ en la interfaz. El usuario pide preservar el paisaje y el cristal del login, con transiciÃ³n direccional de un segundo al entrar; no sustituir datos ausentes por mediciones inventadas.


## Identidad actual
La plataforma se llama Rivora, por decisiÃ³n creativa delegada por el usuario el 22 de octubre. Sustituye Â«monitoreo iotÂ» en las marcas visibles, favicon y tÃ­tulo web. El sÃ­mbolo de gota/cauce es tambiÃ©n el loading de operaciones y arranque. Se conserva la denominaciÃ³n tÃ©cnica de servicios y el propÃ³sito de monitoreo ambiental.


## Nombre vigente: Silvana
El usuario elige Silvana el 22 de octubre y reemplaza la propuesta Rivora. Identidad orgÃ¡nica de hojas y seÃ±ales. Solo sÃ­mbolo 3D y nombre durante loading, sin subtÃ­tulo; logo de validaciÃ³n confinado a la tarjeta, sin repetirse durante las transiciones direccionales de entrada/salida.


## Backend Node.js vigente
El usuario solicita migrar todos los procesos a Node.js/TypeScript y uniformar el arranque con npm run dev. Auth, Gateway y dispositivos estÃ¡n migrados; conservan tablas, hashes, sesiones y bases independientes. Las otras cuatro carpetas tienen base Node explÃ­citamente pendiente. La versiÃ³n Python queda archivada y no se necesita para ejecutar o probar la aplicaciÃ³n.


## Recepción IoT implementada

Recepción :8003 tiene PostgreSQL Supabase independiente y ruta /api/readings por Gateway; autentica dispositivos mediante API interna con token privado, valida temperatura/humedad/presión/lluvia resistiva, conserva idempotencia y protege consultas por propietario. Última comunicación permite calcular online durante 120 segundos en dispositivos. Se verificó por HTTP hasta recepción PostgreSQL usando datos temporales eliminados. Dispositivos continúa SQLite por error tenant/user no encontrado en su Supabase; migración preparada, no declarada completa. Modelos/pines retomados de Momento 2 IOT.docx. Firmware de ejemplo aún sin compilar ni probar físicamente. Análisis, alertas, notificaciones y pantalla de lecturas siguen pendientes.


## Actualización: dispositivos migrado a Supabase

El pooler ya acepta conexión. Se ejecutó la migración SQL, se importó el dispositivo local existente conservando ID, propietario y credencial, y se activó PostgreSQL en .env. SQLite permanece como respaldo. Se verificó el recorrido por Gateway con autenticación, dispositivos y recepción en tres bases Supabase independientes; datos temporales eliminados. La prueba física del ESP32 sigue pendiente. Este estado sustituye la incidencia de conexión descrita anteriormente.


## Estación y sensores automáticos

Se adaptó el sketch probado del usuario: DHT11 GPIO4, lluvia ADC34 (bajo=seco, umbral1200), BMP280 I2C21/22 en0x76/0x77. Vinculación inicial por código temporal de la cuenta; después la estación guarda identidad y credencial y reporta sus sensores sin configurarlos individualmente en la web. Dashboard/resumen y recepción muestran lecturas por estación cada5segundos, reportes y estado conectado/última comunicación. Wi-Fi y URL pueden cambiarse por USB sin reflashear, guardadas en NVS. Firmware compilado para ESP32; carga y envío físico de esta adaptación pendientes. Gateway local escucha interfaces de red; aún no hay URL pública de Internet. Detalles en docs/conexion-esp32.md. Esta actualización sustituye los textos previos que indicaban pantalla de lecturas pendiente.

## Estado funcional · 6/11/2026

Análisis y alertas implementados con bases separadas y acceso por Gateway. Análisis calcula estadísticas y series horarias. Alertas permite configurar umbrales y reconocer incidencias sin duplicarlas por cada lectura. No se envían notificaciones todavía. Contrato: docs/analisis-alertas.md.

## Notificaciones · 6/11/2026

Los seis microservicios están implementados. Notificaciones recibe aperturas y cierres desde la bandeja de alertas, conserva historial, estado de lectura, preferencias y cola de correo. Gmail requiere credenciales locales para una prueba externa; el centro web funciona sin ellas. No se afirma entrega a bandeja de entrada por aceptación SMTP.
