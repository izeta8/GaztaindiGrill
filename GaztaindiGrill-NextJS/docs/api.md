# Documentación de la API

Este documento describe la API externa utilizada por la aplicación GaztaindiGrill.

## URL Base

La URL base para todas las llamadas a la API se configura a través de la variable de entorno `NEXT_PUBLIC_API_URL`.

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
  creator_name: string;
  creation_date: string;   // Formato: YYYY-MM-DD
  update_date: string;     // Formato: YYYY-MM-DD
  is_active: number;       // 1 para true, 0 para false
}
```

### ProgramStep

Un `ProgramStep` representa un único paso dentro de un `Program`, y hace **una sola cosa**: mover la parrilla o esperar.

`time` a solas es un **paso de espera**; no es un retardo pegado a un movimiento. Los pasos que mueven la parrilla no llevan tiempo y avanzan en cuanto llegan a su destino. El firmware resuelve el tipo en el orden en que aparecen los campos abajo, y se salta un paso que no traiga ninguno.

```typescript
interface ProgramStep {
  action?: string;        // por ahora solo "flip"
  temperature?: number;   // en grados Celsius
  position?: number;      // 0-100
  rotation?: number;      // 0-360
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

#### `GET /programs`

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
        "creator_name": "Asador Gaztaindi",
        "creation_date": "2023-01-15",
        "update_date": "2023-05-20",
        "is_active": 1
      }
    ]
    ```

#### `GET /programs/{id}`

Obtiene los detalles de un programa específico por su ID.

*   **Método:** `GET`
*   **Respuesta Exitosa (200 OK):**
    ```json
    {
      "id": 1,
      "name": "Chuletón al punto",
      // ... resto de campos del programa
    }
    ```

#### `POST /programs/create`

Crea un nuevo programa.

*   **Método:** `POST`
*   **Cuerpo de la Petición (Request Body):**
    ```json
    {
      "name": "Nuevo Programa",
      "description": "Descripción opcional",
      "creatorName": "Tu Nombre",
      "stepsJson": "[{\"position\":30},{\"time\":60}]",
      "categoryId": 2
    }
    ```
*   **Respuesta Exitosa (200 OK o 201 Created):** Un objeto confirmando la creación.

#### `PATCH /programs/{id}`

Actualiza un programa existente. Se pueden enviar solo los campos a modificar.

*   **Método:** `PATCH`
*   **Cuerpo de la Petición (Request Body):**
    ```json
    {
      "name": "Nombre del Programa Actualizado",
      "description": "Descripción actualizada",
      "stepsJson": "[{\"position\":30},{\"time\":120}]"
    }
    ```
*   **Respuesta Exitosa (200 OK):** Un objeto confirmando la actualización.

### Categorías

#### `GET /categories`

Obtiene una lista de todas las categorías disponibles.

*   **Método:** `GET`
*   **Respuesta Exitosa (200 OK):**
    ```json
    [
      { "id": 1, "name": "Carnes" },
      { "id": 2, "name": "Pescados" }
    ]
    ```

#### `POST /categories/create`

Crea una nueva categoría.

*   **Método:** `POST`
*   **Cuerpo de la Petición (Request Body):**
    ```json
    {
      "name": "Nueva Categoría"
    }
    ```
*   **Respuesta Exitosa (200 OK o 201 Created):**
    ```json
    {
      "success": true,
      "id": 3,
      "message": "Categoría creada"
    }
    ```
