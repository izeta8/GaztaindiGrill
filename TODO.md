# TODO

## 1. Temperatura — en orden, ya desbloqueado por el termopar

Cada punto depende del anterior. Todo es solo para la parrilla 0: es la única con termopar.

El termopar mide su propia temperatura, no la del aire ni la de la brasa: es un índice de
radiación, repetible en esta parrilla pero no comparable con un termómetro. Sirve para cocinar
sin tratarlo como grados calibrados.

1. **Leer el termopar en el firmware.** El código existe pero está comentado:
   - `HardwareManager::setup_devices()`: la creación del `Adafruit_MAX31855` (CS en el pin 14).
   - `GrillSystem::handle_temperature_updates()`: la lectura periódica y la publicación en
     `grill/0/status/sensor/temperature` (retenido).

   Al activarlo hay que arreglar tres cosas:
   - `handle_temperature_stop()` lee por SPI en *cada* vuelta del `loop`, y si el termopar falla
     manda "Error reading temperature!" por MQTT en cada vuelta. Leer una vez por intervalo y
     guardar el último valor.
   - `GrillSensor::get_temperature()` usa `hardware->thermocouple` sin comprobar que exista; en la
     parrilla 1 es `nullptr`.
   - Hay dos intervalos para lo mismo: `intervalTemp` en `GrillSystem.h` y
     `SENSOR_UPDATE_INTERVAL` en `GrillConstants.h`, que no usa nadie. Dejar uno.

   Verificación: con el termopar suelto, el valor no debe publicarse ni colgar nada.

2. **Mostrar la temperatura en la web — HECHO.** Se ve sobre la parrilla izquierda en el
   modelo 3D de `/control`.

3. **Caracterizar el sensor con la parrilla encendida.** Sin código, pero sin estos datos los
   pasos siguientes se ajustan a ciegas:
   - Cuánto tarda en estabilizarse tras cambiar de altura (se espera ~30 s).
   - Cuánto ruido tiene la lectura en reposo.
   - Qué valores da a varias alturas, con brasa nueva y con brasa vieja.

   De aquí salen los valores de las constantes `TEMPERATURE_*` de `GrillConstants.h` y el
   intervalo de lectura.

4. **Gráfica de temperatura en tiempo real.** En brasa la curva dice más que el número: si sube o
   baja. Volátil, en el cliente, con lo que llega por MQTT desde que se abre la página. También
   ayuda a hacer el punto 3.

5. **Pasos por temperatura — HECHO, sin probar con fuego.** Un paso `temperature` lleva la
   parrilla a esa lectura y la mantiene mientras la brasa se apaga, a pasos del 2 % con 10 s de
   espera entre correcciones. Ver `ARCHITECTURE.md` §8 y `.claude/plans/temperature-steps.md`.
   Falta flashear y probarlo en el caserío: está en la sección de arriba del `CLAUDE.md` raíz.

   Queda pendiente el mismo control como **comando manual**: `handleSetTemperature` en
   `useGrillCommands.tsx` sigue mostrando "pendiente de implementación".

## 2. Temperatura — después, dependen de lo anterior

- **Avisos fuera de la app.** Notificación de Home Assistant al móvil cuando la temperatura se
  sale de rango o la parrilla se desconecta (el LWT ya está), con la tablet apagada.

- **Historial de cocinados.** Tabla nueva en la API: programa, usuario, inicio/fin y temperaturas
  muestreadas. Base para repetir lo que salió bien y para depurar ejecuciones fallidas. Con esto
  la gráfica del punto 4 puede pasar a ser persistente.

## 3. Resto

- **Tiempo restante total del programa.** Agregado del contador por paso. Sumable una vez estén
  los pasos de espera, porque los de movimiento ya no llevan tiempo. Con pasos por temperatura
  el total deja de ser exacto: solo cuentan los pasos de espera.

- **Recuperación tras reinicio del ESP32.** Persistir en NVS el programa en curso (`programId`,
  paso, `stepStartUnix`) y al arrancar publicar que había uno a medias, para reanudar o abortar.
  Hoy un reinicio cancela el programa: la UI ya lo quita (el firmware publica `isRunning: false`
  al arrancar), pero la parrilla se queda parada sin avisar a nadie de que se cortó.

- **Ajustes configurables desde la web.** Mejor después del punto 1.3, cuando se sepa qué
  valores tienen sentido. Cuatro valores que hoy están compilados y que solo se aciertan probando
  con la parrilla cargada, así que cambiarlos obliga a reflashear:

  1. Velocidad del rotor en manual (el PWM lento de `action/movement/rotation`).
  2. Márgenes de "ya he llegado": `POSITION_MARGIN` está en 0 y exige clavar el valor exacto,
     lo que con ruido de encoder puede hacer oscilar al actuador. También `ROTOR_MARGIN` y las
     `TEMPERATURE_*` del regulador (`BAND`, `STEP_PCT`, `SETTLE_MS`).
  3. `MOVEMENT_TIMEOUT`, que depende de lo rápido que sea el actuador.
  4. El intervalo de lectura de sensores, hoy en 1,5 s.

  Se guardan en NVS y, si está vacío, se cae a los valores compilados de hoy. Contrato: un
  `grill/config` retenido con los valores actuales y un comando para cambiarlos.

  Fuera a propósito: `CLEARANCE_PCT` y `ROTATION_MAX_DROP_PCT`, porque de ellos depende el guard
  de rotación; y la config de red y del broker, que no puede viajar por el propio broker.
