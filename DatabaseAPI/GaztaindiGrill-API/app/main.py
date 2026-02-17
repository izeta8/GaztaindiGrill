from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.routes.categories import router as categories_router
from .api.routes.programs import router as programs_router
from contextlib import asynccontextmanager

from .core.mqtt_client import connect_mqtt, disconnect_mqtt

app = FastAPI()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Code that runs BEFORE the application starts accepting requests
    print("Application starting... Connecting to MQTT.")
    connect_mqtt()

    yield  # This is the point where the application is "alive"

    # Code that runs AFTER the application stops
    print("Application shutting down... Disconnecting from MQTT.")
    disconnect_mqtt()

app = FastAPI(lifespan=lifespan)

# Allow CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,
)

# Include routers
app.include_router(categories_router)
app.include_router(programs_router)

# python -m uvicorn app.main:app --reload