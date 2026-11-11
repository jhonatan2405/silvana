# Firmware de Silvana

El programa real está en `recepcion-iot-service/firmware/silvana_station/silvana_station.ino`. Captura DHT11 (GPIO 4), BMP280 (I²C 21/22) y lluvia resistiva (GPIO 34).

## Internet y pruebas locales

El Gateway predeterminado es https://silvana-api.onrender.com. Cambiar Wi-Fi no modifica este destino ni la vinculación. La web local y la desplegada son clientes independientes: abrir localhost no cambia el destino del ESP32.

Actualizar el firmware una vez incorpora el certificado público de confianza, espera HTTPS de hasta 60 segundos para un inicio en frío y diagnóstico de errores de transporte. La configuración previamente guardada en NVS se conserva: para pasar una estación existente al despliegue, enviar `gateway` y luego `publico` una sola vez.

Para desarrollo sin Internet, enviar `gateway` y después `http://IP_DEL_PC:8000`. Guarda esa dirección como destino local. Después se puede recuperar con `gateway` → `local`, o volver al despliegue con `gateway` → `publico`. Una IP local puede cambiar entre redes; no se usa como destino diario. No hay cambio automático entre servidores: podría ocultar fallos o enviar mediciones al entorno equivocado.

`estado` muestra Wi-Fi, IP y Gateway guardado. `wifi` cambia solamente la red. El panel USB ofrece la dirección pública y una opción para pruebas locales, sin modificar la estación hasta guardar.

HTTPS verifica el certificado; no se usa setInsecure. La raíz pública incluida se obtuvo de la cadena validada por Windows para el dominio público el 11 de noviembre de 2026. Si el proveedor cambia la cadena de confianza, hay que actualizar el certificado del firmware. Otros dominios HTTPS requieren su CA mediante el comando `ca`.

El envío sigue pasando por API Gateway → recepción; no se escribe directamente en Supabase. Las credenciales de estación deben ser válidas para el backend seleccionado.

## Diagnóstico de Wi-Fi

El firmware informa conexión e IP al obtener dirección; cada 15 segundos sin conexión imprime SSID entre corchetes, estado y razón del último rechazo. `estado` también incluye estos datos, sin mostrar la contraseña. Reintenta asociación cada 45 segundos. Un rechazo de autenticación puede deberse a credenciales o compatibilidad del router; no implica automáticamente una contraseña incorrecta.
