ALTER TABLE devices ADD COLUMN IF NOT EXISTS hardware_id VARCHAR(40);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS sensors_json TEXT DEFAULT '[]';
CREATE UNIQUE INDEX IF NOT EXISTS ix_devices_hardware ON devices(hardware_id);
CREATE TABLE IF NOT EXISTS pairing_codes(token_hash VARCHAR(64) PRIMARY KEY,owner_id VARCHAR(64) NOT NULL,device_id VARCHAR(64),expires_at TIMESTAMPTZ NOT NULL,hardware_id VARCHAR(40),credential_hash VARCHAR(64));
ALTER TABLE pairing_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE pairing_codes FROM anon,authenticated;
