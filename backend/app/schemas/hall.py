from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.hall import HallType


class HallCreate(BaseModel):
    name: str
    hall_type: HallType


class HallResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    hall_type: HallType
    category: str
    created_at: datetime
