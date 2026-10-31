import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import ts from 'typescript';
const mfFolder=readdirSync('node_modules/.pnpm').find(x=>x.startsWith('miniflare@'));
const {Miniflare}=await import(resolve('node_modules/.pnpm',mfFolder,'node_modules/miniflare/dist/src/index.js'));
function modules(env){globalThis.__bookingTestEnv=env;const cache=new Map();function url(file){file=resolve(file);if(cache.has(file))return cache.get(file);let code=ts.transpile(readFileSync(file,'utf8'),{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022});code=code.replace(/import \{ env \} from ['"]cloudflare:workers['"];/g,'const env=globalThis.__bookingTestEnv;');code=code.replace(/from (["'])(\.\.?\/[^"']+)\1/g,(_,quote,path)=>'from '+JSON.stringify(url(resolve(dirname(file),path+'.ts'))));if(file.endsWith('namecheap-email.ts'))code='export class EmailConfigurationError extends Error{};export function getNamecheapConfiguration(){};export async function sendNamecheapEmail(){globalThis.__emailCount++;if(globalThis.__emailFailure)throw Error("simulated timeout");}';const result='data:text/javascript;base64,'+Buffer.from(code).toString('base64');cache.set(file,result);return result;}return async file=>import(url(file));}
test('forward-only weekly closures in display, calendar and atomic reservations',async()=>{
 const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',compatibilityDate:'2026-05-15',d1Databases:['DB']});
 try{
 const DB=await mf.getD1Database('DB');for(const sql of readFileSync('drizzle/0000_new_mysterio.sql','utf8').split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await DB.prepare(sql).run();
 const load=modules({DB});const store=await load('app/lib/booking-store.ts');
 const open=async(date,a,b)=>{for(let m=a;m<=b;m+=15)await DB.prepare('INSERT OR REPLACE INTO booking_slots(date,minute,manual) VALUES(?,?,-1)').bind(date,m).run()};
 const available=async(kind,date,time)=>(await store.availability(kind,date)).slots.find(s=>s.time===time)?.available;
 const reject=async(kind,date,time)=>{await assert.rejects(()=>store.reserve(kind,date,time,crypto.randomUUID()));assert.equal((await DB.prepare('SELECT count(*) n FROM bookings WHERE date=? AND minute=?').bind(date,kind==='appointment'?360:390).first()).n,0)};
 await open('2030-10-14',300,390);
 assert.equal(await available('appointment','2030-10-14','5:00 AM'),true,'backward weekly closure ignored');
 assert.equal(await available('appointment','2030-10-14','5:30 AM'),false);
 assert.equal(await available('appointment','2030-10-14','6:00 AM'),false);await reject('appointment','2030-10-14','6:00 AM');
 assert.equal(await available('contact','2030-10-14','6:15 AM'),true);
 assert.equal(await available('contact','2030-10-14','6:30 AM'),false);await reject('contact','2030-10-14','6:30 AM');
 assert.equal((await store.monthAvailability('appointment','2030-10')).dates['2030-10-14'],true);
 await store.reserve('appointment','2030-10-14','5:00 AM',crypto.randomUUID());
 // A missing quarter-hour inside the forward hour blocks an appointment.
 await open('2030-10-15',300,390);await DB.prepare('DELETE FROM booking_slots WHERE date=? AND minute=345').bind('2030-10-15').run();
 assert.equal(await available('appointment','2030-10-15','5:00 AM'),false);
 await assert.rejects(()=>store.reserve('appointment','2030-10-15','5:00 AM',crypto.randomUUID()));
 // Recheck overrides atomically even after an available display was generated.
 await open('2030-10-16',300,375);assert.equal(await available('appointment','2030-10-16','5:00 AM'),true);
 await DB.prepare('UPDATE booking_slots SET manual=0 WHERE date=? AND minute=345').bind('2030-10-16').run();
 await assert.rejects(()=>store.reserve('appointment','2030-10-16','5:00 AM',crypto.randomUUID()));
 // Default windows include their endpoint; backward closures do not delay opening.
 assert.equal(await available('appointment','2030-10-17','7:30 PM'),true);
 assert.equal(await available('appointment','2030-10-17','9:00 PM'),true);
 assert.equal(await available('appointment','2030-10-17','9:30 PM'),false);
 assert.equal(await available('contact','2030-10-17','10:15 PM'),true);
 assert.equal(await available('contact','2030-10-17','10:30 PM'),false);
 // Month-end forward window must see the next day's manual openings.
 await open('2030-10-31',1410,1425);await open('2030-11-01',0,45);
 assert.equal(await available('appointment','2030-10-31','11:30 PM'),true);
 assert.equal((await store.monthAvailability('appointment','2030-10')).dates['2030-10-31'],true);
 await store.reserve('appointment','2030-10-31','11:30 PM',crypto.randomUUID());
 await open('2030-11-02',300,315); // Saturday remains closed except explicit openings.
 assert.equal(await available('contact','2030-11-02','5:00 AM'),true);
 assert.equal(await available('contact','2030-11-02','5:15 AM'),false);
 assert.equal((await store.adminDay('2030-10-31')).slots.length,96);
 await open('2030-11-04',1020,1380);
 const held=await store.reserve('appointment','2030-11-04','7:30 PM',crypto.randomUUID());
 assert.equal(await available('contact','2030-11-04','6:00 PM'),true,'point before the backward boundary stays open');
 assert.equal(await available('contact','2030-11-04','6:15 PM'),true,'scheduled opening waives backward clearance');
 assert.equal(await available('contact','2030-11-04','8:45 PM'),false,'fifth forward point blocked');
 assert.equal(await available('contact','2030-11-04','9:00 PM'),true,'next point after forward buffer opens');
 await assert.rejects(()=>store.reserve('contact','2030-11-04','8:45 PM',crypto.randomUUID()));
 assert.equal((await store.adminDay('2030-11-04')).slots.find(s=>s.time==='8:45 PM').bookings[0].id,held.id);
 assert.equal((await DB.prepare('SELECT count(*) n FROM booking_blocks WHERE booking_id=?').bind(held.id).first()).n,6);
 // Proposed appointment must also respect its own forward buffer before an existing contact.
 await open('2030-11-05',1020,1380);await store.reserve('contact','2030-11-05','7:45 PM',crypto.randomUUID());
 assert.equal(await available('appointment','2030-11-05','6:30 PM'),false);
 await assert.rejects(()=>store.reserve('appointment','2030-11-05','6:30 PM',crypto.randomUUID()));
 assert.equal(await available('appointment','2030-11-05','6:00 PM'),true);
 globalThis.__bookingTestEnv.BOOKING_ADMIN_PASSWORD='test-password-only-at-least-20-characters';
 const admin=await load('app/api/slot-admin/route.ts');const response=await admin.POST(new Request('https://example.test/api/slot-admin',{method:'POST',headers:{Origin:'https://example.test',Authorization:'Bearer test-password-only-at-least-20-characters','Content-Type':'application/json'},body:JSON.stringify({date:'2030-11-04',minute:1245,blocked:false,cancelIds:[held.id]})}));
 assert.equal(response.status,200);assert.equal((await DB.prepare('SELECT active FROM bookings WHERE id=?').bind(held.id).first()).active,0,'cancel from fifth forward point releases booking');

 }finally{await mf.dispose()}
});
