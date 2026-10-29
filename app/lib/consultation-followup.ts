import {database,BookingError} from './booking-store';
// Delivery metadata only: client names, contacts, counselling text and audio remain email-only.
export const FOLLOWUP_SCHEMA=`CREATE TABLE IF NOT EXISTS consultation_followups (booking_id TEXT PRIMARY KEY NOT NULL REFERENCES bookings(id), state TEXT NOT NULL DEFAULT 'available', expires_at INTEGER NOT NULL)`;
export async function ensureFollowups(){await database().prepare(FOLLOWUP_SCHEMA).run();}
export async function followupExpiry(id:string){await ensureFollowups();const row=await database().prepare("SELECT expires_at FROM consultation_followups WHERE booking_id=? AND state!='sent' AND expires_at>?").bind(id,Date.now()).first<{expires_at:number}>();return row?.expires_at||0;}
export async function claimFollowup(id:string,key:string){
 await ensureFollowups();
 const row=await database().prepare("SELECT f.state,f.expires_at FROM consultation_followups f JOIN bookings b ON b.id=f.booking_id WHERE b.id=? AND b.request_key=? AND b.kind='contact' AND b.active=1").bind(id,key).first<{state:string;expires_at:number}>();
 if(!row||row.expires_at<=Date.now())throw new BookingError('This optional-details submission is no longer available. Please contact us by email or WhatsApp.',403);
 if(row.state==='sent')return false;
 const claimed=await database().prepare("UPDATE consultation_followups SET state='sending' WHERE booking_id=? AND state IN ('available','failed') AND expires_at>? RETURNING booking_id").bind(id,Date.now()).first();
 if(!claimed)throw new BookingError('Optional details are already being submitted. Please wait.',409);
 return true;
}
export async function finishFollowup(id:string,state:'sent'|'failed'){await database().prepare('UPDATE consultation_followups SET state=? WHERE booking_id=?').bind(state,id).run();}
