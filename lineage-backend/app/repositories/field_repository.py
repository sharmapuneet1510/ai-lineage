from sqlalchemy.orm import Session
from sqlalchemy import text


class FieldRepository:
    def __init__(self, db_session: Session):
        self.db = db_session

    def list_fields(self, jurisdiction_code: str = None, search: str = None, skip: int = 0, limit: int = 25):
        query = "SELECT field_id, jurisdiction_id, internal_field_name, external_display_name, business_name, data_type, criticality, status FROM regulatory_fields WHERE 1=1"
        params = {}

        if jurisdiction_code:
            query += " AND jurisdiction_id IN (SELECT jurisdiction_id FROM jurisdictions WHERE jurisdiction_code = :jc)"
            params["jc"] = jurisdiction_code

        if search:
            query += " AND (internal_field_name LIKE :search OR business_name LIKE :search)"
            params["search"] = f"%{search}%"

        query += f" ORDER BY business_name OFFSET :skip ROWS FETCH NEXT :limit ROWS ONLY"
        params["skip"], params["limit"] = skip, limit

        results = self.db.execute(text(query), params).fetchall()
        return [dict(zip(['field_id', 'jurisdiction_id', 'internal_field_name', 'external_display_name', 'business_name', 'data_type', 'criticality', 'status'], r)) for r in results]

    def get_field_by_id(self, field_id: int):
        result = self.db.execute(
            text("SELECT field_id, jurisdiction_id, internal_field_name, external_display_name, business_name, data_type, criticality, status FROM regulatory_fields WHERE field_id = :field_id"),
            {"field_id": field_id}
        ).fetchone()
        return result

    def get_field_interpretation(self, field_id: int):
        result = self.db.execute(
            text("SELECT business_interpretation, technical_interpretation FROM field_interpretations WHERE field_id = :field_id"),
            {"field_id": field_id}
        ).fetchone()
        return result
