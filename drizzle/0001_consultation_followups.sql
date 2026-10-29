-- Optional-details delivery state only; no client details, counselling text or recordings.
-- The Contact handler also creates this table idempotently for existing deployments.
CREATE TABLE IF NOT EXISTS consultation_followups (
 booking_id TEXT PRIMARY KEY NOT NULL REFERENCES bookings(id),
 state TEXT NOT NULL DEFAULT 'available',
 expires_at INTEGER NOT NULL
);
