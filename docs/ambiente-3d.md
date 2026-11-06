# Escena ambiental con Three.js

La ilustración 2D se reemplazó por una escena WebGL creada con Three.js. El panel conserva su desplazamiento entre login y registro, y contiene un botón visible para cambiar de formulario. La escena no se desmonta al cambiar el formulario: la cámara interpola su perspectiva.

## Contenido

Terreno con cauce, río con shader de ondas y reflejos estilizados, vegetación instanciada, rocas, estación, panel solar, sensor protegido, anemómetro, luces cálidas nocturnas y nubes. Son geometrías procedurales propias; no se han copiado modelos ni grabaciones de terceros. No pretende ser una representación geográfica exacta de Montería.

La iluminación tiene modos Ahora, Día, Atardecer, Anochecer y Noche. Ahora usa America/Bogota. La lluvia se controla de forma independiente: puede combinarse con cualquier iluminación. Cielo, niebla, luces y precipitación se interpolan al cambiar de estado.

## Audio

Web Audio genera un ambiente suave de viento, aves de día, insectos nocturnos y lluvia. El sonido empieza apagado y solo se activa mediante el botón del usuario. Tiene volumen y apagado explícitos, se suspende al ocultar la pestaña y se detiene al entrar en la vista protegida. Es audio sintetizado, no una grabación de sensores ni del entorno real.

## Ejecución y accesibilidad

Three.js se carga en un módulo separado bajo demanda. El render limita resolución y frecuencia, agrupa vegetación mediante instancias y libera geometrías/materiales al desmontarse. Al ocultar la pestaña no dibuja fotogramas. Movimiento reducido mantiene iluminación y controles pero detiene la animación del paisaje y la cámara. Si WebGL no se puede inicializar, conserva el formulario y muestra el estado de vista simplificada.

Los selectores de clima son de demostración y están identificados como tales. No existe aún conexión a sensores; la hora real solo gobierna la iluminación del modo Ahora.

Referencia técnica consultada: [Three.js](https://threejs.org/) y su [documentación](https://threejs.org/docs/).

## Fondo completo y paso del tiempo

La escena vive en una capa fija que cubre la ventana. El formulario es una tarjeta lateral translúcida con leve perspectiva en escritorio; en móvil fluye verticalmente sobre el mismo fondo. El fondo no se reinicia al cambiar de formulario ni al desplazar la página.

Al seleccionar una iluminación, el reloj visual recorre hacia delante las horas intermedias durante siete segundos: puede atravesar madrugada, amanecer, día, atardecer y anochecer. Se interpolan cielo, luz, agua y ambiente; las nubes mantienen su deriva y la lluvia aparece de forma gradual. En Ahora, el reloj visual sigue la hora real America/Bogota, con segundos; el modo no acelera ni simula el paso de la hora real. Movimiento reducido elimina el recorrido acelerado.

Los controles inferiores conservan sus acciones anteriores. Solo se ajustó su superficie para que sean legibles sobre el fondo; su rediseño funcional queda para otra fase.


## Controles compactos y animación explícita

El selector de cinco botones se sustituye por un único botón cíclico con la iluminación actual y el siguiente estado en su etiqueta accesible. Lluvia permanece separada. Sonido es solo un icono con nombre accesible; el volumen predeterminado es moderado (35 % del nivel configurado), sin deslizador visible.

Se detectó prefers-reduced-motion=true en el navegador del usuario, motivo por el que la versión anterior mantenía el paisaje estático. Se respeta al iniciar por primera vez. Un icono reproducir/pausar permite autorizar el movimiento explícitamente y conserva esa elección localmente. En la revisión se activó mediante ese control; no se cambió ninguna preferencia del sistema. Ahora nubes, ondas, vegetación y anemómetro usan esa decisión explícita.

La tarjeta, la cámara y el texto no cambian de lado al alternar los formularios. La página de acceso ocupa exactamente la ventana sin scroll exterior; con poca altura, zoom o errores, solo la tarjeta tiene desplazamiento interno. Esto preserva todos los campos y acciones.



## Refinamiento del paisaje · 22 de octubre de 2026

Cambio limitado a `frontend/src/world.ts` y al nuevo módulo `landscapeMaterials.ts`. Conserva cámara, composición, formulario, controles, transiciones y lógica de la aplicación. No modifica firmware, servicios ni datos.

El río ahora usa un reflejo planar de la escena real mediante Reflector de Three.js: árboles, cielo y construcciones se reflejan sobre la superficie. El shader combina Fresnel, distorsión por ondas, color por profundidad aproximada, ondulaciones de lluvia, brillo solar y niebla. La geometría sigue el cauce y se prolonga fuera del primer plano; las orillas se forman por intersección con el terreno, sin planos de agua laterales. La profundidad es una aproximación al lecho procedural, no una medición física ni refracción volumétrica.

El terreno incorpora variación coherente de suelo, detalle de normales por derivadas, zonas húmedas de ribera y sombreado amplio que acompaña al movimiento ambiental. Se sustituyó el ruido aleatorio por vértice por variación espacial suave. Sombras PCF compatibles con la versión instalada de Three.js, mapa2048 en escritorio y1024 en pantallas compactas. La variante antigua PCFSoft fue descartada porque Three.js0.186 ya no la admite.

Arboleda aumentada de155 a215 ejemplares en escritorio y180 en pantallas compactas. Copas con volumen irregular por capas, siete ramificaciones principales, hojas curvas con UV de nervaduras y color/transmisión de luz suaves. El viento se replica en el material de profundidad para que las sombras acompañen las hojas. Corteza con surcos procedurales y rocas con mayor suavidad geométrica.

Para limitar el coste se mantienen las instancias y el límite existente de resolución/fotogramas. Reflejo de512x512 cada90ms en escritorio y256x256 cada140ms en compacto; las ondas y el paisaje siguen su animación normal. El límite compacto se determina al crear la escena. El render target del reflejo, las sombras y los materiales de profundidad se liberan al desmontar. No se descargaron mapas ni modelos de terceros; son materiales y geometría procedurales. No se afirma fotorealismo ni se representa una geografía exacta de Montería.

Compilación del frontend correcta y revisión visual del paisaje. No se ejecutaron pruebas del hardware ni flujos de autenticación/dispositivos para esta mejora. Las advertencias del detector corresponden a colores/materiales de escena, fuera de los tokens de UI; se conserva la paleta ambiental existente.

## Corriente, nubosidad y ambiente sonoro · 22 de octubre de 2026

El río integra una fase de corriente continua: lluvia y viento aumentan velocidad, desplazamiento vertical de ondas y distorsión del reflejo sin saltos de fase. Incluye estelas que recorren el cauce, espuma en orillas/crestas e impactos radiales de gotas. Es una aproximación visual procedural, no una simulación de dinámica de fluidos ni de caudal real.

Scene acepta conditions con cloudCover, rainIntensity y windStrength normalizados entre 0 y 1. La cobertura controla densidad de nubes, luz, niebla y visibilidad de astros independientemente de la lluvia; permite representar muy nublado sin precipitación. Se conserva el menú existente. La conexión de estos valores con sensores o un servicio meteorológico real sigue pendiente; por ahora el ambiente es demostrativo.

El audio usa un AudioWorklet con ruido estéreo continuo y capas separadas de río, viento y lluvia cercana/lejana. Aves e insectos varían intervalos, tono, duración y posición; amanecer, día, atardecer y noche tienen perfiles distintos. Ahora usa la hora America/Bogota. Los truenos se retrasan respecto a los rayos de la tormenta. Son sonidos sintetizados, no grabaciones de campo. Si AudioWorklet no está disponible se emplean buffers largos de 37 y 53 segundos con fases independientes; esa alternativa sí contiene repetición.

La activación sigue siendo voluntaria mediante el icono existente. Cambios de perfil y apagado usan fundidos, la pestaña oculta suspende el audio y al desmontar se liberan procesadores/fuentes/contexto. Sin cambios de formularios, dashboard, servicios ni firmware.

Verificación: compilación correcta, procesador con muestras finitas/energía no nula/canales distintos y parada correcta; activación desde el navegador sin errores de consola. Revisión visual de lluvia en escritorio y móvil. La calidad perceptiva del audio requiere escucha del usuario. Detector: 19 avisos informativos de colores de materiales ambientales, sin cambios de tokens de interfaz.

## Sonidos de interacción

Se añaden notas sintetizadas cortas para hover de controles (una por entrada, no por movimiento), activación y navegación. Entrada/salida del dashboard usan una secuencia ascendente/descendente, sin modificar las transiciones visuales ni esperar al audio. Comparten AudioContext, compresor y apagado con el ambiente existente; no hay autoplay ni descargas de sonidos. Hover tiene separación mínima de 180 ms y acciones de 80 ms; touch no produce hover. Los nodos se liberan al finalizar y al apagar; la pestaña oculta no emite señales. Activación/cambio de formulario comprobados sin errores en navegador; compilación correcta. La valoración acústica queda a la escucha del usuario.

Corrección: los efectos de interfaz usan ahora un AudioContext ligero independiente y se habilitan con la primera interacción válida del usuario. El botón existente controla exclusivamente el ambiente; apagarlo no detiene hover, clics o transiciones. Los efectos no descargan ni inicializan las capas ambientales. La pestaña oculta suspende ambos contextos y el desmontaje los libera. Sigue aplicándose la restricción de reproducción del navegador antes del primer gesto. Esta separación sustituye la descripción anterior de apagado compartido.
