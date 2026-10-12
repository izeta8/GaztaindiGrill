# Documentación de la API

Este documento describe la API HTTP de GaztaindiGrill. Vive en el propio proyecto de Next.js, como Route Handlers bajo `src/app/api/`, y sustituye al antiguo servicio FastAPI (`GaztaindiGrill-API`), que se borró. Las respuestas mantienen la forma exacta que daba FastAPI, así que las páginas solo cambiaron la URL.

## URL Base

No hay: la API comparte origen con la página, así que el cliente llama a rutas relativas (`fetch('/api/programs')`). Sin otro host ni puerto no hace falta CORS.

## Cómo está organizada

| Capa | Dónde | Qué hace |
|---|---|---|
| Rutas | `src/app/api/**/route.ts` | Solo HTTP: valida el cuerpo, llama a la capa de datos y responde |
| Validación | `src/server/validation/*.ts` | Esquemas `zod`, en lugar de los modelos de Pydantic |
| Datos | `src/server/data/*.ts` | Las consultas, con Drizzle ORM. Devuelven ya la forma snake_case del contrato |
| Conexión | `src/db/index.ts`, `src/db/schema.ts` | Pool de `mysql2` y el esquema de las tablas (ver [database.md](database.md)) |

Todo lo de `src/server/` y `src/db/` importa `server-only`, así que si un componente de cliente lo importa por error el build falla en vez de mandar las credenciales al navegador. La conexión se configura con `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` y `DB_NAME`, variables del servidor que se leen al arrancar (ver `.env.example`).

Los errores responden siempre `{ "success": false, "message": "..." }`, que es lo que el cliente muestra en sus avisos. Un 500 lleva el motivo que dio MariaDB.

---

## Modelos de Datos

### Program

Un objeto `Program` representa una receta o programa de cocinado. La API devuelve los campos en `snake_case`.

```typescript
interface Program {
  id: number;
  name: string;
  description?: string;
  category_id?: number;
  steps_json: string;      // Un string JSON que contiene un array de ProgramStep
  usage_count: number;
  user_id: number;         // Creador. La columna creator_name de texto libre ya no existe
  user_name: string;       // Resuelto por la API con un JOIN sobre users
  creation_date: string;   // Formato: YYYY-MM-DD
  update_date: string;     // Formato: YYYY-MM-DD
  is_active: number;       // 1 para true, 0 para false
  reference_type: 'absolute' | 'relative';
}
```

### ProgramStep

Un `ProgramStep` representa un único paso dentro de un `Program`, y hace **una sola cosa**: mover la parrilla o esperar.

`time` a solas es un **paso de espera**; no es un retardo pegado a un movimiento. Los pasos que mueven la parrilla no llevan tiempo y avanzan en cuanto llegan a su destino. El firmware resuelve el tipo en el orden en que aparecen los campos abajo, y se salta un paso que no traiga ninguno.

```typescript
interface ProgramStep {
  action?: string;        // por ahora solo "flip"
  temperature?: number;   // en grados Celsius
  position?: number;      // 0-100; en relativo, desplazamiento de -100 a 100
  rotation?: number;      // 0-359: el firmware ignora 360 o más; el formulario guarda 356 o más como 0
  time?: number;          // en segundos
}
```

### Category

Representa una categoría para agrupar programas.

```typescript
interface Category {
  id: number;
  name: string;
}
```

---

## Endpoints

### Programas

#### `GET /api/programs`

Obtiene una lista de todos los programas activos.

*   **Método:** `GET`
*   **Respuesta Exitosa (200 OK):**
    ```json
    [
      {
        "id": 1,
        "name": "Chuletón al punto",
        "description": "Chuletón de 500g a la brasa.",
        "category_id": 1,
        "steps_json": "[{\"position\":50},{\"time\":300},{\"action\":\"flip\"}]",
        "usage_count": 42,
        "user_id": 1,
        "user_name": "Asador Gaztaindi",
        "creation_date": "2023-01-15",
        "update_date": "2023-05-20",
        "is_active": 1
      }
    ]
    ```

#### `GET /api/programs/{id}`

Obtiene los detalles de un programa específico por su ID. No filtra por `is_active`, a diferencia del listado.

*   **Método:** `GET`
*   **Respuesta Exitosa (200 OK):**
    ```json
    {
      "id": 1,
      "name": "Chuletón al punto",
      // ... resto de campos del programa
    }
    ```

#### `POST /api/programs`

Crea un nuevo programa.

*   **Método:** `POST`
*   **Cuerpo de la Petición (Request Body):**
    ```json
    {
      "name": "Nuevo Programa",
      "description": "Descripción opcional",
      "userId": 1,
      "stepsJson": "[{\"position\":30},{\"time\":60}]",
      "categoryId": 2,
      "referenceType": "absolute"
    }
    ```
    `referenceType` es opcional y vale `absolute` por defecto. Sin `name`, `stepsJson` o `userId` responde 400.
*   **Respuesta Exitosa (201 Created):**
    ```json
    { "success": true, "message": "Programa creado correctamente", "id": 38 }
    ```

#### `PATCH /api/programs/{id}`

Actualiza un programa existente. Se pueden enviar solo los campos a modificar: un campo que falta o llega a `null` se deja como estaba, así que `categoryId: null` no quita la categoría. Acepta además `userId`, `creationDate`, `updateDate`, `usageCount` y `referenceType`. Sin ningún campo responde 400; con un id que no existe, 404.

*   **Método:** `PATCH`
*   **Cuerpo de la Petición (Request Body):**
    ```json
    {
      "name": "Nombre del Programa Actualizado",
      "description": "Descripción actualizada",
      "stepsJson": "[{\"position\":30},{\"time\":120}]"
    }
    ```
*   **Respuesta Exitosa (200 OK):**
    ```json
    { "success": true, "message": "Programa actualizado correctamente" }
    ```

#### `DELETE /api/programs/{id}`

Borrado lógico: pone `is_active` a 0, así que el programa desaparece del listado pero sigue en la base de datos. 404 si no existe, 400 si ya estaba inactivo.

*   **Método:** `DELETE`
*   **Respuesta Exitosa (200 OK):**
    ```json
    { "success": true, "message": "Programa desactivado correctamente" }
    ```

### Categorías

#### `GET /api/categories`

Obtiene una lista de todas las categorías disponibles.

*   **Método:** `GET`
*   **Respuesta Exitosa (200 OK):**
    ```json
    [
      { "id": 1, "name": "Carnes" },
      { "id": 2, "name": "Pescados" }
    ]
    ```

#### `POST /api/categories`

Crea una nueva categoría. `name` es único, así que un nombre repetido devuelve 409.

*   **Método:** `POST`
*   **Cuerpo de la Petición (Request Body):**
    ```json
    {
      "name": "Nueva Categoría"
    }
    ```
*   **Respuesta Exitosa (201 Created):**
    ```json
    {
      "success": true,
      "id": 3,
      "message": "Categoria creada correctamente"
    }
    ```

### Usuarios

#### `GET /api/users`

Obtiene la lista de usuarios activos. `CurrentUserContext` la pide al arrancar para validar el usuario guardado en `localStorage`, y `ProgramForm` la usa para el desplegable de creador.

*   **Método:** `GET`
*   **Respuesta Exitosa (200 OK):**
    ```json
    [
      { "id": 1, "name": "Gaztaindi", "creation_date": "2026-09-10T23:09:29", "is_active": 1 }
    ]
    ```

#### `POST /api/users`

Crea un usuario nuevo. `name` es único, así que un nombre repetido devuelve 409 en vez de 500.

*   **Método:** `POST`
*   **Cuerpo de la Petición (Request Body):**
    ```json
    {
      "name": "Julen"
    }
    ```
*   **Respuesta Exitosa (201 Created):**
    ```json
    {
      "success": true,
      "id": 3,
      "message": "Usuario creado correctamente"
    }
    ```
