CREATE TABLE IF NOT EXISTS analysis_samples (
 reading_id VARCHAR(36) PRIMARY KEY, device_id VARCHAR(64) NOT NULL, owner_id VARCHAR(64) NOT NULL,
 measured_at TIMESTAMPTZ NOT NULL, received_at TIMESTAMPTZ NOT NULL,
 temperature_c DOUBLE PRECISION, humidity_pct DOUBLE PRECISION, pressure_hpa DOUBLE PRECISION,
 temperature_bmp_c DOUBLE PRECISION, rain_detected INTEGER,
 CHECK(rain_detected IN (0,1))
);
CREATE INDEX IF NOT EXISTS ix_analysis_owner_device_time ON analysis_samples(owner_id,device_id,measured_at);
