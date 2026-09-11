## Features pendientes de planificar

- **Saltar al siguiente paso durante una ejecución**, en vez de esperar a que termine el actual.

- **Recuperación tras reinicio del ESP32.** Persistir en NVS el programa en curso (`programId`,
  paso, `stepStartUnix`) y al arrancar publicar que había uno a medias, para reanudar o abortar.
  Hoy un reinicio con brasa encendida deja la parrilla parada sin avisar a nadie.

- **Historial de cocinados.** Tabla nueva en la API: programa, usuario, inicio/fin y temperaturas
  muestreadas. Base para repetir lo que salió bien y para depurar ejecuciones fallidas.

- **Gráfica de temperatura en tiempo real.** Ahora solo se ve el valor actual. En brasa la curva
  dice más que el número: si sube o baja. Persistente si se hace el historial, volátil si no.

- **Avisos fuera de la app.** Notificación de Home Assistant al móvil cuando la parrilla se
  desconecta (el LWT ya está) o la temperatura se sale de rango, con la tablet apagada.

- **Tiempo restante total del programa.** Agregado del contador por paso. Sumable una vez estén
  los pasos de espera, porque los de movimiento ya no llevan tiempo.

- **Pasos por temperatura.** Hoy un paso fija posición, y un 30% con brasa nueva y con brasa de
  dos horas cocinan distinto: el programa que salió bien no se repite. Fijando temperatura, la
  parrilla busca la altura según cómo esté el fuego. `MovementManager::go_to_temp()` ya está
  escrito; depende del sensor de abajo.

- **Sensor de temperatura rápido.** Termopar tipo K de unión expuesta e hilo fino en lugar de la
  sonda de 50 cm, que tarda unos 10 min en enfriarse — más que un paso entero, así que siempre
  informa del paso anterior. La bolita fina baja a ~30 s.

  Mide su propia temperatura, no la del aire ni la de la brasa: es un índice de radiación,
  repetible en esta parrilla pero no comparable con un termómetro. Sirve para cocinar sin
  tratarlo como grados calibrados. Correcciones lentas, cada 15-30 s; un control rápido oscilaría.

- **Ajustes configurables desde la web.** Cuatro valores que hoy están compilados y que solo se
  aciertan probando con la parrilla cargada, así que cambiarlos obliga a reflashear:

  1. Velocidad del rotor en manual (el PWM lento de `action/movement/rotation`).
  2. Márgenes de "ya he llegado": `POSITION_MARGIN` está en 0 y exige clavar el valor exacto,
     lo que con ruido de encoder puede hacer oscilar al actuador. También `ROTOR_MARGIN` y
     `TEMPERATURE_MARGIN`.
  3. `MOVEMENT_TIMEOUT`, que depende de lo rápido que sea el actuador.
  4. `SENSOR_UPDATE_INTERVAL`, hoy en 1,5 s. Habrá que bajarlo cuando esté el termopar rápido.

  Se guardan en NVS y, si está vacío, se cae a los valores compilados de hoy. Contrato: un
  `grill/config` retenido con los valores actuales y un comando para cambiarlos.

  Fuera a propósito: `CLEARANCE_PCT` y `ROTATION_MAX_DROP_PCT`, porque de ellos depende el guard
  de rotación; y la config de red y del broker, que no puede viajar por el propio broker.
