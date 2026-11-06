CREATE TABLE IF NOT EXISTS readings (
 id VARCHAR(36) PRIMARY KEY, device_id VARCHAR(64) NOT NULL,
 owner_id VARCHAR(64) NOT NULL, packet_id VARCHAR(36) NOT NULL,
 measured_at TIMESTAMPTZ NOT NULL, received_at TIMESTAMPTZ NOT NULL,
 measurements TEXT NOT NULL, payload_hash VARCHAR(64) NOT NULL,
 UNIQUE(device_id,packet_id)
);
CREATE INDEX IF NOT EXISTS ix_readings_device_time ON readings(device_id,measured_at DESC,id);
CREATE INDEX IF NOT EXISTS ix_readings_owner ON readings(owner_id);
ALTER TABLE readings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE readings FROM anon, authenticated;
