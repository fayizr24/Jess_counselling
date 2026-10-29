CREATE TABLE IF NOT EXISTS contact_booking_sequence (
  number INTEGER PRIMARY KEY NOT NULL CHECK(number>=100),
  booking_id TEXT NOT NULL UNIQUE REFERENCES bookings(id)
);
