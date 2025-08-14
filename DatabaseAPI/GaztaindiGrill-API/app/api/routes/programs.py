from fastapi import APIRouter
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from ...core.db import get_connection
from ...schemas.programs import CreateProgramRequest, UpdateProgramRequest

router = APIRouter(prefix="/programs", tags=["programs"])

@router.get("/")
async def get_programs():
    cursor = None
    connection = get_connection()
    try:
        cursor = connection.cursor(dictionary=True)
        sql = "SELECT * FROM programs"
        cursor.execute(sql)
        result = cursor.fetchall()
        return JSONResponse(content=jsonable_encoder(result), status_code=200)
    except Exception as e:
        return JSONResponse(
            {"success": False, "message": f"Error obteniendo los programas: {e}"},
            status_code=500,
        )
    finally:
        if cursor is not None:
            cursor.close()


@router.patch("/{program_id}")
async def update_program(program_id: int, payload: UpdateProgramRequest):
    # Build dynamic SET clause only for provided fields
    fields_map = {
        "name": payload.name,
        "description": payload.description,
        "category_id": payload.category_id,
        "steps_json": payload.steps_json,
        "creator_name": payload.creator_name,
        "creation_date": payload.creation_date,
        "update_date": payload.update_date,
        "uses_count": payload.uses_count,
    }

    set_parts = []
    values = []
    for column, value in fields_map.items():
        if value is not None:
            set_parts.append(f"{column} = %s")
            values.append(value)

    if not set_parts:
        return JSONResponse(
            {"success": False, "message": "No se proporcionaron campos para actualizar"},
            status_code=400,
        )

    values.append(program_id)

    cursor = None
    connection = get_connection()
    try:
        cursor = connection.cursor()
        sql = f"UPDATE programs SET {', '.join(set_parts)} WHERE id = %s"
        cursor.execute(sql, tuple(values))
        connection.commit()

        if cursor.rowcount == 0:
            return JSONResponse(
                {"success": False, "message": "Programa no encontrado"},
                status_code=404,
            )

        return JSONResponse(
            {"success": True, "message": "Programa actualizado correctamente"},
            status_code=200,
        )
    except Exception as e:
        return JSONResponse(
            {"success": False, "message": f"Error actualizando el programa: {e}"},
            status_code=500,
        )
    finally:
        if cursor is not None:
            cursor.close()



@router.post("/create")
async def create_program(payload: CreateProgramRequest):
    if not payload.name or not payload.steps_json or not payload.creator_name:
        return JSONResponse(
            {"success": False, "message": "El nombre, los pasos y el creador son requeridos"},
            status_code=400,
        )

    cursor = None
    connection = get_connection()
    try:
        cursor = connection.cursor()
        sql = (
            "INSERT INTO programs (name, description, category_id, steps_json, creator_name) "
            "VALUES (%s, %s, %s, %s, %s)"
        )
        cursor.execute(
            sql,
            (
                payload.name,
                payload.description,
                payload.category_id,
                payload.steps_json,
                payload.creator_name,
            ),
        )
        connection.commit()
        insert_id = cursor.lastrowid
        return JSONResponse(
            {"success": True, "message": "Programa creado correctamente", "id": insert_id},
            status_code=201,
        )
    except Exception as e:
        return JSONResponse(
            {"success": False, "message": f"Error creando el programa: {e}"},
            status_code=500,
        )
    finally:
        if cursor is not None:
            cursor.close()


@router.get("/{program_id}")
async def get_program(program_id: int):
    cursor = None
    connection = get_connection()
    try:
        cursor = connection.cursor(dictionary=True)
        sql = "SELECT * FROM programs WHERE id = %s"
        cursor.execute(sql, (program_id,))
        program = cursor.fetchone()

        if not program:
            return JSONResponse(
                {"success": False, "message": "Programa no encontrado"},
                status_code=404,
            )

        return JSONResponse(content=jsonable_encoder(program), status_code=200)

    except Exception as e:
        return JSONResponse(
            {"success": False, "message": f"Error obteniendo el programa: {e}"},
            status_code=500,
        )
    finally:
        if cursor is not None:
            cursor.close()


@router.delete("/{program_id}")
async def soft_delete_program(program_id: int):
    cursor = None
    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute(
            "SELECT id, is_active FROM programs WHERE id = %s",
            (program_id,),
        )
        program = cursor.fetchone()

        if not program:
            return JSONResponse(
                {"success": False, "message": "Programa no encontrado"},
                status_code=404,
            )

        if program[1] == 0:
            return JSONResponse(
                {"success": False, "message": "El programa ya está inactivo"},
                status_code=400,
            )

        cursor.execute(
            "UPDATE programs SET is_active = 0 WHERE id = %s",
            (program_id,),
        )
        connection.commit()

        return JSONResponse(
            {"success": True, "message": "Programa desactivado correctamente"},
            status_code=200,
        )

    except Exception as e:
        return JSONResponse(
            {"success": False, "message": f"Error desactivando el programa: {e}"},
            status_code=500,
        )
    finally:
        if cursor is not None:
            cursor.close()
