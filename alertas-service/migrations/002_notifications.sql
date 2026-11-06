CREATE TABLE IF NOT EXISTS alert_notification_outbox (
 id VARCHAR(64) PRIMARY KEY, event_id VARCHAR(36) NOT NULL, owner_id VARCHAR(64) NOT NULL,
 device_id VARCHAR(64) NOT NULL, kind VARCHAR(16) NOT NULL CHECK(kind IN ('opened','resolved')),
 rule_name VARCHAR(100) NOT NULL, metric VARCHAR(40) NOT NULL, value DOUBLE PRECISION NOT NULL,
 threshold DOUBLE PRECISION NOT NULL, measured_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL,
 reason VARCHAR(24) NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_alert_outbox_time ON alert_notification_outbox(created_at,id);
CREATE TABLE IF NOT EXISTS alert_notification_receipts (
 source_id VARCHAR(64) PRIMARY KEY REFERENCES alert_notification_outbox(id) ON DELETE CASCADE
);
INSERT INTO alert_notification_outbox(id,event_id,owner_id,device_id,kind,rule_name,metric,value,threshold,measured_at,created_at,reason)
 SELECT id || ':opened',id,owner_id,device_id,'opened',rule_name,metric,value,threshold,measured_at,created_at,'condition'
 FROM alert_events WHERE 1=1 ON CONFLICT(id) DO NOTHING;
INSERT INTO alert_notification_outbox(id,event_id,owner_id,device_id,kind,rule_name,metric,value,threshold,measured_at,created_at,reason)
 SELECT id || ':resolved',id,owner_id,device_id,'resolved',rule_name,metric,value,threshold,measured_at,resolved_at,'recovered_or_changed'
 FROM alert_events WHERE resolved_at IS NOT NULL ON CONFLICT(id) DO NOTHING;
