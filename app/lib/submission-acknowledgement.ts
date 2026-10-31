import {indianSubmissionDay,type DailyForm} from './daily-submission';
type ReceiptForm=DailyForm|'apt'|'free';
export type ContactReceipt={bookingId?:string;submittedWithoutOptionalDetails?:boolean;time:string;date:string;day:string;contacts:{method:string;detail:string}[]};
type Receipt={data:ContactReceipt|Record<string,string>;message:string;expiresAt:number};
export function acknowledgementExpiry(submittedAt=Date.now()){const nextMidnight=(Math.floor((submittedAt+19800000)/86400000)+1)*86400000-19800000;return Math.max(nextMidnight,submittedAt+15*60000);}
const key=(form:ReceiptForm)=>`jess-counselling:${form}:acknowledgement`;
export function saveAcknowledgement(form:ReceiptForm,data:Receipt['data'],message='',storage?:Pick<Storage,'setItem'>|null,submittedAt=Date.now()){
 const expiresAt=acknowledgementExpiry(submittedAt);try{(storage===undefined?localStorage:storage)?.setItem(key(form),JSON.stringify({version:1,data,message,submittedAt,submittedDay:indianSubmissionDay(submittedAt)}));}catch{}return expiresAt;
}
export function readAcknowledgement(form:'contact'|'free',storage?:(Pick<Storage,'getItem'>&Partial<Pick<Storage,'removeItem'>>)|null):{data:ContactReceipt;message:string;expiresAt:number}|null;
export function readAcknowledgement(form:'appointment'|'apt',storage?:(Pick<Storage,'getItem'>&Partial<Pick<Storage,'removeItem'>>)|null):{data:Record<string,string>;message:string;expiresAt:number}|null;
export function readAcknowledgement(form:ReceiptForm,storage?:(Pick<Storage,'getItem'>&Partial<Pick<Storage,'removeItem'>>)|null):Receipt|null{
 try{const saved=JSON.parse((storage===undefined?localStorage:storage)?.getItem(key(form))||'null');if(!saved||saved.version!==1||typeof saved.message!=='string'||!saved.data||typeof saved.data!=='object')return null;
 const store=storage===undefined?localStorage:storage;
 const day=saved.submittedDay||store?.getItem(`jess-counselling:${form}:last-successful-day`);
 const expiresAt=(form==='apt'||form==='free')?Infinity:typeof saved.submittedAt==='number'&&Number.isFinite(saved.submittedAt)?acknowledgementExpiry(saved.submittedAt):typeof day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(day)?Date.parse(day+'T00:00:00+05:30')+86400000:0;
 if(form!=='apt'&&form!=='free'&&Date.now()>=expiresAt){try{store?.removeItem?.(key(form));}catch{}return null;}
 const d=saved.data;if(form==='contact'||form==='free'){
 if((d.bookingId!==undefined&&typeof d.bookingId!=='string')||!['time','date','day'].every(k=>typeof d[k]==='string')||!Array.isArray(d.contacts)||!d.contacts.every((c:ContactReceipt['contacts'][number])=>c&&typeof c.method==='string'&&typeof c.detail==='string'))return null;
 }else if(Array.isArray(d)||!Object.keys(d).length||!Object.values(d).every(v=>typeof v==='string'))return null;
 return {data:d,message:saved.message,expiresAt};}catch{return null;}
}

/** Move the existing receipt after optional completion without renewing its lifetime. */
export function completeContactAcknowledgement(storage?:(Pick<Storage,'getItem'|'setItem'>&Partial<Pick<Storage,'removeItem'>>)|null,bookingId?:string){
 try{const store=storage===undefined?localStorage:storage;if(!readAcknowledgement('contact',store))return;
 const saved=JSON.parse(store?.getItem(key('contact'))||'null');saved.data.submittedWithoutOptionalDetails=false;if(bookingId)saved.data.bookingId=bookingId;store?.setItem(key('contact'),JSON.stringify(saved));}catch{}
}

export function clearAcknowledgement(form:ReceiptForm){try{localStorage.removeItem(key(form));}catch{}}
