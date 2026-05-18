from sqlalchemy.orm import Session
from sqlalchemy import text


class AccessRepository:
    def __init__(self, db_session: Session):
        self.db = db_session

    def get_user_by_username(self, username: str):
        result = self.db.execute(
            text("SELECT user_id, username, display_name, email FROM app_users WHERE username = :username AND status = 'ACTIVE'"),
            {"username": username}
        ).fetchone()
        return result

    def get_user_roles(self, user_id: int):
        result = self.db.execute(
            text("""
                SELECT r.role_id, r.role_name, r.description
                FROM app_user_roles ur
                JOIN app_roles r ON ur.role_id = r.role_id
                WHERE ur.user_id = :user_id
            """),
            {"user_id": user_id}
        ).fetchall()
        return result

    def get_user_screens(self, user_id: int):
        result = self.db.execute(
            text("""
                SELECT DISTINCT sa.screen_code
                FROM app_user_roles ur
                JOIN app_screen_access sa ON ur.role_id = sa.role_id
                WHERE ur.user_id = :user_id AND sa.can_view = 1
            """),
            {"user_id": user_id}
        ).fetchall()
        return [row[0] for row in result]

    def get_user_jurisdictions(self, user_id: int):
        result = self.db.execute(
            text("""
                SELECT DISTINCT ja.jurisdiction_code
                FROM app_user_roles ur
                JOIN app_jurisdiction_access ja ON ur.role_id = ja.role_id
                WHERE ur.user_id = :user_id AND ja.can_view = 1
            """),
            {"user_id": user_id}
        ).fetchall()
        return [row[0] for row in result]
