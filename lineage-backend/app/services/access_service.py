from sqlalchemy.orm import Session
from app.repositories.access_repository import AccessRepository
from app.models.access_models import UserDTO, RoleDTO, AccessInfo
from app.core.config import settings
from app.core.exceptions import NotFoundException


class AccessService:
    def __init__(self, db_session: Session):
        self.repo = AccessRepository(db_session)

    def get_current_user_access(self, username: str) -> AccessInfo:
        user_row = self.repo.get_user_by_username(username)
        if not user_row:
            raise NotFoundException("User", username)

        user_id, username, display_name, email = user_row

        roles = self.repo.get_user_roles(user_id)
        role_dtos = [RoleDTO(role_id=r[0], role_name=r[1], description=r[2]) for r in roles]

        screens = self.repo.get_user_screens(user_id)
        jurisdictions = self.repo.get_user_jurisdictions(user_id)

        user = UserDTO(
            user_id=user_id,
            username=username,
            display_name=display_name,
            email=email,
            roles=role_dtos
        )

        return AccessInfo(
            user=user,
            allowed_screens=screens,
            allowed_jurisdictions=jurisdictions,
            access_mode=settings.access_mode
        )
