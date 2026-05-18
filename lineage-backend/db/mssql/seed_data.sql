-- Sample users
INSERT INTO app_users (username, display_name, email, status) VALUES
('puneet.sharma', 'Puneet Sharma', 'puneet@example.com', 'ACTIVE'),
('alice.developer', 'Alice Developer', 'alice@example.com', 'ACTIVE');

-- Sample roles
INSERT INTO app_roles (role_name, description) VALUES
('LINEAGE_VIEWER', 'View lineage data'),
('LINEAGE_ANALYST', 'View and analyze lineage'),
('LINEAGE_ADMIN', 'Full access');

-- Assign roles to users
INSERT INTO app_user_roles (user_id, role_id) SELECT u.user_id, r.role_id FROM app_users u, app_roles r WHERE u.username = 'puneet.sharma' AND r.role_name = 'LINEAGE_ADMIN';

-- Screen access
INSERT INTO app_screen_access (role_id, screen_code, can_view)
SELECT role_id, 'FIELDS', 1 FROM app_roles WHERE role_name IN ('LINEAGE_VIEWER', 'LINEAGE_ANALYST', 'LINEAGE_ADMIN');

INSERT INTO app_screen_access (role_id, screen_code, can_view)
SELECT role_id, 'COMPARISON', 1 FROM app_roles WHERE role_name IN ('LINEAGE_ANALYST', 'LINEAGE_ADMIN');

-- Jurisdictions
INSERT INTO jurisdictions (jurisdiction_code, jurisdiction_name, region, regulator_name, reporting_regime, owner_team, status, created_by)
VALUES
('JFSA', 'Japan FSA', 'Asia', 'Financial Services Agency', 'Forex', 'Regulatory', 'ACTIVE', 'admin'),
('MAS', 'Monetary Authority Singapore', 'Asia', 'Monetary Authority', 'OTC Derivatives', 'Regulatory', 'ACTIVE', 'admin'),
('ASIC', 'Australian Securities', 'APAC', 'ASIC', 'Trade Reporting', 'Regulatory', 'ACTIVE', 'admin');

-- Sample fields for JFSA
INSERT INTO regulatory_fields (jurisdiction_id, internal_field_name, external_display_name, business_name, data_type, criticality, status, created_by)
SELECT jurisdiction_id, 'TRADE_ID', 'Trade Identifier', 'Trade ID', 'STRING', 'HIGH', 'APPROVED', 'admin'
FROM jurisdictions WHERE jurisdiction_code = 'JFSA';

INSERT INTO regulatory_fields (jurisdiction_id, internal_field_name, external_display_name, business_name, data_type, criticality, status, created_by)
SELECT jurisdiction_id, 'TRADE_TIMESTAMP', 'Trade Timestamp', 'Trade Time', 'TIMESTAMP', 'HIGH', 'APPROVED', 'admin'
FROM jurisdictions WHERE jurisdiction_code = 'JFSA';

-- Field interpretations
INSERT INTO field_interpretations (field_id, business_interpretation, technical_interpretation, status, created_by)
SELECT field_id, 'Unique identifier for each trade', 'UUID in database', 'APPROVED', 'admin'
FROM regulatory_fields WHERE internal_field_name = 'TRADE_ID';
