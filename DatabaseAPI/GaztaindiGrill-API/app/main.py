from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.routes.categories import router as categories_router
from .api.routes.programs import router as programs_router

app = FastAPI()

# Allow CORS (same as original)
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
