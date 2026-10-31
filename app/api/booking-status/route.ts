import {env} from 'cloudflare:workers';
import {notificationWarning} from '../../lib/booking-messages';

const headers={'Cache-Control':'no-store, private','Vary':'Idempotency-Key','Referrer-Policy':'no-referrer'};
const json=(data:unknown,status=200)=>Response.json(data,{status,headers});

/** Read-only recovery: the private random request key is a bearer capability.
 * Never accept a public Case ID or put request keys in URLs/log messages. */
export async function POST(request:Request){
 const key=request.headers.get('Idempotency-Key')||'';
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key))return json({error:'Invalid submission reference.'},400);
 if(Number(request.headers.get('content-length')||0)>256)return json({error:'Invalid status request.'},400);
 let kind:unknown;
 try{kind=((await request.json()) as {kind?:unknown})?.kind;}catch{return json({error:'Invalid status request.'},400);}
 if(kind!=='contact'&&kind!=='appointment')return json({error:'Invalid status request.'},400);
 try{
  const binding=env.DB;if(!binding)return json({error:'Booking status is temporarily unavailable.'},503);const db=binding;
  const row=await db.prepare('SELECT id,date,minute,created,active,notification FROM bookings WHERE request_key=? AND kind=?').bind(key,kind).first<{id:string;date:string;minute:number;created:string;active:number;notification:string}>();
  if(!row)return json({state:'not_found'});
  if(!row.active)return json({state:'cancelled'});
  // Read existing metadata only. Older installations may not have either optional table.
  async function reference(table:'booking_references'|'booking_case_inputs'){
   try{return (await db.prepare(`SELECT reference FROM ${table} WHERE booking_id=?`).bind(row!.id).first<{reference:string}>())?.reference||'';}
   catch(error){if(/no such table/i.test(String(error)))return '';throw error;}
  }
  const generated=await reference('booking_references');
  const caseId=generated||(kind==='appointment'?await reference('booking_case_inputs'):'');
  const notification=row.notification==='sent'?'sent':row.notification==='failed'?'failed':'pending';
  return json({state:'booked',bookingId:row.id,bookingReference:caseId,date:row.date,minute:row.minute,submittedAt:Date.parse(row.created),notification,warning:notificationWarning(notification)});
 }catch{return json({error:'Booking status is temporarily unavailable.'},503);}
}
