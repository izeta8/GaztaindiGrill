from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.routes.categories import router as categories_router
from .api.routes.programs import router as programs_router
from .api.routes.users import router as users_router

app = FastAPI()

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
app.include_router(users_router)

# python -m uvicorn app.main:app --reload
