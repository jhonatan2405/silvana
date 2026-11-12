# Compartir estaciones

En Dispositivos, el propietario abre **Compartir estación**, escribe el correo de una cuenta registrada y comparte el acceso. La estación aparecerá en el listado de esa persona al actualizar. El acceso permite consultar recepción, análisis, comparación externa, reglas e historial de alertas. Las acciones de administración siguen reservadas al propietario.

Los nuevos eventos se distribuyen al propietario y a los miembros con acceso. En el primer evento tras compartir se activan las preferencias web, correo y tipos de aviso del invitado automáticamente. Después puede modificarlas en Notificaciones. No se envían alertas anteriores a la fecha de compartir. Cada persona tiene su propia bandeja y estado de lectura. No se copian mediciones ni se entregan credenciales del ESP32.

El propietario puede retirar el acceso. Se bloquean las consultas posteriores y se cancelan los correos pendientes al procesarlos; los avisos ya recibidos permanecen en la bandeja personal. Compartir de nuevo habilita otra vez los nuevos avisos.

## Operación

El arranque crea `device_shares` en dispositivos y `notification_share_grants` en notificaciones de forma idempotente, con RLS y sin acceso público en PostgreSQL. Usuarios expone un directorio mínimo interno protegido por `INTERNAL_SERVICE_TOKEN`; cada servicio conserva su base independiente. Localmente usuarios debe tener el mismo token interno de dispositivos y notificaciones. Render lo hereda del supervisor. El frontend solo llama al Gateway.

Estos cambios deben desplegarse tanto en Render como en Vercel para utilizarlos públicamente. El envío real depende de que el transporte de correo esté configurado y operativo.
