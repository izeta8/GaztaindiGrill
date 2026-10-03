# Avisos de seguridad con el programa en marcha

Rama: `feat/running-program-warnings` (desde `feat/edit-running-program` en `efedd0f`, sin mergear
aún; al mergear esta entran las dos).

## Qué se quiere

Que la web avise de un paso que no va a hacer lo escrito (la inclinación no deja bajar, el relativo
se sale de 0-100, el giro necesita subir) también **al editar un paso en marcha** y **al ejecutar
un programa**, no solo al crearlo. Caso real: rejilla a 93° y un programa `[20, 50, espera, 70]`;
los dos primeros pasos "se saltaron" porque el suelo del 60 % coincidía con la altura en la que ya
estaba, y nada lo avisó.

## Diseño

- **Una sola fuente:** `planSimulation()` + `stepNotice()`, lo mismo que el simulador del
  formulario. Solo cambia desde dónde se simula.
- **El simulador aprende dos cosas:** si la parrilla tiene rotor (la derecha no: el firmware ignora
  giros y `flip`, y sin inclinación no hay suelo) y el ancla de un programa relativo, que en marcha
  ya no es la altura actual sino la de cuando empezó.
- **El firmware publica esa ancla** (`positionAnchor`) en `status/program/current` para los
  programas relativos. Es el único cambio de firmware: una línea en `publish_program_status()`.
- **Los avisos viven en `/control`:** en la secuencia de la ejecución, cada paso que falta lleva
  escrito su aviso (ámbar) o su info (gris), igual que la lista del simulador. Se simula desde la
  pose real de esa parrilla, a partir del paso en curso. Si entre medias hay un paso de
  temperatura (o hay una regulación activa), la altura depende del fuego: el aviso sale igual, con
  "(aproximado)".
- **Al editar en marcha:** la modal del paso muestra el aviso del valor que se está escribiendo,
  con la misma simulación.
- **Al ejecutar:** `SelectGrillModal` no lista avisos. Si alguno de los pasos tiene un aviso ámbar
  desde la pose real de esa parrilla, bajo ella sale una sola línea: hay pasos que no harán lo
  escrito y se ven en Control, en la ejecución del programa. No bloquea.
- **Modo dual:** los dos actuadores se mueven como uno y el giro es el rotor de la izquierda, así
  que se simula como la izquierda (`hasRotor: true`), elija la parrilla que elija.

## Tareas

### 1. El firmware publica el ancla de los programas relativos — hecho
- `GrillConstants.h`: `JSON_POSITION_ANCHOR = "positionAnchor"`.
- `ProgramManager::publish_program_status()`: lo añade si el programa es relativo.
- `scripts/fake-grill.mjs`: lo mismo, con su `g.anchor`.
- `types/program.ts`: `RunningProgram.positionAnchor?: number`.
- Commit: `feat: publish where a relative program is anchored`
- Verificación: `pio run`, `npm run typecheck`, `npm run lint`; con `fake-grill` y un programa
  relativo, `mosquitto_sub` muestra `positionAnchor` en `status/program/current`. Agente
  `mqtt-contract-auditor` al final de la tarea.

### 2. El simulador sabe de rotor y de ancla — hecho
- `planSimulation(steps, referenceType, start, options?)` con `{ hasRotor?: boolean; anchor?: number }`.
  Sin rotor, `rotation` y `flip` no hacen nada y no hay suelo por inclinación. Sin `anchor`, sigue
  siendo `start.position` (el formulario no cambia).
- Commit: `feat: let the simulator run a program on either grill and from its real anchor`
- Verificación: `npm run typecheck`, `npm run lint`; script desechable con `npx tsx`: giro en la
  derecha (no hace nada), relativo con ancla 30 desde 80 (el +20 va a 50).

### 3. Avisos en la secuencia de la ejecución — hecho
- Un hook (`useRunningStepNotices`) simula `[paso actual, ...siguientes]` desde la pose de esa
  parrilla (`useGrillState`), con `hasRotor` y `anchor`, y devuelve `stepNotice()` por índice. La
  pose se toma al cambiar de paso o de pasos, no en cada lectura, para que el aviso del paso en
  curso no cambie mientras se mueve. "(aproximado)" en los pasos detrás de uno de temperatura, o
  en todos si hay `hold` activo.
- `ExecutionSteps`: bajo cada paso actual o futuro, su aviso (ámbar) o info (gris), como en la
  lista del simulador. Los pasos hechos, nada.
- Commit: `feat: show which running steps will not do what they say`
- Verificación: `npm run typecheck`, `npm run lint`; con `fake-grill`, la rejilla a 90° y
  `[20, 50, espera, 70]` en la izquierda: los pasos 1 y 2 en ámbar; el mismo en la derecha, nada.
  Captura.

### 4. Aviso al editar un paso en marcha — hecho
- `ProgramExecutionStatus`: al abrir y al cambiar el valor, la misma simulación con el paso editado
  en su sitio, y `stepNotice()` de ese paso.
- `StepModal`: prop `notice` (texto + si es aviso), pintado como en `StepPreview`.
- Commit: `feat: warn about a step edited mid-run the way the program form does`
- Verificación: `npm run typecheck`, `npm run lint`; con `fake-grill`: rejilla a 90° y editar un
  paso futuro de posición al 20 % → "no puede bajar de 60%". Captura.

### 5. Indicación al elegir parrilla para ejecutar — hecho
- `SelectGrillModal`: por parrilla, simula el programa entero desde su pose real. Si sale algún
  aviso ámbar, una línea bajo esa parrilla: "Hay pasos que no harán lo escrito. Míralos en
  Control, en la ejecución del programa." Sin lista de pasos. Sin avisos, igual que hoy. En dual,
  las dos se simulan como la izquierda.
- Commit: `feat: tell before running that some steps will not run as written`
- Verificación: `npm run typecheck`, `npm run lint`; con `fake-grill`, la rejilla a 90° y
  `[20, 50, espera, 70]`: la línea sale bajo "Izquierda" y no bajo "Derecha".

### 6. Documentación — hecho
- `docs/mqtt.md` y `docs/cache.md` (`positionAnchor`), `ARCHITECTURE.md` §3, `CLAUDE.md` de
  NextJS (avisos en la ejecución, al editar y al ejecutar, `hasRotor`/`anchor`), y la prueba en
  "Pendiente de probar en el caserío".
- Commit: `docs: describe the safety warnings for running programs`
- Verificación: `/docs-sync`.

## Límites conocidos (no se arreglan aquí)

- Tras un paso de temperatura, o con una regulación activa, la altura es la del fuego: el aviso es
  aproximado y lo dice.
- Los pasos que faltan se recalculan con cada lectura, así que siguen los movimientos a mano. El
  paso en curso guarda el aviso de cuando empezó, como el firmware, que fija el suelo al empezar.
- Si el paso en curso es un giro a medias, se vuelve a simular desde la pose de ese momento, así
  que la altura de vuelta puede diferir un poco de la real.
