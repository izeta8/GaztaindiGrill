# Step timer

Contador de tiempo por paso en el panel de ejecución (`/control`). El firmware ya inyecta
`stepStartUnix` (UTC, segundos) en el paso actual de `grill/{id}/status/program/current`
(`ProgramManager.cpp`, `start_current_step()`), y `fake-grill.mjs` también. Ningún componente lo
lee. `ExecutionSteps.tsx` tiene incluso un hueco comentado en la fila del paso actual.

Solo web: no cambia el contrato MQTT ni el firmware, así que no hace falta flashear.

Branch: `feat/step-timer`

## Decisiones

- **Reloj:** se compara `stepStartUnix` con `Date.now()` de la tablet. El ESP32 y la tablet van
  por NTP, así que el desfase es de segundos. `grill/time` no sirve para corregirlo: es retenido y
  solo se publica al sincronizar NTP, así que no dice cuándo se leyó.
- **Sin NTP:** si el ESP32 aún no ha sincronizado, `stepStartUnix` son segundos desde el arranque.
  Si el valor es menor de `1_000_000_000` (2001), o falta, no se muestra nada.
- **Dónde:** a la derecha de la fila del paso actual en `ExecutionSteps`, donde está el hueco.
- **Solo en pasos de espera** (decidido tras la tarea 2): un paso de movimiento acaba al llegar, así
  que su reloj medía el trayecto y parecía el tiempo en esa posición. Ese tiempo es el de la espera
  que le sigue. Los demás pasos no muestran reloj (`feat: show the step timer only on wait steps`).

## Tareas

### 1. Mostrar cuánto lleva el paso actual

- `src/utils/parse.ts` (junto a `formatSeconds`): `formatDuration(seconds)` → `m:ss`, o `h:mm:ss` a partir de una hora.
- `src/app/control/hooks/useSecondsSince.ts` (nuevo): segundos desde un unix, con un intervalo de
  1 s que se limpia al desmontar o cambiar el valor; `null` si falta o no es plausible.
- `src/app/control/components/execution/ExecutionSteps.tsx`: sustituir el hueco comentado por el
  tiempo transcurrido del paso actual (`stepStartUnix` sale de `steps[currentStepIndex]`).
- Commit: `feat: show how long the current program step has been running`
- Verificación: `npm run lint` y `npm run typecheck`. Manual con `npm run fake-grill` +
  `npm run fake-program`: el contador arranca en 0:00 en cada paso y se reinicia al saltar paso.

### 2. Cuenta atrás en los pasos de espera

- `ExecutionSteps.tsx`: si el paso actual es de espera (`time` sin otro tipo), mostrar lo que queda
  (`time - transcurrido`, sin bajar de 0:00) en vez del transcurrido. Los demás pasos siguen
  mostrando el transcurrido.
- Commit: `feat: count down the time left on a program's wait steps`
- Verificación: `npm run lint` y `npm run typecheck`. Manual con el programa demo, que tiene
  esperas de 15 s y 10 s: baja hasta 0:00 y pasa al siguiente paso. Recargar la página a mitad de
  una espera: la cuenta sigue donde iba, no empieza de nuevo.

### 3. Actualizar los TODO

- `GaztaindiGrill-NextJS/TODO.md`: quitar "Contador de tiempo en la ejecución".
- `TODO.md` raíz: marcar el punto 1.2 (mostrar la temperatura) como hecho; ya se ve en `/control`.
- Commit: `docs: drop the step timer and the temperature display from the todo lists`
- Verificación: leer el diff.
