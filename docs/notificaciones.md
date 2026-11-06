# Centro web y correo

El contrato, configuración y pruebas están en [notificaciones-service/README.md](../notificaciones-service/README.md).

Flujo: ESP32 → Gateway → Recepción → Alertas → bandeja durable → Notificaciones → centro web / Gmail. Análisis conserva su consumidor independiente. Cada uno de los seis microservicios tiene su propia base.

Gmail requiere completar el remitente y la contraseña de aplicación localmente antes de la prueba externa. El centro web funciona mientras tanto.
