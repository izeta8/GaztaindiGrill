# Estado de programa desincronizado entre ESP32 y cliente

Rama sugerida: `fix/stale-program-state`. Ahora estás en `develop` con trabajo de
`skip-program-step` a medias (task 2 en stage, task 3 pendiente). Conviene commitear eso antes de
sacar la rama.

## El problema

El cliente solo sabe si hay programa por el retenido `grill/{id}/status/program/current`. Dos
huecos dejan ese retenido mintiendo:

1. **Reinicio.** El programa vive en RAM y se pierde, pero nadie republica el topic: el broker
   sigue entregando `isRunning: true` de antes del corte.
2. **Rechazo sin corrección.** Cancel y skip sin programa contestan `no_program_running` por
   `status/result` y hacen `return` sin publicar. El cliente enseña el toast y sigue con el fantasma.

Decidido: un corte de luz **cancela** el programa. No se reanuda (ARCHITECTURE.md §5 sigue igual).

## Un detalle que cambia dónde va el código

En `setup()`, `connect_to_mqtt()` corre **antes** de `new GrillSystem()`. En la primera conexión
`grillSystem` es nulo y el bloque `if (grillSystem)` de la reconexión no hace nada. Publicar solo
"al conectar" no cubriría el arranque.

Por eso van dos llamadas:
- En `GrillSystem::initialize_system()`, justo después de `resubscribe_all()` y **antes** de la
  espera bloqueante del reset. Así el fantasma desaparece nada más arrancar, no tras subir las parrillas.
- En `connect_to_mqtt()`, junto a `resubscribe_all()`, para las reconexiones sin reinicio. Ahí el
  programa sigue en RAM, así que se publica el real y no un `false`.

## Lo que NO cambia

- El contrato MQTT: mismo topic, mismo payload, sin códigos nuevos. **No hace falta auditor.**
- El cliente: `RunningProgramsContext` ya pone la parrilla a `null` al recibir `isRunning: false`.
- Los docs (ARCHITECTURE.md §3 y §5, `docs/cache.md`, `docs/mqtt.md`) los cubre `/docs-sync`.

---

## Tareas

### 1. Publicar el estado de programa al arrancar y al reconectar

- `Grill`: exponer `publish_program_status()`, que delega en `programManager`.
- `GrillSystem`: `publish_all_program_status()`, recorriendo `grills[]` con la misma comprobación
  de nulos que `resubscribe_all()`.
- `GrillSystem::initialize_system()`: llamarla tras `resubscribe_all()`.
- `src/GaztaindiGrill.cpp`, `connect_to_mqtt()`: llamarla dentro de `if (grillSystem)`.

Archivos: `GaztaindiGrill-ESP32/lib/Grill/Grill.h/.cpp`,
`GaztaindiGrill-ESP32/lib/Grill/GrillSystem.h/.cpp`,
`GaztaindiGrill-ESP32/src/GaztaindiGrill.cpp`
Commit: `fix: clear a stale running program when the grill boots or reconnects`
Verificación: `pio run`. En hardware, con `mosquitto_sub -v -t 'grill/#'`:
- Lanzar un programa, reiniciar el ESP32: llega `{"isRunning":false}` en las dos parrillas antes
  de `reset_status: ready`, y el panel de `/control` desaparece.
- Lanzar un programa, desenchufar el cable de red unos segundos: al reconectar se republica el
  programa con el paso actual, y sigue en marcha.

### 2. Republicar el estado real al rechazar con `no_program_running`

- `Grill::handle_mqtt_message()`: en las ramas de `TOPIC_CMD_PROG_CANCEL` y
  `TOPIC_CMD_PROG_SKIP_STEP`, llamar a `programManager->publish_program_status()` antes del
  `reply_error(... ERROR_NO_PROGRAM_RUNNING)`.

Archivos: `GaztaindiGrill-ESP32/lib/Grill/Grill.cpp`
Commit: `fix: resend the real program state when a command finds no program running`
Verificación: `pio run`. En hardware: con el ESP32 sin programa, publicar a mano un fantasma
retenido (`mosquitto_pub -r -t grill/0/status/program/current -m '{"isRunning":true,"name":"x","currentStepIndex":0,"steps":[{"time":60}]}'`),
pulsar "Cancelar" en `/control`: sale el toast **y** el panel desaparece en todas las pestañas.
Repetir con "Saltar Paso".

---

## Preguntas abiertas

**1. ¿Incluir `mode_change_denied`?** Es el caso contrario: el cliente cree que no hay programa y
el ESP32 sí tiene uno. Vive en `GrillSystem::set_system_mode()`, no en `Grill`. Mi propuesta es
dejarlo fuera: con la tarea 1 es muy difícil llegar a ese estado. Si lo quieres, sería una tarea 3.

**2. ¿Orden respecto a `skip-program-step`?** La tarea 2 toca la rama de skip, que ya está
commiteada (`841cb1d`), así que no hay conflicto. Solo hace falta que la task 2 de skip esté
commiteada antes de cambiar de rama.
