# Estado de la primera fase

Fecha de revisión: 21 de octubre de 2026, America/Bogota.

## Comprobado en local

- Compilación React y TypeScript correcta.
- Once pruebas de API correctas con bases temporales, incluyendo sesiones, expiración, revocación, inyección de rol/propietario, aislamiento por usuario, límite de intentos, Gateway y caída de autenticación.
- Recorrido manual en navegador: registro, login, vista protegida, alta de dispositivo, credencial de un solo uso, deshabilitación y logout.
- Revisadas composiciones a 1440px mediante iframe de prueba, 718px de ventana disponible y 390px móvil mediante iframe. Login y registro con error visibles y utilizables; efectos de transición y cambio de ambiente comprobados.
- Revisión externa del diseño: tres hallazgos corregidos y confirmados (espacio del registro, contraste de placeholders y etiqueta redundante). El veredicto cubre esas correcciones; no sustituye una auditoría completa de accesibilidad.
- Dos archivos de base de datos físicamente distintos para usuarios y dispositivos.
- Dependencias Python sin conflictos; npm audit de instalación sin vulnerabilidades conocidas reportadas.

## Antes de cerrar la fase

- Conectar y probar dos proyectos Supabase PostgreSQL independientes. Confirmar permisos y exposición de tablas.
- Decidir recuperación de contraseña y verificación de correo. No existen botones ficticios para estas funciones ni proveedores sociales sin integrar.
- Aprobación visual del usuario con su propia revisión.
- Validar Docker/Compose en un equipo donde Docker esté instalado.
- Si se publica fuera del equipo: HTTPS, cookie Secure, origen definitivo, limitación compartida si hay réplicas, migraciones y respaldo de datos.

## Separación de responsabilidades

Autenticación mantiene cuentas y sesiones en su persistencia. Dispositivos mantiene equipos y hashes de credenciales en otra persistencia. Este último verifica la identidad por API de usuarios y responde con error controlado si no puede verificarla. No consulta tablas ajenas.

Los modos ambientales son demostraciones. El modo automático usa únicamente la hora de Montería. No se ha conectado el ESP32 ni se han generado lecturas ficticias presentadas como reales.

Se creó una cuenta y una estación locales identificadas como pruebas para verificar el recorrido. No contienen información de personas ni sensores reales.

## Revisión de interfaz compacta

Comprobado en el navegador: prefers-reduced-motion=true; se activó movimiento explícitamente mediante el control de reproducción. Antes y después de alternar registro, la tarjeta conservó exactamente su rectángulo (x49.2, y152, ancho440, alto436.4) y la página midió658px de alto para una ventana658px. Se recorrieron las cinco iluminaciones con un único botón: Día, Atardecer, Anochecer, Noche y Ahora. Compilación correcta y revisión visual SHIP para esta modificación. Capturas de escritorio1440px y móvil390px, además de ventana real538px.

