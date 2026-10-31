import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const root=process.cwd(),output=path.resolve(process.argv[2]||'acknowledgement-pdfs');
const require=createRequire(path.join(root,'package.json')),cache=new Map(),ts=require('typescript');
function inline(file){
 file=path.resolve(root,file);if(cache.has(file))return cache.get(file);
 let code=ts.transpile(fs.readFileSync(file,'utf8'),{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022});
 code=code.replace(/from (["'])(\.\.?\/[^"']+)\1/g,(_,q,relative)=>'from '+JSON.stringify(inline(path.resolve(path.dirname(file),relative+'.ts'))));
 code=code.replace(/from (["'])jspdf\1/g,'from '+JSON.stringify(pathToFileURL(require.resolve('jspdf')).href));
 const result='data:text/javascript;base64,'+Buffer.from(code).toString('base64');cache.set(file,result);return result;
}
const {createAppointmentPdfBlob}=await import(inline('app/lib/appointment-pdf.ts'));
fs.mkdirSync(output,{recursive:true});
for(const [filename,details]of [
 ['Appointment-Acknowledgement-Sample.pdf',{name:'Sample Client',age:'35','booking id':'120-1026-MU','contact methods':'Google Meet','contact_Google Meet':'Meeting link will be provided by us','Google Meet WhatsApp or email':'sample@example.com','appointment type':'New Appointment (1 hour session)','appointment date':'5 Nov 2026','appointment time (Indian Time)':'7:30 PM'}],
 ['Apt-Acknowledgement-Sample.pdf',{name:'Sample Follow-up Client',age:'35','booking id':'121-1026-SA','contact methods':'WhatsApp',contact_WhatsApp:'+91 90000 00000','appointment type':'Follow-up (Clarification session, 10 minutes)','appointment date':'6 Nov 2026','appointment time (Indian Time)':'10:30 AM'}]
]){fs.writeFileSync(path.join(output,filename),Buffer.from(await createAppointmentPdfBlob(details).arrayBuffer()));console.log(filename);}
const {createPaymentReceiptPdf}=await import(inline('app/lib/payment-receipt-pdf.ts'));
const receipt={receiptNo:'26-27/0001',receiptDate:'2026-10-31',clientName:'Sample Client',caseId:'120-1026-MU',service:'Online Counselling',session:'New Appointment (1 hour session)',sessionDate:'2026-11-05',paymentDate:'2026-10-31',paymentMethod:'Google Pay',transactionReference:'SAMPLE-TRANSACTION-12345',amount:'990.00'};
fs.writeFileSync(path.join(output,'Payment-Receipt-Sample.pdf'),Buffer.from(createPaymentReceiptPdf(receipt,receipt.receiptNo,receipt.receiptDate)));console.log('Payment-Receipt-Sample.pdf');
