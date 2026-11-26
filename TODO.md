# TODO

## 0. Despliegue — en curso (rama `feature/dockerize`, 2026-11-25)

Plan y motivos: `.claude/plans/api-into-nextjs.md`. Resumen: merge a `main` → job `checks` en
GitHub (lint, typecheck, build) → job `deploy` en un runner self-hosted del CT 103 (`git pull`,
build, reinicio del servicio systemd). **Sin Docker ni GHCR.** La fase 2 la escribe Julen para
aprender; Claude revisa y da pistas, no la solución.

Hecho:
- Fase 1 (API dentro de Next.js, FastAPI borrado), 12/10.
- ESP32 por DHCP en `192.168.1.70` y broker MQTT en `192.168.1.102` (la HA), flasheado, 25/11.
- Plan reescrito para CI/CD sin Docker, 25/11.

Falta, en orden:
1. Commit del plan (`.claude/plans/api-into-nextjs.md`).
2. GitHub: confirmar que el ruleset `main protection` está creado (sin borrar ni force push, PR
   obligatorio con 0 aprobaciones) y activar Settings → Actions → General → «Require approval
   for all external contributors».
3. `GaztaindiGrill-NextJS/.nvmrc` con `22`.
4. Tareas 11–16 del plan: job `checks`, runner en el CT 103, servicio systemd, job `deploy`,
   status check en el ruleset, docs (`docs/deploy.md` y `CLAUDE.md` siguen hablando de Docker).
5. `.env` del CT 103: login nuevo `gaztaindi_grill` (en Bitwarden) y `DB_NAME=gaztaindi_grill`;
   corregir también `deploy/.env.example`, que sigue con `DB_NAME=gaztaindi`.
6. Comprobar en los logs del add-on Mosquitto que la parrilla (`.70`) conecta al broker.
7. Sacar el usuario y la contraseña de MQTT de `GrillConfig.h` (repo público) y cambiarlos.
8. HA: desinstalar el add-on `gaztaindigrill_api` y, si nada más lo usa, Apache2.
9. Mergear `feature/dockerize` (lleva también los dos arreglos del ESP32) a `develop` y `main`.

## 1. Temperatura — en orden, ya desbloqueado por el termopar

Cada punto depende del anterior. Todo es solo para la parrilla 0: es la única con termopar.

El termopar mide su propia temperatura, no la del aire ni la de la brasa: es un índice de
radiación, repetible en esta parrilla pero no comparable con un termómetro. Sirve para cocinar
sin tratarlo como grados calibrados.

1. **Leer el termopar en el firmware — HECHO.** `HardwareManager` crea el `Adafruit_MAX31855`
   solo en la parrilla 0, `GrillSensor::get_temperature()` devuelve -1 sin termopar, un fallo se
   avisa una sola vez por MQTT y la lectura usa un único intervalo,
   `TEMPERATURE_UPDATE_INTERVAL`.

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
   Flasheado el 03/10/2026; falta probarlo con fuego en el caserío: está en la sección de arriba
   del `CLAUDE.md` raíz.

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
