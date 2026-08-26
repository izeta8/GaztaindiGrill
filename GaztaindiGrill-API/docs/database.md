# Documentación de la Base de Datos

Este documento describe el esquema de la base de datos utilizada por el microservicio, el motor y las relaciones entre las tablas.

## 1. Motor de Base de Datos

- **Sistema**: **MySQL**
- **Librería de Conexión**: `mysql-connector-python`
- **Gestión de Conexión**: El acceso se gestiona a través de un singleton simple en `app.core.db` para reutilizar conexiones.

## 2. Diagrama del Esquema (ERD)

El siguiente diagrama Mermaid ilustra las tablas principales y sus relaciones.

```mermaid
erDiagram
    CATEGORIES {
        INT id PK "Clave Primaria"
        VARCHAR(255) name "Nombre de la categoría"
        TIMESTAMP creation_date "Fecha de creación"
    }

    PROGRAMS {
        INT id PK "Clave Primaria"
        VARCHAR(255) name "Nombre del programa"
        TEXT description "Descripción detallada"
        INT category_id FK "Referencia a CATEGORIES"
        JSON steps_json "Pasos del programa en formato JSON"
        VARCHAR(100) creator_name "Nombre del creador"
        TIMESTAMP creation_date "Fecha de creación"
        TIMESTAMP update_date "Fecha de última modificación"
        INT usage_count "Contador de uso"
        BOOLEAN is_active "Borrado lógico (1=activo, 0=inactivo)"
        VARCHAR(20) reference_type "absolute o relative"
    }

    PROGRAMS }|--|| CATEGORIES : "pertenece a"
```

## 3. Descripción de Tablas

### Tabla: `categories`

Almacena las categorías para agrupar los programas de cocción.

| Columna | Tipo de Dato | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `INT` | `PRIMARY KEY`, `AUTO_INCREMENT` | Identificador único de la categoría. |
| `name` | `VARCHAR(255)` | `NOT NULL`, `UNIQUE` | Nombre de la categoría (ej. "Carnes", "Pescados"). |
| `creation_date` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP`| Fecha y hora de creación del registro. |

---

### Tabla: `programs`

Contiene los programas de cocción con todos sus detalles y pasos.

| Columna | Tipo de Dato | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `INT` | `PRIMARY KEY`, `AUTO_INCREMENT` | Identificador único del programa. |
| `name` | `VARCHAR(255)` | `NOT NULL` | Nombre descriptivo del programa. |
| `description` | `TEXT` | `NULL` | Explicación más detallada del programa. |
| `category_id` | `INT` | `FOREIGN KEY(categories.id)` | ID de la categoría a la que pertenece. |
| `steps_json` | `JSON` | `NOT NULL` | Array de objetos JSON que define los pasos de cocción. Cada paso hace una sola cosa: `action`, `temperature`, `position`, `rotation` o `time`. Un paso con solo `time` es una **espera**. |
| `creator_name` | `VARCHAR(100)`| `NOT NULL` | Nombre del usuario o rol que creó el programa. |
| `creation_date` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP`| Fecha y hora de creación del registro. |
| `update_date` | `TIMESTAMP` | `NULL` | Fecha de la última actualización. |
| `usage_count` | `INT` | `DEFAULT 0` | Cuántas veces se ha utilizado el programa. |
| `is_active` | `BOOLEAN` / `TINYINT(1)` | `DEFAULT 1` | Para borrado lógico. 1 para activo, 0 para inactivo. |
| `reference_type` | `VARCHAR(20)` | `DEFAULT 'absolute'` | Cómo se interpreta el campo `position` de cada paso. `"absolute"`: la posición es el objetivo fijo 0-100%. `"relative"`: la posición es un delta (puede ser negativo) que se suma a la posición de la parrilla en el momento de iniciar la ejecución del programa, y se clampa a 0-100%.
