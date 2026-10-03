# Editar pasos de un programa en marcha

Rama: `feat/edit-running-program` (desde `develop` en `c652883`).

## Qué se quiere

Con un programa en marcha, poder cambiar sus pasos desde `/control` (p. ej. una espera de 4 min a
5 min porque la chuleta no está). El cambio vale **solo para esa ejecución**: el programa guardado
en la base de datos no se toca.

## ¿Es fácil? ¿Hace falta refactorizar?

- **Firmware: fácil, sin refactor.** El programa en marcha ya vive en RAM (`currentProgram.steps`)
  y `check_time_elapsed()` lee `step.time` en cada vuelta: cambiar la espera del paso actual surte
  efecto al momento. Basta un comando nuevo que reescriba un paso y republique
  `status/program/current`.
- **Base de datos: nada.** La API no está en el bucle en tiempo real; el cambio viaja por MQTT al
  ESP32 y no vuelve a la API.
- **Web: un refactor pequeño.** La conversión paso ⇄ formulario de `StepModal` vive dentro de
  `ProgramForm`; hay que sacarla para reutilizar la misma modal en `/control`.
- **Multiusuario gratis:** `status/program/current` es retenido y ya se republica en cada cambio,
  así que todas las pantallas ven el paso editado.

## Diseño propuesto

- **Comando nuevo** `grill/{id}/action/program/edit_step`, con el envoltorio de siempre:
  `{ value: { index, step: { time? | temperature? | position? | rotation? } }, requestId }`.
  Reemplaza el paso entero en esa posición.
- **Qué se puede editar** (lo decide la web, no el firmware):
  - Pasos **futuros**: su valor, **sin cambiar de tipo** (la modal abre con el tipo bloqueado).
  - El paso **actual**: solo si es una **espera**, y solo su tiempo. Si el tiempo nuevo ya está
    pasado, el paso termina en ese momento.
  - Los pasos ya hechos, o el actual si no es espera, no llevan lápiz.
- **Firmware mínimo:** solo comprueba lo que protege al ESP32: que haya programa
  (`no_program_running`) y que `index` esté dentro del array (`invalid_json`), porque fuera de
  rango escribiría en memoria ajena. **Sin código de error nuevo.** Editar un paso que ya arrancó
  no tiene efecto, así que no hace falta rechazarlo.
- **En la web:** en la lista "Secuencia" de la ejecución, un lápiz en cada paso editable abre la
  misma `StepModal` de crear programas, sin la vista 3D (ver pregunta 4). Al guardar manda
  `edit_step`; un error sale como toast con el texto de `commandErrors.ts`.

## Tareas

### 1. Comando `edit_step` en el firmware y su contrato en la web ✅
- `GrillConstants.h`: `TOPIC_CMD_PROG_EDIT_STEP` y las claves JSON (`index`, `step`).
- `ProgramManager`: `edit_step(request)` comprueba programa e índice, reescribe `currentProgram.steps[index]` y
  llama a `publish_program_status()`. `Grill.cpp` lo despacha como `skip_step`.
- `constants/mqtt.ts` (`EDIT_STEP`).
- Commit: `feat: let a running program's steps be edited without touching the saved program`
- Verificación: `pio run`, `npm run lint`, agente `mqtt-contract-auditor`. La prueba real
  (`mosquitto_pub` con un programa en marcha) va a la lista del caserío.

### 2. `fake-grill` entiende `edit_step` ✅
- `scripts/fake-grill.mjs`: mismas reglas que el firmware, para probar la web en casa.
- Commit: `chore: let the fake grill edit a running program's steps`
- Verificación: `npm run fake-grill` + `npm run fake-program`, y `mosquitto_pub` a `edit_step`
  cambiando la espera: `status/program/current` sale con el tiempo nuevo.

### 3. Sacar la conversión paso ⇄ formulario de `ProgramForm` ✅
- `stepToForm()` y `formToStep()` (con sus mensajes de validación) a
  `app/programs/utils/stepForm.ts`. `StepModal` acepta no tener vista 3D (`previousSteps` y
  `simulationStart` opcionales) y un tipo fijo que no se puede cambiar. Sin cambio visible.
- Commit: `refactor: share the step form conversion outside the program form`
- Verificación: `npm run lint`, `npm run typecheck`; crear y editar pasos en `/programs/create`
  sigue igual.

### 4. Editar pasos desde la ejecución en `/control` ✅
- `useGrillCommands`: `handleEditStep(index, step)` (en localhost, igual que `handleSkipStep`).
- `ExecutionSteps`: lápiz en los pasos editables (futuros, y el actual si es una espera);
  abre `StepModal` con el tipo bloqueado y manda el paso.
- Commit: `feat: edit the steps of a running program from the control page`
- Verificación: `npm run lint`, `npm run typecheck`; con `fake-grill`, cambiar la espera del paso
  en curso y ver la cuenta atrás saltar; editar un paso futuro; intentar uno ya hecho (no sale
  lápiz). Captura.

### 5. Documentación ✅
- `docs/mqtt.md` (topic, error, flujo), `docs/cache.md` (los pasos pueden cambiar a mitad),
  `ARCHITECTURE.md` §3, `CLAUDE.md` de NextJS, y la prueba en "Pendiente de probar en el
  caserío" del `CLAUDE.md` raíz.
- Commit: `docs: describe editing a running program`
- Verificación: `/docs-sync`.

## Decisiones cerradas

1. El paso actual de temperatura no se edita, por ahora.
2. Solo editar: ni añadir, ni borrar, ni reordenar.
3. Sin cambiar el tipo de un paso, y eso lo impide la web: el firmware no lleva error nuevo.
4. Sin vista 3D en la modal durante la ejecución.
5. Sin marcar los pasos editados.
