import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const code=ts.transpile(readFileSync('app/lib/admin-slot-range.ts','utf8'),{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022});
const {unblockSlotRange}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const a={id:'a',kind:'appointment',time:'8:00 PM'},b={id:'b',kind:'contact',time:'8:30 PM'};
function fixture(){return [0,15,30,45,60].map((minute,i)=>({minute,blocked:true,bookings:i<3?[a]:[b]}));}
test('inclusive range prompts once for each distinct booking and continues after both',async()=>{let slots=fixture(),prompts=[],saved=[];const result=await unblockSlotRange(slots,0,60,m=>{prompts.push(m);return true;},async slot=>{saved.push(slot.minute);const ids=slot.bookings.map(b=>b.id);slots=slots.map(s=>({...s,bookings:s.bookings.filter(b=>!ids.includes(b.id))}));return slots;});assert.equal(prompts.length,2);assert.match(prompts[0],/appointment at 8:00 PM/);assert.match(prompts[1],/contact at 8:30 PM/);assert.deepEqual(saved,[0,15,30,45,60]);assert.deepEqual(result,{opened:5,skipped:0});});
test('declining a booking skips its entire affected range, then continues',async()=>{let prompts=0,saved=[];const result=await unblockSlotRange(fixture(),0,60,()=>++prompts>1,async slot=>{saved.push(slot.minute);return fixture().map(s=>({...s,bookings:s.bookings.filter(b=>b.id!=='b')}));});assert.equal(prompts,2);assert.deepEqual(saved,[45,60]);assert.deepEqual(result,{opened:2,skipped:3});});
test('overlapping bookings each get a warning; decline preserves the affected slot',async()=>{let prompts=0,saves=0;const result=await unblockSlotRange([{minute:0,blocked:true,bookings:[a,b]}],0,0,()=>++prompts===1,async()=>{saves++;return [];});assert.equal(prompts,2);assert.equal(saves,0);assert.equal(result.skipped,1);});
test('invalid ranges cannot mutate, and a request failure stops later requests',async()=>{let saved=[];await assert.rejects(unblockSlotRange([],30,0,()=>true,async()=>{throw Error('unexpected');}),/valid From/);await assert.rejects(unblockSlotRange(fixture(),0,60,()=>true,async s=>{saved.push(s.minute);throw Error('offline');}),/offline/);assert.deepEqual(saved,[0]);});
