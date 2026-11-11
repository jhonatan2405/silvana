#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <DHT.h>
#include <Wire.h>
#include <Adafruit_BMP280.h>
#include <ArduinoJson.h>
#include <esp_system.h>
#include <time.h>
#include "config.h"
#include "gateway_defaults.h"

// Montaje probado por el usuario. No se envía directamente a Supabase.
constexpr uint8_t DHT_PIN = 4;
constexpr uint8_t RAIN_PIN = 34;
constexpr int RAIN_THRESHOLD = 1200; // En este montaje: ADC bajo = seco.
DHT dht(DHT_PIN, DHT11);
Adafruit_BMP280 bmp;
Preferences prefs;
bool bmpReady = false, blocked = false;
String stationId, credential, gateway, wifiSsid, wifiPassword, pairingCode, pairingKey, rootCa;
String pending, commandBuffer;
unsigned long lastAttempt = 0;
bool firstAttempt = true;
volatile uint8_t wifiFailureReason = 0;
unsigned long wifiAttemptAt = 0, wifiReportAt = 0;
bool wifiWasConnected = false;
const char* wifiReasonText(uint8_t reason) {
  switch (reason) {
    case WIFI_REASON_NO_AP_FOUND: return "No se encuentra la red guardada: verifica nombre exacto, cobertura y 2.4 GHz.";
    case WIFI_REASON_AUTH_FAIL: return "El router rechazó la autenticación; revisa clave y compatibilidad de seguridad.";
    case WIFI_REASON_4WAY_HANDSHAKE_TIMEOUT:
    case WIFI_REASON_HANDSHAKE_TIMEOUT: return "No se completó la autenticación: puede ser clave, señal o seguridad del router.";
    case WIFI_REASON_ASSOC_FAIL: return "El router rechazó asociar el ESP32.";
    default: return "Aún no se completa la conexión Wi-Fi.";
  }
}
void serviceWifi() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!wifiWasConnected) {
      Serial.printf("Wi-Fi conectado a [%s] | IP: %s\n", wifiSsid.c_str(), WiFi.localIP().toString().c_str());
      configTime(0, 0, "pool.ntp.org", "time.google.com"); firstAttempt = true;
    }
    wifiWasConnected = true; return;
  }
  wifiWasConnected = false;
  if ((unsigned long)(millis() - wifiReportAt) >= 15000) {
    wifiReportAt = millis(); Serial.printf("Wi-Fi pendiente [%s] | estado %d | motivo %u: %s\n", wifiSsid.c_str(), (int)WiFi.status(), wifiFailureReason, wifiReasonText(wifiFailureReason));
  }
  if ((unsigned long)(millis() - wifiAttemptAt) >= 45000) {
    wifiAttemptAt = millis(); WiFi.reconnect(); Serial.println("Reintentando Wi-Fi; Gateway y vinculación se conservan.");
  }
}


String randomHex(size_t length) {
  String out; out.reserve(length * 2);
  for (size_t i = 0; i < length; ++i) { uint8_t b; esp_fill_random(&b, 1); char v[3]; snprintf(v, sizeof(v), "%02x", b); out += v; }
  return out;
}
String hardwareId() {
  char out[24]; snprintf(out, sizeof(out), "esp32-%012llx", (unsigned long long)(ESP.getEfuseMac() & 0xFFFFFFFFFFFFULL));
  return String(out);
}
String packetId() {
  uint8_t b[16]; esp_fill_random(b, sizeof(b)); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
  char out[37]; snprintf(out, sizeof(out), "%02x%02x%02x%02x-%02x%02x-%02x%02x-%02x%02x-%02x%02x%02x%02x%02x%02x", b[0],b[1],b[2],b[3],b[4],b[5],b[6],b[7],b[8],b[9],b[10],b[11],b[12],b[13],b[14],b[15]);
  return String(out);
}
bool saveValue(const char* key, const String& value) {
  // Se conserva la configuración entre reinicios; no se imprime la clave Wi-Fi ni tokens.
  if (prefs.putString(key, value) != value.length()) { Serial.println("No se pudo guardar la configuración en NVS."); return false; }
  return true;
}
bool prompt(const char* text, String& value, size_t maxLength, bool trim = true) {
  Serial.println(text); value = ""; unsigned long start = millis();
  while (millis() - start < 120000) {
    if (Serial.available()) {
      char ch = Serial.read();
      if (ch == '\r') continue;
      if (ch == '\n') { if (trim) value.trim(); return true; }
      if (value.length() >= maxLength) { Serial.println("Entrada demasiado larga."); return false; }
      value += ch;
    } else delay(10);
  }
  Serial.println("Tiempo agotado. Repite el comando."); return false;
}
void connectWifi() {
  wifiFailureReason = 0; wifiAttemptAt = wifiReportAt = millis(); wifiWasConnected = false;
  WiFi.disconnect(); WiFi.mode(WIFI_STA); WiFi.setAutoReconnect(true);
  WiFi.begin(wifiSsid.c_str(), wifiPassword.c_str()); configTime(0, 0, "pool.ntp.org", "time.google.com");
  Serial.println("Conectando a la red guardada. Comando wifi para cambiarla.");
}
void configure(const String& command) {
  if (command == "wifi") {
    String ssid, password;
    if (!prompt("Nombre exacto de la red 2.4 GHz:", ssid, 32, false) || ssid.isEmpty()) return;
    if (!prompt("Clave Wi-Fi (no se mostrará en la salida):", password, 63, false)) return;
    if (!saveValue("ssid", ssid) || !saveValue("wifiPass", password)) return;
    wifiSsid = ssid; wifiPassword = password; connectWifi();
  } else if (command == "gateway") {
    String url;
    if (!prompt("URL base del Gateway, sin /api (publico / local / http://IP:8000):", url, 240)) return;
    if (url == "publico") url = PUBLIC_GATEWAY_URL;
    else if (url == "local") {
      url = prefs.getString("localGateway", "");
      if (url.isEmpty()) { Serial.println("No hay Gateway local guardado. Introduce su URL una sola vez."); return; }
    }
    if (!url.startsWith("http://") && !url.startsWith("https://")) { Serial.println("URL no válida."); return; }
    while (url.endsWith("/")) url.remove(url.length()-1);
    if (url.indexOf('@') >= 0 || url.indexOf('?') >= 0 || url.indexOf('#') >= 0) { Serial.println("Usa una URL base sin credenciales ni parámetros."); return; }
    if (url.startsWith("http://") && !saveValue("localGateway", url)) return;
    if (!saveValue("gateway", url)) return;
    gateway = url; firstAttempt = true;
    Serial.println(url == PUBLIC_GATEWAY_URL ? "Gateway guardado. Modo público con HTTPS configurado; cambiar Wi-Fi no cambia el Gateway." : "Gateway guardado. Usa publico para volver al despliegue o local para recuperar esta dirección.");
  } else if (command == "vincular") {
    String code; if (!prompt("Código de 16 caracteres del dashboard:", code, 16) || code.length() != 16) return;
    code.toUpperCase();
    for (size_t i = 0; i < code.length(); i++) if (!isxdigit(code[i])) { Serial.println("Código no válido."); return; }
    String key = randomHex(32);
    if (!saveValue("pairKey", key) || !saveValue("pairCode", code)) return;
    pairingCode = code; pairingKey = key; blocked = false; firstAttempt = true;
    Serial.println("Vinculación pendiente; se enviará por el Gateway.");
  } else if (command == "ca") {
    Serial.println("Pega la CA raíz PEM del Gateway HTTPS, línea por línea. Termina con una línea que tenga solo un punto.");
    String ca, line;
    while (true) {
      if (!prompt("", line, 180)) return;
      if (line == ".") break;
      if (ca.length() + line.length() > 8000) { Serial.println("CA demasiado larga."); return; }
      ca += line + "\n";
    }
    if (ca.indexOf("-----BEGIN CERTIFICATE-----") < 0 || ca.indexOf("-----END CERTIFICATE-----") < 0) { Serial.println("PEM no válido."); return; }
    if (saveValue("ca", ca)) { rootCa = ca; firstAttempt = true; Serial.println("CA guardada. Se verificará el certificado HTTPS."); }
  } else if (command == "estado") {
    Serial.printf("Wi-Fi: %s | Estación: %s | IP local: %s\n", WiFi.status() == WL_CONNECTED ? "conectado" : "sin conexión", stationId.isEmpty() ? "sin vincular" : stationId.c_str(), WiFi.localIP().toString().c_str());
    Serial.printf("Red guardada: [%s] | %u caracteres | motivo Wi-Fi: %u (%s)\n", wifiSsid.c_str(), (unsigned)wifiSsid.length(), wifiFailureReason, wifiReasonText(wifiFailureReason));
    Serial.printf("Gateway guardado: %s | Modo: %s\n", gateway.c_str(), gateway == PUBLIC_GATEWAY_URL ? "publico" : "personalizado/local");
    Serial.println("Comandos: wifi / gateway / vincular / ca / estado. Enviar con Nueva línea.");
  } else Serial.println("Comandos disponibles: wifi / gateway / vincular / ca / estado");
}
void readCommand() {
  while (Serial.available()) {
    char ch = Serial.read(); if (ch == '\r') continue;
    if (ch == '\n') { String command = commandBuffer; commandBuffer = ""; command.trim(); if (!command.isEmpty()) configure(command); }
    else if (commandBuffer.length() < 32) commandBuffer += ch;
  }
}
void readSensors(JsonDocument& doc) {
  JsonObject values = doc["measurements"].to<JsonObject>(); JsonArray sensors = doc["sensors"].to<JsonArray>();
  float temperature = dht.readTemperature(), humidity = dht.readHumidity();
  bool dhtOk = isfinite(temperature) && temperature >= -80 && temperature <= 100 && isfinite(humidity) && humidity >= 0 && humidity <= 100;
  if (isfinite(temperature) && temperature >= -80 && temperature <= 100) values["temperature_c"] = temperature;
  if (isfinite(humidity) && humidity >= 0 && humidity <= 100) values["humidity_pct"] = humidity;
  JsonObject dhtSensor = sensors.add<JsonObject>(); dhtSensor["type"] = "DHT11"; dhtSensor["status"] = dhtOk ? "ok" : "error";
  // Reintenta detectar BMP para recuperar conexión después de un fallo.
  if (!bmpReady) { bmpReady = bmp.begin(0x76); if (!bmpReady) bmpReady = bmp.begin(0x77); }
  float pressure = NAN, bmpTemperature = NAN;
  if (bmpReady) { pressure = bmp.readPressure()/100.0f; bmpTemperature = bmp.readTemperature(); }
  bool bmpOk = isfinite(pressure) && pressure >= 300 && pressure <= 1100 && isfinite(bmpTemperature) && bmpTemperature >= -80 && bmpTemperature <= 100;
  if (bmpOk) { values["pressure_hpa"] = pressure; values["temperature_bmp_c"] = bmpTemperature; }
  else bmpReady = false;
  JsonObject bmpSensor = sensors.add<JsonObject>(); bmpSensor["type"] = "BMP280"; bmpSensor["status"] = bmpOk ? "ok" : "error";
  int rain = analogRead(RAIN_PIN); values["rain_raw_adc"] = rain; values["rain_detected"] = rain >= RAIN_THRESHOLD;
  JsonObject rainSensor = sensors.add<JsonObject>(); rainSensor["type"] = "RAIN_ANALOG"; rainSensor["status"] = "unverified";
  // ADC no tiene identificación de módulo: se informa señal, no detección eléctrica de la placa.
  Serial.printf("DHT11: %s | BMP280: %s | Lluvia ADC: %d (%s)\n", dhtOk?"responde":"sin lectura", bmpOk?"responde":"sin lectura", rain, rain < RAIN_THRESHOLD ? "Sin agua detectada" : rain <= 2500 ? "Agua detectada" : "Señal elevada de agua");
}
int post(const String& path, const String& body, bool authenticate, String& response) {
  WiFiClient plain; WiFiClientSecure secure; HTTPClient http;
  String url = gateway + path;
  if (gateway.startsWith("https://")) {
    const char* trustedCa = gateway == PUBLIC_GATEWAY_URL ? PUBLIC_GATEWAY_CA : rootCa.c_str();
    if (!trustedCa[0]) { Serial.println("Falta CA del Gateway: usa el comando ca. No se desactiva validación TLS."); return -1; }
    secure.setCACert(trustedCa); secure.setHandshakeTimeout(20);
    if (!http.begin(secure, url)) return -1;
  } else if (!http.begin(plain, url)) return -1;
  http.setConnectTimeout(gateway == PUBLIC_GATEWAY_URL ? 15000 : 5000); http.setTimeout(gateway == PUBLIC_GATEWAY_URL ? 60000 : 10000);
  http.addHeader("Content-Type", "application/json");
  if (authenticate) http.addHeader("Authorization", String("Bearer ") + credential);
  int status = http.POST(body);
  response = status > 0 ? http.getString() : "";
  if (status < 0) Serial.printf("No se alcanzó %s: %s. Revisa estado y la red; no se borra la vinculación.\n", gateway.c_str(), HTTPClient::errorToString(status).c_str());
  http.end(); return status;
}
bool enroll() {
  JsonDocument sample; readSensors(sample);
  JsonDocument doc; doc["code"] = pairingCode; doc["hardware_id"] = hardwareId(); doc["credential"] = pairingKey; doc["sensors"] = sample["sensors"];
  String body, response; serializeJson(doc, body);
  int status = post("/api/devices/enroll", body, false, response);
  Serial.printf("Vinculación: HTTP %d\n", status);
  if (status == 200) {
    JsonDocument result; if (deserializeJson(result, response)) return false;
    String id = result["device"]["id"] | ""; if (id.length() != 32) return false;
    if (!saveValue("credential", pairingKey) || !saveValue("deviceId", id)) return false;
    stationId = id; credential = pairingKey; pairingCode = ""; pairingKey = "";
    prefs.remove("pairCode"); prefs.remove("pairKey"); pending = "";
    Serial.println("Estación vinculada. Sus sensores aparecerán en el dashboard."); return true;
  }
  if (status == 401 || status == 409 || status == 422) {
    blocked = true;
    Serial.println("Revisa el código o la estación seleccionada. Genera otro código y usa vincular.");
  }
  return false;
}
bool buildReading() {
  time_t now = time(nullptr); if (now < 1700000000) { Serial.println("Esperando hora NTP; no se inventa la fecha."); return false; }
  struct tm utc; gmtime_r(&now, &utc); char stamp[25]; strftime(stamp, sizeof(stamp), "%Y-%m-%dT%H:%M:%SZ", &utc);
  JsonDocument doc; readSensors(doc); doc["device_id"] = stationId; doc["packet_id"] = packetId(); doc["measured_at"] = stamp;
  pending = ""; serializeJson(doc, pending); return true;
}
void setup() {
  Serial.begin(115200); Serial.setTimeout(1000); delay(1000);
  if (!prefs.begin("silvana", false)) { Serial.println("No se pudo abrir NVS."); blocked = true; }
  wifiSsid = prefs.getString("ssid", DEFAULT_WIFI_SSID); wifiPassword = prefs.getString("wifiPass", DEFAULT_WIFI_PASSWORD);
  gateway = prefs.getString("gateway", DEFAULT_GATEWAY_URL); stationId = prefs.getString("deviceId", ""); credential = prefs.getString("credential", "");
  pairingCode = prefs.getString("pairCode", ""); pairingKey = prefs.getString("pairKey", ""); rootCa = prefs.getString("ca", "");
  dht.begin(); pinMode(RAIN_PIN, INPUT); analogReadResolution(12); Wire.begin(21,22);
  bmpReady = bmp.begin(0x76); if (!bmpReady) bmpReady = bmp.begin(0x77);
  WiFi.onEvent([](WiFiEvent_t event, WiFiEventInfo_t info) { wifiFailureReason = info.wifi_sta_disconnected.reason; }, ARDUINO_EVENT_WIFI_STA_DISCONNECTED);
  connectWifi(); Serial.println("Silvana · ESP32. Comandos: wifi / gateway / vincular / ca / estado.");
}
void loop() {
  readCommand();
  serviceWifi();
  if (blocked || WiFi.status() != WL_CONNECTED) { delay(20); return; }
  if (!firstAttempt && (unsigned long)(millis() - lastAttempt) < 10000) { delay(10); return; }
  firstAttempt = false; lastAttempt = millis();
  if (!pairingCode.isEmpty()) { enroll(); return; }
  if (stationId.isEmpty() || credential.isEmpty()) { Serial.println("Sin vincular: genera un código en Silvana y escribe vincular aquí."); return; }
  if (pending.isEmpty() && !buildReading()) return;
  String response; int status = post("/api/readings", pending, true, response);
  Serial.printf("Gateway / recepción: HTTP %d\n", status);
  if (status == 200 || status == 201) { pending = ""; Serial.println("Lectura guardada por recepción."); }
  else if (status == 401 || status == 403) { blocked = true; Serial.println("Credencial no válida o estación desactivada. Revisa Silvana y vuelve a vincular."); }
  else if (status == 409 || status == 422) { pending = ""; Serial.println("Muestra rechazada. Revisar datos o reloj."); }
  else Serial.println("Se reintentará el mismo paquete, conservando su ID y valores.");
}
