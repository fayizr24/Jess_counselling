type Booking={id:string;kind:string;time:string;appointmentType?:string;caseReference?:string};
type RangeSlot={minute:number;time?:string;blocked:boolean;manual?:boolean;enabled?:boolean;defaultBlocked?:boolean;bookings:Booking[]};
function validateRange<T extends RangeSlot>(slots:T[],from:number,to:number){
 if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to>=1440||from%15||to%15||from>to)throw Error('Select a valid From and To time.');
 for(let minute=from;minute<=to;minute+=15)if(!slots.some(s=>s.minute===minute))throw Error('Time slots are incomplete. Refresh and try again.');
}
/** Warn for each occupied quarter-hour; block only open points and never cancel bookings. */
export async function blockSlotRange<T extends RangeSlot>(initial:T[],from:number,to:number,confirm:(message:string)=>boolean,save:(slot:T)=>Promise<T[]>){
 validateRange(initial,from,to);let current=initial,blocked=0;const accepted=new Set<string>();
 function approve(slot:T){
  if(!slot.bookings.length)return true;
  const signature=slot.minute+':'+slot.bookings.map(b=>b.id).sort().join(',');if(accepted.has(signature))return true;
  const labels=slot.bookings.map(b=>(b.kind==='contact'?'Free consult':b.appointmentType||'Appointment')+' at '+b.time+(b.caseReference?' (Case ID: '+b.caseReference+')':'')).join('; ');
  if(!confirm(`The ${slot.time||Math.floor(slot.minute/60)+':'+String(slot.minute%60).padStart(2,'0')} slot is blocked by an existing booking or its automatic buffer: ${labels}. This booking will be left unchanged. Press OK to continue blocking the open slots in the selected interval, or Cancel to abort.`))return false;
  accepted.add(signature);return true;
 }
 for(const slot of initial.filter(s=>s.minute>=from&&s.minute<=to).sort((a,b)=>a.minute-b.minute))if(!approve(slot))return {blocked,aborted:true};
 for(let minute=from;minute<=to;minute+=15){
  const slot=current.find(s=>s.minute===minute);if(!slot)throw Error('Time slots are incomplete. Refresh and try again.');
  if(!approve(slot))return {blocked,aborted:true};
  if(slot.blocked||slot.bookings.length)continue;
  current=await save(slot);
  const updated=current.find(s=>s.minute===minute);if(!updated)throw Error('Time slots are incomplete. Refresh and try again.');
  if(!approve(updated))return {blocked,aborted:true};
  if(updated.manual)blocked++;
 }
 return {blocked,aborted:false};
}
/** Range Unblock opens schedule closures only. Bookings and manual blocks are never touched. */
export async function unblockSlotRange<T extends RangeSlot>(initial:T[],from:number,to:number,save:(slot:T)=>Promise<T[]>){
 validateRange(initial,from,to);let current=initial,opened=0,skipped=0;
 for(let minute=from;minute<=to;minute+=15){
  const slot=current.find(s=>s.minute===minute);if(!slot)throw Error('Time slots are incomplete. Refresh and try again.');
  if(slot.bookings.length){skipped++;continue;}
  if(!slot.blocked||!slot.defaultBlocked||slot.manual||slot.enabled)continue;
  current=await save(slot);
  const updated=current.find(s=>s.minute===minute);if(!updated)throw Error('Time slots are incomplete. Refresh and try again.');
  if(updated.bookings.length)skipped++;else if(!updated.blocked)opened++;
 }
 return {opened,skipped};
}
