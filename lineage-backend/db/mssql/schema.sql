CREATE TABLE app_users (user_id BIGINT IDENTITY PRIMARY KEY, username VARCHAR(100) UNIQUE NOT NULL, display_name VARCHAR(255) NOT NULL, email VARCHAR(255), status VARCHAR(50) DEFAULT 'ACTIVE', created_at DATETIME2 DEFAULT SYSUTCDATETIME());

CREATE TABLE app_roles (role_id BIGINT IDENTITY PRIMARY KEY, role_name VARCHAR(100) UNIQUE NOT NULL, description VARCHAR(MAX));

CREATE TABLE app_user_roles (user_id BIGINT NOT NULL, role_id BIGINT NOT NULL, PRIMARY KEY (user_id, role_id), FOREIGN KEY (user_id) REFERENCES app_users(user_id), FOREIGN KEY (role_id) REFERENCES app_roles(role_id));

CREATE TABLE app_screen_access (screen_access_id BIGINT IDENTITY PRIMARY KEY, role_id BIGINT NOT NULL, screen_code VARCHAR(100) NOT NULL, can_view BIT DEFAULT 1, FOREIGN KEY (role_id) REFERENCES app_roles(role_id), UNIQUE (role_id, screen_code));

CREATE TABLE app_jurisdiction_access (jurisdiction_access_id BIGINT IDENTITY PRIMARY KEY, role_id BIGINT NOT NULL, jurisdiction_code VARCHAR(50) NOT NULL, can_view BIT DEFAULT 1, FOREIGN KEY (role_id) REFERENCES app_roles(role_id), UNIQUE (role_id, jurisdiction_code));

CREATE TABLE jurisdictions (jurisdiction_id BIGINT IDENTITY PRIMARY KEY, jurisdiction_code VARCHAR(50) UNIQUE NOT NULL, jurisdiction_name VARCHAR(255) NOT NULL, region VARCHAR(100), regulator_name VARCHAR(255), reporting_regime VARCHAR(255), description VARCHAR(MAX), owner_team VARCHAR(255), status VARCHAR(50) DEFAULT 'ACTIVE', created_by VARCHAR(100) NOT NULL, created_at DATETIME2 DEFAULT SYSUTCDATETIME(), updated_by VARCHAR(100), updated_at DATETIME2);

CREATE TABLE regulatory_fields (field_id BIGINT IDENTITY PRIMARY KEY, jurisdiction_id BIGINT NOT NULL, internal_field_name VARCHAR(255) NOT NULL, external_display_name VARCHAR(255) NOT NULL, business_name VARCHAR(255), data_type VARCHAR(100), field_category VARCHAR(255), reporting_section VARCHAR(255), is_mandatory BIT DEFAULT 0, criticality VARCHAR(50) DEFAULT 'MEDIUM', owner_team VARCHAR(255), status VARCHAR(50) DEFAULT 'DRAFT', description VARCHAR(MAX), current_version INT DEFAULT 1, created_by VARCHAR(100) NOT NULL, created_at DATETIME2 DEFAULT SYSUTCDATETIME(), updated_by VARCHAR(100), updated_at DATETIME2, CONSTRAINT fk_rf_j FOREIGN KEY (jurisdiction_id) REFERENCES jurisdictions(jurisdiction_id), CONSTRAINT uq_rf UNIQUE (jurisdiction_id, internal_field_name));

CREATE TABLE field_interpretations (interpretation_id BIGINT IDENTITY PRIMARY KEY, field_id BIGINT NOT NULL, business_interpretation VARCHAR(MAX), technical_interpretation VARCHAR(MAX), example_scenario VARCHAR(MAX), assumptions VARCHAR(MAX), version_no INT DEFAULT 1, status VARCHAR(50) DEFAULT 'DRAFT', created_by VARCHAR(100) NOT NULL, created_at DATETIME2 DEFAULT SYSUTCDATETIME(), updated_by VARCHAR(100), updated_at DATETIME2, CONSTRAINT fk_fi FOREIGN KEY (field_id) REFERENCES regulatory_fields(field_id));

CREATE TABLE field_versions (version_id BIGINT IDENTITY PRIMARY KEY, field_id BIGINT NOT NULL, version_no INT NOT NULL, snapshot_json NVARCHAR(MAX) NOT NULL, change_reason VARCHAR(MAX), changed_by VARCHAR(100) NOT NULL, changed_at DATETIME2 DEFAULT SYSUTCDATETIME(), CONSTRAINT fk_fv FOREIGN KEY (field_id) REFERENCES regulatory_fields(field_id), CONSTRAINT uq_fv UNIQUE (field_id, version_no));

CREATE TABLE audit_log (audit_id BIGINT IDENTITY PRIMARY KEY, entity_type VARCHAR(100) NOT NULL, entity_id BIGINT, action_type VARCHAR(100) NOT NULL, old_value NVARCHAR(MAX), new_value NVARCHAR(MAX), performed_by VARCHAR(100) NOT NULL, performed_at DATETIME2 DEFAULT SYSUTCDATETIME(), remarks VARCHAR(MAX));
