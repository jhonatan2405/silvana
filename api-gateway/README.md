# API Gateway Â· Node.js / TypeScript

```cmd
npm run dev
```

Puerto 8000. Dependencias por separado: `npm install`. ProducciÃ³n: `npm run build` y `npm start`.

`/api/auth/*` se dirige a `AUTH_SERVICE_URL` (8001); `/api/devices/*` a `DEVICES_SERVICE_URL` (8002). Conserva cookies HttpOnly, errores, query string y estados HTTP; limita cuerpos a 16 KiB. Solo reenvÃ­a los encabezados necesarios. No registra contraseÃ±as ni tokens, y no accede a ninguna base de datos.

Los logs muestran una lÃ­nea por peticiÃ³n con mÃ©todo destacado, ruta sin dominio ni parÃ¡metros, servicio, estado y duraciÃ³n. Incluyen tambiÃ©n errores y rutas rechazadas. Ejemplo: `14:32:08  POST   /api/auth/login  -> auth-service  200  145 ms`. En terminal compatible, el mÃ©todo aparece en cian y el estado cambia de color. `/health` identifica el runtime Node. Las otras rutas devuelven 404 y los servicios no disponibles devuelven 503 controlado. ConfiguraciÃ³n en `.env.example`; no habilita CORS abierto. Respaldo anterior en `legacy/python`.


`/api/readings` se dirige a `RECEPTION_SERVICE_URL` (8003). Reenvía `Authorization` únicamente a la ruta elegida, sin registrarlo. ESP32 usa su credencial de dispositivo; el navegador consulta con la cookie del usuario. El Gateway no expone `/internal/*` y no conoce el secreto entre recepción y dispositivos.
