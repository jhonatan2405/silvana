# Acceso y dispositivos
Mode: operate. Spanish web application, desktop and mobile. User explicitly approved the sliding reference, environmental scene and direct code implementation; these pinned decisions override catalog directions. No alternative-world decision is required.

## Direction contract
THESIS: Access takes place beside a continuous environmental scene; switching login and registration moves the scene across the frame without resetting its weather.
OWN-WORLD: Deep forest green, pale mineral backgrounds, blue atmospheric distance and restrained amber sunlight. Clear system UI typography for forms; a separately authored landscape rendered with canvas geometry.
STORY: Identify the monitoring platform, choose access or registration, complete fields, manage the user's own devices. Environmental states are preview states until sensors exist.
FIRST VIEWPORT: A broad framed composition below a small wordmark header. Landscape occupies the left 54 percent and the login the right 46 percent; register reverses their locations. Landscape carries a visible station and river. Preview controls sit below the frame, clearly separate from authentication. Primary form action is full width.
FORM: User-pinned sliding panel reference; seed a8220bfc acknowledged, user constraints override assignment. Challengers declined: bitmap specimen reduces form legibility, garden map displaces the pinned scene, coded catalog obscures state labels. Keep precise spacing and restrained density.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Boundaries: no sensor readings invented. Supabase configuration pending. Mobile keeps form in ordinary flow, scene above it; reduced-motion mode removes sliding and ambient animation.

## Cambio solicitado el 21 de octubre
El usuario rechaza la ilustración plana anterior y solicita Three.js real con relieve, estación, vegetación, agua, iluminación y transiciones. Conservar la composición y el desplazamiento del panel de referencia, añadir su botón de alternancia dentro del panel. Separar iluminación (ahora, día, atardecer, anochecer, noche) de precipitación (despejado/lluvia), con audio ambiental opcional activado por acción del usuario. Interpolación de colores, luces, lluvia y perspectiva sin recrear el mundo al cambiar de formulario o clima. Pausar render/audio al ocultarse la pestaña y respetar movimiento reducido. Mantener formulario funcional si WebGL falla. La escena sigue siendo demostración sin datos reales.


## Fondo inmersivo solicitado
La referencia del usuario ahora gobierna la composición: escena Three.js fija a toda la ventana, formulario lateral sobre superficie translúcida con inclinación leve en escritorio y flujo vertical en móvil. El fondo persiste al alternar formularios; tarjeta y mensaje conservan desplazamiento lateral en escritorio. La iluminación recorre una línea solar continua durante siete segundos al cambiar de modo, incluyendo amanecer al pasar de noche a día. Ahora sigue la hora real de Montería sin acelerar automáticamente el reloj. Nubes con deriva continua, agua y viento visibles, lluvia independiente. Los controles inferiores conservan sus funciones y estructura, sin rediseñarlos en esta fase. Sin datos reales conectados.


## Última revisión del acceso
La tarjeta permanece en la misma posición y tamaño al alternar login/registro; la cámara y el texto lateral también permanecen estables. Se eliminan alternancia duplicada y pies redundantes. Un único botón recorre Ahora, Día, Atardecer, Anochecer y Noche; lluvia separada, sonido solo icono. Se añade icono reproducir/pausar necesario porque el navegador de revisión declara prefers-reduced-motion=true: inicialmente se respeta esa preferencia, y la elección explícita de movimiento se conserva localmente como monitoreo-motion. Durante la revisión se activó voluntariamente para el usuario. Nubes y ondas más visibles. El acceso ocupa 100dvh sin desplazamiento de página; solo el interior de la tarjeta puede desplazarse cuando falta altura o aparecen errores, preservando el acceso a todos los campos. Hover de campos, botón principal y luz suave sobre tarjeta, sin cambiar su posición.


Último ajuste solicitado: movimiento de la escena siempre activo, sin control de pausa ni lectura de la preferencia local anterior. Sonido como icono blanco transparente junto a la hora. Un único desplegable hacia arriba agrupa Ahora, Día, Atardecer, Anochecer, Noche y con/sin lluvia, sin fondo en su disparador. Tarjeta con mayor desenfoque (28px), superficie translúcida .76/.82 en hover, título e introducción centrados y sin antena. Compilación verificada y selección del menú comprobada en navegador.

