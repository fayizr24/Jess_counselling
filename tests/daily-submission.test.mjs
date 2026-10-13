import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const code=ts.transpile(readFileSync('app/lib/daily-submission.ts','utf8'),{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022});
const {createDailySubmissionGuard}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('each form limits successful submissions, persists across reload and resets at Indian midnight',()=>{const data=new Map();const storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};let now=Date.parse('2030-10-14T18:29:59Z');for(const form of ['contact','appointment']){const guard=createDailySubmissionGuard(form,storage,()=>now);assert.equal(guard.blocked(),false);/* A rejected/conflicting request must not mark success. */assert.equal(guard.blocked(),false);guard.markSuccessful();assert.equal(guard.blocked(),true);assert.equal(createDailySubmissionGuard(form,storage,()=>now).blocked(),true);}now=Date.parse('2030-10-14T18:30:00Z');assert.equal(createDailySubmissionGuard('contact',storage,()=>now).blocked(),false);assert.equal(createDailySubmissionGuard('appointment',storage,()=>now).blocked(),false);});
test('separate form limits and memory fallback if storage fails',()=>{const storage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};const appointment=createDailySubmissionGuard('appointment',storage);appointment.markSuccessful();assert.equal(appointment.blocked(),true);assert.equal(createDailySubmissionGuard('contact',storage).blocked(),false);});
