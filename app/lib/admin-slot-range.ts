type Booking={id:string;kind:string;time:string};
type RangeSlot={minute:number;blocked:boolean;bookings:Booking[]};
export async function unblockSlotRange<T extends RangeSlot>(initial:T[],from:number,to:number,confirm:(message:string)=>boolean,save:(slot:T)=>Promise<T[]>){
 if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to>=1440||from%15||to%15||from>to)throw Error('Select a valid From and To time.');
 let current=initial,opened=0,skipped=0;
 const decisions=new Map<string,boolean>();
 for(let minute=from;minute<=to;minute+=15){
  const slot=current.find(s=>s.minute===minute);if(!slot)throw Error('Time slots are incomplete. Refresh and try again.');
  for(const booking of slot.bookings)if(!decisions.has(booking.id))decisions.set(booking.id,confirm('Release this slot by cancelling the following booking(s) and their entire automatic block? '+booking.kind+' at '+booking.time+'. Other manual or booking blocks will remain. Contact the client separately about cancellation.'));
  if(slot.bookings.some(b=>!decisions.get(b.id))){skipped++;continue;}
  // Open every point, including newly released buffers, so weekly closures cannot reappear.
  current=await save(slot);opened++;
 }
 return {opened,skipped};
}
