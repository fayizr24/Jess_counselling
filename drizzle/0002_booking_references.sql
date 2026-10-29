-- Short email references only; no client details. Created idempotently by the handler too.
CREATE TABLE IF NOT EXISTS booking_references (
 booking_id TEXT PRIMARY KEY NOT NULL REFERENCES bookings(id),
 reference TEXT NOT NULL UNIQUE
);
