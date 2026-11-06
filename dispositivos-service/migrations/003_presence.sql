CREATE TABLE IF NOT EXISTS device_presence (
 device_id VARCHAR(64) PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
 state VARCHAR(16) NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS device_notification_outbox (
 id VARCHAR(36) PRIMARY KEY, device_id VARCHAR(64) NOT NULL, owner_id VARCHAR(64) NOT NULL,
 device_name VARCHAR(100) NOT NULL, kind VARCHAR(16) NOT NULL,
 created_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS device_notification_receipts (
 source_id VARCHAR(36) PRIMARY KEY REFERENCES device_notification_outbox(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ix_device_outbox_time ON device_notification_outbox(created_at,id);
