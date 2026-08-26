# Seguro de rotación (rotation clearance guard)

Rama sugerida: `feat/rotation-clearance-guard` (ahora estamos en `develop`; el cambio de rama es decisión tuya).
Árbol sucio: hay un `GaztaindiGrill-ESP32/prompt.txt` sin trackear. Este plan no lo toca.

## Qué hace

Ante cualquier giro: guardar la posición actual, subir a una altura donde el borde inclinado no llegue a las brasas, girar, y al terminar volver a la posición guardada si el ángulo final lo permite.

Lo que **no** hace, por decisión explícita: no pone un tope inferior a los movimientos de bajada normales. Solo actúa alrededor de los giros.

## Los números

Medidas reales de la instalación:

| Dato | Valor |
|---|---|
| Recorrido del actuador lineal (0% → 100%) | 30 cm |
| Profundidad de la rejilla | 30 cm |
| Eje de giro | central |
| Altura sobre las brasas a 0% | 0 cm (a 0% la rejilla llega a aplastar la brasa) |
| Altura libre por encima | metros, sin límite práctico |

De ahí:

```
1 % de posición                = 0,3 cm
caída del borde bajo a 90°     = 30/2 = 15 cm  →  50 % de posición
margen de seguridad de 3 cm    = 10 % de posición
```

## La función de suelo

```
min_safe_position(θ) = 50 · |sin θ| + CLEARANCE_PCT

  · CLEARANCE_PCT = 10  (3 cm de holgura bajo el borde inclinado)
  · Caso horizontal: si θ está a menos de ROTOR_MARGIN (3°) de 0° o de 180°, devuelve 0.
    No hay borde que caiga, así que puede bajar del todo. Sin esta excepción, volver de un
    volteo dejaría la parrilla clavada al 10% aunque estuviese cocinando al 5%.

SAFE_ROTATION_POSITION_PCT = min_safe_position(90°) = 60
```

Comprobación: al 60% la rejilla está a 18 cm de las brasas. Inclinada 90°, el borde bajo queda a 18 − 15 = **3 cm**.

## Dónde vive y qué cubre

En `MovementManager`, que es la única capa por la que pasa toda rotación. Las alternativas dejarían agujeros: en `ProgramManager` solo cubriría los programas, y en `Grill::handle_mqtt_message` se le escaparía `turn_around()`, que llama a `go_to_rotor()` por dentro sin pasar por MQTT.

Los cuatro caminos que hoy hacen girar la rejilla:

```
Slider "Go-To rotación"      ──► action/movement/set_rotation  ──┐
Paso de rotación de programa ──► start_current_step()         ──┼──► go_to_rotor()  ──► SEGURO
Acción "flip" de programa    ──► turn_around()                ──┘

Botones manuales (mantener)  ──► action/movement/rotation     ──► rotate_clockwise()          ──► SEGURO
                                                                  rotate_counter_clockwise()
```

Tres de los cuatro pasan por `go_to_rotor()` y los cubre la tarea 1. Los botones manuales son el único camino aparte, de ahí la tarea 3. **Programas y control manual quedan cubiertos por igual: no es una feature de programas.**

No toca nada más: `go_up()`, `go_down()`, `go_to()` y `go_to_temp()` se comportan igual que hoy y se puede seguir bajando al 0%. El seguro *usa* el actuador vertical, pero no *limita* lo que se le puede pedir. La parrilla derecha no cambia en absoluto: no tiene rotor y todos los caminos de rotación ya la rechazan con `no_rotor`.

## El ciclo completo

Una máquina de estados en `MovementManager`, que avanza en el loop principal:

```
IDLE ──(giro pedido, posición < 60%)──► LIFTING ──(arriba)──► ROTATING ──(rotor parado)──► RETURNING ──► IDLE
  └──(giro pedido, posición ≥ 60%)───────────────────────────► ROTATING ──► ...
```

1. Guardar la posición actual.
2. Subir a `SAFE_ROTATION_POSITION_PCT` (60%) ← siempre el peor caso: todo giro cruza 90°.
3. Girar.
4. Al parar el rotor, volver a `max(posiciónGuardada, min_safe_position(ánguloFinal))`.

- Volteo de 180°: el ángulo final es horizontal → `min_safe_position = 0` → vuelve entera a donde estaba.
- Giro que acaba a 90°: `min_safe_position = 60` → se queda al 60%. Correcto por construcción.
- Si al pedir el giro ya está por encima del 60%, no hay subida ni posición guardada: gira directamente y se queda donde acabe.

### Traza de un `flip` con la parrilla al 20%

| Loop | Qué pasa |
|---|---|
| 1 | `turn_around()` → `go_to_rotor(180)`. 20 < 60 → guarda **20**, estado `LIFTING`, lanza `go_to(60)`. **El rotor no arranca.** |
| … | El actuador sube. `handle_position_stop()` lo para al llegar a 60. |
| n | El guard ve `LIFTING` sin target de posición → arranca el rotor hacia 180°, estado `ROTATING`. |
| … | `handle_rotor_stop()` para el rotor a 180°. |
| m | El guard ve `ROTATING` sin target de grados → `min_safe_position(180°) = 0` → `go_to(max(20, 0))`, estado `RETURNING`. |
| … | Baja al 20%. `handle_position_stop()` la para. |
| z | Estado `IDLE`. La parrilla está donde estaba, con la carne del otro lado. |

### Por qué el paso 2 exige siempre el 60%

Cualquier giro de un ángulo a otro **cruza los 90° o los 270°** salvo que sea un giro parcial corto, y los botones manuales no tienen ángulo destino en absoluto. Calcular el peor ángulo del barrido solo serviría para giros parciales que no crucen la zona; se puede afinar después sin tocar la estructura, porque la función ya existe.

### Por qué en secuencia y no en paralelo

Subir y girar a la vez haría depender la seguridad de que el actuador lineal (30 cm de recorrido, lento) gane la carrera al rotor llegando a 90°. Si el rotor es más rápido, el seguro falla justo en el instante crítico. Secuencial cuesta unos segundos más y no depende de qué motor es más rápido. Si la espera molesta en uso real, el paralelo se añade después midiendo las dos velocidades.

## Suposición que asume este plan

**Al encender, la rejilla tiene que estar horizontal.** El encoder del rotor es incremental y `DeviceEncoder::begin()` lo pone a 0 en cada arranque, sin homing (`reset_rotor_encoder()` y `check_rotor_reset_status()` existen pero no se llaman/implementan, y el final de carrera `PIN_CS_LIMIT_ROTOR` no se lee nunca). Decisión tomada: se asume por procedimiento, no por código. Queda documentado como comentario en el firmware y en los docs.

Efecto secundario menor: `GrillSensor.cpp:50` devuelve el último valor cuando lee 0, así que justo después de un giro de 360° el ángulo informado será ~355° en vez de 0°. Con la excepción horizontal de `ROTOR_MARGIN` eso deja el suelo en 50·|sin 355°| + 10 ≈ 14% en vez de 0%: la parrilla volvería un poco más alta de lo debido tras un giro completo. Se corrige solo en cuanto el encoder informa otro valor. Si molesta, es otra rama (arreglar el centinela del encoder).

---

## Tareas

### 1. Función de suelo + subida antes de girar — HECHA (`9aa51a3`)

El núcleo. Cubre `set_rotation`, los pasos de rotación de un programa y la acción `flip`, porque los tres pasan por `go_to_rotor()`.

- `CLEARANCE_PCT = 10` y `SAFE_ROTATION_POSITION_PCT = 60` en `GrillConstants.h`, junto a los demás márgenes, con el cálculo de arriba como comentario.
- `MovementManager::min_safe_position(int degrees)` nuevo, con la excepción horizontal usando `ROTOR_MARGIN`.
- `go_to_rotor(deg)`: si `sensor->get_encoder_value() < SAFE_ROTATION_POSITION_PCT`, guardar la posición actual, lanzar `go_to(SAFE_ROTATION_POSITION_PCT)` y dejar el giro **pendiente** en vez de arrancar el rotor.
- Estado nuevo en `MovementManager`, como enum y no como centinelas sueltos:
  ```cpp
  enum RotationGuardState { GUARD_IDLE, GUARD_LIFTING, GUARD_ROTATING, GUARD_RETURNING } guardState = GUARD_IDLE;
  int pendingRotationDegrees;   // a qué ángulo hay que ir cuando termine la subida
  int positionBeforeRotation;   // a dónde volver después (NO_TARGET si no hubo subida)
  ```
- El guard avanza en el loop, dentro de `GrillSystem::handle_rotor_operations()`, que ya se ejecuta solo para la parrilla 0.
- Si la posición ya es >= 60%, pasa directo a `GUARD_ROTATING` y no guarda posición: no hay nada a lo que volver.
- **`has_any_active_target()` tiene que contar el guard.** Entre `LIFTING` y `ROTATING` hay un instante en el que `targetPosition` ya está limpio y `targetDegrees` todavía no está puesto. En ese hueco la función devolvería `false`, y `ProgramManager::check_target_reached()` daría el paso por terminado **en mitad de la maniobra**, antes de que la rejilla haya girado. Una línea:
  ```cpp
  bool MovementManager::has_any_active_target() {
      return (targetTemperature != GrillConstants::NO_TARGET ||
              targetPosition    != GrillConstants::NO_TARGET ||
              targetDegrees     != GrillConstants::NO_TARGET ||
              guardState        != GUARD_IDLE);   // el paso no ha terminado mientras el seguro trabaja
  }
  ```
  Con esto, el tiempo de un paso de rotación empieza a contar cuando acaba la maniobra entera: el tiempo del paso es tiempo de cocción, no de maniobra.
- `emergency_stop()` y `finish_program()` tienen que devolver `guardState` a `GUARD_IDLE` y limpiar las dos variables, o un giro quedaría armado esperando a dispararse.

Archivos: `GrillConstants.h`, `MovementManager.h/.cpp`, `Grill.h/.cpp`, `GrillSystem.cpp`, `ProgramManager.cpp`
Commit: `feat: raise the grill to a safe height before rotating`
Verificación: `pio run`. En hardware: con la parrilla al 20%, mandar `set_rotation 180` y ver que sube al 60% antes de girar.

### 2. Vuelta a la posición previa al terminar el giro — HECHA (`6f8647b`)

- Cuando el guard está en `GUARD_ROTATING` y el rotor ya ha parado, si hay `positionBeforeRotation` guardada: lanzar `go_to(max(positionBeforeRotation, min_safe_position(ánguloFinal)))` y pasar a `GUARD_RETURNING`. Al terminar esa bajada, volver a `GUARD_IDLE`.
- Sin esto, un volteo dentro de un programa deja la parrilla al 60% y los pasos siguientes cocinan a una altura que nadie pidió.
- Los programas no necesitan cambios: con `has_any_active_target()` ya contando el `guardState` (tarea 1), el paso espera a la secuencia entera —subida, giro y vuelta— y solo entonces entra en `STEP_WAITING_TIME`.

Archivos: `MovementManager.h/.cpp`
Commit: `feat: return to the pre-rotation position once the turn is safe`
Verificación: `pio run`. En hardware: al 20%, un volteo de 180° completo tiene que acabar otra vez al 20%.

### 3. Botones manuales de giro — HECHA en `82d1b59`, REVERTIDA en `6e81e73`

> Decisión posterior: el seguro solo interviene en **giros con destino**. Girar a mano es
> alguien mirando la parrilla y parándola; los programas corren solos, y ahí es donde vale.
> Se quitaron `start_rotating`, `run_rotating`, `rotatingDirection`, el enum de sentido y la
> partición `_raw` del rotor. Lo de abajo queda como registro de lo que se deshizo.

`rotate_clockwise()` / `rotate_counter_clockwise()` son los botones de mantener pulsado, y no pasan por `go_to_rotor()`.

- Misma máquina de estados de las tareas 1 y 2: `GUARD_LIFTING` → `GUARD_ROTATING` → `GUARD_RETURNING`.
- Diferencia: aquí no hay ángulo destino, así que lo pendiente es "seguir girando en este sentido", no "ir a X grados". Hace falta guardar el sentido además de (o en vez de) `pendingRotationDegrees`. La vuelta se calcula con el ángulo en el que se haya quedado al soltar.
- Soltar el botón (`stop`) tiene que devolver el guard a `GUARD_IDLE` si aún está en `GUARD_LIFTING`. Si no, sueltas y la parrilla arranca a girar sola en cuanto acaba de subir.

Archivos: `MovementManager.h/.cpp`, `Grill.cpp`
Commit: `feat: apply the rotation clearance guard to manual rotation`
Verificación: `pio run`. En hardware: con la parrilla abajo, mantener el botón de giro; y soltarlo a mitad de la subida para comprobar que no gira después.

### 4. Código de error `rotation_unsafe` (firmware + cliente) — HECHA (`18d45b5`)

Un solo commit porque es un cambio de contrato: partirlo dejaría los dos lados en desacuerdo.

- `ERROR_ROTATION_UNSAFE = "rotation_unsafe"` en `GrillConstants.h`.
- Se devuelve cuando el giro no se puede asegurar: el encoder lineal devuelve `ENCODER_ERROR` al recibir el comando (no se puede saber la posición), o la subida no llega al 60% dentro de `MOVEMENT_TIMEOUT`.
- Texto en `commandErrors.ts`: `'No se puede girar: la parrilla no ha podido subir a una altura segura'`.

Archivos: `GaztaindiGrill-ESP32/lib/Grill/GrillConstants.h`, `GaztaindiGrill-NextJS/src/constants/commandErrors.ts`
Commit: `feat: reject a rotation that cannot be made safe`
Verificación: `pio run` + `npm run lint`

### 5. Avisar en el cliente de que girar sube y baja la parrilla — HECHA en `0b6a94a`, RETIRADA en `fef9ee7`

> El aviso colgaba de los pads manuales, que con la tarea 3 revertida ya no suben nada. Y no
> hay UI para giros con destino: `handleSetRotation` existe en el hook pero no lo llama ningún
> componente. Si algún día se hace el control Go-To de rotación, el aviso vuelve ahí.

Sin cambios de contrato MQTT: el cliente ya conoce la posición, y el 60% es una constante suya.

- Constante `SAFE_ROTATION_POSITION = 60` en el cliente, con un comentario que apunte a `GrillConstants.h` como origen.
- En el control de rotación de la parrilla 0, cuando la posición actual está por debajo del 60%, avisar de que girar subirá la parrilla y la devolverá al acabar.
- Evita que una espera de varios segundos parezca que el comando se ha perdido.

Archivos: `GaztaindiGrill-NextJS/src/constants/mqtt.ts` (o `constants/index.ts`), `app/control/components/ControlColumn.tsx`
Commit: `feat: warn that rotating will raise and lower the grill`
Verificación: `npm run lint` + `npm run build`

### 6. Auditar el contrato MQTT

Ejecutar el agente `mqtt-contract-auditor` por la tarea 4. Sin commit propio salvo que encuentre divergencias.

Verificación: el informe del agente.

> Los docs (`GaztaindiGrill-NextJS/docs/mqtt.md`, `GaztaindiGrill-ESP32/ARCHITECTURE.md`) los cubre `/docs-sync` al final.

---

## Riesgo residual conocido

Este seguro cubre "girar estando baja". No cubre "bajar estando inclinada" por un mando directo: si la rejilla se queda a 90° y se manda bajar al 10%, choca igual. Queda fuera por decisión explícita, porque el uso real es girar 180° y volver a horizontal, y la tarea 2 ya impide que la vuelta automática baje por debajo de lo seguro. Si algún día se usan pasos que mantienen la rejilla inclinada un rato, hay que reabrirlo.


---

## Revisión del 2026-08-25

Dos ajustes sobre lo implementado:

1. **El seguro solo cubre giros con destino** (`go_to_rotor`): paso de rotación de un programa,
   acción `flip` y `set_rotation`. Los botones manuales quedan fuera. Tareas 3 y 5 revertidas.
2. **La subida es la que pide cada giro, no un 60% fijo.** `min_safe_position_for_turn()`
   recorre el arco que se va a girar y coge el peor punto: si cruza 90° o 270° el listón es el
   60%, si no, el mayor de los dos extremos. Un giro a 10° desde el 20% ya no sube nada; un
   volteo de 180° sigue subiendo al 60% y volviendo.

`SAFE_ROTATION_POSITION_PCT` sigue existiendo como el peor caso, ahora solo como techo de esa
función.

---

*Plan cerrado. Se conserva por las alternativas descartadas y su porqué, que no están en el código ni en los docs.*
