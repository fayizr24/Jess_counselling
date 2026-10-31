const key='jess-counselling:receipt:passcode-attempts';
const indiaOffset=19800000;
export function receiptPasscodeDay(now=Date.now()){return new Date(now+indiaOffset).toISOString().slice(0,10);}
export function nextIndianMidnight(now=Date.now()){return Date.parse(receiptPasscodeDay(now)+'T00:00:00Z')+86400000-indiaOffset;}
/** Local browser deterrent only. No passcode or receipt details are persisted. */
export function createReceiptPasscodeGuard(storage:Pick<Storage,'getItem'|'setItem'>|null,clock=Date.now){
 let memory={day:'',failures:0};
 function state(){
  const day=receiptPasscodeDay(clock());if(memory.day!==day)memory={day,failures:0};
  try{const saved=JSON.parse(storage?.getItem(key)||'null');if(saved?.day===day&&Number.isInteger(saved.failures)&&saved.failures>=0)memory.failures=Math.max(memory.failures,Math.min(3,saved.failures));}catch{}
  return {...memory,locked:memory.failures>=3};
 }
 function save(failures:number){memory={day:receiptPasscodeDay(clock()),failures};try{storage?.setItem(key,JSON.stringify(memory));}catch{}return state();}
 return {state,failed(){const current=state();return save(Math.min(3,current.failures+1));},succeeded(){return state();}};
}
