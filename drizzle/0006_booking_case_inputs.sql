CREATE TABLE IF NOT EXISTS booking_case_inputs (booking_id TEXT PRIMARY KEY NOT NULL REFERENCES bookings(id), reference TEXT NOT NULL);
