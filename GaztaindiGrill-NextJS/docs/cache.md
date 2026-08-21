# Arquitectura de la Caché en Memoria

La versión anterior de la aplicación utilizaba un sistema complejo de caché con peticiones a la API y lógica de invalidación. Esto ha sido **eliminado y reemplazado** por un mecanismo mucho más simple, robusto y eficiente.

## Principio de Funcionamiento

El objetivo de la caché es tener los **detalles completos de un programa** (nombre, descripción, pasos, etc.) para poder mostrarlos en la interfaz mientras se recibe el estado de progreso (ligero) desde el ESP32.

La nueva caché (`runningProgramsCache`) es un simple **objeto en memoria RAM** (un estado de React en `RunningProgramsContext`) que funciona como un diccionario.

-   **Clave:** El `programId` del programa en ejecución.
-   **Valor:** El objeto completo del programa, tal y como lo envió el ESP32.

## Flujo de Población de la Caché

La caché se popula dinámicamente cuando un cliente necesita la información.

1.  **Llega un mensaje de estado:** La aplicación recibe un mensaje MQTT de `grill/{id}/program_status_response` que dice, por ejemplo, `{ "programId": 123, ... }`.

2.  **Comprobación de la Caché (Cache Check):** La aplicación busca la clave `123` en el objeto `runningProgramsCache`.

3.  **Cache Miss (Fallo de Caché):** Si la clave `123` no existe, significa que este cliente no tiene los detalles del programa. En este caso:
    a. El cliente publica una petición en `grill/{id}/get_running_program_details`.
    b. La aplicación se pone en un estado de `isLoading` para ese programa, mostrando una Carga en la UI pero usando los datos parciales que ya tiene (el ID del programa).

4.  **Respuesta del ESP32:** El ESP32 responde en `grill/{id}/running_program_details_response` con el JSON completo del programa que está ejecutando.

5.  **Escritura en Caché (Cache Write):** La aplicación recibe esta respuesta y **guarda el objeto completo del programa en `runningProgramsCache`** con la clave `123`.

6.  **Cache Hit (Acierto de Caché):** A partir de este momento, cualquier nuevo mensaje de estado para el programa `123` encontrará los detalles en la caché local. La aplicación combinará el estado de progreso del MQTT con los detalles de la caché para mostrar una vista completa, sin necesidad de volver a pedir los datos.

### Invalidación o Limpieza

La caché de un programa se limpia automáticamente cuando este finaliza. Dado que el estado vive en la RAM del navegador, también se limpia si el usuario cierra o refresca la página. El sistema está diseñado para repoblar la caché de forma automática y eficiente cada vez que sea necesario.
