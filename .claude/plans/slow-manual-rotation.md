# Rotor más lento con los botones manuales

Rama sugerida: `feat/slow-manual-rotation` (ahora estás en `develop`; el cambio de rama es tuyo).
Árbol sucio: `TODO.md` modificado sin stagear, con la entrada de ajustes configurables. Este plan no lo toca.

## Qué cambia

Los botones de mantener pulsado del tab Control giran el rotor despacio, para poder afinar la inclinación. Todo lo demás —ir a un ángulo concreto y los programas— sigue a máxima velocidad.

## Comprobado contra el código

| Comprobación | Resultado |
|---|---|
| ¿Hay control de velocidad? | Sí, y sin usar: `DeviceRotorDrive.cpp:18` hace `analogWrite(_pinENB, 255)` en el constructor y nunca más |
| ¿Se distinguen los dos caminos? | Sí. Manual entra por `Grill.cpp:205-210`; con destino, por `start_rotation_to()` |
| ¿Comparten métodos? | **Sí**: los dos acaban en `MovementManager::rotate_clockwise()` / `rotate_counter_clockwise()` |
| ¿Hay cambio de contrato MQTT? | **No.** Mismos topics, mismos payloads. No hace falta pasar el auditor |

De la tercera fila sale la decisión de diseño: como los dos caminos comparten los mismos métodos, **la velocidad se pasa como argumento explícito**, no como estado guardado.

El motivo es un fallo real que la alternativa provoca: `stop_rotor()` solo pone IN3/IN4 a LOW, no toca el PWM. Si la velocidad fuera estado, un giro manual la dejaría en lenta y **el siguiente programa heredaría la lenta en silencio**. Con el argumento obligatorio en la firma, olvidarlo no compila.

## Decisiones tomadas

**Dos constantes en `GrillConstants.h`**, junto al resto del contrato: `ROTOR_PWM_MANUAL` y `ROTOR_PWM_FULL` (255).

**El valor de la lenta sale de probar, no de calcular.** Es un motor de escobillas con reductora moviendo un bastidor con peso: por debajo de cierto duty no tiene par para arrancar, zumba y se queda quieto. Quedarse atascado con PWM puesto es como se quema un motor. El plan arranca en **180** y la verificación es bajarlo por escalones con la parrilla cargada hasta notar que le cuesta, y subir uno.

**Esto es la versión compilada.** Hacerlo ajustable desde la web está en `TODO.md` como entrada aparte y no entra aquí: primero hay que saber qué número es el bueno.

---

## Tareas

### 1. Girar despacio con los botones manuales — HECHA

Un solo cambio de comportamiento, aunque toque tres ficheros.

- `DeviceRotorDrive`: método `set_speed(uint8_t duty)` que haga el `analogWrite` sobre `_pinENB`. El constructor deja de fijar 255 a mano y llama a `set_speed(ROTOR_PWM_FULL)`.
- `GrillConstants.h`: `ROTOR_PWM_MANUAL` (180 de salida) y `ROTOR_PWM_FULL` (255).
- `MovementManager::rotate_clockwise()` y `rotate_counter_clockwise()` pasan a recibir la velocidad como parámetro **sin valor por defecto**, y la aplican antes de arrancar.
- `Grill.cpp:205-208` pasa `ROTOR_PWM_MANUAL`; `start_rotation_to()` pasa `ROTOR_PWM_FULL`.

Archivos: `GaztaindiGrill-ESP32/lib/DeviceRotorDrive/DeviceRotorDrive.h`, `DeviceRotorDrive.cpp`, `lib/Grill/GrillConstants.h`, `lib/Grill/MovementManager.h`, `MovementManager.cpp`, `lib/Grill/Grill.cpp`
Commit: `feat: turn the rotor slower from the manual buttons`
Verificación: `pio run`. **En hardware, y con el bastidor cargado**: mantener pulsado en el tab Control y ver que gira despacio; mandar un `set_rotation` justo después y comprobar que ese va rápido — ahí es donde se vería el PWM heredado si algo quedó mal.

### 2. Subir la frecuencia del PWM — solo si pita — NO HACE FALTA

Probado en hardware con el bastidor cargado: a `ROTOR_PWM_MANUAL = 180` no se oye ningún pitido. La frecuencia por defecto de `analogWrite` no es un problema en este montaje.

`analogWrite` en el core de ESP32 usa una frecuencia baja por defecto, y a duty parcial eso suele dar un pitido agudo audible. Si molesta, se configura el canal LEDC del pin a ~20 kHz, por encima del oído.

Archivos: `GaztaindiGrill-ESP32/lib/DeviceRotorDrive/DeviceRotorDrive.cpp`
Commit: `fix: move the rotor pwm above the audible range`
Verificación: `pio run`, y en hardware que el pitido desaparezca sin que el motor pierda par.

---

## Preguntas abiertas

**1. ¿Y el movimiento vertical?** Los botones de subir y bajar tienen el mismo problema conceptual: van a tope y son difíciles de afinar. No lo he metido porque el actuador lineal usa otro driver (`CytronMotorDriver`) y no he mirado si admite PWM. ¿Lo miro y lo añado a este plan, o lo dejamos para otra rama?

**2. ¿Una velocidad o dos?** El plan asume una sola "lenta" para el manual. Otra opción es pulsación corta igual a paso fino y pulsación mantenida acelerando progresivamente, que es como funcionan muchos mandos. Más cómodo de usar y bastante más código.
