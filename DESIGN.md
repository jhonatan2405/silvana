---
name: Sistema de Monitoreo IoT
description: Calm environmental access and device management for Montería.
colors:
  forest: "#245d47"
  forest-hover: "#174d38"
  ink: "#233f36"
  muted: "#65776e"
  line: "#d8e2da"
  paper: "#fbfcf8"
  page: "#edf1ed"
  field: "#f4f7f0"
  field-border: "#dbe4d8"
  placeholder: "#5e6f61"
  white: "#fff"
  focus-amber: "#bb8d3f"
  focus-green: "#4f8068"
  error-surface: "#f9e8e3"
  error-ink: "#8d382c"
  success-surface: "#e4efe0"
  success-ink: "#285b35"
  account: "#285641"
  access-glass: "rgba(241,247,242,.93)"
  access-field: "#fcfefaad"
  weather-track: "#e1e8df"
  weather-selected: "#fafcf7"
typography:
  display:
    fontFamily: "'Manrope Variable', sans-serif"
    fontSize: "clamp(37px, 4.4vw, 62px)"
    fontWeight: 650
    lineHeight: 1.08
    letterSpacing: "-1.8px"
  headline:
    fontFamily: "'Manrope Variable', sans-serif"
    fontSize: "28px"
    fontWeight: 750
    lineHeight: 1.25
    letterSpacing: "-1px"
  title:
    fontFamily: "'Manrope Variable', sans-serif"
    fontSize: "18px"
    fontWeight: 700
    letterSpacing: "-.5px"
  body:
    fontFamily: "'Manrope Variable', sans-serif"
    fontSize: "12px"
    fontWeight: 450
    lineHeight: 1.65
  label:
    fontFamily: "'Manrope Variable', sans-serif"
    fontSize: "11px"
    fontWeight: 700
rounded:
  text-action: "4px"
  icon: "5px"
  secondary: "6px"
  control: "7px"
  toolbar: "8px"
  inset: "9px"
  panel: "12px"
  access-card: "17px"
  access-card-mobile: "14px"
spacing:
  tight: "4px"
  inline: "8px"
  control-gap: "12px"
  section-gap: "18px"
  inset: "22px"
  panel: "28px"
components:
  button-primary:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.white}"
    rounded: "{rounded.control}"
    padding: "12px 18px"
    height: "47px"
  button-primary-hover:
    backgroundColor: "{colors.forest-hover}"
  button-secondary:
    textColor: "#365b43"
    rounded: "{rounded.secondary}"
    padding: "8px 12px"
  button-text:
    textColor: "#275d42"
    rounded: "{rounded.text-action}"
    padding: "5px"
  input:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px 14px"
  panel:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.panel}"
    padding: "28px"
  access-card:
    backgroundColor: "{colors.access-glass}"
    rounded: "{rounded.access-card}"
    padding: "28px 32px"
    width: "405px"
  lighting-cycle:
    backgroundColor: "#fbfdf8"
    textColor: "#31523e"
    rounded: "{rounded.control}"
    padding: "8px 11px"
  environment-toggle:
    textColor: "#31523e"
    rounded: "{rounded.control}"
    padding: "8px 11px"
  status-enabled:
    backgroundColor: "#e7efdf"
    textColor: "#42673b"
    rounded: "{rounded.text-action}"
    padding: "5px 7px"
---

# Design System: Sistema de Monitoreo IoT

## Overview

**Creative North Star: "Environmental Observatory"**

A calm environmental observatory: a continuous Three.js landscape fills the access viewport behind a fixed lateral form. River, terrain, vegetation and a visible station provide atmosphere; forest actions and a translucent mineral card keep Spanish authentication readable. Protected device management retains its paper-and-green surfaces.

The landscape is a real Three.js WebGL world built from procedural geometry, with terrain relief, vegetation, water, a monitoring station and changing light. Moderate motion and local-time lighting give it continuity while the form remains the primary task. The working north-star label is descriptive documentation, not a newly selected identity.

**Key Characteristics:**
- Forest actions on pale mineral surfaces.
- Self-hosted Manrope Variable throughout.
- Continuous Three.js landscape with independent lighting and rain preview states.
- Fixed card, stable message and stable account-switch camera framing; viewport-contained access.

## Colors

Deep greens connect clear controls to the atmospheric landscape; light mineral neutrals carry the working interface. The frontmatter owns the normative interface palette.

### Primary

- **Forest:** primary authentication and device actions; deepens on hover.
- **Account green:** the account summary surface, with pale text.

### Secondary

- **Focus amber / focus green:** keyboard outlines on actions and inputs respectively.
- **Error / success pairs:** contextual feedback surfaces and text; errors remain textual, not color-only.

### Neutral

- **Mineral page / paper:** the protected workspace page and device surfaces. Access uses the translucent mineral card and field variants over the full-window world.
- **Ink / muted:** main hierarchy and supporting copy.
- **Field / field border / placeholder:** softly differentiated inputs with readable hints. The reviewed placeholder combination is approximately 4.95:1.
- **Line:** quiet structural separation.

The scene has four authored lighting palettes in `frontend/src/world.ts`: day, sunset, dusk and night. Rain independently modifies sky, fog and lighting in every mode. These are rendering palettes, separate from interface accents. White overlay text is used throughout, supported by a dark vertical scrim.

## Typography

**Display Font:** self-hosted Manrope Variable, with sans-serif fallback.
**Body Font:** the same family; no separate display or label face.

Variable weights provide a compact, friendly hierarchy. Scene display type is larger and tightly tracked; form headings are direct and labels remain sentence case. The browser base is (14px, weight 450). The normative body token describes form-intro copy; device explanatory copy uses line-height (1.8).

- **Display:** stable scene message; compact desktop (36px), mobile (28px, line-height 1.03, tracking -.7px).
- **Headline:** form title; mobile (25px). Workspace greeting is (37px, tracking -1px), mobile (30px), without an eyebrow.
- **Title:** device section heading. Empty-state title is (20px, weight 650), mobile (18px).
- **Body:** compact supporting text; inputs use (12px, weight 500), mobile (13px).
- **Label:** field labels. Small preview/footer metadata ranges from (8–11px); do not use that range for field content.

## Layout

Access occupies exactly (100dvh), with root overflow hidden and no outer page scroll. The persistent Three.js backdrop is fixed to the viewport. Shell side padding is `clamp(22px,5vw,88px)`; access content caps at (1280px), header height is (74px), and the compact control strip reserves at least (48px). The transparent access stage flexes into the available space. Login, registration and feedback states share its geometry.

Desktop card width is (405px), padding (28px 32px), aligned right and vertically centered. Height is `min(560px,calc(100dvh - 156px))`; final maximum height is `min(100%,calc(100dvh - 156px))`. Vertical overflow is internal to the card, with horizontal overflow hidden and overscroll contained. Form content uses auto vertical margins when space permits. Switching forms changes content only: card position, size, message placement and account-switch camera framing stay fixed. There is no perspective rotation or side swap.

At (701–1000px), the card is (340px) wide with padding (25px); scene-message width is `calc(100% - 375px)`. At (700px) and below, side padding is (20px), header height (64px), and the message occupies an (85px) region. The card begins (88px) below the stage top, spans the available width up to (440px), and uses padding (23px), radius (14px), no transform and internal scrolling. Supporting landscape copy is hidden. At (380px) and below, shell padding becomes (14px), card padding (20px), and controls tighten further. The lower strip remains outside the card and visible; access has no footer.

The protected workspace remains centered within the (1600px) shell, with side padding (5.4%) and workspace cap (1250px). Its sidebar is (250px); at (1050px) and below it becomes (210px), with shell padding (4%). At (700px) and below, the workspace becomes one column with shell padding (20px). Its footer remains present. These workspace rules do not constrain immersive access.

## Elevation & Depth

The workspace uses quiet tonal layering. Access lifts a translucent perspective card over the full-window world, using backdrop blur (16px) and a broad shadow without positional movement. The Three.js landscape supplies depth through perspective, terrain geometry, layered vegetation, fog, physically lit materials and cast shadows; shader water adds stylized waves and reflections. Workspace panels rely on tonal surfaces rather than floating shadows.

### Shadow Vocabulary

- **Fixed access card:** (`0 22px 65px -15px #00131f99`); hover/focus-within deepens it to (`0 26px 75px -12px #00131fc4`) and lightens the surface to (`rgba(245,250,245,.96)`). The stage has no shadow. A pointer-centered radial highlight changes light, not card position.
- **Selected weather option:** (`0 2px 5px #2745360f`), a small selected-state lift.
- **Scene message:** white headline text uses (`0 2px 15px #031923`); supporting text uses (`0 2px 8px #031923`). A full-window vertical vignette supports contrast.

## Shapes

The floating access card has gently curved corners (17px desktop, 14px mobile); working panels are slightly tighter. Inputs and primary actions share a control radius; secondary and feedback surfaces are tighter again. Small status tags have compact corners. Borders are fine single-pixel separators. Procedural 3D terrain, instanced foliage and station geometry extend across the fixed viewport background. They are an environmental world, not decorative card geometry.

## Components

### Buttons

Primary actions are solid forest, white text, weight (650), with an icon gap (12px). Authentication actions occupy full width and separate text from the trailing arrow. Compact workspace actions reduce minimum height to (37px). Secondary actions have a thin border; text actions use green on transparent surfaces. Hover changes the surface; active press translates down (1px). Disabled buttons use opacity (.55) and a wait cursor. Action focus uses a visible amber outline (3px), offset (4px).

### Inputs / Fields

Workspace fields use a pale fill, single-pixel border and visible labels above them. Floating access-card fields override that fill with the translucent access-field token, border (#bfcfc3), and minimum height (43px), padding (11px 13px); mobile (42px), padding (10px 12px). Hover darkens the border; focus changes the fill to white and adds a green outline (2px), offset (2px). Password fields reserve (45px) on the right for a (36px) visibility toggle. Feedback is inline: warm red for errors, pale green for success. Registration exposes the minimum-password guidance below the field.

### Cards / Containers

The transparent access frame stages the floating card and message; it neither contains nor clips the persistent background. The access card uses a translucent surface and blur (16px). Device panels use paper with padding (28px); account panels use green with padding (28px 24px). Device forms are tonal insets with padding (22px). Credential notices wrap long values and provide a copy action. Device rows use top dividers instead of separate floating cards.

### Navigation

The header pairs the activity mark and wordmark with Montería location and local time. The workspace header reduces from (104px) to (80px) on mobile; access uses (74px) desktop and (64px) mobile. Access's compact environment strip contains one cyclic lighting button, separate rain, motion play/pause, and icon-only sound. The lighting button exposes its current and next modes through its accessible name. Rain, motion and sound expose `aria-pressed`; icon controls retain accessible names.

The control surface is (#e7eee7e8), padding (5px), radius (10px), with blur (12px). Controls have minimum height (38px). Lighting has minimum width (125px), mobile (102px), narrow mobile (90px). Motion and sound are (38px) square, mobile width (34px) and minimum height (36px). There is no five-button group or visible volume slider. Access omits redundant footnotes and its page footer; the single account-switch text action remains within the card.

### Status Tags

Device tags show Habilitado / Deshabilitado as text. Enabled tags use pale green; disabled tags use a muted neutral. These represent configured enablement, not real connection telemetry.

### Continuous Environmental Scene

A lazy-loaded Three.js module creates procedural terrain and riverbanks, shader water, instanced trees and rocks, clouds, a station with solar panel and sensor, an anemometer, warm night light and rain particles. It lives outside the access frame as a fixed full-window background. Switching login/register keeps the world, camera framing and lateral message stable. The account-dependent camera angle no longer changes. Subtle pointer offsets may apply while motion is enabled; these do not respond to form selection. No downloaded imagery, models or recordings are used.

The single lighting button cycles Ahora, Día, Atardecer, Anochecer and Noche. Automatic mode follows actual America/Bogota solar time including seconds; discrete mode labels use day (06:00–16:59), sunset (17:00–17:59), dusk (18:00–18:59), night otherwise. Manual targets are (12:00), (17:30), (18:30) and (22:00). With motion enabled, selection changes travel forward through intermediate hours over (7s), including dawn when wrapping from night to day; automatic time is not accelerated afterward. Rain remains independently combinable with all modes. Preview copy explicitly states that no sensor readings are present.

Sound starts off and is enabled through an icon-only action. Synthesized breeze, day birds, dusk/night insects and rain use a fixed moderate level (35% of configured gain), with no visible slider. Gain changes are smoothed; switching off closes audio resources. Hidden tabs suspend sound; entering the protected workspace stops it. Errors are textual statuses.

Motion initially respects `prefers-reduced-motion` unless a saved explicit choice exists. A play/pause icon lets the user opt in or pause; `monitoreo-motion` stores `on` or `off` locally. The review browser reported reduced motion enabled, and the reviewer activated motion through the UI; the system preference was not changed. Paused motion freezes ambient time, pointer camera offsets and accelerated solar travel; state and size changes still render. Explicit opt-in also restores the relevant form, input, button and card-light transitions under a reduced-motion OS setting.

Clouds drift continuously at (1.1 + rainAmount × 1.2) world units per second, with wraparound and faster travel during solar changes. Water time advances at (1.65×) with stronger visible flow. Vegetation wind, rain and anemometer animate while motion is enabled. WebGL caps pixel ratio at (1.7), skips draws less than (33ms) apart, and skips world updates/drawing in hidden tabs. Solar travel uses a (7s) smoothstep curve; atmosphere eases at (2.2 per second). WebGL failure preserves the form with a simplified-view status.

### Fixed Card Interaction

Hover and focus-within add soft pointer-centered light to the card and deepen its shadow over (.3s). Fields strengthen their border on hover and use a green border on focus. Submit hover sends a translucent shine across the button over (.7s) and moves only the trailing arrow (3px) over (.25s). The card itself does not translate, rotate or swap sides on hover or form changes. Internal overflow preserves all fields, help, error messages and actions on short viewports.

## Do's and Don'ts

### Do:
- **Do** keep preview weather explicitly labeled and separate from authentication.
- **Do** preserve visible keyboard focus and the readable placeholder treatment.
- **Do** keep registration errors and the submit action reachable through internal card scrolling.
- **Do** respect the initial OS motion preference and the explicit saved play/pause choice.

### Don't:
- **Don’t** depict preview weather as a sensor measurement.
- **Don't** replace the Three.js world with a flat illustration or restart it when switching forms or preview modes.
- **Don’t** add an eyebrow above the workspace greeting; the shipped hierarchy starts with the greeting.


Implementation evidence: `frontend/src/main.tsx`, `frontend/src/style.css`, `frontend/src/Scene.tsx`, `frontend/src/world.ts`, `frontend/src/useAmbient.ts`, and the final revisions of `docs/acceso-surface.md` and `docs/ambiente-3d.md`. Current captures: `.impeccable/review/fixed-motion-start.png`, `fixed-login-night-motion-later.png`, `fixed-desktop-mobile-top.png`, `fixed-mobile-register-top.png`, and `fixed-mobile-lower.png` (all under the same review directory). At viewport (538px × 658px), login and register both measured (x 49.2px, y 152px, width 440px, height 436.4px); page height matched viewport height (658px). These are review measurements, not independent layout tokens. The compact-access review returned SHIP with no fixes. Geometry and ambience are procedural; Manrope is self-hosted.

Último ajuste solicitado: movimiento de la escena siempre activo, sin control de pausa ni lectura de la preferencia local anterior. Sonido como icono blanco transparente junto a la hora. Un único desplegable hacia arriba agrupa Ahora, Día, Atardecer, Anochecer, Noche y con/sin lluvia, sin fondo en su disparador. Tarjeta con mayor desenfoque (28px), superficie translúcida .76/.82 en hover, título e introducción centrados y sin antena. Compilación verificada y selección del menú comprobada en navegador.



2026-10-22: Paisaje refinado con agua Fresnel, reflejos, ondas de lluvia y bruma del horizonte. Árboles con ramas instanciadas, 22 grupos de follaje irregular y viento por árbol; nubes con densidad y bordes suaves. Se conserva la tarjeta fija y los controles compactos.

2026-10-22: Referencia del usuario aplicada: cristal oscuro traslúcido, texto claro y campos transparentes. Selector de ambiente anclado abajo a la derecha. Cauce excavado también bajo el relieve lejano; follaje de hojas curvas individuales, con viento por instancia.

2026-10-22: Hover de enlaces de acceso sobre cristal mantiene texto claro. Móvil: título compacto en una línea sin párrafo secundario, cabecera con reloj e icono; formulario protegido en pantallas bajas. Agua restringida al cauce para eliminar lagunas laterales. Nubes procedurales suaves, 18 de buen tiempo y 38 adicionales cuya opacidad acompaña la lluvia.

2026-10-22: Cápsula de creadores centrada abajo, ancho natural ~184px, avatares públicos GitHub y enlaces individuales. Hover o foco activa tormenta temporal; salir restaura lluvia seleccionada. Lluvia diagonal de 2800 gotas, viento y rayos ramificados con iluminación y pulsos separados por 5–9 segundos.

2026-10-22: Créditos con brillo radial siguiendo cursor. Tormenta exclusiva del puntero de mouse sobre avatares; se cancela al salir, clicar, perder foco de ventana u ocultar pestaña. Se elimina activación por foco de teclado. Estación con frontones, cubierta con juntas, marcos y escalones; panel solar desplazado al lateral del mástil y montado sobre brazo y refuerzo.

2026-10-22: Soporte solar reconstruido con barras entre extremos exactos, abrazaderas al mástil, refuerzo diagonal y dos travesaños bajo el plano inclinado.


## Dashboard general · 22 de octubre de 2026
Mundo visual extendido desde el acceso aprobado: paisaje Three.js persistente, cristal oscuro verdoso, Manrope y acciones menta. Navegación lateral de 218px, rail de iconos en tablet y menú plegable en móvil. El contenido tiene scroll interno; no hay desbordamiento horizontal.

Entrada: después de un login válido por Gateway, estado de confirmación y salida direccional de un segundo: cabecera arriba, mensaje a la izquierda, tarjeta a la derecha y controles abajo. La misma instancia del paisaje permanece montada. El dashboard entra en 800ms con opacidad, desenfoque y profundidad. Es una animación explícitamente solicitada y se conserva bajo la preferencia de movimiento reducido del equipo; el scroll y demás transiciones respetan esa preferencia salvo los cambios suaves de color.

Vista general: selección de temperatura/humedad sin mediciones ficticias; conteo real de dispositivos y estados de habilitación, historial vacío con filtro de período, acción para preparar estaciones y recorrido de etapas. Los módulos de recepción, análisis, alertas y notificaciones tienen espacios propios señalados como próximas etapas, sin simular conectividad o datos. Cuenta muestra identidad, rol y cierre de sesión revocable. Gestión de dispositivos mantiene las acciones reales existentes a través del Gateway.

Hover: color, borde y brillo radial local en superficies, sin desplazar las tarjetas. Sonido opcional disponible en cabecera del dashboard. Verificación: acceso real, navegación, formulario de dispositivos, selección de variable, cuenta y logout; composiciones a 1440x900 y 390x844, ancho documental móvil 390px. Compilación TypeScript/Vite correcta. Captura de revisión: dashboard-monitoreo-iot.png (cuenta temporal de prueba, sin mediciones).


## Identidad Rivora y carga de marca · 22 de octubre de 2026
Nombre creativo solicitado por el usuario: Rivora, inspirado en río y entorno. Wordmark en Manrope y símbolo vectorial propio: dos riberas en forma de gota, cauce interior y punto de origen. Colores: menta #B9EACD, agua #68B5A2 y espuma #F3FBEF. Fuente nativa del proyecto, sin imágenes generadas o logos externos. SVG estático para favicon y exportación; componente de marca para las cabeceras.

La misma forma sustituye el spinner/texto del botón en login/registro, la restauración inicial de sesión y el cierre de sesión. El cauce avanza por stroke-dashoffset y las dos orillas respiran con desplazamiento pequeño; ondas suaves y tres puntos indican actividad sin porcentaje ficticio. La confirmación estabiliza el símbolo. El formulario conserva su espacio y queda inert durante la operación. Los errores recuperan campos y acciones. Logo de carga también en consulta de dispositivos y preparación del paisaje. Animación explícita de marca solicitada; no destellos ni estrobos.

Cierre: revocar en servidor primero, después retirar sidebar a la izquierda, cabecera arriba y contenido a la derecha en 900ms. Vuelve el acceso en sentido inverso sobre la escena persistente. Un ref evita que la validación periódica convierta el logout en un aviso de expiración durante la transición.

Dashboard: fondo más difuso (blur del paisaje 6px y cristal del shell 22px), reflejo diagonal tenue de cristal. Control Ambiente con etiqueta, icono y tres barras animadas al activar audio. La versión móvil conserva icono e indicador sin etiqueta. Verificación: build, entrada real, cierre y retorno al acceso, error de correo duplicado tras loading y recuperación del formulario, audio y composición a 1440x900 / 390x844.


## Identidad Silvana · revisión del 22 de octubre de 2026
El usuario sustituye explícitamente Rivora por Silvana y rechaza el símbolo anterior. Marca nueva de tres hojas y un tallo de señales. El SVG estático deriva de esa misma silueta y sirve para cabeceras y favicon. Carga con Three.js real en `brandWorld.ts`: hojas curvas con espesor, nervaduras, materiales físicos, luces laterales y señales que recorren el tallo. El grupo gira en profundidad y las hojas oscilan; al confirmar, se estabiliza. Canvas de logo independiente del paisaje; ambos liberan recursos al desmontar.

Secuencia aprobada por el último pedido: durante la operación aparece únicamente la escultura y «silvana», sin frase inferior ni puntos. Login/registro dentro de su tarjeta; logout dentro de la tarjeta de cuenta. Al acabar la comprobación se retira el loading y comienza la salida direccional original. Se eliminan la confirmación flotante y el loading de logout de pantalla completa; no reaparece el logo en el centro de la transición. La carga inicial conserva logo/nombre solos. El estado se anuncia mediante aria-label, sin copiar texto visible adicional. Fallback SVG animado si no hay WebGL.

Revisión visual: escultura real en fixture temporal de la misma tarjeta, sin errores de render; fixture eliminado después de capturar. Entrada y cierre reales por Gateway verificados; cero overlays globales de logo en dashboard. Captura `silvana-logo-3d.png` del componente real, sin imagen generada. SVG `silvana-logo.svg` exportado desde la misma geometría estática de la marca.
