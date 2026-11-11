# Análisis y referencia meteorológica de Montería

Actualización local: 11 de noviembre de 2026. Conserva las seis bases independientes y el diseño de Silvana. No requiere otra cuenta, base de datos ni clave pública nueva.

## Pantalla de análisis

- Variables: temperatura DHT11, humedad, presión de superficie y temperatura BMP280.
- Períodos: 24 horas, 7 días y 30 días.
- Evolución interactiva con promedio horario y rango mínimo–máximo de la estación; las horas sin mediciones no se unen.
- Comparación opcional con la referencia externa de Montería, con valores horarios del modelo.
- Diferencia media (estación menos referencia) y diferencia absoluta media, calculadas solo en horas coincidentes. Una diferencia no prueba un fallo o descalibración del sensor.
- Perfil por hora de Montería, ponderado por la cantidad de muestras válidas de cada hora.
- Cantidad de lecturas por hora y cobertura de cada variable dentro del total recibido. No se inventa una frecuencia de envío ni se califica la calidad de un sensor por estar ausente.
- Amplitud y desviación estándar poblacional del período, sin sustituir ausencias por ceros.
- CSV con fechas UTC, unidades en cabeceras, datos locales y externos separados. Las ausencias se exportan en blanco.

La placa resistiva solo indica agua presente. No se convierte a milímetros ni se calcula un error frente a la precipitación meteorológica.

## Fuentes investigadas

| Fuente | Qué ofrece | Decisión |
| --- | --- | --- |
| [Open-Meteo](https://open-meteo.com/en/docs) | Temperatura a 2 m, humedad relativa, presión de superficie y precipitación horaria por coordenadas. Son resultados de modelos, no observaciones de una estación física. | Integrado para Montería (8,75, -75,88), con atribución y licencia [CC BY 4.0](https://open-meteo.com/en/licence). La API pública sin clave está orientada al uso no comercial y sujeta a límites del proveedor. |
| [IDEAM / DHIME](https://ideam.gov.co/dhime) y [manual de datos abiertos](https://www.ideam.gov.co/sites/default/files/transparencia/datos-abiertos/2025-05/manual_consumo_de_datos.pdf) | Observaciones oficiales por estación y variable. Catálogo de estaciones hp9r-jxuu, humedad uext-mhny, precipitación s54a-sgyg y presión 62tk-nxj5. | Alternativa para investigación con estaciones físicas. Hay que comprobar estación, cobertura y fecha efectiva de cada variable; no se declara como tiempo real ni se mezclan estaciones distintas como si fueran una. |
| [NOAA Aviation Weather Center](https://aviationweather.gov/data/api/) | Observaciones METAR del aeropuerto Los Garzones, identificador SKMR. Se comprobó una respuesta HTTP 200 con observación de Montería. | Alternativa física disponible. El METAR no entrega todas las mismas variables: la humedad puede requerir derivación y el ajuste altimétrico no equivale a presión de superficie del BMP280. No se integró como una segunda curva con equivalencias falsas. |

## Contrato y acceso

`GET /api/analysis/reference?device_id=<id>&period=24h|7d|30d`

El navegador usa únicamente el Gateway, que deriva a análisis. El servicio valida sesión y propiedad de la estación antes de contactar al proveedor. La referencia no se registra como un ESP32, no recibe credenciales de dispositivo ni genera alertas sobre datos externos.

El servicio consulta exclusivamente la URL fija de Open-Meteo; no acepta URLs o coordenadas arbitrarias del cliente. Conserva caché de 10 minutos por período, comparte consultas simultáneas y limita cada espera externa a 8 segundos. Una caída permite mostrar una copia anterior de hasta una hora, identificada como anterior; después informa indisponibilidad. Los reintentos al proveedor se espacian un minuto. La consulta externa es independiente del resumen local, para no retrasarlo.

Las fechas horarias se normalizan a ISO UTC antes de cruzarlas. Se excluyen puntos futuros y se representan fechas en America/Bogota. La referencia puede proceder de una celda cercana a las coordenadas solicitadas; la respuesta conserva ambos pares de coordenadas. Se excluyen los valores nulos de las comparaciones.

## Espera inicial y confirmaciones

Al tardar el servidor, el acceso aparece con un aviso inferior de espera y reconexión automática. La comprobación de sesión utiliza solo GET, con intentos limitados y un plazo total de 90 segundos. Si no responde, ofrece reintentar. Nunca se reenvían automáticamente formularios de registro o acceso.

Cerrar sesión pide confirmación con SweetAlert2 antes de revocar la sesión y mantiene la transición de salida existente. También se confirma habilitar/deshabilitar una estación, cambiar o pausar una regla y desactivar los correos. Las confirmaciones anteriores para eliminar, renovar credenciales y reintentar envíos se conservan.

Verificación: compilación del frontend y análisis; 42 pruebas del proyecto, incluidos agregados, aislamiento por propietario, caché, datos externos ausentes y recuperación del servidor. Revisión local con el histórico real, sin insertar lecturas de ejemplo en las bases del usuario. Los cambios quedan locales para su revisión antes de publicar.


## Segunda revisión · estaciones y tiempo continuo

La pantalla de Recepción incluye un selector de estaciones propias y fuentes externas. Los Garzones (SKMR) entrega observaciones del aeropuerto a través de NOAA/Aviation Weather Center; Open-Meteo es una referencia de modelo para Montería. Ambas son de solo lectura y pasan por el Gateway y análisis; no se registran como dispositivos ESP32 ni reciben credenciales. Las consultas externas requieren una sesión válida incluso sin estaciones propias. La humedad METAR se calcula con temperatura y punto de rocío (Magnus); se identifica como calculada. La presión altimétrica se conserva separada de presión de superficie; no se inventa lluvia en mm para METAR.

Análisis admite última hora, 24 h, 7 días, 30 días, año e histórico completo, con agrupación automática, horaria, diaria, mensual o anual. Día, mes y año respetan America/Bogota. El histórico completo comienza en la primera medición almacenada, sin recortarlo a 30 días. Se consume también el histórico pendiente anterior a ese plazo desde recepción. Para limitar respuestas gigantes, la agrupación horaria se permite hasta 93 días, y diaria hasta diez años; para períodos mayores la API indica elegir una agrupación más amplia. No se eliminan las mediciones por usar una agrupación.

Los límites del proveedor externo siguen siendo independientes: la referencia Open-Meteo integrada consulta hasta 30 días; SKMR hasta 30 días y 400 reportes. En año o histórico completo se advierte esta cobertura; no se rellena el pasado externo. La comparación se calcula por intervalos coincidentes de las dos fuentes. El selector de fuente permite cambiar también a SKMR desde el análisis.

Se retiró el deslizador inferior de la gráfica. Los valores de la fecha seleccionada aparecen arriba. Se explora con el cursor, toque o flechas del teclado sobre la gráfica; Home/End van al comienzo/final. Acercar reduce el intervalo alrededor de la selección y Ver período completo restaura el rango. Los huecos siguen visibles.

El acceso sustituye los botones de franjas fijas por Ahora y una hora editable (00:00–23:59), además de Con lluvia / Sin lluvia. SunCalc 2 calcula altura y azimut del sol para la fecha actual en Montería. La dirección de luz, sombras y tono diurno varían continuamente; los cambios horarios hacen una transición temporal de siete segundos. Es una escena ilustrativa con posición solar aproximada; no pretende representar la orientación geográfica real del paisaje. No requiere ubicación del navegador ni servicios externos para calcular la iluminación.

Verificación de esta revisión: 47 pruebas automatizadas, incluido histórico anterior a 30 días, límites de agrupación, medianoche local, recorrido solar y separación de presión METAR. Las credenciales y las lecturas privadas no se han subido a GitHub.


## Selector solar y estaciones principales

El explorador horario ofrece recorrido con deslizador, pasos de quince minutos y hora exacta. El paisaje interpola directamente en ambas direcciones durante 1,4 segundos, sin completar el día al retroceder.

Vista general, Recepción y Análisis comparten la estación elegida. Los Garzones/SKMR y Open-Meteo pueden ser la fuente principal del análisis; se conservan su procedencia, cobertura y variables ausentes. Los puntos clave describen cambio entre intervalos, amplitud y limitaciones de comparación; no son pronósticos ni validaciones de calibración.

Verificación: 50 pruebas automatizadas aprobadas, incluidas regresión de retroceso horario y agregación externa sin valores inventados.


## Mejoras locales: recordatorios y resolución de minutos

Las reglas admiten repeat_minutes=0,60,120 (predeterminado 60 para reglas existentes). La incidencia se abre una sola vez. Un nuevo dato de hasta dos minutos de antigüedad confirma la condición y permite recordar tras el intervalo de reloj; el avance se guarda en alert_states.last_notified_at. Reconocer no detiene recordatorios; recuperar el umbral o pausar la regla sí. Los recordatorios usan el mismo event_id y un identificador de entrega independiente; no se duplican al repetir consumo y llegan por los canales habilitados. No se envían por ausencia de datos ni se reconstruye una secuencia de recordatorios atrasados. El historial de alertas muestra la fecha del último recordatorio.

En Análisis, al desactivar la comparación desde 24 horas se abre la última hora por minuto. Se puede volver a 24 horas. El backend limita esta resolución a 48 horas y la comparación vuelve a intervalos horarios. El acercamiento permite ventanas de cinco minutos. Ritmo del período conserva el detalle por minuto sin unir huecos.

Qué tener en cuenta ofrece sugerencias operativas con criterios visuales de 30 °C y 80 % de humedad explícitos. No establece límites universales, diagnósticos ni modifica las reglas del usuario.


## Rangos personalizados y seguimiento de las fuentes

El período se conserva al activar/desactivar comparación. El gráfico reinicia el acercamiento al cambiar fuente o modo, evitando ocultar puntos horarios al volver desde un zoom de minutos. El acercamiento sin selección histórica sigue el extremo más reciente; el botón Seguir lo más reciente permite recuperarlo.

Se aceptan períodos horarios enteros de 1 a 8760 horas, además de los rangos y el histórico completo existentes. El límite de resolución por minuto sigue siendo 48 horas. Las fuentes externas se consultan con el rango elegido hasta su cobertura implementada de 30 días, con límite de 400 reportes de aeropuerto. Se distinguen la fecha de consulta y el último dato de origen. La fecha del último reporte no se reemplaza por la hora actual.

Verificación: 58 pruebas aprobadas, incluidos rangos personalizados, series externas de varias horas y validación de acceso. Consulta directa a ambos proveedores respondió correctamente durante la revisión.


## Comparación con resoluciones distintas

La línea de la estación conserva promedios por minuto (hasta 48 horas), incluso al activar la comparación. Los puntos externos se mantienen horarios; se identifican con marcadores y no se crean mediciones minuto a minuto para la fuente externa. Si el cursor cae entre reportes, el inspector identifica la referencia anterior con su fecha, sin desplazar su marcador a una fecha inventada. Las diferencias media y absoluta se calculan agrupando los minutos por hora, ponderados por cantidad de lecturas válidas, y solo con horas coincidentes.

Qué tener en cuenta conserva exactamente tres temas: temperatura, humedad y seguimiento/protección frente al agua. Los botones de la gráfica y del rango usan la paleta y los estados de foco del panel. Verificación: 59 pruebas aprobadas.
