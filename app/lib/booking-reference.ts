// Case ID generation: shared sequence + Indian month/year + name initials. Internal booking UUIDs and request keys remain private.
export const BOOKING_REFERENCE_SCHEMA=`CREATE TABLE IF NOT EXISTS booking_references (booking_id TEXT PRIMARY KEY NOT NULL REFERENCES bookings(id), reference TEXT NOT NULL UNIQUE)`;
export const CONTACT_SEQUENCE_SCHEMA=`CREATE TABLE IF NOT EXISTS contact_booking_sequence (number INTEGER PRIMARY KEY NOT NULL CHECK(number>=100), booking_id TEXT NOT NULL UNIQUE REFERENCES bookings(id))`;
export function bookingMonthPrefix(submittedAt=Date.now()){
 const indianDate=new Date(submittedAt+19800000).toISOString();return indianDate.slice(5,7)+indianDate.slice(2,4);
}
export async function ensureBookingReferences(db:D1Database){await db.batch([db.prepare(BOOKING_REFERENCE_SCHEMA),db.prepare(CONTACT_SEQUENCE_SCHEMA)]);}
export function bookingNameCode(name:string){
 const letters=Array.from(name.normalize("NFKC").toUpperCase()).filter(letter=>/\p{L}/u.test(letter));
 return letters.slice(0,2).join("").padEnd(2,"X");
}
export function contactReferenceStatements(db:D1Database,id:string,submittedAt:number,name:string){
 // Both statements run in the reservation batch: read the last saved sequence,
 // allocate its successor, and save the public reference atomically with the booking.
 return [
  db.prepare('INSERT INTO contact_booking_sequence(number,booking_id) SELECT COALESCE(MAX(number),99)+1,? FROM contact_booking_sequence HAVING EXISTS(SELECT 1 FROM bookings WHERE id=? AND kind IN (\'contact\',\'appointment\'))').bind(id,id),
  db.prepare('INSERT INTO booking_references(booking_id,reference) SELECT booking_id,CAST(number AS TEXT)||? FROM contact_booking_sequence WHERE booking_id=?').bind('-'+bookingMonthPrefix(submittedAt)+'-'+bookingNameCode(name),id)
 ];
}
export async function readBookingReference(db:D1Database,id:string,fallback=id){
 await ensureBookingReferences(db);const row=await db.prepare('SELECT reference FROM booking_references WHERE booking_id=?').bind(id).first<{reference:string}>();return row?.reference||fallback;
}

// Reused client-entered references are display metadata, never sequence allocations or uniqueness checks.
export const BOOKING_CASE_INPUT_SCHEMA="CREATE TABLE IF NOT EXISTS booking_case_inputs (booking_id TEXT PRIMARY KEY NOT NULL REFERENCES bookings(id), reference TEXT NOT NULL)";
export async function ensureCaseDisplayReferences(db:D1Database){await db.batch([db.prepare(BOOKING_REFERENCE_SCHEMA),db.prepare(BOOKING_CASE_INPUT_SCHEMA)]);}
