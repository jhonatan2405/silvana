CREATE TABLE IF NOT EXISTS alert_rules (
 id VARCHAR(36) PRIMARY KEY, owner_id VARCHAR(64) NOT NULL, device_id VARCHAR(64) NOT NULL,
 name VARCHAR(100) NOT NULL, metric VARCHAR(40) NOT NULL, operator VARCHAR(4) NOT NULL,
 threshold DOUBLE PRECISION NOT NULL, enabled BOOLEAN NOT NULL, deleted BOOLEAN NOT NULL DEFAULT FALSE,
 created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL,
 CHECK(metric IN ('temperature_c','humidity_pct','pressure_hpa','temperature_bmp_c','rain_detected')),
 CHECK(operator IN ('gt','gte','lt','lte','eq'))
);
CREATE INDEX IF NOT EXISTS ix_rules_owner_device ON alert_rules(owner_id,device_id);
CREATE TABLE IF NOT EXISTS alert_events (
 id VARCHAR(36) PRIMARY KEY, rule_id VARCHAR(36) NOT NULL REFERENCES alert_rules(id),
 owner_id VARCHAR(64) NOT NULL, device_id VARCHAR(64) NOT NULL, reading_id VARCHAR(36) NOT NULL,
 rule_name VARCHAR(100) NOT NULL, metric VARCHAR(40) NOT NULL, operator VARCHAR(4) NOT NULL,
 threshold DOUBLE PRECISION NOT NULL, value DOUBLE PRECISION NOT NULL,
 measured_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL,
 acknowledged_at TIMESTAMPTZ, resolved_at TIMESTAMPTZ,
 UNIQUE(rule_id,reading_id)
);
CREATE INDEX IF NOT EXISTS ix_events_owner_device_time ON alert_events(owner_id,device_id,created_at DESC,id);
CREATE TABLE IF NOT EXISTS alert_states (
 rule_id VARCHAR(36) PRIMARY KEY REFERENCES alert_rules(id), active_event_id VARCHAR(36),
 last_measured_at TIMESTAMPTZ NOT NULL, last_reading_id VARCHAR(36) NOT NULL
);
