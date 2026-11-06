# Dashboard general
Modo: Operate. Extensión del mundo visual aprobado; implementación directa solicitada por el usuario.

## Direction contract
THESIS: Un observatorio ambiental sobre el mismo paisaje vivo; navegación lateral familiar y contenido organizado por tareas.
OWN-WORLD: Cristal oscuro verdoso, bordes suaves, Manrope, texto blanco y menta para acciones. Fondo Three.js existente con velo más oscuro para leer.
STORY: Entrar con sesión protegida, ver dispositivos propios, registrar la primera estación y reconocer qué funciones esperan a los próximos microservicios.
FIRST VIEWPORT: Barra lateral de 218px, cabecera con saludo y hora, lectura ambiental vacía a la izquierda, estaciones a la derecha, historial vacío debajo. Navegación a resumen, dispositivos, recepción, análisis, alertas, notificaciones y cuenta. No se inventan mediciones ni salud de servicios.
FORM: Extensión code-led del cristal aprobado. Firma: salida direccional de acceso durante un segundo, paisaje continuo, entrada del espacio de trabajo con desenfoque y profundidad.
FINISH: Compilación y revisión visual de escritorio/móvil, estados vacíos funcionales y documentación actualizada.

## Rendimiento y paginación · 22 de octubre de 2026

El resumen pedía hasta 100 muestras y una segunda solicitud para la última lectura cada 5 segundos. Ahora pide 6 muestras y latest en una sola solicitud al Gateway. Recepción verifica la autorización una vez y consulta página/última medición en paralelo; no almacena autorizaciones en caché ni debilita la validación. El límite transportado pasa de 101 registros a 7 en el resumen y de 101 a 11 en recepción, contando latest. Esto mide trabajo/datos evitados, no garantiza un tiempo de red de Supabase.

Recepción solicita 10 muestras por página, con Anterior/Siguiente y desactivación en los extremos. has_more consulta una fila adicional en el servidor, sin cargar todo el historial. until fija la fecha de recepción al abrir la primera página para que envíos posteriores no desplacen las páginas antiguas; la última lectura sigue actualizándose cada 5 segundos. Actualizar vuelve a la primera página. Estación y período reinician la navegación. Un único StationMonitor conserva las lecturas al cambiar entre resumen y recepción y no consulta cuando está oculto en otras secciones. Los errores conservan los últimos datos conocidos.

El fondo continúa animado, con un perfil de coste reducido únicamente dentro del dashboard: máximo aproximado 12 fotogramas/s, pixel ratio limitado a 1, reflejo cada 400 ms y sombras cada 500 ms. El login recupera el perfil de calidad previo, sin reconstruir la escena. Se elimina el segundo desenfoque de toda la carcasa (el paisaje ya está difuminado), las superficies aíslan su pintura y el hover conserva iluminación sin medir/escribir posición en cada movimiento del ratón. Los formateadores de fecha/hora/números se reutilizan.

Verificación: compilaciones de frontend y recepción correctas; cinco pruebas de recepción pasan con bases SQLite temporales, incluyendo 23 lecturas en páginas 10/10/3, final vacío, nueva llegada entre páginas y rechazo de acceso ajeno. Revisión de controles en escritorio y móvil con datos locales ficticios, sin escribir en Supabase ni modificar firmware. Sin errores de consola. No se afirma una mejora medida de FPS o latencia en el equipo/red del usuario. La conexión a Supabase todavía puede aportar latencia.

El brillo de hover que sigue al cursor se ha restaurado por petición del usuario. Agrupa movimientos con requestAnimationFrame (máximo una lectura de geometría/escritura de coordenadas por fotograma), sin actualizar estado React. Cancela trabajo pendiente al salir o desmontar; touch no activa seguimiento. Conserva las mejoras de consultas, paginación y coste del paisaje. Compilación del frontend correcta.

## Actualización · 6/11/2026

Análisis y Alertas ya son secciones operativas: estación y período, estadísticas y series horarias; reglas configurables y eventos paginados de diez en diez. Conservan las superficies de vidrio, tipografía, efectos y fondo existentes. Cargas, errores, sincronización interrumpida y ausencia de estaciones/muestras tienen estados explícitos. Notificaciones sigue pendiente. Ver analisis-alertas.md para el contrato de datos.

## Centro de notificaciones · 6/11/2026

La sexta sección ya muestra avisos reales por propietario: todos/sin leer, paginación de diez, lectura individual y masiva con corte temporal, preferencias de canales y tipos, estado SMTP y reintento. La navegación muestra contador de no leídas. Se conserva el fondo, vidrio, tipografía, sonido y seguimiento de luz existentes. Correo deshabilitado hasta configurar el proveedor; no se simula entrega real.

## Confirmaciones de Silvana

uiFeedback.ts centraliza SweetAlert2: verde bosque, texto claro, confirmación y cancelación con foco de teclado, toast de éxito y errores de acciones. Notificaciones confirma activar correo, lectura masiva y reintento; Alertas confirma eliminar reglas; Dispositivos confirma eliminación y renovación de credenciales. Se mantienen errores de consultas automáticas en contexto, sin ventanas repetidas. Se verificaron cancelar, confirmar y actualización de estado con datos simulados, además del diseño a 1200 y 390 px. Informe: work/sweetalert-detect.json.

Los avisos superiores usan un contenedor propio transparente, sin backdrop ni desenfoque y sin bloquear la página. Entrada de 450 ms y salida de 300 ms; diálogos centrales con transición de 300/220 ms. Se respeta movimiento reducido y se mantiene tipografía compacta del aviso en móvil.

Los avisos incluyen los cambios de comunicación y habilitación de estaciones, con una preferencia propia. Estas entradas presentan el estado y su explicación, sin cifras de medición o umbral.
