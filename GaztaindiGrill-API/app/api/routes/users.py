import mysql.connector
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from ...schemas.programs import CreateUserRequest
from ...core.db import get_connection

router = APIRouter(prefix="/users", tags=["users"])


@router.get("")
async def get_users():
    cursor = None
    connection = get_connection()
    try:
        cursor = connection.cursor(dictionary=True)
        sql = "SELECT * FROM users WHERE is_active = 1"
        cursor.execute(sql)
        result = cursor.fetchall()
        return JSONResponse(content=jsonable_encoder(result), status_code=200)
    except Exception as e:
        return JSONResponse(
            {"success": False, "message": f"Error obteniendo los usuarios: {e}"},
            status_code=500,
        )
    finally:
        if cursor is not None:
            cursor.close()


@router.post("/create")
async def create_user(payload: CreateUserRequest):
    if not payload.name:
        return JSONResponse(
            {"success": False, "message": "El nombre es requerido"}, status_code=400
        )

    cursor = None
    connection = get_connection()
    try:
        cursor = connection.cursor()
        sql = "INSERT INTO users (name) VALUES (%s)"
        cursor.execute(sql, (payload.name,))
        connection.commit()
        insert_id = cursor.lastrowid
        return JSONResponse(
            {"success": True, "message": "Usuario creado correctamente", "id": insert_id},
            status_code=201,
        )
    except mysql.connector.IntegrityError:
        # name is UNIQUE: a duplicate is the caller's mistake, not a server fault.
        return JSONResponse(
            {"success": False, "message": "Ya existe un usuario con ese nombre"},
            status_code=409,
        )
    except Exception as e:
        return JSONResponse(
            {"success": False, "message": f"Error creando el usuario: {e}"}, status_code=500
        )
    finally:
        if cursor is not None:
            cursor.close()
