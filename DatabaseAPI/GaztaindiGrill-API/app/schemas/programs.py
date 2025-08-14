from typing import Optional
from pydantic import BaseModel, Field


class CreateProgramRequest(BaseModel):
    name: str
    description: Optional[str] = None
    category_id: Optional[int] = Field(None, alias="categoryId")
    steps_json: str = Field(..., alias="stepsJson")
    creator_name: str = Field(..., alias="creatorName")


class CreateCategoryRequest(BaseModel):
    name: str
