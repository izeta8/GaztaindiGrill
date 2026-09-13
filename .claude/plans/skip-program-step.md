# Saltar al siguiente paso durante una ejecución

Rama sugerida: `feat/skip-program-step` (ahora estás en `develop`, árbol limpio).

## Qué cambia

Junto a "Cancelar Programa" aparece un botón "Saltar paso". Al pulsarlo, la parrilla abandona el
paso en curso (espera a medias, subida o bajada a medias) y arranca el siguiente. Todos los
clientes conectados ven el cambio, porque el firmware republica `status/program/current`.

## Por qué sale barato

- **El firmware ya sabe avanzar.** `ProgramManager::advance_to_next_step()` incrementa el índice,
  vuelve a `STEP_STARTING` y publica el estado retenido. Saltar es: parar lo que esté haciendo el
  paso y llamar a eso.
- **Si era el último paso, no hay caso especial.** `update_program()` ya ve
  `programCurrentStep >= stepsCount` y llama a `finish_program()`: termina como completado (verde).
- **El patrón del comando ya existe.** `action/program/cancel` es el modelo exacto: sin payload,
  `no_program_running` si no hay programa, y `reply_ok_if_unanswered()` contesta el ok solo.

## Saltar mientras gira

**Se puede saltar siempre**, también en un paso de inclinación: se paran actuador y rotor donde
estén, se anula el seguro de giro y arranca el paso siguiente (tarea 4).

Las tareas 1-3 rechazaban el salto mientras giraba (`skip_step_denied`). Se quitó porque el
peligro no lo trae el salto: el flujo normal ya lo tiene. Tras `inclinación(90)` la parrilla
queda a 60% inclinada, y un `posición(20)` después baja a las brasas, porque `go_to()` no mira la
inclinación. Pendiente para más adelante: un suelo de seguridad en `MovementManager::go_to()`
con `min_safe_position()` del ángulo actual.

## Lo que NO cambia

- La API y la base de datos: no se tocan.
- El esquema de pasos.
- Los docs los cubre `/docs-sync` al final (`docs/mqtt.md`, `ARCHITECTURE.md`).

---

## Tareas

### 1. Comando `action/program/skip_step` en el firmware y en el contrato — HECHA (`841cb1d`)

> `pio run` OK, `npm run lint` sin avisos nuevos, auditor sin divergencias. El giro se detecta con
> `MovementManager::is_rotating()` (`targetDegrees` activo o guard no `GUARD_IDLE`).

- `GrillConstants.h`: `TOPIC_CMD_PROG_SKIP_STEP = "action/program/skip_step"` y
  `ERROR_SKIP_STEP_DENIED = "skip_step_denied"`.
- `MovementManager`: exponer si hay un giro en marcha (`targetDegrees` activo o
  `guardState != GUARD_IDLE`).
- `ProgramManager::skip_current_step()`: limpia `targetPosition` / `targetTemperature`, para el
  actuador y llama a `advance_to_next_step()`.
- `Grill::handle_mqtt_message()`: rama nueva. Sin programa → `no_program_running`. Girando →
  `skip_step_denied`. Si no, `skip_current_step()`.
- `constants/mqtt.ts`: `SKIP_STEP` bajo `ACTION.PROGRAM`.
- `constants/commandErrors.ts`: `skip_step_denied: 'No se puede saltar el paso mientras la parrilla gira'`.

El contrato entra entero en un commit para que firmware y cliente nunca discrepen.

Archivos: `GaztaindiGrill-ESP32/lib/Grill/GrillConstants.h`,
`GaztaindiGrill-ESP32/lib/Grill/MovementManager.h/.cpp`,
`GaztaindiGrill-ESP32/lib/Grill/ProgramManager.h/.cpp`,
`GaztaindiGrill-ESP32/lib/Grill/Grill.cpp`,
`GaztaindiGrill-NextJS/src/constants/mqtt.ts`,
`GaztaindiGrill-NextJS/src/constants/commandErrors.ts`
Commit: `feat: let a running program skip to its next step`
Verificación: `pio run` + `npm run lint`. En hardware, con `mosquitto_sub -v -t 'grill/#'`:
- `posición → espera(60s) → posición`: saltar en la espera arranca el tercer paso al momento.
- Saltar en el último paso: el programa termina en verde.
- Saltar durante un `flip`: llega `skip_step_denied` y el giro sigue.
- Saltar sin programa: llega `no_program_running`.

### 2. Botón "Saltar paso" en la ejecución — HECHA (`9490966`)

> Sin confirmación (pregunta 2, valor por defecto). El hook lee `useRunningPrograms()` para
> simular el paso siguiente en localhost. `npm run lint` y `npm run build` OK.

- `useGrillCommands.tsx`: `handleSkipStep`, que envía `TOPICS.ACTION.PROGRAM.SKIP_STEP` con `''`.
  En localhost republica el estado con `currentStepIndex + 1`, igual que hace el cancel con
  `isRunning: false`, para que el simulador no se quede atascado.
- `page.tsx`: pasar `[commands0.handleSkipStep, commands1.handleSkipStep]`.
- `ProgramExecutionStatus.tsx`: botón secundario "Saltar paso" encima de "Cancelar Programa",
  desactivado sin conexión o sin programa. El error `skip_step_denied` sale como toast solo, vía
  `commandErrorMessage()`.

Archivos: `GaztaindiGrill-NextJS/src/app/control/hooks/useGrillCommands.tsx`,
`GaztaindiGrill-NextJS/src/app/control/page.tsx`,
`GaztaindiGrill-NextJS/src/app/control/components/ProgramExecutionStatus.tsx`
Commit: `feat: add a skip step button to the running program panel`
Verificación: `npm run lint` + `npm run build`. En navegador: con un programa en marcha, pulsar
"Saltar paso" mueve el resaltado de `ExecutionSteps` al paso siguiente en todas las pestañas abiertas.

### 3. Auditar el contrato MQTT — HECHA

Auditor pasado en las tareas 1 y 4, sin divergencias.

### 4. Permitir saltar también durante la inclinación — HECHA (staged)

- `Grill.cpp`: fuera el rechazo por giro; solo queda `no_program_running`.
- `ProgramManager::skip_current_step()`: limpia también `targetDegrees`, llama a
  `reset_rotation_guard()` y para el rotor.
- Fuera `ERROR_SKIP_STEP_DENIED`, `skip_step_denied` y `MovementManager::is_rotating()`, que ya no
  usa nadie. `MovementManager.h/.cpp` y `commandErrors.ts` quedan idénticos a antes de la feature.

Archivos: `GaztaindiGrill-ESP32/lib/Grill/Grill.cpp`, `GrillConstants.h`, `MovementManager.h/.cpp`,
`ProgramManager.cpp`, `GaztaindiGrill-NextJS/src/constants/commandErrors.ts`
Commit: `feat: let a program skip its step while the grill is tilting`
Verificación: `pio run` + `npm run lint` + auditor. En hardware: saltar mientras sube antes de
girar, mientras gira y mientras vuelve a bajar; en los tres casos el rotor y el actuador se paran
y arranca el paso siguiente.

---

## Decidido

**1. Se puede saltar siempre**, incluida la inclinación (tarea 4). El suelo de seguridad en
`go_to()` queda para más adelante, porque el flujo normal ya tiene el mismo riesgo.

**2. Sin confirmación** antes de saltar.

**3. Por parrilla** (`grill/{id}/...`), igual que el cancel.
