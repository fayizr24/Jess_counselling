import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import ts from 'typescript';
const dir='.sites-runtime/receipt-qa';mkdirSync(dir,{recursive:true});
for(const name of ['booking-schedule','payment-receipt','appointment-pdf-fonts','payment-receipt-pdf','payment-receipt-email']){
 const source=readFileSync('app/lib/'+name+'.ts','utf8').replace(/from '(\.\/[^']+)'/g,"from '$1.mjs'").replace(/from "(\.\/[^\"]+)"/g,'from "$1.mjs"');
 writeFileSync(dir+'/'+name+'.mjs',ts.transpile(source,{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}));
}
const {validateReceipt,amountInWords,indianToday,receiptDate,RECEIPT_SERVICES}=await import('../'+dir+'/payment-receipt.mjs');
const {createPaymentReceiptPdf}=await import('../'+dir+'/payment-receipt-pdf.mjs');
const details={receiptNo:'JC/R/26-27/0001',receiptDate:'2026-10-30',clientName:'Sample Client',caseId:'100-1026-SA',service:'Online Counselling',session:RECEIPT_SERVICES[0].label,sessionDate:'2026-11-02',paymentDate:'2026-10-30',paymentMethod:'Google Pay',transactionReference:'SAMPLE-TRANSACTION-12345',amount:'990'};
test('all current services carry the correct default fees',()=>assert.deepEqual(RECEIPT_SERVICES.map(s=>s.fee),[990,750,450,0]));
test('valid amounts normalize and Indian words handle zero, paise and lakh',()=>{
 assert.equal(validateReceipt(details).amount,'990.00');
 assert.equal(receiptDate('2026-10-30'),'30 Oct 2026');
 assert.equal(amountInWords('990'),'Indian Rupees Nine Hundred Ninety Only');
 assert.equal(amountInWords('0'),'Indian Rupees Zero Only');
 assert.equal(amountInWords('100001.25'),'Indian Rupees One Lakh One and Twenty Five Paise Only');
 assert.equal(indianToday(new Date('2026-10-30T20:00:00Z')),'2026-10-31');
});
test('reject invalid dates, payment methods, blank fields and invalid amounts',()=>{
 for(const patch of [{receiptNo:''},{receiptNo:'Bad\"header'},{receiptDate:'2026-02-30'},{sessionDate:'2026-02-30'},{paymentDate:'2099-01-01'},{paymentMethod:'Cash'},{service:'Other'},{session:'Other'},{session:''},{clientName:' '},{caseId:''},{amount:'1e3'},{amount:'-1'},{amount:'990.001'},{amount:'1000000'},{transactionReference:'x'.repeat(121)}])assert.throws(()=>validateReceipt({...details,...patch}));
});
test('generate sample and longest permitted PDF for visual inspection',()=>{
 const sample=createPaymentReceiptPdf(validateReceipt(details),'JC/R/20261030/SAMPLE000001','2026-10-30');
 assert.ok(sample.byteLength>10000);assert.equal(Buffer.from(sample).subarray(0,5).toString(),'%PDF-');
 writeFileSync(dir+'/sample.pdf',Buffer.from(sample));
 const long=createPaymentReceiptPdf(validateReceipt({...details,clientName:'Long client name '.repeat(6).slice(0,100),caseId:'C'.repeat(80),transactionReference:'R'.repeat(120),session:RECEIPT_SERVICES[3].label,amount:'999999.99'}),'JC/R/20261030/SAMPLE000002','2026-10-30');writeFileSync(dir+'/long.pdf',Buffer.from(long));
});
const routeSource=readFileSync('app/api/receipt/route.ts','utf8').replace("import {after} from 'next/server';","const after=(task)=>globalThis.receiptAfterMock(task);").replace("import {sendNamecheapEmail} from '../../lib/namecheap-email';","const sendNamecheapEmail=(...args)=>globalThis.receiptEmailMock(...args);").replaceAll('../../lib/payment-receipt-email','./payment-receipt-email.mjs').replaceAll('../../lib/payment-receipt-pdf','./payment-receipt-pdf.mjs').replaceAll('../../lib/payment-receipt','./payment-receipt.mjs');
writeFileSync(dir+'/route.mjs',ts.transpile(routeSource,{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}));
const backgroundTasks=[];globalThis.receiptAfterMock=task=>backgroundTasks.push(task);
const emailCalls=[];let failEmail=false;globalThis.receiptEmailMock=async(message,form)=>{emailCalls.push({message,form});if(failEmail)throw Error('Simulated email failure');};
const {POST}=await import('../'+dir+'/route.mjs');
function request(body=details,origin='https://example.test'){return new Request('https://example.test/api/receipt',{method:'POST',headers:{Origin:origin},body:JSON.stringify(body)});}
test('receipt endpoint works without a password and enforces origin and validation',async()=>{
 assert.equal((await POST(request(details,'https://other.test'))).status,403);
 assert.equal((await POST(request({...details,amount:'-1'}))).status,400);
 const response=await POST(request());assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'application/pdf');assert.equal(response.headers.get('cache-control'),'no-store');assert.match(response.headers.get('content-disposition'),/Jess-Receipt-JC-R-26-27-0001/);const bytes=Buffer.from(await response.arrayBuffer());assert.ok(bytes.byteLength>10000);assert.equal(response.headers.get('X-Receipt-Email-Status'),'background');assert.equal(emailCalls.length,0);assert.equal(backgroundTasks.length,1);await backgroundTasks.shift()();
 assert.equal(emailCalls.length,1);assert.equal(emailCalls[0].form,'appointment');assert.deepEqual(Buffer.from(emailCalls[0].message.attachment.base64,'base64'),bytes);assert.equal(emailCalls[0].message.attachment.contentType,'application/pdf');assert.equal(emailCalls[0].message.subject,'Receipt: 990-JC/R/26-27/0001');
});
test('receipt stays outside sitemap and navigation',()=>{
 assert.doesNotMatch(readFileSync('public/sitemap.xml','utf8'),/\/receipt/);
 assert.match(readFileSync('app/receipt/page.tsx','utf8'),/index:false,follow:false/);
});

test('PDF responds before background email starts, even if sending fails',async()=>{
 failEmail=true;const before=emailCalls.length;const originalError=console.error;const errors=[];console.error=message=>errors.push(message);
 try{const response=await POST(request());assert.equal(response.status,200);assert.equal(response.headers.get('X-Receipt-Email-Status'),'background');assert.equal(Buffer.from(await response.arrayBuffer()).subarray(0,5).toString(),'%PDF-');assert.equal(emailCalls.length,before);await backgroundTasks.shift()();assert.equal(emailCalls.length,before+1);assert.equal(errors.length,1);}finally{failEmail=false;console.error=originalError;}
});
test('background scheduling failure never prevents the PDF',async()=>{
 const original=globalThis.receiptAfterMock;globalThis.receiptAfterMock=()=>{throw Error('No request scope');};try{const response=await POST(request());assert.equal(response.status,200);assert.equal(response.headers.get('X-Receipt-Email-Status'),'unavailable');assert.equal(Buffer.from(await response.arrayBuffer()).subarray(0,5).toString(),'%PDF-');}finally{globalThis.receiptAfterMock=original;}
});
