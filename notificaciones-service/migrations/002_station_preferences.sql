-- PostgreSQL. initializeNotifications aplica la misma columna con compatibilidad SQLite.
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS station_enabled BOOLEAN NOT NULL DEFAULT TRUE;
