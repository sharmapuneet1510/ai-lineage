from sqlalchemy.orm import Session
from app.repositories.field_repository import FieldRepository
from app.core.exceptions import NotFoundException


class FieldService:
    def __init__(self, db_session: Session):
        self.repo = FieldRepository(db_session)

    def search_fields(self, jurisdiction_code: str = None, search: str = None, page: int = 1, page_size: int = 25):
        skip = (page - 1) * page_size
        fields = self.repo.list_fields(jurisdiction_code, search, skip, page_size)
        return fields

    def get_field_360(self, field_id: int):
        field_row = self.repo.get_field_by_id(field_id)
        if not field_row:
            raise NotFoundException("Field", str(field_id))

        interpretation = self.repo.get_field_interpretation(field_id)

        return {
            "field": dict(zip(['field_id', 'jurisdiction_id', 'internal_field_name', 'external_display_name', 'business_name', 'data_type', 'criticality', 'status'], field_row)),
            "business_interpretation": interpretation[0] if interpretation else None,
            "technical_interpretation": interpretation[1] if interpretation else None,
        }
