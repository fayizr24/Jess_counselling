import {bookingRequest,RECOVERY_UNCERTAIN,SUBMISSION_ERROR} from './booking-messages';

export type RecoveryForm='contact'|'free'|'appointment'|'apt';
export type BookingReply={error?:string;warning?:string;bookingId?:string;bookingReference?:string};
export type PendingBooking={version:1;form:RecoveryForm;key:string;startedAt:number;details:Record<string,string>};
export type RecoveredBooking={data:BookingReply;submittedAt:number};
type Store=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
const memory=new Map<RecoveryForm,PendingBooking>();
const storageKey=(form:RecoveryForm)=>`jess-counselling:${form}:pending-submission`;
function storage():Store|null{try{return localStorage;}catch{return null;}}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function readPendingBooking(form:RecoveryForm,store=storage()):PendingBooking|null{
 try{const value=JSON.parse(store?.getItem(storageKey(form))||'null');
  if(value?.version===1&&value.form===form&&uuid.test(value.key)&&Number.isFinite(value.startedAt)&&value.details&&typeof value.details==='object'&&!Array.isArray(value.details)&&Object.values(value.details).every(v=>typeof v==='string'))return value;
 }catch{}
 return memory.get(form)||null;
}
export function beginPendingBooking(form:RecoveryForm,body:FormData,key:string,store=storage()):PendingBooking{
 if(!uuid.test(key))throw Error('Invalid submission reference. Please refresh the form.');
 if(readPendingBooking(form,store))throw Error(RECOVERY_UNCERTAIN);
 // Persist acknowledgement fields only. Never retain counselling text, topics, age or audio.
 const allowed=new Set(['name','confirmation email','contact methods','Google Meet WhatsApp or email','callback date','callback time (Indian Time)','appointment date','appointment time (Indian Time)','appointment type','booking id','booking source','submission mode']);
 const details:Record<string,string>={};body.forEach((value,name)=>{if(typeof value==='string'&&(allowed.has(name)||name.startsWith('contact_')))details[name]=value;});
 const pending:PendingBooking={version:1,form,key,startedAt:Date.now(),details};memory.set(form,pending);
 try{store?.setItem(storageKey(form),JSON.stringify(pending));}catch{}
 return pending;
}
export function clearPendingBooking(pending:PendingBooking,store=storage()){
 if(memory.get(pending.form)?.key===pending.key)memory.delete(pending.form);
 try{const saved=JSON.parse(store?.getItem(storageKey(pending.form))||'null');if(saved?.key===pending.key)store?.removeItem(storageKey(pending.form));}catch{}
}
export function pendingFormData(pending:PendingBooking){const form=new FormData();for(const [name,value]of Object.entries(pending.details))form.set(name,value);return form;}
export class CancelledBooking extends Error{constructor(){super('The original booking has been cancelled. No new booking was made. Please select a new slot if required.');}}
type StatusReply=BookingReply&{state?:string;submittedAt?:number;date?:string;minute?:number;notification?:string};
type RecoveryOptions={fetcher?:typeof fetch;pause?:(ms:number)=>Promise<void>;delays?:number[]};
async function statusRequest(pending:PendingBooking,fetcher:typeof fetch){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000);
 try{
  const response=await fetcher('/api/booking-status',{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','Idempotency-Key':pending.key},body:JSON.stringify({kind:pending.form==='contact'||pending.form==='free'?'contact':'appointment'}),signal:controller.signal});
  if(!response.ok)throw Error(RECOVERY_UNCERTAIN);return await response.json() as StatusReply;
 }finally{clearTimeout(timer);}
}
/** Only reads status. A missing row or failed lookup is never proof a booking failed. */
export async function recoverPendingBooking(pending:PendingBooking,options:RecoveryOptions={}):Promise<RecoveredBooking>{
 const fetcher=options.fetcher||fetch,pause=options.pause||(ms=>new Promise(resolve=>setTimeout(resolve,ms)));
 let found:RecoveredBooking|undefined;
 for(const delay of options.delays||[0,1000,2000,4000,8000]){
  if(delay)await pause(delay);
  try{
   const data=await statusRequest(pending,fetcher);
   if(data.state==='cancelled')throw new CancelledBooking();
   if(data.state==='booked'&&typeof data.bookingId==='string'&&data.bookingId&&typeof data.submittedAt==='number'&&Number.isFinite(data.submittedAt)){
    found={data,submittedAt:data.submittedAt};if(data.notification==='sent'||data.notification==='failed')return found;
   }
  }catch(error){if(error instanceof CancelledBooking)throw error;}
 }
 if(found)return found;
 throw Error(RECOVERY_UNCERTAIN);
}
/** A failed transport/server response triggers status reads, never another booking POST. */
export async function sendRecoverableBooking(url:string,body:FormData,pending:PendingBooking,onChecking:()=>void){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),40000);
 try{
  const result=await bookingRequest<BookingReply>(url,{method:'POST',body,headers:{'Idempotency-Key':pending.key},signal:controller.signal},SUBMISSION_ERROR);
  if(result.response.status<500){
   if(!result.response.ok)return {...result,submittedAt:pending.startedAt};
   if(typeof result.data.bookingId==='string'&&result.data.bookingId)return {...result,submittedAt:pending.startedAt};
  }
 }catch{}finally{clearTimeout(timer);}
 onChecking();const recovered=await recoverPendingBooking(pending);
 return {response:{ok:true,status:200},...recovered};
}
