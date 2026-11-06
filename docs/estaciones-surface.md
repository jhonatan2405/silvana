# Estaciones y lecturas · Silvana

Extensión del dashboard existente, implementada desde código y revisada el 22 de octubre de 2026. La referencia es la interfaz vigente; no se aprobó un rediseño ni un nuevo mundo visual. `DESIGN.md` y `.impeccable/design.json` se conservan sin cambios.

## Estilo heredado

Se mantienen paisaje Three.js persistente, cristal verde oscuro, Manrope, texto claro, acciones menta, navegación lateral y transiciones de acceso y salida. Las lecturas ocupan las superficies existentes del resumen; Recepción reutiliza el mismo componente con más filas. Vincular ESP32 aparece como panel dentro de Dispositivos, con los controles nativos del dashboard.

La extensión usa bordes finos, esquinas suaves, separadores entre sensores y realce tonal al pasar el puntero. Los estados combinan texto e iconos; el color por sí solo no comunica conexión o error. Selectores y controles de vinculación tienen foco visible. Las cifras usan números tabulares y formato `es-CO`.

En escritorio, lectura principal y sensores comparten la primera fila; historial y orientación continúan debajo. Hasta 850 px la extensión pasa a una columna; hasta 620 px el selector ocupa su propia fila. El dashboard conserva desplazamiento interno. La tabla tiene un contenedor horizontal propio y ancho mínimo de 440 px, sin ampliar la página.

## Lecturas y estados

- Selector de estación, actualización manual y estado de comunicación en Vista general y Recepción.
- Temperatura y humedad seleccionables; presión y agua en placa como valores secundarios. La temperatura BMP280 aparece cuando está presente. Una variable ausente se muestra con raya o texto explicativo, sin inventar mediciones.
- Sensores reportados por la estación: DHT11/DHT22, BMP280 y lluvia analógica. Sus estados son Responde, Sin lectura o Señal ADC; sin contacto reciente pasan a Sin actualizar.
- Se distinguen ausencia de estación, sensores aún no comunicados, primera medición pendiente, período vacío, consulta en curso y error con reintento. Un error conserva la última lectura conocida de la misma estación. Cambiar estación retira la muestra anterior.
- Conectada significa estación habilitada con contacto autenticado en los últimos 60 segundos. El error de consulta de dispositivos se presenta como estado sin actualizar. La antigüedad de la muestra se evalúa por separado: tras 120 segundos se rotula Última conocida. Se muestran hora de medición, recepción y último contacto.

La entrada analógica de lluvia informa señal ADC y detección de agua según el firmware. No demuestra por sí sola conexión física de la placa ni representa milímetros de precipitación. El paisaje sigue siendo ilustrativo.

## Actualización e historial

Dispositivos y lecturas se consultan cada 5 segundos; las lecturas evitan solicitudes superpuestas, omiten consultas con la pestaña oculta y actualizan al volver a verla. Los dispositivos también se actualizan al recuperar el foco. Desmontar o cambiar la consulta cancela las lecturas pendientes. Una respuesta 401 activa el manejo de sesión expirada.

El historial ofrece 24 horas, 7 días y 30 días. Recupera hasta 100 muestras recientes del período; Vista general muestra hasta 6 y Recepción hasta 100. La última muestra se consulta aparte del filtro histórico. Horas en `America/Bogota`. No hay paginación, exportación, gráfica de tendencias ni análisis en esta superficie; Análisis, Alertas y Notificaciones continúan señalados como próximas etapas.

## Vinculación

Dispositivos permite crear automáticamente una estación o elegir una existente. Genera un código de un solo uso, válido durante 10 minutos, para introducir con `vincular` en el Monitor serie del ESP32. La interfaz muestra cuenta regresiva, copia, vencimiento, error y confirmación de comunicación; consulta la confirmación cada 5 segundos mientras existe código. Si falla la copia ofrece selección manual. Vincular una estación existente sustituye su credencial anterior al confirmar el ESP32, como advierte el panel. Los sensores aparecen al comunicarse; no hay escaneo de la red desde el navegador.

## Evidencia y límites

Código contrastado: `StationMonitor.tsx`, `PairStation.tsx`, `Dashboard.tsx`, integración de dispositivos en `main.tsx` y bloque final de `style.css`, todos bajo `frontend/src`. Contexto: `PRODUCT.md`, `DESIGN.md` y `.impeccable/review/station-direction.md`.

Capturas inspeccionadas en `.impeccable/review`: `desktop.png` (1440 × 900), `mobile.png` (390 × 844) y `pairing-desktop.png` (1440 × 900). La revisión final dio SHIP, sin hallazgos bloqueantes ni desbordamiento global. Las capturas muestran una cuenta desechable Prueba técnica y muestras temporales de replay; la muestra antigua y Sin comunicación son esperables tras detener el envío. La captura de vinculación precede a generar el código; la comprobación funcional registrada verificó código de 16 caracteres hexadecimales y contador. Los estados vacíos y payloads malformados cuentan con verificación de integración registrada.

El detector se ejecutó una vez y dejó avisos orientativos de deriva tipográfica, incluida deriva preexistente de `style.css`. No se reparó esa deriva ni se modificaron los documentos del sistema visual. Se corrigió el contraste de una etiqueta antes de las capturas finales. No se añadieron imágenes generadas. La compilación y los ensayos HTTP no sustituyen la validación física: cargar y probar el ESP32 con sus sensores sigue siendo tarea del usuario.
