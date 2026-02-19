# Arquitectura de Comunicación y Flujos MQTT

Este documento describe la arquitectura de comunicación en tiempo real entre la **Parrilla (Hardware)** y el **Cliente Web (Navegador)**. La comunicación con la **API (Backend)** se limita a peticiones HTTP para la gestión de datos (CRUD), sin participar en los flujos de estado en tiempo real.

## Diagrama de Alto Nivel

```
              +----------------+                            +----------------+
              |                |------- HTTP (GET/POST) ---->|                |
              |  Cliente Web   |<------ HTTP (JSON) --------|      API       |
              |  (Navegador)   |                            |    (Backend)   |
              +-------+--------+                            +----------------+
                      |
                      |
(Publica Comandos)    |
(Se suscribe a Estados) |
                      |
                      v                 MQTT
              +-----------------------------------------------------+
              |                                                     |
              |                   Broker MQTT                       |
              |                                                     |
              +-----------------------------------------------------+
                      ^
                      |
                      |
(Se suscribe a Comandos) |
 (Publica Estados)    |
                      |
              +-------+--------+
              |                |
              |   Parrilla     |
              |    (ESP32)     |
              +----------------+
```

## Protocolos de Comunicación

- **HTTP/S:** Se utiliza para operaciones de datos (CRUD) entre el **Cliente Web** y la **API**.
- **MQTT:** Se utiliza para toda la comunicación en tiempo real (comandos y estado) exclusivamente entre el **Cliente Web** y la **Parrilla**.

---

## Flujos Principales de Conversación

A continuación se detallan las "conversaciones" más importantes del sistema.

### Flujo 1: Ejecución de un Programa

Este flujo describe qué pasa cuando un usuario pulsa el botón de "Ejecutar".

1.  **[Cliente Web] -> [Broker MQTT]**: El usuario A publica el programa completo en el topic `grill/0/execute_program`.
    *   **Payload**: Un JSON con el `programId` y la lista completa de `steps`.

2.  **[Broker MQTT] -> [Parrilla]**: La Parrilla, suscrita al topic, recibe el programa, lo guarda en su memoria RAM y comienza la ejecución.

3.  **[Parrilla] -> [Broker MQTT]**: A medida que el programa avanza, la Parrilla publica mensajes de estado **ligeros** en `grill/0/program_status_response`.
    *   **Payload**: Un JSON con el estado de progreso: `{ "isRunning": true, "programId": 123, "currentStepIndex": 1, ... }`.

4.  **[Broker MQTT] -> [Cliente Web]**: El Cliente A (y cualquier otro cliente suscrito) recibe el mensaje de estado y actualiza su interfaz.

### Flujo 2: Sincronización de un Nuevo Cliente

Este es el flujo clave que permite la experiencia multi-usuario.

1.  **[Parrilla] -> [Broker MQTT]**: La parrilla está ejecutando un programa y enviando su estado ligero (ver Flujo 1, paso 3).

2.  **[Cliente Web] (Nuevo Cliente)**: Un nuevo usuario B abre la aplicación. Se suscribe a los topics y recibe el mensaje de estado ligero. Su aplicación se da cuenta de que no tiene los detalles completos del programa `123`.

3.  **[Cliente Web] -> [Broker MQTT]**: Para obtener los detalles, el cliente B publica una petición de un solo uso:
    *   **Topic**: `grill/0/get_running_program_details`
    *   **Payload**: `{}` (vacío)

4.  **[Broker MQTT] -> [Parrilla]**: La Parrilla recibe esta petición.

5.  **[Parrilla] -> [Broker MQTT]**: La Parrilla responde publicando el JSON completo del programa que tiene en su memoria RAM en un topic de respuesta:
    *   **Topic**: `grill/0/running_program_details_response`
    *   **Payload**: `{ "programId": 123, "name": "Chuletón v1", "steps": [...] }`

6.  **[Broker MQTT] -> [Cliente Web]**: El Cliente B recibe los detalles completos, los guarda en su caché local y renderiza la interfaz completa. A partir de ahora, le bastan los mensajes de estado ligeros para actualizarse.

### Flujo 3: Control Manual de la Parrilla

Este flujo no cambia. Permite controlar la posición o rotación de la parrilla directamente desde la interfaz, publicando comandos en topics como `grill/{id}/move`.

## Resumen de Topics MQTT Clave

| Topic Corregido                          | Dirección             | Propósito                                                            |
| ---------------------------------------- | --------------------- | -------------------------------------------------------------------- |
| `grill/{id}/execute_program`             | `Cliente -> Parrilla` | **Comando**: Inicia la ejecución de un programa completo.            |
| `grill/{id}/program_status_response`     | `Parrilla -> Cliente` | **Estado**: Informa (frecuentemente) sobre el progreso de un programa. |
| `grill/{id}/get_running_program_details` | `Cliente -> Parrilla` | **Petición**: Un cliente pide los detalles del programa en curso.     |
| `grill/{id}/running_program_details_response`| `Parrilla -> Cliente` | **Respuesta**: La parrilla envía los detalles completos del programa.   |
| `grill/{id}/move`                        | `Cliente -> Parrilla` | **Comando**: Controla manualmente la posición vertical.              |
| `grill/{id}/status`                      | `Parrilla -> Cliente` | **Estado de Conexión**: Publica `online` o `offline` (vía LWT).      |

* `{id}` representa el índice de la parrilla (ej: `0` o `1`).

---

## Tabla Completa de Topics

| Categoría                    | Topic Completo                         | Dirección             | Propósito                                                               |
| :--------------------------- | :------------------------------------- | :-------------------- | :------------------------------------------------------------------------ |
| **Control de Programas**     |                                        |                       |                                                                           |
|                              | `grill/{id}/execute_program`           | `Cliente -> Parrilla` | Envía un programa completo (ID y pasos) para su ejecución.                |
|                              | `grill/{id}/cancel_program`            | `Cliente -> Parrilla` | Envía un comando para detener/cancelar el programa en ejecución.          |
|                              | `grill/{id}/get_program_status`        | `Cliente -> Parrilla` | Solicita a la parrilla que envíe su estado de programa actual.            |
|                              | `grill/{id}/program_status_response`   | `Parrilla -> Cliente` | La parrilla responde con su estado de progreso (ligero).                  |
|                              | `grill/{id}/program_step_changed`      | `Parrilla -> Cliente` | La parrilla notifica que ha avanzado a un nuevo paso del programa.        |
| **Control Manual**           |                                        |                       |                                                                           |
|                              | `grill/{id}/move`                      | `Cliente -> Parrilla` | Comando para movimiento vertical (`up`, `down`, `stop`).                  |
|                              | `grill/{id}/tilt`                      | `Cliente -> Parrilla` | Comando para rotación (`clockwise`, `counter_clockwise`, `stop`).       |
| **Sensores y Estado**        |                                        |                       |                                                                           |
|                              | `grill/{id}/update_position`           | `Parrilla -> Cliente` | Notifica la nueva posición de la parrilla.                                |
|                              | `grill/{id}/update_temperature`        | `Parrilla -> Cliente` | Notifica la nueva temperatura medida.                                     |
|                              | `grill/{id}/update_tilt`               | `Parrilla -> Cliente` | Notifica la nueva rotación de la parrilla.                                |
| **Sistema y Sincro**         |                                        |                       |                                                                           |
|                              | `grill/{id}/status`                    | `Parrilla -> Cliente` | Notifica estado de conexión `online`/`offline` (LWT).                     |
|                              | `grill/{id}/get_running_program_details`| `Cliente -> Parrilla` | Petición para obtener los detalles del programa en ejecución.             |
|                              | `grill/{id}/running_program_details_response`| `Parrilla -> Cliente`| Respuesta con los detalles completos del programa en ejecución.          |
|                              | `grill/{id}/log`                       | `Parrilla -> Cliente` | La parrilla envía mensajes de log para depuración.                        |
|                              | `grill/{id}/restart`                   | `Cliente -> Parrilla` | Envía un comando para reiniciar el microcontrolador de la parrilla.       |

