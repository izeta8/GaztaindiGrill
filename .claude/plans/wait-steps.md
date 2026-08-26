# Pasos de espera (wait steps)

Rama: ya estás en `feature/wait-steps`, sacada de `feat/rotation-clearance-guard`. Nota menor: la
convención de la casa es `feat/`, no `feature/`. Como ya existe, no la toco.

## Qué cambia

Hoy cada paso lleva un `time` que significa "espera esto **después** de llegar al destino", cosa
que el nombre del campo no dice por ningún lado.

Pasa a haber un tipo de paso nuevo, **espera**, que solo lleva tiempo. Los pasos de movimiento
pierden el tiempo y avanzan en cuanto llegan.

```
antes:  posición(20%, 150s) → posición(50%, 0s)
ahora:  posición(20%) → espera(2min 30s) → posición(50%)
```

Nombre en el esquema: `wait`. **No `stop`**, que ya existe en el contrato MQTT como
`PAYLOAD_STOP` y significa "para el motor". En la UI el texto es "Espera".

## Dos cosas que abaratan esto

**El firmware ya lo soporta casi entero.** El último `else` de `start_current_step()` ya trata un
paso sin posición, sin rotación y sin acción como una espera. Lo que falta es un arreglo (tarea 1)
y que la UI lo sepa crear.

**No hay nada que migrar.** `GET /programs/` devuelve `[]`: la base de datos está vacía. Con
programas guardados esto sería una conversión de datos; ahora es solo cambiar el esquema.

## Lo que NO cambia

- El esquema en la base de datos: `steps_json` es una cadena JSON opaca. La API no se toca.
- El contrato MQTT: `JSON_TIME` sigue llamándose igual, solo se estrecha su significado. No hay
  topics, payloads ni códigos de error nuevos, así que **no hace falta pasar el auditor**.
- `MAX_PROGRAM_STEPS = 50` da de sobra aunque los programas tengan más pasos.

---

## Tareas

### 1. Arrancar el reloj cuando el paso es solo una espera — HECHA (`5841859`)

Bug real que esta feature destapa. En `ProgramManager::start_current_step()`, la rama `else` que
entra en `STEP_WAITING_TIME` **no toca `stepDurationStart`**: solo lo ponen `execute_program()` y
`check_target_reached()`. Un paso de espera mediría desde el instante del paso anterior, así que
saldría corto o vencido de entrada.

Hoy no se nota porque la UI no sabe crear pasos de solo tiempo. En cuanto sepa, sí.

- La espera pasa a tener **rama propia** (`else if (step.time > 0)`) en vez de caer en el `else`,
  y ahí se arranca `stepDurationStart = millis()`.
- El `else` queda para el paso sin nada dentro: se salta con un log en vez de esperar 0 s.

Archivos: `GaztaindiGrill-ESP32/lib/Grill/ProgramManager.cpp`
Commit: `fix: give the wait step its own branch and start its clock`
Verificación: `pio run`. En hardware: un programa de `posición → espera(30s) → posición` tiene que
tardar 30 segundos de verdad entre los dos movimientos.

> Aparte de esto, el firmware no necesita nada más. Un paso de movimiento sin `time` deja
> `s.time = 0` (`v[JSON_TIME] | 0`), y `check_time_elapsed()` lo da por vencido al instante.

### 2. Mostrar los pasos de espera — HECHA (`e01d5be`)

Va antes que la tarea 3 a propósito: si primero se pudieran crear y todavía no se supieran pintar,
saldrían como "Paso desconocido". Al revés no rompe nada, porque aún no existe ninguno.

- `utils/program.tsx`: `getStepIcon()` ya devuelve el reloj por defecto; `getStepDescription()`
  tiene que devolver "Espera: 2:30" en vez de "Paso desconocido", y dejar de pintar la línea
  "Tiempo" en los pasos de temperatura, posición y rotación.
- `programs/list/components/StepsModal.tsx`: mismo cambio en su copia de esas dos funciones.

Archivos: `GaztaindiGrill-NextJS/src/utils/program.tsx`,
`GaztaindiGrill-NextJS/src/app/programs/list/components/StepsModal.tsx`
Commit: `feat: show wait steps in the step lists`
Verificación: `npm run lint` + `npm run build`

### 3. Crear pasos de espera desde el formulario — HECHA (`a23817b`)

- `StepModal.tsx`: `StepType` gana `'wait'`, y el desplegable una opción "Espera". Los bloques de
  temperatura, posición y rotación pierden sus inputs de minutos y segundos; el de espera se queda
  solo con ellos.
- `ProgramForm.tsx`: `handleSaveStep()` solo pone `newStep.time` cuando el tipo es `wait`. La
  validación `if (!stepForm.time) return` deja de aplicar a los pasos de movimiento.
- `handleEditStep()` tiene que reconocer un paso sin movimiento como tipo `wait`.

Archivos: `GaztaindiGrill-NextJS/src/app/programs/components/StepModal.tsx`,
`GaztaindiGrill-NextJS/src/app/programs/components/ProgramForm.tsx`
Commit: `feat: add a wait step type to the program editor`
Verificación: `npm run lint` + `npm run build`. En navegador: crear un programa
`posición(20) → espera(2:30) → posición(50)`, guardarlo y reabrirlo para editar.

### 4. Ajustar el simulador — SIN CAMBIOS NECESARIOS

La premisa del plan era falsa. `mqttSimulators.ts` no fabrica pasos: hace `JSON.parse(program.stepsJson)`
y los reenvía con un `...s`, así que ya publica pasos de espera si el programa los tiene, y la
tarea 2 se encarga de pintarlos.

Comprobado en todo el cliente: `grep -rn "time:\s*[0-9]" src/` no devuelve nada y la página de
debug tampoco fabrica pasos. No hay ni un paso hardcodeado.

> Aparte, y de antes: el payload del simulador no incluye `referenceType`, `description`,
> `creatorName` ni `usageCount`, que sí lee `ExecutionDetails`. Fuera del alcance de esta rama.

### 5. Avisar de dos movimientos seguidos sin espera entre medias — HECHA (`9ebbdbf`)

Sin tiempo en los pasos de movimiento, `posición(20) → posición(50)` encadena al instante: baja al
20 y sube al 50 sin parar. Es correcto, pero es fácil escribirlo sin querer al pasar del modelo
viejo, así que conviene señalarlo.

- Aviso **sutil y no bloqueante**: ni modal, ni error, ni impedir guardar. Una línea discreta bajo
  la lista de pasos, del estilo "los pasos 2 y 3 se encadenan sin pausa".
- Detección en `ProgramForm.tsx` sobre el array de pasos: dos pasos consecutivos que no sean de
  espera.
- Se pinta junto a `StepsList`, no dentro de cada fila, para no ensuciar la lista.

Archivos: `GaztaindiGrill-NextJS/src/app/programs/components/ProgramForm.tsx`
(`StepsList.tsx` no hizo falta: el aviso va debajo de la lista, no dentro de ella)
Commit: `feat: point out program steps that run back to back`
Verificación: `npm run lint` + `npm run build`. En navegador: dos pasos de posición seguidos sacan
el aviso; metiendo una espera entre medias, desaparece.

> Los docs (el esquema de pasos está en el `CLAUDE.md` raíz y en `docs/api-reference.md`) los cubre
> `/docs-sync` al final.

---

## Decidido

**1. El paso de temperatura se queda como está.** Sigue roto (`handle_temperature_stop()`
comentado en `GrillSystem.cpp:133` cuelga el programa para siempre), pero no se toca en esta rama.

**2. El contador de ejecución no entra aquí.** Anotado en `GaztaindiGrill-NextJS/TODO.md`.

**3. Dos movimientos seguidos encadenan sin pausa**, y eso está bien. Lleva un aviso en el
formulario: tarea 5.

---

*Plan cerrado. Se conserva por las alternativas descartadas y su porqué, que no están en el código ni en los docs.*
