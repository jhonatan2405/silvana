# Silvana: conectar el ESP32 probado al Gateway

El código se adaptó al montaje aportado por el usuario: DHT11 GPIO 4, lluvia analógica GPIO 34 y BMP280 por I²C en SDA21/SCL22, direcciones0x76/0x77. Se conserva el Wi-Fi facilitado en `recepcion-iot-service/firmware/silvana_station/config.h`, privado y excluido de Git. El sketch ya no contiene URL ni claves de Supabase.

## Qué quedó funcionando

ESP32 -> API Gateway -> Dispositivos (vinculación) / Recepción (mediciones) -> PostgreSQL independiente de cada servicio. El navegador consulta siempre por Gateway. No se consulta una base ajena desde otro microservicio.

El dashboard actualiza estaciones y lecturas cada cinco segundos; muestra la última muestra, los sensores comunicados y hasta100 muestras del período seleccionado. La estación aparece conectada si está habilitada y hubo contacto autenticado en los últimos60 segundos. Pasado ese plazo conserva la última lectura indicando que ya no está actualizada.

DHT11 y BMP280 reportan si entregan lecturas válidas. Lluvia se muestra como señal ADC: el programa no puede comprobar la presencia física de una placa resistiva solo con una lectura analógica. El firmware usa la interpretación probada por el usuario: ADC<1200 seco; >=1200 agua; valores superiores a2500 se describen como señal elevada, sin afirmar intensidad meteorológica ni milímetros. Se envía también la temperatura del BMP280, separada de la del DHT11.

## Primera carga

1. Mantener en ejecución los cinco componentes. Desde la raíz del proyecto: `npm run dev`. No iniciar otros procesos en los mismos puertos si ya están abiertos.
2. Abrir con Arduino IDE `recepcion-iot-service/firmware/silvana_station/silvana_station.ino`. En este equipo ya existe `config.h` con el Wi-Fi proporcionado y Gateway local `http://192.168.1.7:8000`. En otro equipo copiar `config.example.h` como `config.h` y completar valores.
3. Seleccionar la placa ESP32 y su puerto USB real. Cargar el sketch una sola vez. La compilación se verificó para `esp32:esp32:esp32` usando core2.0.17, DHT1.4.6, Adafruit BMP2803.0.0, ArduinoJson7.4.2, Unified Sensor1.1.15 y BusIO1.17.4. No se cargó automáticamente ni se sustituyó el programa de la placa del usuario.
4. Abrir Monitor serie a115200 y escoger terminación **Nueva línea**. Reiniciar la placa si se abrió el monitor después del arranque.
5. Iniciar sesión en Silvana -> Dispositivos -> Vincular estación. Elegir la estación existente para conservar su ID/nombre, o la opción de crearla automáticamente. Generar el código de16 caracteres, válido10 minutos. Al confirmar una estación existente se reemplaza la credencial anterior.
6. Escribir `vincular` en el Monitor serie, pulsar Enviar y después enviar el código. El ESP32 genera su propia credencial aleatoria, se identifica por el chip y la guarda localmente. El código temporal solo sirve para asociarlo a tu cuenta. Una respuesta perdida puede reintentarse con el mismo código, chip y credencial mientras no venza; no duplica estaciones.
7. En segundos aparecerán el estado de la estación y sus sensores. Con reloj NTP válido se envían lecturas cada10 segundos. 201 confirma guardado; 200 confirma un reenvío que ya estaba guardado. El dashboard permite consultar lo recibido y el historial.

## Cambiar entre casa y hotspot sin volver a cargar el programa

En el Monitor serie, enviar los comandos por separado y responder cada pregunta:

| Comando | Función |
|---|---|
| `wifi` | Pregunta nombre y contraseña de la red2.4GHz, los guarda y reconecta |
| `gateway` | Cambia la URL base del Gateway, sin `/api`; se guarda entre reinicios |
| `vincular` | Recibe un nuevo código del dashboard para asociar o recuperar la estación |
| `estado` | Muestra conexión Wi-Fi, IP local y si está vinculada; no imprime claves |
| `ca` | Guarda una CA raíz PEM para verificar el certificado de un Gateway HTTPS |

**PC en5GHz y ESP32 en2.4GHz:** pueden comunicarse si el router los mantiene en la misma red local y no aísla clientes. No hace falta cambiar el código por la frecuencia.

**En la universidad:** conectar PC y ESP32 al hotspot del celular, habilitado en2.4GHz. Si el nombre/clave difieren, usar `wifi`. La IP del PC puede cambiar: ejecutar `ipconfig` en el PC y usar `gateway` con `http://NUEVA_IP:8000`. No usar localhost ni127.0.0.1 en el ESP32. Algunos hotspots aíslan equipos y no permiten este recorrido local; en ese caso hace falta otra red que permita comunicación o un Gateway publicado.

Cambiar Wi-Fi desde una web remota requiere que el equipo aún tenga conexión para recibir la orden. La recuperación por USB funciona aunque la red anterior ya no exista. En esta entrega el dashboard vincula y observa; no modifica a distancia la contraseña Wi-Fi.

## Alcance de Internet y HTTPS

El Gateway actual está preparado para la red local y escucha en0.0.0.0:8000. Solo el Gateway debe ser accesible al ESP32; los demás servicios locales siguen en127.0.0.1. No se modificó automáticamente el firewall de Windows. Si Windows pide permiso a Node, usar red privada para la demostración.

Supabase accesible por Internet no hace público el Gateway del PC. Para que el ESP32 envíe desde una red distinta al PC se necesita desplegar el Gateway y sus servicios en un servidor accesible con HTTPS. No se ha publicado un dominio ni un túnel en esta entrega.

El firmware acepta una URL `https://...` mediante `gateway`, pero requiere instalar su CA raíz con `ca` y tener hora NTP válida. No usa `setInsecure`. El ejemplo incluye HTTP para la demostración en la red local privada; no enviar credenciales por HTTP a través de Internet.

## Reintentos y límites

Wi-Fi, URL, identidad y credencial se guardan en Preferences/NVS del ESP32. No es una cola histórica: mantiene una muestra pendiente en RAM y la reenvía sin cambiar UUID, fecha ni valores; un reinicio pierde esa muestra, y durante un corte no almacena todas las mediciones. Si DHT o BMP fallan se omiten sus valores y se reporta el fallo, no se envían ceros inventados. El reloj debe sincronizarse por NTP antes de etiquetar muestras.

401/403 detienen envíos hasta revisar el estado en Silvana y volver a vincular o reiniciar. Un código vencido requiere generar otro. Si se renueva la credencial manualmente, volver a vincular con el código del dashboard actualiza automáticamente la credencial de la placa. 409/422 en una muestra requieren revisar contrato/reloj; otros errores reintentan el mismo paquete cada10 segundos.

## Verificado y pendiente

- 18 pruebas del servidor: propietario, credenciales, caducidad, vinculación concurrente/reintentos, sensores, fechas, deduplicación y consultas protegidas.
- Compilación de firmware para ESP32 y compilación del frontend/servicios.
- Recorrido por Gateway hasta las tres bases Supabase con datos temporales de prueba; UI revisada en1440x900 y390x844. Los valores de las capturas son una repetición técnica, no una nueva lectura física.
- Pendiente: cargar esta adaptación en el ESP32 del usuario y comprobar comunicación real por su Wi-Fi/hotspot. El montaje y el firmware anterior ya fueron probados por el usuario; eso no equivale a probar aún este recorrido nuevo.

## Referencias de las bibliotecas

- Preferences: https://docs.espressif.com/projects/arduino-esp32/en/latest/api/preferences.html
- Wi-Fi: https://docs.espressif.com/projects/arduino-esp32/en/latest/api/wifi.html
- ArduinoJson7: https://arduinojson.org/v7/tutorial/serialization/


## Si Arduino IDE no encuentra ArduinoJson

En este equipo Arduino IDE usa el sketchbook `C:/Users/ASUS/Documents` desde `.arduinoIDE/arduino-cli.yaml`, mientras el CLI sin ese archivo de configuración usa `Documents/Arduino`. Las bibliotecas deben instalarse usando la misma configuración que el IDE. ArduinoJson7.4.2 quedó instalada en `Documents/libraries/ArduinoJson`; DHT1.4.7 mantiene la versión del IDE. Al copiar el firmware, copiar también su config.h privado y el sketch completo. La copia en Desktop/proyectos/iot/codigosistemademonitoreo se completó desde el original y conserva respaldo .ino.incompleto.bak.

## Configuración USB desde el dashboard · 27 de octubre de 2026

Dispositivos incorpora el panel Configurar por USB. No crea otro microservicio: la provisión local conecta navegador y ESP32 con Web Serial; la vinculación/autorización y las lecturas conservan el recorrido mediante API Gateway. El servidor no puede detectar dispositivos USB de otro equipo.

1. Abrir Silvana en Chrome o Edge de escritorio, con localhost o HTTPS, y entrar en Dispositivos.
2. Conectar el ESP32 mediante un cable de datos y cerrar el Monitor serie de Arduino.
3. Pulsar Seleccionar ESP32 y autorizar su puerto en el selector del navegador. La página solo reconoce Silvana después de recibir la respuesta al comando estado a 115200 baudios. Los puertos previamente autorizados se detectan sin abrirlos automáticamente; esto no identifica una estación hasta comprobar su respuesta.
4. Completar nombre y contraseña de la nueva red de 2,4 GHz y Guardar Wi-Fi. El mensaje de red guardada confirma configuración, no conexión efectiva: usar Consultar estado para comprobarla después.
5. Si cambia la IP del PC, guardar la nueva URL base del Gateway, sin /api ni localhost. HTTPS conserva la necesidad de una CA raíz ya instalada con el comando ca; el panel no instala certificados.
6. Para vincular, generar el código habitual y pulsar Vincular este ESP32 en el panel USB. La recepción de ese código por USB no equivale a vinculación confirmada; el dispositivo debe contactar al Gateway.

Usa los comandos del firmware existente: no hace falta recompilarlo para cada cambio de red. La contraseña viaja directamente por USB, no se manda al servidor ni se persiste en navegador, y se limpia del formulario al enviarse. No se muestran trazas serie completas, solo el estado sin credenciales. Los comandos se serializan y esperan la pregunta/respuesta correspondiente; ante fallo o tiempo agotado se cierra el puerto. Si una configuración quedó a medias, reiniciar físicamente el ESP32 antes de volver a seleccionar su puerto. Desmontar el panel libera lectura y puerto; usar Desconectar USB antes de volver a Arduino.

Verificación: compilación frontend y cuatro pruebas con puerto simulado, que cubren fragmentación, configuración, vinculación, entradas inválidas, firmware incompatible y tiempo agotado sin envío indebido de contraseña. Flujo visual probado con un ESP32 simulado en escritorio/móvil; no se cambiaron redes ni credenciales del hardware real. Pendiente prueba física por el usuario y compatibilidad efectiva de su navegador/cable/controlador USB. Esta sección sustituye el alcance anterior que limitaba la configuración al Monitor serie.
