from pydantic import BaseModel
from typing import Optional, List


class FieldDTO(BaseModel):
    field_id: int
    jurisdiction_code: str
    internal_field_name: str
    external_display_name: str
    business_name: Optional[str] = None
    data_type: Optional[str] = None
    criticality: str
    status: str


class Field360DTO(BaseModel):
    field: FieldDTO
    business_interpretation: Optional[str] = None
    technical_interpretation: Optional[str] = None
    xslt_variables: List[str] = []
    java_methods: List[str] = []
    downstream_systems: List[str] = []
    impacted_fields_count: int = 0
