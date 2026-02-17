# Arquitectura de Comunicación y Flujos MQTT

Este documento describe la arquitectura de comunicación entre los tres componentes principales del sistema: la **Parrilla (Hardware)**, el **Cliente Web (Navegador)** y la **API (Backend)**.

## Diagrama de Alto Nivel

```
              +----------------+                            +----------------+
              |                |------- HTTP (GET/POST) ---->|                |
              |  Cliente Web   |<------ HTTP (JSON) --------|      API       |
              |  (Navegador)   |                            |    (Backend)   |
              +-------+--------+                            +-------+--------+
                      |                                             |
                      |                                             | (Paso Inferido)
(Publica Comandos)    |                                             | (Publica Notificaciones)
(Se suscribe a Estados) |                                             |
                      |                                             |
                      v                 MQTT                  ^     v
              +-----------------------------------------------------+
              |                                                     |
              |                   Broker MQTT                       |
              |                                                     |
              +-----------------------------------------------------+
                      ^                                             ^
                      |                                             |
                      |                                             |
(Se suscribe a Comandos) |                                             | (Publica Estados)
 (Publica Estados)    |                                             |
                      |                                             |
              +-------+--------+                                    |
              |                |<------------------------------------+
              |   Parrilla     |
              |    (ESP32)     |
              +----------------+

```

## Protocolos de Comunicación

- **HTTP/S:** Se utiliza para operaciones de datos (CRUD) entre el **Cliente Web** y la **API**. Es un protocolo de petición-respuesta.
- **MQTT:** Se utiliza para la comunicación en tiempo real. Es un protocolo de publicación-suscripción, ideal para notificaciones y comandos instantáneos entre el **Cliente Web** y la **Parrilla**.

---

## Flujos Principales de Conversación

A continuación se detallan las "conversaciones" más importantes del sistema.

### Flujo 1: Ejecución de un Programa (El más complejo)

Este flujo describe qué pasa cuando un usuario pulsa el botón de "Ejecutar" en la web.

1.  **[Cliente Web] -> [Broker MQTT]**: El usuario selecciona una parrilla (ej: "izquierda", índice `0`). El Cliente Web publica un mensaje en el topic `grill/0/execute_program`.
    *   **Payload**: Un JSON con el ID del programa y la lista completa de pasos.
      ```json
      { "programId": 123, "steps": [{ "time": 300, "temperature": 250 }, ...] }
      ```

2.  **[Broker MQTT] -> [Parrilla]**: La Parrilla, que está suscrita a `grill/0/execute_program`, recibe el mensaje y comienza a ejecutar el programa paso a paso.

3.  **[Parrilla] -> [Broker MQTT]**: A medida que el programa avanza (o cambia de paso), la Parrilla publica mensajes de estado en topics como `grill/0/program_status_response` o `grill/0/program_step_changed`.
    *   **Payload**: Un JSON con el estado actual.
      ```json
      { "isRunning": true, "programId": 123, "currentStepIndex": 1, "elapsedTime": 15 }
      ```

4.  **[Broker MQTT] -> [Cliente Web]**: El Cliente Web, que está suscrito a estos topics de estado, recibe los mensajes. La lógica en `RunningProgramsContext` se activa.

5.  **[Cliente Web] <-> [API] (Solo la primera vez)**: Si el Cliente Web no tiene los detalles del programa `123` en su caché local, hace una petición `GET /programs/123` a la **API** para obtener el nombre, descripción, etc. (Ver `docs/cache.md`).

6.  **[Cliente Web]**: La interfaz de usuario se actualiza para mostrar en tiempo real el progreso del programa en ejecución (paso actual, tiempo transcurrido, etc.).

### Flujo 2: Creación/Edición de un Programa (Sincronización de Caché)

Este flujo muestra cómo la API notifica al Cliente Web que un dato ha cambiado.

1.  **[Cliente Web] -> [API]**: El usuario guarda un programa nuevo o modificado. El Cliente Web envía una petición `POST` o `PATCH` a la API con los detalles del programa.

2.  **[API]**: La API guarda los cambios en su base de datos.

3.  **[API] -> [Broker MQTT] (Paso Inferido)**: Tras guardar en la base de datos, la API publica un mensaje de "invalidación de caché" en el topic `programs/updated/<ID>`. Por ejemplo, `programs/updated/123`. El contenido del mensaje no es importante, solo el topic.
    *   *Nota: Este paso es inferido, ya que no tenemos el código de la API, pero es la única forma en que el sistema puede funcionar como está diseñado. El Cliente Web depende de este mensaje para mantener su caché actualizada.*

4.  **[Broker MQTT] -> [Cliente Web]**: El Cliente Web recibe este mensaje. La función `handleCacheInvalidation` en `RunningProgramsContext` se ejecuta.

5.  **[Cliente Web]**: El cliente borra los datos del programa `123` de su caché local. La próxima vez que necesite información sobre este programa, la pedirá de nuevo a la API, asegurándose de obtener la versión más reciente.

### Flujo 3: Control Manual de la Parrilla

Este flujo permite controlar la posición o rotación de la parrilla directamente desde la interfaz.

1.  **[Cliente Web] -> [Broker MQTT]**: El usuario pulsa un botón de control manual (ej: "Subir" en la parrilla `1`). El Cliente Web publica un mensaje en un topic de control, como `grill/1/move`.
    *   **Payload**: Un valor simple, como `up`, `down`, o `stop`.

2.  **[Broker MQTT] -> [Parrilla]**: La Parrilla, suscrita a este topic, recibe el comando y activa el motor correspondiente.

3.  **[Parrilla] -> [Broker MQTT]**: La Parrilla sigue publicando su estado general (posición, temperatura) en los topics de estado (`update_position`, `update_temperature`), permitiendo que la interfaz refleje la nueva posición.

## Resumen de Topics MQTT Clave (Versión Corregida)

| Topic Corregido                          | Dirección             | Propósito                                                            |
| ---------------------------------------- | --------------------- | -------------------------------------------------------------------- |
| `grill/{id}/execute_program`             | `Cliente -> Parrilla` | **Comando**: Inicia la ejecución de un programa completo.            |
| `grill/{id}/program_status_response`     | `Parrilla -> Cliente` | **Estado**: Informa sobre el estado de un programa en ejecución.     |
| `grill/{id}/move`                        | `Cliente -> Parrilla` | **Comando**: Controla manualmente la posición vertical (`up`/`down`). |
| `grill/{id}/update_position`             | `Parrilla -> Cliente` | **Estado**: Informa de un cambio en la posición de la parrilla.      |
| `programs/updated/+`                     | `API -> Cliente`      | **Notificación**: Invalida la caché del cliente para un programa.    |

* `{id}` representa el índice de la parrilla (ej: `0` o `1`).
* `+` es un comodín MQTT que captura cualquier ID de programa.

---

## Tabla Completa de Topics (Versión Corregida)

Esta tabla incluye todos los topics encontrados en `src/constants/mqtt.ts` y su uso contextual.

| Categoría                    | Topic Completo                         | Dirección             | Propósito                                                               |
| :--------------------------- | :------------------------------------- | :-------------------- | :------------------------------------------------------------------------ |
| **Control de Programas**     |                                        |                       |                                                                           |
|                              | `grill/{id}/execute_program`           | `Cliente -> Parrilla` | Envía un programa completo (ID y pasos) para su ejecución.                |
|                              | `grill/{id}/cancel_program`            | `Cliente -> Parrilla` | Envía un comando para detener/cancelar el programa en ejecución.          |
|                              | `grill/{id}/get_program_status`        | `Cliente -> Parrilla` | Solicita a la parrilla que envíe su estado de programa actual.            |
|                              | `grill/{id}/program_status_response`   | `Parrilla -> Cliente` | La parrilla responde con su estado de programa.                           |
|                              | `grill/{id}/program_step_changed`      | `Parrilla -> Cliente` | La parrilla notifica que ha avanzado a un nuevo paso del programa.        |
| **Control Manual**           |                                        |                       |                                                                           |
|                              | `grill/{id}/move`                      | `Cliente -> Parrilla` | Comando para movimiento vertical (`up`, `down`, `stop`).                  |
|                              | `grill/{id}/tilt`                      | `Cliente -> Parrilla` | Comando para rotación (`clockwise`, `counter_clockwise`, `stop`).       |
|                              | `grill/{id}/set_position`              | `Cliente -> Parrilla` | Establece una posición vertical absoluta (0-100).                         |
|                              | `grill/{id}/set_tilt`                  | `Cliente -> Parrilla` | Establece una rotación absoluta (0-360).                                  |
|                              | `grill/{id}/set_mode`                  | `Cliente -> Parrilla` | Establece el modo de la parrilla (ej: `normal`, `dual`).                    |
| **Sensores y Estado**        |                                        |                       |                                                                           |
|                              | `grill/{id}/update_position`           | `Parrilla -> Cliente` | Notifica la nueva posición de la parrilla.                                |
|                              | `grill/{id}/update_temperature`        | `Parrilla -> Cliente` | Notifica la nueva temperatura medida.                                     |
|                              | `grill/{id}/update_tilt`               | `Parrilla -> Cliente` | Notifica la nueva rotación de la parrilla.                                |
| **Sistema y Sincro**         |                                        |                       |                                                                           |
|                              | `grill/{id}/log`                       | `Parrilla -> Cliente` | La parrilla envía mensajes de log para depuración.                        |
|                              | `grill/{id}/restart`                   | `Cliente -> Parrilla` | Envía un comando para reiniciar el microcontrolador de la parrilla.       |
|                              | `programs/updated/+`                   | `API -> Cliente`      | Notifica que un programa ha sido actualizado para invalidar la caché.     |
|                              | `grill/{id}/set_temperature`           | `Cliente -> Parrilla` | `--- TO DO ---` según el código. (Establecería una temperatura objetivo). |

