import type {DailyForm} from './daily-submission';
export type ContactReceipt={time:string;date:string;day:string;contacts:{method:string;detail:string}[]};
type Receipt={data:ContactReceipt|Record<string,string>;message:string};
const key=(form:DailyForm)=>`jess-counselling:${form}:acknowledgement`;
export function saveAcknowledgement(form:DailyForm,data:Receipt['data'],message='',storage?:Pick<Storage,'setItem'>|null){
 try{(storage===undefined?localStorage:storage)?.setItem(key(form),JSON.stringify({version:1,data,message}));}catch{}
}
export function readAcknowledgement(form:'contact',storage?:Pick<Storage,'getItem'>|null):{data:ContactReceipt;message:string}|null;
export function readAcknowledgement(form:'appointment',storage?:Pick<Storage,'getItem'>|null):{data:Record<string,string>;message:string}|null;
export function readAcknowledgement(form:DailyForm,storage?:Pick<Storage,'getItem'>|null):Receipt|null{
 try{const saved=JSON.parse((storage===undefined?localStorage:storage)?.getItem(key(form))||'null');if(!saved||saved.version!==1||typeof saved.message!=='string'||!saved.data||typeof saved.data!=='object')return null;
 const d=saved.data;if(form==='contact'){
 if(!['time','date','day'].every(k=>typeof d[k]==='string')||!Array.isArray(d.contacts)||!d.contacts.every((c:ContactReceipt['contacts'][number])=>c&&typeof c.method==='string'&&typeof c.detail==='string'))return null;
 }else if(Array.isArray(d)||!Object.keys(d).length||!Object.values(d).every(v=>typeof v==='string'))return null;
 return {data:d,message:saved.message};}catch{return null;}
}
