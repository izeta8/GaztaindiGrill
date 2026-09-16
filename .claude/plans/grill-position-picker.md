# Elegir la altura arrastrando sobre el modelo 3D

Rama sugerida: `feat/grill-position-picker`. Al final se hizo directamente en `develop`.

**Cerrado.** Las preguntas abiertas se resolvieron con las propuestas: se quitan slider, campo y ENVIAR; sin rotación en la modal; pasos de 5 %; la modal se cierra tras "Mover".

## Qué se quiere

Sustituir el slider vertical, el campo numérico y el botón ENVIAR de cada columna de `/control`
por una modal (opción A de los bocetos, "solo fantasma"):

- Se abre al tocar una parrilla en el modelo 3D de `/control`.
- Dentro, el modelo 3D con cámara fija: parrilla izquierda en perspectiva isométrica (para ver la
  inclinación del rotor) y parrilla derecha de frente.
- La parrilla real se queda en su sitio. Una parrilla fantasma sigue el dedo arriba y abajo.
- Muestra el % objetivo, "Cancelar" cierra sin mover y "Mover a X%" envía
  `action/movement/set_position` y cierra.
- Modo dual: tocar cualquiera de las dos abre la modal de la parrilla 0, igual que hoy la columna
  "Parrilla Dual" usa `grillIndex` 0.
- No se abre mientras corre un programa en esa parrilla (en dual, cualquiera) ni sin conexión.

## Lo que NO cambia

- **El contrato MQTT.** Se usa `action/movement/set_position` tal cual lo manda hoy
  `handleSetPosition()`. **No hace falta auditor.**
- El firmware y la API.
- Los pads de subir/parar/bajar y de rotación de `ControlColumn`.
- `ResettingOverlay`, que también pinta `GrillScene`: sigue sin ser interactivo.

## Decisiones de diseño

- **Arrastre exacto bajo el dedo.** El puntero se proyecta sobre un plano vertical que pasa por la
  parrilla, y la `y` de ese punto se convierte en % con los mismos `MIN_HEIGHT`/`MAX_HEIGHT` de
  `GrillModel`. Así funciona igual con la cámara isométrica y con la frontal.
- **Fantasma = clon del nodo** `padre_parrilla_ezkerra`/`eskubi` con materiales propios
  translúcidos en naranja. Clonar los materiales para no teñir la parrilla real. En la izquierda el
  clon copia también la rotación de `rotor_cilindro+parrilla`.
- **Cámara calculada, no a mano.** El encuadre sale del `Box3` del nodo de la parrilla, porque
  `<Stage>`/`<Center>` desplazan el modelo y unas coordenadas fijas se romperían al cambiarlo.
- **Sin `OrbitControls` en la modal**, para que arrastrar mueva el fantasma y no la cámara.
- **Una segunda `<Canvas>`** montada solo con la modal abierta. `useGLTF` ya cachea el `.glb`.
- **Tocar vs girar en la escena principal.** `onClick` de R3F no se dispara tras un arrastre, así
  que girar con `OrbitControls` no abre la modal.

---

## Tareas

### 1. ESP32 falso para desarrollar sin la parrilla — HECHA (`5575a67`)

`scripts/fake-grill.mjs` (ya escrito, sin commitear) y el script `npm run fake-grill`. Habla el
contrato de `GrillConstants.h` contra un broker local: LWT, modo, `reset_status`, posición y
rotación que se mueven de verdad, temperatura cada 5 s y respuestas en `status/result`.

Documentarlo en `GaztaindiGrill-NextJS/CLAUDE.md`, junto a `mosquitto_sub`/`mosquitto_pub`: broker
local con listener WebSocket en 1884 y `allow_anonymous`, y `.env.local` sin
`NEXT_PUBLIC_DEV_HOST` ni credenciales.

Archivos: `GaztaindiGrill-NextJS/scripts/fake-grill.mjs`, `GaztaindiGrill-NextJS/package.json`,
`GaztaindiGrill-NextJS/CLAUDE.md`
Commit: `chore: add a fake esp32 to develop the web client against a local broker`
Verificación: `npm run lint`. Con `npm run fake-grill` y `npm run dev`: las dos luces del dock en
verde, mover a 30% baja la parrilla en el 3D y la temperatura aparece en naranja.

### 2. Hacer `GrillScene` y `GrillModel` configurables, sin cambiar lo que se ve — HECHA (`0be1d13`)

Preparar las piezas que usará la modal, sin comportamiento nuevo:

- `GrillModel`: exponer los nodos de cada parrilla, por índice, y sacar a funciones reutilizables
  el cálculo de altura (`% → y`, y su inversa `y → %`).
- `GrillModel`: prop para ocultar las etiquetas de texto 3D.
- `GrillScene`: props opcionales para la cámara y para desactivar `OrbitControls`. Por defecto, lo
  de hoy, así `/control` y `ResettingOverlay` no cambian.

Archivos: `GaztaindiGrill-NextJS/src/components/three/GrillScene.tsx`,
`GaztaindiGrill-NextJS/src/components/three/GrillModel.tsx`
Commit: `refactor: let the 3d grill scene take its camera and controls from props`
Verificación: `npm run lint`, `npm run typecheck`. Con el ESP32 falso, `/control` y el overlay de
reset se ven y se mueven igual que antes.

### 3. Tocar una parrilla en el 3D abre su modal — HECHA (`b56a545`)

> Dos cosas que no estaban previstas. R3F solo pasa al handler la malla más cercana, casi siempre
> una pared, así que la parrilla se busca en `event.intersections`. Y la vista enfocada oculta las
> paredes y la otra parrilla, porque desde cualquier esquina tapaban la rejilla.

- `GrillModel`: `onClick` sobre la escena, subiendo por `parent` hasta `padre_parrilla_ezkerra` o
  `padre_parrilla_eskubi`. Cursor `pointer` al pasar por encima.
- `GrillScene`: prop `onGrillSelect(index)`. Sin prop, nada es clicable.
- Nuevo `GrillPositionModal` sobre `components/ui/Modal`: título con la parrilla, la escena con la
  cámara de esa parrilla (isométrica la 0, frontal la 1), el % actual y "Cancelar".
- `control/page.tsx`: estado de la parrilla abierta. Resuelve modo dual (siempre 0) y bloquea si
  hay programa o no hay conexión.

Archivos: `GaztaindiGrill-NextJS/src/components/three/GrillModel.tsx`,
`GaztaindiGrill-NextJS/src/components/three/GrillScene.tsx`,
`GaztaindiGrill-NextJS/src/app/control/components/GrillPositionModal.tsx` (nuevo),
`GaztaindiGrill-NextJS/src/app/control/page.tsx`
Commit: `feat: open a grill's position view by tapping it in the 3d model`
Verificación: `npm run lint`, `npm run typecheck`. Con el ESP32 falso, en el navegador y en vista
móvil:
- Tocar cada parrilla abre su modal con la cámara correcta. Girar el modelo no la abre.
- Con la izquierda inclinada desde el fake, se ve la inclinación en la modal.
- En dual, las dos abren la parrilla 0.
- Con un programa simulado en marcha, o con el fake parado, no se abre.

### 4. Arrastrar la parrilla fantasma y mandarla a esa altura — HECHA (`296f6c9`)

> El encuadre por esfera dejaba todo el recorrido en ~65 px: 40 px de arrastre eran un 60 %. Ahora
> la distancia sale de proyectar las esquinas de la caja, con un margen por cámara (`FOCUS_FILL`).

- En la modal: clon translúcido de la parrilla, que arranca en la posición real.
- Arrastre con puntero (ratón y dedo) por proyección sobre el plano vertical, limitado a 0-100 y
  redondeado a pasos de 5, como el slider actual. `touch-action: none` en la canvas.
- Etiqueta con el % objetivo junto al fantasma, y botón "Mover a X%" que llama a
  `handleSetPosition()` de `useGrillCommands` y cierra la modal.
- Botón desactivado si durante la modal empieza un programa o se pierde la conexión.

Archivos: `GaztaindiGrill-NextJS/src/app/control/components/GrillPositionModal.tsx`,
`GaztaindiGrill-NextJS/src/components/three/GrillModel.tsx` (fantasma), y posiblemente un
`GhostGrill.tsx` nuevo en `components/three/`
Commit: `feat: drag a ghost grill in the position view to send the grill to that height`
Verificación: `npm run lint`, `npm run typecheck`. Con el ESP32 falso y
`mosquitto_sub -v -t 'grill/#'`:
- Arrastrar deja el fantasma bajo el dedo en las dos cámaras. La parrilla real no se mueve.
- "Mover a 35%" publica `{"value":"35",...}` en `grill/{id}/action/movement/set_position`, la
  modal se cierra y la parrilla baja en la escena principal.
- "Cancelar", ESC o tocar fuera no publican nada.

### 5. Quitar el slider, el campo numérico y ENVIAR de las columnas — HECHA (`4bf1781`)

Borrar la fila 2 de `ControlColumn` (slider, input, botón), el estado `targetPos` y su efecto.
Si `handleSetPosition` y `LIMITS.POSITION_MAX` solo los usa ya la modal, se quedan: la modal los
llama.

Va aparte de la tarea 4 para poder probar la modal con los sliders todavía delante antes de
quitarlos.

Archivos: `GaztaindiGrill-NextJS/src/app/control/components/ControlColumn.tsx`
Commit: `feat: replace the position sliders with the 3d position view`
Verificación: `npm run lint`, `npm run build` con `npm run dev` **parado** (el build rompe el
`.next` del dev server). En móvil, las columnas solo muestran los pads.

> Hecho con `npm run typecheck` y lint: el dev server estaba levantado, así que el build queda
> pendiente.

### Después — HECHO

`GaztaindiGrill-NextJS/CLAUDE.md`: sección del 3D y del flujo de `/control`.

---

## Preguntas abiertas

**1. ¿Se quitan de verdad el slider, el campo y ENVIAR?** La tarea 5 lo hace. Si prefieres dejar
el campo numérico para valores exactos, la tarea 5 lo mantiene dentro de la modal en vez de
borrarlo.

**2. La rotación no se edita en la modal**, solo se ve la inclinación. Si la quieres (por ejemplo,
arrastrar en horizontal para girar el fantasma), sería una tarea 6 aparte, con
`action/movement/set_rotation` y el guard de altura del firmware en cuenta.

**3. Pasos de 5% o de 1%.** Propongo 5%, como el slider actual: con el dedo es difícil clavar un
número y el firmware tiene `POSITION_MARGIN` en 0.

**4. Qué pasa tras "Mover".** Propongo cerrar la modal y ver el movimiento en la escena principal.
La alternativa es dejarla abierta y ver subir la parrilla real hasta el fantasma.
