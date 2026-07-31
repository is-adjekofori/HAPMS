from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.hall import HallType


class HallCreate(BaseModel):
    # Matches halls.name's VARCHAR(100) (§6.2) so an oversized value is a
    # clean 422 instead of a raw MySQL DataError under strict SQL mode.
    name: str = Field(min_length=1, max_length=100)
    hall_type: HallType


class HallResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    hall_type: HallType
    category: str
    created_at: datetime
