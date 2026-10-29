CREATE TABLE IF NOT EXISTS booking_appointment_types (booking_id TEXT PRIMARY KEY NOT NULL REFERENCES bookings(id), appointment_type TEXT NOT NULL);
