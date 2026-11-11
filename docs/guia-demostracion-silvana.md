# Guía breve para demostrar Silvana

Silvana recibe mediciones ambientales de una estación ESP32 y permite consultarlas, analizarlas y recibir avisos. El navegador y la estación entran por API Gateway; cada microservicio conserva su propia base de datos.

1. **Acceso:** identifica al usuario y protege sus estaciones y datos.
2. **Dispositivos:** administra las estaciones, su vinculación, sensores y último contacto. Conectada significa comunicación válida en el último minuto, no una prueba directa del Wi-Fi del ESP32. Volver a vincular conserva la estación elegida y su historial; la clave se sustituye cuando el ESP32 confirma.
3. **Recepción de datos:** muestra las muestras guardadas, su fecha y valores, con diez por página. Vista general muestra el último estado y las muestras recientes.
4. **Análisis:** agrupa el histórico por hora, día, mes o año, muestra promedios, extremos y variación, y compara intervalos con datos disponibles. Los Garzones/SKMR es una fuente de observaciones aeroportuarias; Open-Meteo es un modelo para Montería. La humedad de SKMR es calculada. Su presión altimétrica no equivale a presión de superficie. Una variable ausente no significa cero.
5. **Alertas:** las reglas evalúan nuevas lecturas. Una incidencia permanece abierta mientras se incumple la condición, sin una nueva alerta por cada muestra. Reconocer significa que alguien la vio; no significa que se haya resuelto. Cambiar o pausar la regla también puede cerrar incidencias.
6. **Notificaciones:** muestra avisos y su estado de lectura y correo. Las preferencias se aplican a avisos futuros; activar correo no reenvía los anteriores. La aceptación por el servidor de correo no garantiza llegada a bandeja principal.

## Qué conviene aclarar durante la demostración

- El paisaje 3D es ilustrativo; simular una hora o lluvia no cambia los sensores ni crea mediciones.
- El sensor resistivo detecta presencia de agua, no milímetros de lluvia.
- La comparación externa da contexto: diferencias de ubicación, altura y cobertura pueden producir valores distintos. No demuestra por sí sola que un sensor esté mal calibrado.
- Sin lecturas en un período no equivale a estación averiada: revisar el rango y el último contacto.
- El Gateway público queda fijo aunque cambie el Wi-Fi. El modo local se reserva para pruebas. Render gratuito puede necesitar despertar.
- Los avisos de desconexión se generan después de un minuto sin contacto; la revisión periódica y el proveedor de correo añaden tiempo de entrega.

## Revisión local del 11 de noviembre de 2026

La estación CBB0 comunicó lecturas recientes durante la revisión. Se revisaron las seis secciones sin modificar reglas, enviar correos ni renovar credenciales reales. Se corrigieron textos de carga, nombres de acciones y la explicación del tiempo de desconexión. El botón Volver a vincular abre la estación existente y no invalida su acceso por pulsarlo. Compilación de frontend y 50 pruebas automatizadas aprobadas. Cambios locales, pendientes de publicar.
