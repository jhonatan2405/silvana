# Primera etapa de usuarios y autenticación

## Objetivo

Permitir que una persona se registre, inicie sesión y acceda a una vista protegida mediante el flujo frontend → API Gateway → usuarios-auth-service.

## Orden de trabajo

1. Definir campos de registro, roles y permisos, contratos de API y estrategia de sesión.
2. Acordar la dirección visual: referencias, tipografía, colores, componentes y comportamiento adaptable a móvil y escritorio.
3. Implementar usuarios y autenticación con persistencia, validaciones y contraseñas protegidas mediante hash.
4. Configurar el Gateway para las rutas de esta etapa.
5. Construir registro, login y una vista protegida inicial en React.
6. Integrar y comprobar el recorrido completo, incluidos errores y cierre de sesión.

## Funciones previstas

- Registro de usuario.
- Inicio y cierre de sesión.
- Consulta del usuario autenticado.
- Autorización del lado del servidor.
- Estados de carga, errores de validación y mensajes de acceso.
- Manejo de sesión expirada.

## Criterios de finalización

Una cuenta nueva puede registrarse e iniciar sesión; el correo duplicado y las credenciales incorrectas se manejan de forma clara. El usuario autenticado puede consultar su perfil y acceder a la vista protegida. Las solicitudes sin sesión válida son rechazadas por el backend. El cierre de sesión sigue la estrategia de invalidación definida y bloquea el acceso protegido según esa estrategia.

## Alcance posterior

Los otros cinco servicios quedan reservados para siguientes etapas. La vista protegida inicial no implica que las mediciones, los gráficos o las alertas ya funcionen. No se presentarán datos de demostración como si fueran datos de sensores reales.

## Decisiones pendientes

- Campos obligatorios, roles y política de registro.
- Recuperación de contraseña y verificación de correo: decidir si entran en esta etapa.
- Estrategia de sesión, renovación, expiración e invalidación.
- Backend definitivo, versiones y librería de componentes.
- Dirección visual del producto antes de construir las pantallas.
