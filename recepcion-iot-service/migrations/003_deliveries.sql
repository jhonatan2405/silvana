CREATE TABLE IF NOT EXISTS reading_deliveries (
 consumer VARCHAR(16) NOT NULL, reading_id VARCHAR(36) NOT NULL REFERENCES readings(id) ON DELETE CASCADE,
 PRIMARY KEY(consumer,reading_id)
);
CREATE INDEX IF NOT EXISTS ix_readings_received ON readings(received_at,id);
