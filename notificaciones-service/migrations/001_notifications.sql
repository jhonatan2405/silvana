CREATE TABLE IF NOT EXISTS notification_preferences (
 owner_id VARCHAR(64) PRIMARY KEY, web_enabled BOOLEAN NOT NULL DEFAULT TRUE,
 opened_enabled BOOLEAN NOT NULL DEFAULT TRUE, resolved_enabled BOOLEAN NOT NULL DEFAULT TRUE,
 email_enabled BOOLEAN NOT NULL DEFAULT FALSE, email VARCHAR(254), updated_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS notifications (
 id VARCHAR(36) PRIMARY KEY, source_id VARCHAR(64) NOT NULL UNIQUE,
 event_id VARCHAR(36) NOT NULL, owner_id VARCHAR(64) NOT NULL, device_id VARCHAR(64) NOT NULL,
 kind VARCHAR(16) NOT NULL CHECK(kind IN ('opened','resolved')), title VARCHAR(160) NOT NULL,
 body TEXT NOT NULL, metric VARCHAR(40) NOT NULL, value DOUBLE PRECISION NOT NULL,
 threshold DOUBLE PRECISION NOT NULL, measured_at TIMESTAMPTZ NOT NULL,
 source_created_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL, read_at TIMESTAMPTZ,
 visible BOOLEAN NOT NULL, email_to VARCHAR(254), email_status VARCHAR(16) NOT NULL DEFAULT 'disabled',
 email_attempts INTEGER NOT NULL DEFAULT 0, email_sent_at TIMESTAMPTZ, email_retry_at TIMESTAMPTZ,
 email_locked_until TIMESTAMPTZ, email_error VARCHAR(40),
 CHECK(email_status IN ('disabled','pending','processing','sent','failed','cancelled'))
);
CREATE INDEX IF NOT EXISTS ix_notifications_owner_time ON notifications(owner_id,created_at DESC,id);
CREATE INDEX IF NOT EXISTS ix_notifications_email_queue ON notifications(email_status,email_retry_at);
