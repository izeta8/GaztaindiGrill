# Pasos de temperatura en los programas

Rama sugerida: `feat/temperature-steps`. Al final se hizo directamente en `develop`.

**Cerrado.** Las dos preguntas se resolvieron con las propuestas: un paso `rotation`/`flip` no anula
la regulación (se aparta y retoma), y el bloqueo en la web se deja para cuando se haga el de la
rotación. **Falta probarlo con fuego**: ver la sección "Pendiente de probar en el caserío" del
`CLAUDE.md` raíz.

## Qué se quiere

Que un paso `temperature` de un programa lleve la parrilla izquierda a la altura en la que el
termopar marca esa temperatura, y la mantenga ahí mientras el fuego cambia. Es el punto 5 del
`TODO.md`.

El termopar ya está montado a la altura de la rejilla y sube y baja con ella: mide lo que le llega
a la carne, no la brasa. Las temperaturas de los programas se escriben en esa misma escala.

## Diseño acordado

- **Regulador por pasos con margen.** Objetivo T, margen ±5°C. Dentro del margen no se mueve. Por
  debajo baja la parrilla un paso (se acerca a la brasa); por encima la sube. Después de cada
  corrección espera 10 s antes de decidir otra vez.
- **Mantener, no buscar una vez.** La regulación sigue durante los pasos de espera siguientes, hasta
  que la sustituya otro paso de posición o de temperatura, o el programa termine, se cancele o haya
  parada de emergencia.
- **El paso termina al entrar en el margen por primera vez.** Si en 10 min no entra, el programa
  avanza igual.
- **Sin toasts.** Cómo va la regulación se enseña como estado fijo en el panel de ejecución
  ("Manteniendo 180 ±5°C", "Fuego flojo: parrilla al mínimo"...), no como mensajes emergentes.
- **Solo la parrilla 0.** Un programa con pasos de temperatura en la 1 se rechaza con `no_sensor`.

## Constantes (`GrillConstants.h`)

| Constante | Valor | Qué controla |
|---|---|---|
| `TEMPERATURE_BAND` | 5 °C | Margen alrededor del objetivo |
| `TEMPERATURE_STEP_PCT` | 2 % | Cuánto se mueve en cada corrección |
| `TEMPERATURE_SETTLE_MS` | 10 000 | Espera tras una corrección |
| `TEMPERATURE_REACH_TIMEOUT_MS` | 600 000 | Tiempo máximo para entrar en el margen |
| `TEMPERATURE_AVERAGE_SAMPLES` | 2 | Lecturas promediadas (10 s, una cada 5 s) |

**Riesgo con ±5 y 10 s.** El termopar tarda unos 30 s en asentarse del todo, así que a los 10 s el
regulador decide con una lectura que todavía está cambiando por la corrección anterior, y con un
margen de solo 10°C es fácil que la parrilla no pare de corregir. Por eso el paso de movimiento es
pequeño (2 %). Si en la prueba real oscila, el orden de ajuste es: subir `TEMPERATURE_SETTLE_MS`,
bajar `TEMPERATURE_STEP_PCT`, ampliar `TEMPERATURE_BAND`. Todo son constantes.

## Decisiones de diseño

- **El regulador vive en `ProgramManager`**, no en `MovementManager`: solo lo arranca un programa,
  y su estado (objetivo, plazo, última corrección) es estado del programa. Mueve la parrilla con
  `movement->go_to()`, que ya pone el suelo de seguridad con la rejilla inclinada.
- **Se aparta mientras hay otro movimiento.** Con un giro o una subida del seguro en marcha
  (`has_any_active_target()`) no corrige hasta que termine. Un paso `rotation` o `flip` no anula la
  regulación; uno de `position` sí, porque pide una altura explícita.
- **Las lecturas salen de `GrillSensor`**: `update_temperature()` guarda las últimas N válidas y
  expone su media. El regulador usa exactamente lo que se publica.
- **El estado de la regulación viaja en `status/program/current`**, como campo de ejecución igual
  que `stepStartUnix`: `hold: { temperature, status }`, con `status` uno de `reaching`, `holding`,
  `fire_too_weak` (al 0 % y aún por debajo), `fire_too_strong` (al 100 % y aún por encima),
  `not_reached` (vencieron los 10 min) o `sensor_failed` (sin lectura; la parrilla se queda quieta).
  Se republica solo cuando cambia, no en cada corrección. El cliente lo enseña en el panel; no hay
  toasts ni códigos de error nuevos para esto.
- **Se borran `go_to_temp()` y `handle_temperature_stop()`.** Van al revés (demasiado frío →
  `go_up()`), nadie llama al segundo desde el bucle, y el primero deja `targetTemperature` puesto con
  una lectura inválida, que cuelga el programa. `targetTemperature` desaparece con ellos.

## Descartado: decidir con Jev

Se valoró delegar la decisión subir/bajar/quieto en Jev (TypeSafe AI) como microservicio. No encaja:
es un clasificador en la nube para juicios sobre texto o JSON, y aquí la decisión es comparar dos
números (lectura contra objetivo ± margen), justo lo que su propia documentación desaconseja. Añadiría
70–500 ms por decisión, haría que cocinar dependiese de internet y de Home Assistant, y pondría un
motor bajo el control de una salida probabilística. La regla cabe en unas líneas del firmware.

## Lo que NO cambia

- El control manual de temperatura (`handleSetTemperature` en la web sigue en "pendiente").
- Los pasos de posición, giro, `flip` y espera.
- El ESP32 falso: no ejecuta programas. La web se prueba publicando a mano `status/program/current`;
  el regulador, con fuego real.

---

## Tareas

### 1. Regulador de temperatura para los pasos de programa — HECHA (`6753cfb`)

- `GrillConstants.h`: las constantes de arriba.
- `GrillSensor`: buffer de las últimas `TEMPERATURE_AVERAGE_SAMPLES` lecturas válidas, rellenado en
  `update_temperature()`, y `get_average_temperature()` (inválido si no hay lecturas recientes).
- `ProgramManager`: estado de regulación y `update_temperature_hold()` llamado desde
  `update_program()` en cada vuelta.
  - Paso `temperature`: arranca la regulación en un estado nuevo `STEP_REACHING_TEMPERATURE`, que
    termina al entrar en el margen o al vencer el plazo.
  - Paso `position`, fin, cancelación, salto del propio paso de temperatura y parada de emergencia:
    paran la regulación.
  - Sin lectura válida: no mueve.
- `MovementManager`: fuera `go_to_temp()`, `handle_temperature_stop()` y `targetTemperature`;
  `has_any_active_target()` deja de contarla. `Grill` pierde sus envoltorios.
- `ARCHITECTURE.md`: sección nueva sobre la regulación y cómo convive con el seguro de giro.
- En esta tarea las situaciones (fuego flojo, etc.) solo van al log; la tarea 3 las publica.

Archivos: `GaztaindiGrill-ESP32/lib/Grill/GrillConstants.h`, `GrillSensor.h/.cpp`,
`ProgramManager.h/.cpp`, `MovementManager.h/.cpp`, `Grill.h/.cpp`,
`GaztaindiGrill-ESP32/ARCHITECTURE.md`
Commit: `feat: hold a program's temperature by moving the left grill in small steps`
Verificación: `pio run`. En la parrilla real con fuego, y `mosquitto_sub -v -t 'grill/#'`:
- Programa `[{temperature: T}, {time: 600}]` con T un poco por encima de la lectura actual: la
  parrilla baja a pasos del 2 %, espera 10 s entre ellos, y el paso 1 termina al entrar en T±5.
- Durante los 10 min de espera sigue corrigiendo si la lectura sale del margen.
- Saltar el paso de espera o cancelar para la regulación. Un paso de posición después también.
- Con la rejilla inclinada no baja del suelo seguro.

### 2. Rechazar pasos de temperatura en la parrilla sin termopar — HECHA (`3546448`)

`execute_program()` en la parrilla 1 recorre los pasos antes de arrancar y, si alguno es de
temperatura, contesta `no_sensor` sin ejecutar nada. Es respuesta al que pulsó "Ejecutar", así que
sí sale como toast, una vez.

Archivos: `GaztaindiGrill-ESP32/lib/Grill/GrillConstants.h`, `ProgramManager.cpp`,
`GaztaindiGrill-NextJS/src/constants/commandErrors.ts`, `GaztaindiGrill-NextJS/docs/mqtt.md`
Commit: `feat: reject temperature steps on the grill without a thermocouple`
Verificación: `pio run`, `npm run lint`. En la parrilla real: ejecutar en la derecha un programa
con un paso de temperatura → toast `no_sensor` y no se mueve nada. En la izquierda arranca normal.

### 3. Enseñar en el panel qué temperatura se mantiene y cómo va — HECHA (`25e3c5f`)

- Firmware: `publish_program_status()` añade `hold: { temperature, status }` mientras la regulación
  está activa, y republica cuando cambia el estado.
- Web: `RunningProgram` gana `hold?`, y la vista de ejecución enseña una línea fija según el estado:
  "Buscando 180°C", "Manteniendo 180 ±5°C", "Fuego flojo: parrilla al mínimo", "Fuego demasiado
  fuerte: parrilla al máximo", "No se alcanzó 180°C", "Termopar sin lectura".
- `docs/mqtt.md`, `docs/cache.md`: el campo nuevo.

Archivos: `GaztaindiGrill-ESP32/lib/Grill/ProgramManager.cpp`,
`GaztaindiGrill-NextJS/src/types/program.ts`,
`GaztaindiGrill-NextJS/src/app/control/components/execution/ExecutionDetails.tsx`,
`GaztaindiGrill-NextJS/docs/mqtt.md`, `GaztaindiGrill-NextJS/docs/cache.md`
Commit: `feat: show which temperature a program holds and how it is going`
Verificación: `pio run`, `npm run lint`, `npm run typecheck`. En la web, con el ESP32 falso y un
`status/program/current` retenido publicado a mano con cada `hold.status`: sale la línea que toca,
sin toasts. En la parrilla real, aparece al empezar el paso y sigue en la espera siguiente.

### 4. Auditoría del contrato MQTT — HECHA (sin cambios)

> Sin divergencias en `no_sensor` ni en el campo `hold`, y no quedan restos del control viejo
> (`go_to_temp`, `handle_temperature_stop`, `targetTemperature`, `TEMPERATURE_MARGIN`). El auditor
> sí encontró el `TODO.md` raíz desfasado, corregido junto con la nota del caserío.

`mqtt-contract-auditor` sobre `no_sensor` y el campo `hold`.

Commit: solo si hay algo que corregir (`fix:`).
Verificación: informe sin divergencias.

### Después — HECHO

- `TODO.md`: punto 5 marcado como hecho pendiente de fuego; referencias muertas corregidas.
- `ARCHITECTURE.md` §8, `docs/mqtt.md` y `docs/cache.md` se actualizaron dentro de sus tareas.

---

## Preguntas abiertas

**1. ¿Un paso `rotation`/`flip` anula la regulación?** Propongo que no: se aparta mientras gira y
retoma después. La alternativa es que cualquier paso de movimiento la anule.

**2. ¿Bloquear en la web?** La web podría no ofrecer "Ejecutar en la derecha" si el programa tiene
pasos de temperatura, igual que el TODO de NextJS pide para la rotación. Propongo dejarlo solo en
firmware (`no_sensor`) en este plan y hacerlo junto con lo de la rotación.
