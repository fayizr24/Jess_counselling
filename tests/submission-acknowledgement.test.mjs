import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const transpile=file=>ts.transpile(readFileSync(file,'utf8'),{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022});
const url=code=>'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
const daily=url(transpile('app/lib/daily-submission.ts'));
const receipts=await import(url(transpile('app/lib/submission-acknowledgement.ts').replace("'./daily-submission'",JSON.stringify(daily))));
test('contact and appointment receipts last until midnight or 15 minutes after submission, whichever is later',()=>{
 const original=Date.now;const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 let clock;Date.now=()=>clock;
 try{for(const submitted of ['2030-10-14T18:28:00Z','2030-10-14T18:30:00Z','2030-10-14T10:00:00Z']){
  clock=Date.parse(submitted);const expected=receipts.acknowledgementExpiry(clock);assert.ok(expected-clock>=15*60000);
  for(const form of ['contact','appointment']){
   clock=Date.parse(submitted);const details=form==='contact'?{date:'20 Oct 2030',day:'Sunday',time:'7:30 PM',contacts:[]}:{name:'Sample'};
   const expires=receipts.saveAcknowledgement(form,details,'',storage);assert.equal(expires,expected);
   clock=expected-1;assert.deepEqual(receipts.readAcknowledgement(form,storage)?.data,details);
   clock=expected;assert.equal(receipts.readAcknowledgement(form,storage),null);assert.equal(values.has(`jess-counselling:${form}:acknowledgement`),false);
  }
 }
 clock=Date.parse('2030-10-14T18:28:00Z');assert.equal(new Date(receipts.acknowledgementExpiry(clock)).toISOString(),'2030-10-14T18:43:00.000Z','11:58 PM IST lasts until 12:13 AM');
 receipts.saveAcknowledgement('apt',{name:'Sample'},'',storage);clock+=3*86400000;assert.ok(receipts.readAcknowledgement('apt',storage),'staff receipt remains manual-clear');
 }finally{Date.now=original;}
});
test('open contact page clears expired acknowledgement when mobile tab resumes',()=>{
 const source=readFileSync('app/page.tsx','utf8'),effect=source.split('\n').find(line=>line.startsWith('useEffect(()=>{const refresh=()=>{const blocked=submittedToday()'));
 let ack={sample:true},status='old warning',expired=false,read=0,blocked=true,cleanup;const events=new Map();const ref={current:Date.now()+60000};
 const win={addEventListener:(k,v)=>events.set(k,v),removeEventListener:k=>events.delete(k),setInterval:()=>1,clearInterval:()=>{}};
 const doc={visibilityState:'visible',addEventListener:(k,v)=>events.set(k,v),removeEventListener:k=>events.delete(k)};
 new Function('useEffect','submittedToday','setDailyBlocked','sendingRef','acknowledgementExpiryRef','setAcknowledgement','setStatus','readAcknowledgement','repeatAttemptDayRef','localStorage','storageKey','setRepeatAttempted','indianDay','dailyMessage','window','document',effect)(fn=>cleanup=fn(),()=>!expired,v=>blocked=v,{current:false},ref,v=>ack=v,v=>status=typeof v==='function'?v(status):v,()=>read++,{current:''},{getItem:()=>null},'test',()=>{},()=>'', 'daily message',win,doc);
 assert.ok(ack);ref.current=Date.now()-1;expired=true;events.get('visibilitychange')();assert.equal(ack,null);assert.equal(status,'');assert.equal(blocked,false);assert.equal(read,1);cleanup();assert.equal(events.has('visibilitychange'),false);
});
