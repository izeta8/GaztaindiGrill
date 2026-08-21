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

Un `ProgramStep` representa un único paso dentro de un `Program`.

```typescript
interface ProgramStep {
  time?: number;          // en segundos
  temperature?: number;   // en grados Celsius
  position?: number;      // 0-100
  rotation?: number;      // 0-360
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
        "steps_json": "[{"time":300,"temperature":250},{"time":300,"position":50}]",
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
      "stepsJson": "[{"time":60,"temperature":180}]",
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
      "stepsJson": "[{"time":120,"temperature":200}]"
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
