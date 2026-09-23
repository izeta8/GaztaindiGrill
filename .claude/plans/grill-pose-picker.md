# Girar la parrilla izquierda desde la vista de posición

Rama sugerida: `feat/grill-pose-picker`. Al final se hizo directamente en `develop`.

**Cerrado.** Pregunta 1 resuelta con la propuesta: `set_pose` contesta como `set_rotation`. Faltan por probar en la parrilla real las tareas 1 y 2, y el sentido de giro de la pregunta 2.

## Qué se quiere

La modal de posición (`GrillPositionModal`) de la **parrilla izquierda** permite elegir también la
inclinación. La derecha no cambia.

- Selector segmentado **Altura | Giro**. El arrastre sobre el 3D solo mueve lo seleccionado.
- Dos campos vinculados sobre el 3D: `%` y `°`. El arrastre reescribe su campo y escribir mueve
  la parrilla objetivo. Giro en pasos de 15° arrastrando y exacto escribiendo (0-359).
- La posición actual sigue como fantasma, con su ángulo real.
- **Zona prohibida en rojo:** las alturas por debajo del suelo seguro del ángulo elegido. La
  parrilla objetivo no puede quedar ahí.
- "Mover" en la izquierda manda un único comando `set_pose { position, rotation }`. La derecha
  sigue con `set_position`.

## Por qué hace falta tocar el firmware

Hoy hay dos piezas que no se pueden combinar desde el cliente:

- `set_rotation` pasa por el seguro de holgura (ARCHITECTURE.md §6): sube si hace falta, gira y
  **vuelve a la altura de antes**.
- `go_to()` no mira la inclinación. Es el riesgo pendiente de §6: un `set_position` bajo con la
  rejilla a 90° la mete en la brasa.

Mandar `set_rotation` y `set_position` seguidos hace que los dos peleen por el actuador, o que el
seguro devuelva la rejilla a su sitio y luego la posición la baje inclinada. Por eso primero el
suelo en `go_to()` y luego un comando que haga la maniobra entera.

## Decisiones de diseño

- **`set_pose` reutiliza el seguro, no lo duplica.** `go_to_rotor()` gana un destino final
  opcional. Donde hoy `GUARD_ROTATING` vuelve a `positionBeforeRotation`, con destino final va a
  `max(destino, min_safe_position(ángulo final))`. Si el destino ya es más alto que la subida que
  pide el giro, sube directamente hasta el destino y no hace falta un tercer movimiento.
- **Respuesta como `set_rotation`:** ok cuando el giro arranca, diferida si antes hay que subir;
  `rotation_unsafe` si la subida no llega. Ver pregunta abierta 1.
- **`set_pose` rechaza con `rotor_busy`** si hay un programa o un movimiento en marcha, igual que
  `reset_rotation`: pisar un seguro a medias dejaría la maniobra con un origen equivocado.
- **Sin códigos de error nuevos.** `invalid_json` si falta `position` o `rotation`,
  `rotation_out_of_range`, `no_rotor`, `rotation_unsafe`, `rotor_busy`. La posición fuera de
  0-100 se recorta, como ya hace `go_to()`.
- **La zona roja es el suelo del ángulo final**, `min_safe_position(θ)`, no el peor punto del
  arco. El arco solo obliga a una subida temporal que el firmware ya hace solo; lo que el usuario
  no puede elegir es *quedarse* por debajo del suelo.
- **La fórmula se duplica en TypeScript** (`utils/rotation.ts`), con `CLEARANCE_PCT`,
  `ROTATION_MAX_DROP_PCT` y `ROTOR_MARGIN` copiados de `GrillConstants.h`. No es contrato MQTT,
  así que el auditor no lo vigila: un comentario en ambos lados apunta al otro.
- **Giro arrastrando = ángulo alrededor del eje en pantalla.** Se proyecta el pivote del rotor a
  pantalla y el ángulo del dedo respecto a él da los grados, como girar un mando. El sentido
  (horario en el encoder vs en el modelo) no está verificado; se ajusta con un signo.
- **Al girar, la altura sube sola** hasta el suelo si el objetivo quedaba por debajo, y el campo
  `%` lo refleja.

## Lo que NO cambia

- Los giros manuales (`action/movement/rotation`) siguen sin seguro, a propósito (§6).
- `set_rotation` y `set_position` siguen existiendo: los usan los programas y la parrilla derecha.
- La parrilla derecha y el modo dual (que usa la parrilla 0, así que en dual sí sale el selector).

---

## Tareas

### 1. Suelo de altura en `go_to()` según la inclinación actual — HECHA (`213dba8`)

`MovementManager::go_to()` recorta el destino a `min_safe_position(ángulo actual)` y lo anota
con `mqtt->print` cuando recorta. Cubre `set_position`, los pasos de posición de los programas y
las propias llamadas del seguro (que ya piden alturas por encima del suelo, así que no cambian).

Archivos: `GaztaindiGrill-ESP32/lib/Grill/MovementManager.cpp`,
`GaztaindiGrill-ESP32/ARCHITECTURE.md` (§6: quitar el riesgo pendiente, describir el suelo)
Commit: `fix: keep a tilted rack above the embers when the grill is sent to a position`
Verificación: `pio run`. En hardware, con `mosquitto_sub -v -t 'grill/#'`: rejilla a 90° con
`set_rotation`, luego `set_position 0` → para en el suelo (60 %) y el log lo dice. Con la rejilla
horizontal, `set_position 0` baja del todo.

### 2. Comando `set_pose { position, rotation }` en firmware, contrato y ESP32 falso — HECHA (`d92f514`)

- `GrillConstants.h`: `TOPIC_CMD_SET_POSE = "action/movement/set_pose"` y los nombres JSON.
- `Grill::handle_mqtt_message()`: parsea `request.raw`, valida (`no_rotor`, `invalid_json`,
  `rotation_out_of_range`, `rotor_busy`) y llama a `go_to_rotor()` con destino final.
- `MovementManager`: destino final opcional en `go_to_rotor()` y en el guard, como en Decisiones.
  Si no hace falta girar (ya está en el ángulo), va directo a la altura.
- `constants/mqtt.ts`: `SET_POSE`. `docs/mqtt.md`: fila en la tabla de comandos y en la de
  errores (`rotor_busy`). `ARCHITECTURE.md` §6: el tercer camino por el seguro.
- `scripts/fake-grill.mjs`: `set_pose` gira y luego va a la altura, con `no_rotor` en la 1.

Va en un solo commit porque es un cambio de contrato: partirlo deja firmware y cliente en
desacuerdo.

Archivos: `GaztaindiGrill-ESP32/lib/Grill/GrillConstants.h`, `Grill.cpp`,
`MovementManager.h/.cpp`, `GaztaindiGrill-ESP32/ARCHITECTURE.md`,
`GaztaindiGrill-NextJS/src/constants/mqtt.ts`, `GaztaindiGrill-NextJS/docs/mqtt.md`,
`GaztaindiGrill-NextJS/scripts/fake-grill.mjs`
Commit: `feat: move the left grill to a height and a tilt in one command`
Verificación: `pio run`, `npm run lint`. En hardware con `mosquitto_pub`:
- Rejilla horizontal al 20 %, `set_pose {40, 90}` → sube a 60, gira, baja a 60 (no a 40: suelo).
- `set_pose {80, 90}` desde abajo → sube a 80 directamente, gira, se queda.
- `set_pose {10, 0}` desde 90° y 60 % → gira a 0 y baja a 10.
- En la parrilla 1 → `no_rotor`. Con un programa en marcha → `rotor_busy`.

### 3. Selector Altura | Giro, campo de grados y giro de la parrilla objetivo — HECHA (`b869294`)

> El giro arrastrando sale del ángulo del puntero alrededor del pivote del rotor proyectado a
> pantalla. El sentido sigue sin verificar contra la parrilla real (pregunta 2).

- `GrillModel`: `target` gana `rotation` y un modo de arrastre (`height` | `rotation`). La copia
  objetivo usa su propio ángulo en vez de copiar el real. Arrastre de giro por ángulo alrededor
  del pivote proyectado, en pasos de 15°.
- `GrillPositionModal`: selector segmentado solo en la parrilla 0, campo `°` junto al `%`, ambos
  vinculados. Arranca con el ángulo real, redondeado.
- Todavía sin zona roja ni `set_pose`: "Mover" sigue mandando solo la altura, así que esta tarea
  se puede probar visualmente sin tocar el firmware.

Archivos: `GaztaindiGrill-NextJS/src/components/three/GrillModel.tsx`,
`GaztaindiGrill-NextJS/src/components/three/GrillScene.tsx`,
`GaztaindiGrill-NextJS/src/app/control/components/GrillPositionModal.tsx`
Commit: `feat: pick the left grill's tilt in the position view`
Verificación: `npm run lint`, `npm run typecheck`. Con el ESP32 falso, en vista móvil:
- En Altura el arrastre solo sube y baja; en Giro solo gira. El campo de cada uno se actualiza.
- Escribir `90` en `°` gira la copia objetivo; el fantasma se queda con el ángulo real.
- La parrilla derecha no enseña selector ni campo de grados.

### 4. Zona prohibida y "Mover" con `set_pose` — HECHA (`2f29011`)

> El suelo se aplica también al abrir la modal: con la rejilla inclinada y baja, el objetivo
> arranca ya fuera de la banda roja en vez de dentro.

- `utils/rotation.ts`: `minSafePosition(degrees)`, espejo de `min_safe_position()`.
- `GrillModel`: bloque rojo translucido bajo la rejilla, de 0 % al suelo del ángulo objetivo.
- `GrillPositionModal`: la altura objetivo no baja del suelo (arrastrando, escribiendo o al
  girar, que la empuja hacia arriba).
- `useGrillCommands`: `handleSetPose(position, rotation)`. `control/page.tsx`: "Mover" usa
  `set_pose` en la parrilla 0 y `set_position` en la 1.

Archivos: `GaztaindiGrill-NextJS/src/utils/rotation.ts` (nuevo), `src/utils/index.ts`,
`src/components/three/GrillModel.tsx`, `src/app/control/components/GrillPositionModal.tsx`,
`src/app/control/hooks/useGrillCommands.tsx`, `src/app/control/page.tsx`,
`GaztaindiGrill-ESP32/lib/Grill/GrillConstants.h` (comentario que apunta a la copia en TS)
Commit: `feat: send the picked height and tilt together and keep the rack above the embers`
Verificación: `npm run lint`, `npm run typecheck`. Con el ESP32 falso y `mosquitto_sub`:
- A 90° la zona roja llega al 60 % y la altura no baja de ahí; a 0° desaparece.
- Girar a 90° con la altura al 20 % la sube sola a 60 %.
- "Mover" en la izquierda publica `set_pose` con los dos valores; en la derecha, `set_position`.

### 5. Auditoría del contrato MQTT — HECHA (`2f731df`)

> Sin divergencias en topics, payload ni códigos. Lo único: el texto de `rotor_busy` hablaba solo
> de poner el rotor a cero, y ahora también lo devuelve `set_pose`. Reescrito.
>
> El auditor apunta además que el ESP32 falso no simula `rotor_busy` ni `rotation_unsafe`, así que
> esos dos caminos solo se pueden probar contra la parrilla real.

Lanzar `mqtt-contract-auditor` sobre `set_pose` y corregir lo que encuentre.

Commit: solo si hay algo que corregir (`fix:`).
Verificación: el informe del auditor sin divergencias.

### Después — HECHO

`GaztaindiGrill-NextJS/CLAUDE.md`: sección del 3D y de la modal.

---

## Preguntas abiertas

**1. ¿Cuándo contesta `set_pose`?** Propongo lo mismo que `set_rotation`: ok cuando el giro
arranca. Contestar al terminar toda la maniobra (subir, girar, bajar) es más exacto, pero añade
un segundo camino diferido en el guard y hoy la web no espera la respuesta (cierra la modal).

**2. Sentido del giro.** El arrastre y el modelo 3D pueden girar al revés que el encoder: ya
pasaba al vincular el rotor al modelo y no se verificó. Se comprueba en la tarea 3 con la
parrilla real y se corrige con un signo.

**3. Precisión del fantasma.** El firmware solo publica `status/sensor/rotation` cada 5°, así que
el fantasma puede ir hasta 4° por detrás del ángulo real. Lo dejaría así.
