from fastapi import APIRouter
from fastapi.responses import JSONResponse
from ...schemas.programs import CreateCategoryRequest
from ...core.db import get_connection

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("")
async def get_categories():
    cursor = None
    connection = get_connection()
    try:
        cursor = connection.cursor(dictionary=True)
        sql = "SELECT * FROM categories"
        cursor.execute(sql)
        result = cursor.fetchall()
        return JSONResponse(result, status_code=200)
    except Exception as e:
        return JSONResponse(
            {"success": False, "message": f"Error obteniendo las categorias: {e}"},
            status_code=500,
        )
    finally:
        if cursor is not None:
            cursor.close()


@router.post("/create")
async def create_category(payload: CreateCategoryRequest):
    if not payload.name:
        return JSONResponse(
            {"success": False, "message": "El nombre es requerido"}, status_code=400
        )

    cursor = None
    connection = get_connection()
    try:
        cursor = connection.cursor()
        sql = "INSERT INTO categories (name) VALUES (%s)"
        cursor.execute(sql, (payload.name,))
        connection.commit()
        insert_id = cursor.lastrowid
        return JSONResponse(
            {"success": True, "message": "Categoria creada correctamente", "id": insert_id},
            status_code=201,
        )
    except Exception as e:
        return JSONResponse(
            {"success": False, "message": f"Error creando la categoria: {e}"}, status_code=500
        )
    finally:
        if cursor is not None:
            cursor.close()


