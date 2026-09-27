# Simulador 3D de programas

Rama: `feat/program-simulator` (desde `develop` en `f79c81a`).

## Qué se quiere

Hoy un programa se escribe a ciegas. Debajo de "Pasos del Programa" en `ProgramForm` (crear y
editar) va un simulador: la parrilla izquierda en 3D, con la cámara en esquina del modal de control
(`focusGrill={0}`), que reproduce los pasos animados. Solo cliente web; firmware y API no se tocan.

## Diseño acordado

- **Botonera:** iniciar / pausar, saltar paso, reiniciar. **Velocidad:** x1, x5, x10, x20, aplicada
  al reloj entero. Las esperas no se aceleran aparte: una espera de 10 min se pasa con "saltar paso".
- **Temperatura no se simula.** No hay modelo del fuego. Un paso `temperature` deja la parrilla
  quieta, muestra "Manteniendo T ±5 °C" y se queda ahí hasta "saltar paso". Como en el firmware, la
  línea sigue durante las esperas siguientes hasta que un paso `position` la sustituye.
- **Punto de partida:** la pose real de la parrilla izquierda (`useGrillState(0)`). En relativo sale
  además un input de altura 0-100, por defecto la altura real. La rotación es siempre absoluta.
- **0 % es abajo del todo** (junto a las brasas), 100 % arriba. 0° rejilla plana, 180° dada la vuelta.
- **Si se editan los pasos**, la simulación vuelve al inicio.

## Reglas del firmware que hay que copiar

Fuente: `ProgramManager::start_current_step()`, `resolve_target_position()`,
`MovementManager::go_to()`, `go_to_rotor()`, `min_safe_position_for_turn()`,
`update_rotation_guard()`, `turn_around()`.

| Paso | Qué hace |
|---|---|
| `position` | Relativo: punto de partida + valor. Recorte a 0-100 (**avisar** en la UI cuando recorta). Luego sube al suelo del ángulo actual (`minSafePosition`) si queda por debajo. |
| `rotation` | Altura necesaria = `min_safe_position_for_turn(desde, hasta)`: 60 % si el arco cruza 90° o 270°, si no el mayor de los dos suelos. Si está más baja, sube primero; gira por el lado corto; vuelve a la altura de antes (subida al suelo del ángulo final). |
| `action: flip` | Igual que `rotation` a `(actual + 180) % 360`. |
| `temperature` | Parrilla quieta, estado "Manteniendo T ±5 °C", espera a "saltar paso". |
| `time` solo | Espera `time` s de reloj simulado. |
| sin nada | Se salta. |

Tipo resuelto en ese orden: `action`, `temperature`, `position`, `rotation`, `time`.

Velocidades orientativas (no están en `GrillConstants.h`): **8 %/s** y **30 °/s**, las mismas que
`scripts/fake-grill.mjs`.

**Riesgo:** estas reglas quedan copiadas en tres sitios (firmware, `utils/rotation.ts`,
simulador). El comentario de `rotation.ts` ya pide cambiarlos juntos; se amplía a lo nuevo.

## Tareas

### Componentes 3D: uno por responsabilidad

`GrillModel` **no se toca para el simulador**: ya mezcla MQTT, selección, arrastre, etiquetas y
cámara. El simulador tiene su propio modelo. Lo que sí se comparte:

- **El canvas** (`SharedGrillCanvas`): un segundo `<Canvas>` recompila shaders y entorno, que es
  justo lo que se quitó. Hoy el canvas pinta `GrillModel` a fuego; pasa a pintar lo que le dé el
  hueco activo.
- **El "rig" del .glb** (nombres de nodos, altura por porcentaje, base del rotor, encuadre de
  cámara, material gris): se saca a un módulo para no copiarlo en los dos modelos.

```
SharedGrillCanvas  (un solo WebGL, luz, sombras, cámara, controles)
  └─ contenido del hueco activo
       ├─ GrillScene      → GrillModel      (control: MQTT, selección, arrastre)
       └─ SimulatorScene  → SimulatedGrill  (simulador: solo pinta una pose)
                 ambos usan grillRig.ts
```

### 1. El canvas compartido pinta cualquier contenido ✅
- `GrillSlotProps` deja de llevar las props de `GrillModel`: el hueco trae `cameraPosition`,
  `controls` y `content: ReactNode`. El canvas lo pinta dentro de `<Center top>` con la misma clave
  por hueco. `GrillScene` pasa `<GrillModel …/>` como contenido.
- Archivos: `src/components/three/SharedGrillCanvas.tsx`, `GrillScene.tsx`.
- Commit: `refactor: let the shared 3d canvas show whatever its slot hands it`
- Verificación: `npm run lint`, `npm run typecheck`; en el navegador, `/control` y su modal siguen
  igual (con `npm run fake-grill` moviendo la parrilla).

### 2. Sacar el rig del .glb de `GrillModel` ✅
- `src/components/three/grillRig.ts` (nuevo): `GRILL_NODE_NAMES`, `ROTOR_NODE_NAME`,
  `heightForPosition` / `positionForHeight`, `FOCUS_*`, `focusCamera(camera, grill, index)` y
  `FADED_MATERIAL`. `GrillModel` los importa; su comportamiento no cambia.
- Archivos: `grillRig.ts`, `GrillModel.tsx` (y quien importe `heightForPosition` o
  `GRILL_NODE_NAMES` de ahí).
- Commit: `refactor: move the 3d grill's node and camera helpers out of the model`
- Verificación: igual que la 1.

### 3. Motor de simulación puro ✅
- `src/utils/rotation.ts`: añade `minSafePositionForTurn(from, to)` (copia de
  `min_safe_position_for_turn` con `arc_covers`) y `SAFE_ROTATION_POSITION_PCT = 60`.
- `src/utils/programSimulation.ts` (nuevo, sin React): `planSimulation(steps, referenceType, start)`
  devuelve por paso sus fases (`lift` / `rotate` / `return` / `move` / `wait` / `hold`) con pose
  inicial, final y duración, más avisos (`clamped: { requested, applied }`, `raisedByFloor`).
  `poseAt(step, elapsed)` interpola la pose; el giro por el lado corto (y hacia abajo en empate, como
  `start_rotation_to`). `rotation.ts` ya lleva en su cabecera la lista de lo que copia.
- Commit: `feat: replay program steps with the firmware's movement rules`
- Verificación: `npm run lint`, `npm run typecheck`, y un script desechable con `npx tsx` en el
  scratchpad que imprime el plan de 3 casos: giro 0→200 (va por 359), giro desde el 20 % (sube a
  60, gira, vuelve), relativo desde 80 con +30 (recorta a 100).

### 4. Panel del simulador en el formulario ✅
- `src/components/three/SimulatedGrill.tsx` (nuevo): carga el .glb, apaga en gris todo menos la
  parrilla izquierda, encuadra con `focusCamera(…, 0)` y coloca parrilla y rotor en la pose que
  lee cada frame de `getPose()` (así la animación no re-renderiza React), sin suavizado (el motor ya interpola). Sin MQTT, sin arrastre, sin selección.
- `src/components/three/SimulatorScene.tsx` (nuevo): el hueco del canvas compartido con
  `<SimulatedGrill getPose>` como contenido y `controls={false}`.
- `src/app/programs/hooks/useProgramSimulation.ts`: reloj con `requestAnimationFrame`; estado
  `idle | running | paused | finished`, paso actual, tiempo dentro del paso, velocidad; acciones
  iniciar, pausar, saltar, reiniciar. Vuelve a `idle` si cambian pasos, modo o punto de partida.
- `src/app/programs/components/ProgramSimulator.tsx`: `SimulatorScene` con la pose simulada; encima, "45 % · 90°" en HTML como en
  el modal. Debajo: botonera, velocidad x1/x5/x10/x20, input de partida (solo relativo), la línea de
  temperatura y su propia lista de pasos (`getStepIcon` + `getStepDescription`, solo lectura) con
  el paso actual resaltado, los hechos atenuados y el aviso de recorte junto al paso que recorta.
- `ProgramForm.tsx`: el panel en su tarjeta, bajo "Pasos del Programa", solo con algún paso.
- Commit: `feat: simulate a program on the 3d grill while it is being written`
- Verificación: `npm run lint`, `npm run typecheck`; en el navegador (`/programs/create`), un
  programa con posición, giro, espera y temperatura: se anima, pausa, salta, reinicia, cambia de
  velocidad; en relativo sale el input y el aviso de recorte. Captura como prueba.

### 5. Documentación ✅
- `GaztaindiGrill-NextJS/CLAUDE.md` (sección 3D: el canvas pinta cualquier contenido, `grillRig`,
  `SimulatedGrill` y el simulador), `TODO.md` si lo tenía apuntado.
- Commit: `docs: describe the program simulator and the firmware rules it copies`
- Verificación: releer contra el diff (`/docs-sync` lo cubre).

## Decisiones cerradas

1. **"Saltar paso" a mitad de un movimiento completa el paso al instante** (pose final). El
   firmware para el motor donde esté; aquí interesa ver adónde llega.
2. **En absoluto no hay input de partida:** se parte de la pose real.
3. **El panel del simulador lleva su propia lista de pasos** con el actual resaltado (tarea 4).
   La lista de "Pasos del Programa" (`StepsList`) no se toca.
