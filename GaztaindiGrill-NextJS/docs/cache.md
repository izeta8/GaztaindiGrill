# Funcionamiento de la Caché de Programas

Este documento explica cómo la aplicación gestiona la información de los programas, combinando datos en tiempo real del hardware (vía MQTT) con datos estáticos de la base de datos (vía API), utilizando un sistema de caché para optimizar el rendimiento.

Toda esta lógica se centraliza en `src/contexts/RunningProgramsContext.tsx`.

## Propósito de la Caché

El objetivo principal es **minimizar las llamadas a la API**. Los detalles de un programa (nombre, descripción, pasos, etc.) no cambian con frecuencia. No tiene sentido pedirlos a la API cada vez que el hardware envía una actualización de estado (que puede ocurrir cada pocos segundos).

La caché permite:
1.  Descargar los detalles de un programa **una sola vez**.
2.  Reutilizar esa información mientras el programa esté en uso.
3.  Tener un mecanismo para "invalidar" o "refrescar" esa información si el programa se actualiza en la base de datos.

## Componentes Clave (Variables de Estado)

Dentro del `RunningProgramsProvider`, hay tres estados principales que gestionan el proceso:

1.  `espProgramsData`:
    *   **Qué es:** Un objeto que almacena el estado **en tiempo real** que llega desde las parrillas vía MQTT.
    *   **Contenido:** `isRunning`, `programId`, `currentStepIndex`, `elapsedTime`.
    *   **Ejemplo:** `{ 0: { programId: 123, isRunning: true, ... }, 1: null }` (El programa 123 está en la parrilla 0, y no hay nada en la parrilla 1).

2.  `programApiCache`:
    *   **Qué es:** El corazón del sistema de caché. Es un objeto que funciona como un diccionario donde se guardan los **detalles estáticos** de los programas que se han pedido a la API.
    *   **Contenido:** La clave es el `programId` y el valor son los datos completos del programa.
    *   **Ejemplo:** `{ 123: { id: 123, name: "Chuletón", stepsJson: "[...]", ... } }`

3.  `loadingProgramIds`:
    *   **Qué es:** Un `Set` (conjunto) que registra los IDs de los programas que se están pidiendo a la API **en este preciso momento**.
    *   **Propósito:** Evitar peticiones duplicadas. Si ya se está pidiendo el programa `123`, no se lanza una segunda petición.

## Flujo de Funcionamiento

Este es el proceso cuando un programa se activa en una parrilla:

1.  **Llega un Mensaje MQTT:** La parrilla `0` empieza a ejecutar el programa `123`. Envía un mensaje por el topic `grill/0/program/status/response` con el contenido `{ "programId": 123, "isRunning": true, ... }`.

2.  **Se actualiza `espProgramsData`:** El `RunningProgramsProvider` recibe este mensaje y actualiza su estado `espProgramsData` para reflejar que el programa `123` está corriendo en la parrilla `0`.

3.  **Comprobación de la Caché:** El componente detecta que `espProgramsData` ha cambiado y necesita "enriquecer" esa información. Comprueba si los detalles del programa `123` ya existen en `programApiCache`.

    *   **CASO A: Cache Hit (El programa está en la caché)**
        Si `programApiCache[123]` existe, el sistema simplemente combina los datos en tiempo real de `espProgramsData` con los datos estáticos de `programApiCache` para formar el objeto final que consumirá la interfaz. No hay llamadas a la API.

    *   **CASO B: Cache Miss (El programa NO está en la caché)**
        Si `programApiCache[123]` no existe, se activa la función `fetchAndCacheProgram(123)`.

4.  **Petición a la API (`fetchAndCacheProgram`)**:
    a.  Añade el `123` al `Set` de `loadingProgramIds` para bloquear otras peticiones.
    b.  Lanza una petición `fetch` a la URL `(API_URL)/programs/123`.
    c.  **Si la petición tiene éxito:**
        i.  Recibe los detalles del programa.
        ii. Los guarda en la caché: `setProgramApiCache(...)`. Ahora `programApiCache[123]` contiene la información completa.
    d.  **Si la petición falla:**
        i.  Guarda `null` en la caché para ese ID (`programApiCache[123] = null`). Esto sirve como una marca para no volver a intentar descargar un programa que dio error o no existe.
    e.  Finalmente, elimina el `123` del `Set` `loadingProgramIds`.

5.  **Ensamblaje del Estado Final:** Una vez que `programApiCache` se actualiza, el componente vuelve a renderizar y ahora sí puede combinar los datos de `espProgramsData` y `programApiCache` para mostrar la información completa en la interfaz.

## Invalidación de la Caché

¿Qué pasa si alguien edita un programa en la base de datos mientras la aplicación está abierta? Aquí entra en juego la invalidación.

1.  **Disparador:** El backend (o cualquier otro sistema) publica un mensaje en el topic MQTT `programs/updated/<ID>`, por ejemplo: `programs/updated/123`.

2.  **Ejecución del Handler:** El `RunningProgramsProvider` está suscrito a este topic. Al recibir el mensaje, ejecuta la función `handleCacheInvalidation`.

3.  **Acción:** Esta función extrae el ID (`123`) y **elimina la entrada correspondiente del objeto `programApiCache`**.

4.  **Consecuencia:** La próxima vez que el programa `123` se necesite, el sistema se encontrará con un `Cache Miss` (paso 3B) y se verá obligado a pedir de nuevo la información a la API, obteniendo así los datos actualizados.
