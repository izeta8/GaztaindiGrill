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


class UpdateProgramRequest(BaseModel):
    # All fields optional; only provided fields will be updated
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = Field(None, alias="categoryId")
    steps_json: Optional[str] = Field(None, alias="stepsJson")
    creator_name: Optional[str] = Field(None, alias="creatorName")
    creation_date: Optional[str] = Field(None, alias="creationDate")
    update_date: Optional[str] = Field(None, alias="updateDate")
    usage_count: Optional[int] = Field(None, alias="usageCount")
