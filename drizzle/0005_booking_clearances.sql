CREATE TABLE IF NOT EXISTS booking_clearances (booking_id TEXT PRIMARY KEY NOT NULL REFERENCES bookings(id), forward_minutes INTEGER NOT NULL);
