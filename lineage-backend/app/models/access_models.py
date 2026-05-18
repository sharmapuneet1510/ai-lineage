from pydantic import BaseModel
from typing import List, Optional


class RoleDTO(BaseModel):
    role_id: int
    role_name: str
    description: Optional[str] = None


class UserDTO(BaseModel):
    user_id: int
    username: str
    display_name: str
    email: Optional[str] = None
    roles: List[RoleDTO] = []


class AccessInfo(BaseModel):
    user: UserDTO
    allowed_screens: List[str] = []
    allowed_jurisdictions: List[str] = []
    access_mode: str = "READ_ONLY"


class CurrentUserResponse(BaseModel):
    success: bool
    data: Optional[AccessInfo] = None
    message: Optional[str] = None
