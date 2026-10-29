export type ContactFollowup={bookingId:string;key:string;expiresAt:number;fields:[string,string][]};
const storageKey='jess-counselling:contact:optional-followup';
let memoryOnly=false,memory:ContactFollowup|null=null;
export function readContactFollowup():ContactFollowup|null{
 try{const data=memoryOnly?memory:JSON.parse(localStorage.getItem(storageKey)||'null');if(!data)return null;
 if(typeof data.bookingId!=='string'||typeof data.key!=='string'||typeof data.expiresAt!=='number'||data.expiresAt<=Date.now()||!Array.isArray(data.fields)||!data.fields.every((x:unknown)=>Array.isArray(x)&&x.length===2&&x.every(v=>typeof v==='string'))){saveContactFollowup(null);return null;}return data;
 }catch{return memory&&memory.expiresAt>Date.now()?memory:null;}
}
export function saveContactFollowup(data:ContactFollowup|null){memory=data;try{if(data)localStorage.setItem(storageKey,JSON.stringify(data));else localStorage.removeItem(storageKey);memoryOnly=false;}catch{memoryOnly=true;}}
