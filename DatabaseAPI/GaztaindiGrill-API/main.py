from fastapi import FastAPI
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import mysql.connector
import os 
from pydantic import BaseModel, Field
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder

# Load environment variables
load_dotenv()

# Establish a connection
connection = mysql.connector.connect(
    host=os.getenv("DB_HOST"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    database=os.getenv("DB_NAME")
)

# Check if the connection is successful
if connection.is_connected():
    print("Connected to MySQL database")

app = FastAPI()

# Allow CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      
    allow_methods=["*"],      
    allow_headers=["*"],      
    allow_credentials=False,
)

class CreateProgramRequest(BaseModel):
    name: str
    description: Optional[str] = None
    category_id: Optional[int] = Field(None, alias="categoryId")
    steps_json: str = Field(..., alias="stepsJson")
    creator_name: str = Field(..., alias="creatorName")

class CreateCategoryRequest(BaseModel):
    name: str

@app.post("/categories/create")
async def create_category(payload: CreateCategoryRequest):

    # Validate the payload
    if not payload.name:
        return JSONResponse(
            {"success": False, "message": "El nombre es requerido"},
            status_code=400,
        )

    cursor = None
    try:
        cursor = connection.cursor()
        sql = (
            "INSERT INTO categories (name) "
            "VALUES (%s)"
        )
        cursor.execute(
            sql,
            (
                payload.name,
            ),
        )
        connection.commit()
        insert_id = cursor.lastrowid
        return JSONResponse(
            {"success": True, "message": "Categoria creada correctamente", "id": insert_id},
            status_code=201,
        )
    except Exception as e:
        return JSONResponse(
            {"success": False, "message": f"Error creando la categoria: {e}"},
            status_code=500,
        )
    finally:
        if cursor is not None:
            cursor.close()

@app.post("/programs/create")
async def create_program(payload: CreateProgramRequest):

    # Validate the payload
    if not payload.name or not payload.steps_json or not payload.creator_name:
        return JSONResponse(
            {"success": False, "message": "El nombre, los pasos y el creador son requeridos"},
            status_code=400,
        )

    cursor = None
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


@app.get("/categories")
async def get_categories():

    cursor = None
    try:
        cursor = connection.cursor(dictionary=True)
        sql = (
            "SELECT * FROM categories"
        )
        cursor.execute(sql)
        result = cursor.fetchall()
        return JSONResponse(
            result,
            status_code=200,
        )

    except Exception as e:
        return JSONResponse(
            {"success": False, "message": f"Error obteniendo las categorias: {e}"},
            status_code=500,
        )
    finally:
        if cursor is not None:
            cursor.close()

    
@app.get("/programs")
async def get_programs():

    cursor = None
    try:
        cursor = connection.cursor(dictionary=True)
        sql = (
            "SELECT * FROM programs"
        )
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

@app.delete("/programs/{program_id}")
async def soft_delete_program(program_id: int):
    cursor = None
    try:
        cursor = connection.cursor()
        # Check if the program exists and is active
        cursor.execute(
            "SELECT id, is_active FROM programs WHERE id = %s", 
            (program_id,)
        )
        program = cursor.fetchone()

        if not program:
            return JSONResponse(
                {"success": False, "message": "Programa no encontrado"},
                status_code=404,
            )

        if program[1] == 0:  # already inactive
            return JSONResponse(
                {"success": False, "message": "El programa ya está inactivo"},
                status_code=400,
            )

        # Soft delete: set is_active to false
        cursor.execute(
            "UPDATE programs SET is_active = 0 WHERE id = %s", 
            (program_id,)
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




#  python -m uvicorn main:app --reload