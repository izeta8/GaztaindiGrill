# Arquitectura del Firmware - GaztaindiGrill

Este documento describe la arquitectura del software para el microcontrolador ESP32 del proyecto GaztaindiGrill. Su objetivo es servir como guía de mantenimiento y referencia para futuras modificaciones.

## 1. Estructura de Clases y Separación de Responsabilidades

El firmware sigue un diseño orientado a objetos para separar las responsabilidades y facilitar su mantenimiento. Las clases principales son:

-   **`GaztaindiGrill.cpp` (Fichero Principal):**
    -   Es el punto de entrada de la aplicación (`setup()` y `loop()`).
    -   Gestiona las conexiones primarias (WiFi y MQTT).
    -   Actúa como un **despachador principal**: en el `loop()` llama a las actualizaciones de los sistemas principales y en el `callback` de MQTT enruta los mensajes a la clase `Grill` correspondiente.

-   **`GrillSystem`:**
    -   Clase contenedora que gestiona el conjunto de todas las parrillas (`Grill`). En nuestro caso, crea y mantiene las 2 instancias de `Grill`.

-   **`Grill`:**
    -   Representa una única parrilla. Actúa como una **fachada (Facade)** que simplifica la interacción con los subsistemas.
    -   Recibe los comandos MQTT (ej: `action/program/execute`) y los delega al gestor apropiado (ej: `ProgramManager`).

-   **`ProgramManager`:**
    -   **Es el cerebro de la ejecución de programas.** Contiene la máquina de estados (`ProgramState`, `StepState`) que controla el avance de un programa paso a paso.
    -   Interpreta el JSON del programa y lo convierte en una secuencia de acciones.
    -   Mantiene el estado del programa actual **en RAM** (no sobrevive a reinicios en la versión actual).

-   **`MovementManager`:**
    -   Responsable de todo el movimiento físico: actuador lineal (posición) y motor de rotación (inclinación).

-   **`GrillMQTT`:**
    -   Es un "wrapper" o envoltorio que simplifica la comunicación con el broker MQTT. Centraliza la lógica para publicar y suscribirse a topics, parsearlos, etc.
    -   `parse_topic()` es quien antepone el prefijo: `grill/{id}/<accion>` para una parrilla concreta, o `grill/<accion>` cuando el índice es `-1` (instancia de sistema).
    -   Implementa además el protocolo petición/respuesta descrito en §2.

-   **`DualModeCoordinator`:**
    -   Coordina las dos parrillas cuando el sistema está en modo `dual` (frente a `single`), incluyendo la recalibración conjunta que publica `grill/reset_status`.

-   **`HardwareManager`, `GrillSensor`, `StatusLed`:**
    -   Clases de bajo nivel que abstraen la interacción directa con el hardware (sensores, motores, LEDs).

## 2. Protocolo de Comandos: Petición / Respuesta

Los comandos no son "dispara y olvida". Todo lo que llega a un topic `action/...` viene envuelto como `{ "value": <payload>, "requestId": "<uuid>" }`, y el ESP32 contesta en `grill/{id}/status/result` (QoS 1, **sin retain**) con `{ requestId, command, ok, error? }`.

El flujo dentro del firmware:

1.  El despachador (`GaztaindiGrill.cpp`) llama a `GrillMQTT::parse_request()`, que desenvuelve el sobre **una sola vez**. Si el payload no es JSON (un `mosquitto_pub` a pelo, un cliente antiguo), sigue siendo utilizable: se trata como `value` plano y se le asigna el `requestId` centinela `EVERYONE`.
2.  Se pasa la `GrillRequest` **por referencia** al handler. Es un valor por petición y no estado dentro de `GrillMQTT` a propósito: `client.loop()` puede entregar varios mensajes en una misma iteración, y un "id actual" como miembro de la clase acabaría respondiendo al cliente equivocado.
3.  **El éxito es lo que no falló.** Los handlers solo escriben sus rechazos (`reply_error()`); al volver, el despachador llama a `reply_ok_if_unanswered()`, que responde `ok` si nadie contestó.
4.  `defer()` marca la petición como respondida sin responder: es para resultados que se deciden en una iteración posterior del `loop()` (el cambio de modo), que contestarán con `reply_to()`.
5.  Una petición con id `EVERYONE` **no** recibe ok automático: significa que nadie está esperando. Esto es lo que evita que el ESP32 se conteste a sí mismo al releer, al arrancar, sus propios topics retenidos (`current_mode`, `reset_status`).

Los códigos de error (`ERROR_*` en `GrillConstants.h`) son códigos máquina, nunca texto de interfaz: el texto vive en el cliente, para que reescribir un mensaje no obligue a reflashear la parrilla.

## 3. Flujo de Sincronización de Estado (Multi-Usuario)

Este es el flujo clave para asegurar que cualquier cliente que se conecte pueda ver el estado actual de un programa en ejecución.

**Problema:** Un nuevo cliente (Usuario B) se conecta y necesita saber qué programa está ejecutando la parrilla, que fue iniciado por el Usuario A. No puede pedirlo a la API, porque la API podría tener una versión más nueva del programa que la que se está cocinando ahora mismo. La fuente de verdad es la RAM del ESP32.

**Solución: un único topic retenido.**

`ProgramManager::publish_program_status()` publica el estado en `grill/{id}/status/program/current` **con el flag `retain`**, y ese mensaje contiene el programa **entero**, no solo el progreso:

```json
{
  "isRunning": true,
  "name": "Chuletón",
  "programId": 123,
  "currentStepIndex": 1,
  "referenceType": "absolute",
  "steps": [
    { "time": 300, "temperature": 220, "position": 40 },
    { "time": 600, "position": 20, "stepStartUnix": 1755781200 }
  ]
}
```

El broker guarda el último mensaje retenido y se lo entrega automáticamente a cualquier cliente en cuanto se suscribe. **No hace falta ninguna petición de detalles**: el cliente nuevo tiene la información completa nada más conectarse.

Detalles que importan:

-   Los campos vacíos de cada paso se **omiten** del JSON en lugar de enviarse a `null`.
-   `stepStartUnix` se inyecta **solo en el paso actual**: es el timestamp UTC en que arrancó ese paso, y es lo que permite a un cliente recién conectado calcular bien el tiempo restante en lugar de suponer que el paso empezó cuando él llegó.
-   Cuando no hay nada ejecutándose el payload es `{ "isRunning": false }`, también retenido, lo que limpia el estado en todos los clientes.
-   Existe `grill/{id}/action/request/program_status`, que fuerza una republicación. El cliente web **no lo usa**; queda como herramienta de depuración manual.

> Versiones anteriores de este documento describían un esquema de petición/respuesta con `get_running_program_details` y `running_program_details_response`. **Ese esquema ya no existe**, y sus topics tampoco.

## 4. Gestión de Desconexiones (Robustez del Sistema)

Para evitar "estados fantasma" en los clientes (que la UI muestre un programa en ejecución cuando el ESP32 está apagado), se utiliza el mecanismo **Last Will and Testament (LWT)** de MQTT.

-   **Al Conectar:** El ESP32 se registra en el broker con una "última voluntad" sobre el topic **global** `grill/connection` (`TOPIC_LWT`): si se desconecta de forma inesperada, el broker publicará `offline` ahí. Es un único topic para todo el sistema, no uno por parrilla — las dos parrillas viven en el mismo microcontrolador, así que caen juntas.
-   **Al Desconectar:** El broker ejecuta la "voluntad" y notifica a todos los clientes.
-   **En el Cliente:** La aplicación web está suscrita a `grill/connection`. Si recibe `offline`, marca la parrilla como desconectada; si se intenta enviar un comando en ese estado, avisa en vez de fallar en silencio.
-   **Recalibración:** aparte del LWT, `grill/reset_status` (retenido) alterna entre `resetting` y `ready`. Mientras está en `resetting` el firmware rechaza cualquier comando con el código de error `resetting`.

## 5. Nota sobre la Persistencia de Estado (Futuras Mejoras)

**IMPORTANTE:** La versión actual del firmware **NO guarda el estado de ejecución si el ESP32 se reinicia o se corta la alimentación.**

-   **Decisión de Diseño:** Se eliminó la lógica de guardado en la memoria Flash interna para simplificar el código y evitar el desgaste prematuro del chip por escrituras constantes.

-   **Solución Futura (Ideal):** Para implementar una reanudación precisa al segundo, la solución correcta es añadir al circuito un chip de **memoria FRAM (RAM Ferroeléctrica)**.
    -   La FRAM permite escrituras constantes y rápidas sin desgaste y no es volátil.
    -   La arquitectura futura consistiría en guardar el JSON del programa en la Flash una vez, y actualizar el progreso (`paso_actual`, `segundos_transcurridos`) en la FRAM cada segundo.
