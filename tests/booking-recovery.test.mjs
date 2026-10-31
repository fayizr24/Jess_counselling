import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import ts from 'typescript';

function loader(env={}){
 globalThis.__recoveryEnv=env;const cache=new Map(),generation=crypto.randomUUID();
 function url(file){file=resolve(file);if(cache.has(file))return cache.get(file);
  let code=ts.transpile(readFileSync(file,'utf8'),{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022});
  code=code.replace(/import \{\s*env\s*\} from ['"]cloudflare:workers['"];?/g,'const env=globalThis.__recoveryEnv;');
  code=code.replace(/from (["'])(\.\.?\/[^"']+)\1/g,(_,q,path)=>'from '+JSON.stringify(url(resolve(dirname(file),path+'.ts'))));
  const result='data:text/javascript;base64,'+Buffer.from(code).toString('base64')+'#'+generation;cache.set(file,result);return result;
 }return file=>import(url(file));
}
function store(){const data=new Map();return {data,getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};}
function fields(){const f=new FormData();for(const [k,v]of Object.entries({name:'Client','contact methods':'WhatsApp',contact_WhatsApp:'123','callback date':'14 Oct 2030','callback time (Indian Time)':'8:00 PM','appointment date':'14 Oct 2030','appointment time (Indian Time)':'8:00 PM','appointment type':'Follow-up (30 min session)','booking id':'','support requested':'Private topic','additional information':'Private concerns',age:'35'}))f.set(k,v);f.set('voice recording',new Blob(['private voice']));return f;}
const saved=(notification='sent')=>({state:'booked',bookingId:'internal-booking',bookingReference:'100-1026-CL',submittedAt:Date.now(),notification,warning:notification==='sent'?undefined:'Delivery unconfirmed'});

test('pending snapshots persist before sending, isolate all four forms and exclude optional details/audio',async()=>{
 const load=loader(),a=await load('app/lib/booking-recovery.ts'),disk=store();
 for(const form of ['contact','free','appointment','apt']){
  const p=a.beginPendingBooking(form,fields(),crypto.randomUUID(),disk);
  assert.equal(a.readPendingBooking(form,disk).key,p.key);assert.equal(p.details.contact_WhatsApp,'123');
  for(const key of ['support requested','additional information','voice recording','age'])assert.equal(p.details[key],undefined);
  assert.throws(()=>a.beginPendingBooking(form,fields(),crypto.randomUUID(),disk),/original submission/);
 }
 const fresh=await loader()('app/lib/booking-recovery.ts');
 for(const form of ['contact','free','appointment','apt']){const p=fresh.readPendingBooking(form,disk);assert.ok(p);assert.equal(fresh.pendingFormData(p).get('name'),'Client');fresh.clearPendingBooking(p,disk);assert.equal(fresh.readPendingBooking(form,disk),null);}
});

test('lost/non-JSON/5xx booking responses recover by status only and never POST another booking',async()=>{
 const original=globalThis.fetch,local=globalThis.localStorage;globalThis.localStorage=store();
 try{for(const failure of ['disconnect','1102','json-503','invalid-success']){
  const a=await loader()('app/lib/booking-recovery.ts'),p=a.beginPendingBooking('appointment',fields(),crypto.randomUUID());let bookings=0,checks=0,checking=0;
  globalThis.fetch=async(url,init)=>{assert.equal(init.headers['Idempotency-Key'],p.key);
   if(url==='/api/appointment'){bookings++;assert.equal(a.readPendingBooking('appointment').key,p.key);if(failure==='disconnect')throw Error('connection lost');if(failure==='1102')return new Response('<html>Error 1102</html>',{status:500});if(failure==='json-503')return Response.json({error:'server error'},{status:503});return Response.json({ok:true});}
   assert.equal(url,'/api/booking-status');checks++;assert.equal(init.cache,'no-store');assert.ok(!url.includes(p.key));return Response.json(saved());
  };
  const result=await a.sendRecoverableBooking('/api/appointment',fields(),p,()=>checking++);
  assert.equal(result.data.bookingReference,'100-1026-CL');assert.equal(result.response.ok,true);assert.equal(bookings,1);assert.equal(checks,1);assert.equal(checking,1);a.clearPendingBooking(p);
 }}finally{globalThis.fetch=original;globalThis.localStorage=local;}
});

test('missing rows, failed lookups and non-JSON status responses remain uncertain and cannot clear a pending booking',async()=>{
 const a=await loader()('app/lib/booking-recovery.ts'),disk=store(),p=a.beginPendingBooking('contact',fields(),crypto.randomUUID(),disk);
 for(const outcome of ['missing','503','disconnect','invalid']){let count=0;await assert.rejects(a.recoverPendingBooking(p,{delays:[0,1,2],pause:async()=>{},fetcher:async()=>{count++;if(outcome==='disconnect')throw Error('offline');if(outcome==='503')return new Response('1102',{status:503});return Response.json(outcome==='missing'?{state:'not_found'}:{state:'booked'});}}),/could not confirm/);assert.equal(count,3);assert.equal(a.readPendingBooking('contact',disk).key,p.key);}
});

test('email pending is not called failed; recovery waits briefly for an in-flight send and keeps original submission time',async()=>{
 const a=await loader()('app/lib/booking-recovery.ts'),messages=await loader()('app/lib/booking-messages.ts'),p={version:1,form:'free',key:crypto.randomUUID(),startedAt:1,details:{}};let count=0;
 const result=await a.recoverPendingBooking(p,{delays:[0,1],pause:async()=>{},fetcher:async()=>Response.json({...saved(++count===1?'pending':'sent'),submittedAt:1234})});assert.equal(count,2);assert.equal(result.submittedAt,1234);assert.equal(result.data.warning,undefined);
 const pending=await a.recoverPendingBooking(p,{delays:[0],fetcher:async()=>Response.json({...saved('pending'),warning:messages.notificationWarning('pending')})});assert.match(pending.data.warning,/could not confirm whether/);assert.ok(!pending.data.warning.includes('could not email'));
 assert.equal(messages.notificationWarning('failed'),'Your booking has succeeded. However, form data could not be sent due to a server error. Please contact  Jess Counselling via WhatsApp or email, quoting your Case ID, to confirm your booking. Please do not submit the form again.');assert.equal(messages.notificationWarning('sent'),undefined);
});

test('explicit validation rejection returns normally without recovery; cancelled bookings never become successful acknowledgements',async()=>{
 const a=await loader()('app/lib/booking-recovery.ts'),p={version:1,form:'apt',key:crypto.randomUUID(),startedAt:1,details:{}},original=globalThis.fetch;let calls=0;
 try{globalThis.fetch=async()=>{calls++;return Response.json({error:'Invalid audio'},{status:400});};const result=await a.sendRecoverableBooking('/api/appointment',fields(),p,()=>assert.fail());assert.equal(result.response.status,400);assert.equal(calls,1);}finally{globalThis.fetch=original;}
 await assert.rejects(a.recoverPendingBooking(p,{delays:[0],fetcher:async()=>Response.json({state:'cancelled'})}),a.CancelledBooking);
});

test('status lookup uses the existing D1 booking key and saved references, with no schema changes, writes, PDF or email work',async()=>{
 const folder=readdirSync('node_modules/.pnpm').find(x=>x.startsWith('miniflare@'));
 const {Miniflare}=await import(resolve('node_modules/.pnpm',folder,'node_modules/miniflare/dist/src/index.js'));
 const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',compatibilityDate:'2026-05-15',d1Databases:['DB']});
 const DB=await mf.getD1Database('DB');
 try{
  for(const sql of readFileSync('drizzle/0000_new_mysterio.sql','utf8').split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await DB.prepare(sql).run();
  const load=loader({DB}),bookings=await load('app/lib/booking-store.ts'),cases=[];
  for(const [i,form]of ['contact','free','appointment','apt'].entries()){
   const kind=i<2?'contact':'appointment',key=crypto.randomUUID(),reference=i===3?'PREVIOUS-CASE':'';
   const booking=await bookings.reserve(kind,'2030-10-'+(14+i),'8:00 PM',key,0,'Client',0,i===2,'Follow-up (30 min session)',reference);cases.push({key,kind,booking,reference});
  }
  const readOnly={prepare:sql=>{assert.match(sql,/^SELECT /);return DB.prepare(sql);}};
  const route=await loader({DB:readOnly})('app/api/booking-status/route.ts');
  function request(key,kind){return new Request('https://test/api/booking-status',{method:'POST',headers:{'Idempotency-Key':key,'Content-Type':'application/json'},body:JSON.stringify({kind})});}
  for(const item of cases){
   const response=await route.POST(request(item.key,item.kind)),data=await response.json();assert.equal(response.headers.get('Cache-Control'),'no-store, private');assert.equal(data.state,'booked');assert.equal(data.bookingId,item.booking.id);assert.equal(data.bookingReference,item.reference||item.booking.reference);assert.equal(data.notification,'pending');assert.match(data.warning,/could not confirm whether/);assert.ok(!JSON.stringify(data).includes(item.key));
   await DB.prepare("UPDATE bookings SET notification='failed' WHERE id=?").bind(item.booking.id).run();const failed=await (await route.POST(request(item.key,item.kind))).json();assert.match(failed.warning,/form data could not be sent/);
   await DB.prepare("UPDATE bookings SET notification='sent' WHERE id=?").bind(item.booking.id).run();const sent=await (await route.POST(request(item.key,item.kind))).json();assert.equal(sent.warning,undefined);
  }
  assert.equal((await DB.prepare('SELECT count(*) n FROM bookings').first()).n,4);
  assert.equal((await (await route.POST(request(cases[0].key,'appointment'))).json()).state,'not_found');
  assert.equal((await (await route.POST(request(crypto.randomUUID(),'contact'))).json()).state,'not_found');
  assert.equal((await route.POST(request('100-1026-CL','contact'))).status,400);
  assert.equal((await route.POST(request(cases[0].key,'invalid'))).status,400);
  await DB.prepare('UPDATE bookings SET active=0 WHERE id=?').bind(cases[0].booking.id).run();assert.equal((await (await route.POST(request(cases[0].key,'contact'))).json()).state,'cancelled');
 }finally{await mf.dispose();}
});

test('recovery restores the original midnight/15-minute expiry and daily submission date instead of renewing them',async()=>{
 const a=await loader()('app/lib/submission-acknowledgement.ts'),daily=await loader()('app/lib/daily-submission.ts'),disk=store();
 const original=Date.now,submitted=Date.parse('2030-10-14T18:28:00Z');Date.now=()=>submitted+5*60000;
 try{const expiry=a.saveAcknowledgement('appointment',{name:'Client'},'',disk,submitted);assert.equal(expiry,submitted+15*60000);assert.equal(a.readAcknowledgement('appointment',disk).expiresAt,expiry);const guard=daily.createDailySubmissionGuard('appointment',disk);guard.markSuccessful(submitted);assert.equal(guard.blocked(),false);Date.now=()=>expiry+1;assert.equal(a.readAcknowledgement('appointment',disk),null);}finally{Date.now=original;}
});

test('page reload recovery restores the saved acknowledgement once, without requiring or submitting an available slot',async()=>{
 const a=await loader()('app/lib/booking-recovery.ts'),disk=store(),original=globalThis.localStorage,fetcher=globalThis.fetch,win=globalThis.window;
 globalThis.localStorage=disk;globalThis.window={addEventListener(){},removeEventListener(){}};
 const p=a.beginPendingBooking('contact',fields(),crypto.randomUUID());let checks=0,finished=0,resolveDone;
 const done=new Promise(resolve=>resolveDone=resolve),effects=[],states=[],refs=[];let si=0,ri=0;
 const scope={...a,RECOVERY_CHECKING:'Checking booking status…',useState:initial=>{const i=si++;if(!(i in states))states[i]=initial;return [states[i],v=>states[i]=v];},useRef:initial=>{const i=ri++;return refs[i]||(refs[i]={current:initial});},useEffect:fn=>effects.push(fn)};
 const code=ts.transpile(readFileSync('app/lib/use-booking-recovery.ts','utf8'),{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}).replace(/^import .*;\s*$/gm,'').replace('export function useBookingRecovery','function useBookingRecovery');
 try{
  globalThis.fetch=async(url,init)=>{assert.equal(url,'/api/booking-status');assert.equal(init.headers['Idempotency-Key'],p.key);checks++;return Response.json(saved());};
  const hook=new Function(...Object.keys(scope),code+';return useBookingRecovery;')(...Object.values(scope));
  const recovery=hook('contact',(body,result,submittedAt)=>{finished++;assert.equal(body.get('callback time (Indian Time)'),'8:00 PM');assert.equal(body.get('additional information'),null);assert.equal(result.bookingReference,'100-1026-CL');assert.ok(submittedAt>0);},()=>{},busy=>{if(!busy)resolveDone();});
  effects[0]();await recovery.recover();await done;assert.equal(checks,1);assert.equal(finished,1);assert.equal(a.readPendingBooking('contact'),null);
 }finally{globalThis.localStorage=original;globalThis.fetch=fetcher;globalThis.window=win;}
});
