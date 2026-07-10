from datetime import datetime

from pydantic import BaseModel


class PorterAssignmentCreate(BaseModel):
    porter_id: int
    room_id: int


class PorterAssignmentResponse(BaseModel):
    id: int
    porter_id: int
    room_id: int
    assigned_at: datetime
