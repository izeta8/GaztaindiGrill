# Referencia de la API

Esta documentación describe los endpoints disponibles en el microservicio `GaztaindiGrill-API`.


## Entidad: Categories

Gestiona las categorías de los programas de cocción.

### `GET /categories`

- **Descripción**: Obtiene una lista de todas las categorías disponibles.
- **Método**: `GET`
- **Parámetros**: Ninguno.
- **Respuesta Exitosa (200 OK)**:
  ```json
  [
    {
      "id": 1,
      "name": "Carnes Rojas",
      "creation_date": "2024-02-17T10:00:00Z"
    },
    {
      "id": 2,
      "name": "Pescados",
      "creation_date": "2024-02-17T10:01:00Z"
    }
  ]
  ```

### `POST /categories/create`

- **Descripción**: Crea una nueva categoría.
- **Método**: `POST`
- **Cuerpo de la Petición (`Request Body`)**:
  ```json
  {
    "name": "Verduras"
  }
  ```
- **Respuesta Exitosa (201 CREATED)**:
  ```json
  {
    "success": true,
    "message": "Categoria creada correctamente",
    "id": 3
  }
  ```
- **Respuesta de Error (400 Bad Request)**:
  ```json
  {
    "success": false,
    "message": "El nombre es requerido"
  }
  ```

---

## Entidad: Programs

Gestiona los programas de cocción, que contienen los pasos para una receta.

### `GET /programs`

- **Descripción**: Obtiene una lista de todos los programas.
- **Método**: `GET`
- **Parámetros**: Ninguno.
- **Respuesta Exitosa (200 OK)**:
  ```json
  [
    {
      "id": 101,
      "name": "Chuleta a punto",
      "description": "Chuleta de 500g a fuego fuerte.",
      "category_id": 1,
      "steps_json": "[{"temp": 250, "duration": 300}, {"temp": 200, "duration": 600}]",
      "creator_name": "Asador Principal",
      "creation_date": "2024-02-17T11:00:00Z",
      "update_date": null,
      "usage_count": 15,
      "is_active": 1,
      "reference_type": "absolute"
    }
  ]
  ```

### `GET /programs/{program_id}`

- **Descripción**: Obtiene los detalles de un programa específico por su ID.
- **Método**: `GET`
- **Parámetros de Ruta**:
  - `program_id` (integer, requerido): El ID del programa.
- **Respuesta Exitosa (200 OK)**:
  ```json
  {
    "id": 101,
    "name": "Chuleta a punto",
    "description": "Chuleta de 500g a fuego fuerte.",
    "category_id": 1,
    "steps_json": "[{"temp": 250, "duration": 300}, {"temp": 200, "duration": 600}]",
    "creator_name": "Asador Principal",
    "creation_date": "2024-02-17T11:00:00Z",
    "update_date": null,
    "usage_count": 15,
    "is_active": 1,
    "reference_type": "absolute"
  }
  ```
- **Respuesta de Error (404 Not Found)**:
  ```json
  {
    "success": false,
    "message": "Programa no encontrado"
  }
  ```

### `POST /programs/create`

- **Descripción**: Crea un nuevo programa de cocción.
- **Método**: `POST`
- **Cuerpo de la Petición (`Request Body`)**:
  ```json
  {
    "name": "Merluza a la brasa",
    "description": "Lomo de merluza con piel.",
    "categoryId": 2,
    "stepsJson": "[{"temp": 180, "duration": 480}]",
    "creatorName": "Chef de Mar",
    "referenceType": "relative"
  }
  ```
  `referenceType` es opcional y por defecto es `"absolute"`. Determina cómo se interpretan los valores `position` de los pasos: `"absolute"` (posición fija 0-100%) o `"relative"` (delta desde la posición de la parrilla en el momento de ejecutar el programa, ver `docs/database.md`).
- **Respuesta Exitosa (201 CREATED)**:
  ```json
  {
    "success": true,
    "message": "Programa creado correctamente",
    "id": 102
  }
  ```

### `PATCH /programs/{program_id}`

- **Descripción**: Actualiza uno o más campos de un programa existente. Solo se deben enviar los campos a modificar. No emite ningún mensaje MQTT: este servicio no habla MQTT (ver `docs/architecture.md` §5).
- **Método**: `PATCH`
- **Parámetros de Ruta**:
  - `program_id` (integer, requerido): El ID del programa a actualizar.
- **Cuerpo de la Petición (`Request Body`)**:
  ```json
  {
    "description": "Lomo de merluza de anzuelo con piel.",
    "usageCount": 16,
    "referenceType": "relative"
  }
  ```
- **Respuesta Exitosa (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Programa actualizado correctamente"
  }
  ```
- **Respuesta de Error (404 Not Found)**:
  ```json
  {
    "success": false,
    "message": "Programa no encontrado"
  }
  ```

### `DELETE /programs/{program_id}`

- **Descripción**: Realiza un borrado lógico (soft delete) de un programa, estableciendo su campo `is_active` a `0`.
- **Método**: `DELETE`
- **Parámetros de Ruta**:
  - `program_id` (integer, requerido): El ID del programa a desactivar.
- **Respuesta Exitosa (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Programa desactivado correctamente"
  }
  ```
- **Respuesta de Error (404 Not Found)**:
  ```json
  {
    "success": false,
    "message": "Programa no encontrado"
  }
  ```
- **Respuesta de Error (400 Bad Request)**:
  ```json
  {
    "success": false,
    "message": "El programa ya está inactivo"
  }
  ```
