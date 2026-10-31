import {after} from 'next/server';
import {validateReceipt} from '../../lib/payment-receipt';
import {createPaymentReceiptPdf} from '../../lib/payment-receipt-pdf';
import {sendNamecheapEmail} from '../../lib/namecheap-email';
import {receiptEmail} from '../../lib/payment-receipt-email';
const headers={'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'};
export async function POST(request:Request){
 if(request.headers.get('Origin')!==new URL(request.url).origin)return Response.json({error:'Invalid request origin.'},{status:403,headers});
 const body=await request.text();if(new TextEncoder().encode(body).length>8192)return Response.json({error:'Receipt details are too long.'},{status:413,headers});
 let data;try{data=validateReceipt(JSON.parse(body));}catch(e){return Response.json({error:e instanceof SyntaxError?'Invalid receipt details.':e instanceof Error?e.message:'Invalid receipt details.'},{status:400,headers});}
 try{
  const issued=data.receiptDate,reference=data.receiptNo;
  const pdf=createPaymentReceiptPdf(data,reference,issued);
  const filename='Jess-Receipt-'+reference.replace(/[^A-Za-z0-9._-]/g,'-')+'.pdf';
  let emailStatus='background';
  try{after(async()=>{try{await sendNamecheapEmail(receiptEmail(data,pdf,filename),'appointment');}catch{console.error('Payment receipt email copy could not be confirmed.');}});}catch{emailStatus='unavailable';}
  return new Response(pdf,{headers:{...headers,'Content-Type':'application/pdf','X-Receipt-Email-Status':emailStatus,'Content-Disposition':'attachment; filename="'+filename+'"'}});
 }catch{return Response.json({error:'The PDF could not be generated. Please try again.'},{status:500,headers});}
}
