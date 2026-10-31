import {APPOINTMENT_TYPES,validDate} from './booking-schedule';
export const RECEIPT_SERVICES=APPOINTMENT_TYPES.map((label,index)=>({label,fee:[990,750,450,0][index]}));
export const PAYMENT_METHODS=['Bank Transfer','Google Pay'] as const;
export type ReceiptInput={receiptNo:string;receiptDate:string;clientName:string;caseId:string;service:string;session:string;sessionDate:string;paymentDate:string;paymentMethod:string;transactionReference:string;amount:string};
export function indianToday(now=new Date()){return new Date(now.getTime()+19800000).toISOString().slice(0,10);}
export function validateReceipt(value:unknown):ReceiptInput{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Please complete the receipt form.');
 const raw=value as Record<string,unknown>,result={} as ReceiptInput;
 for(const [key,max] of Object.entries({receiptNo:60,receiptDate:10,clientName:100,caseId:80,service:100,session:100,sessionDate:10,paymentDate:10,paymentMethod:30,transactionReference:120,amount:12})){
  const v=raw[key];if(typeof v!=='string'||!v.trim()||v.trim().length>max||/[\x00-\x1f\x7f]/.test(v))throw Error('Please enter a valid '+key+'.');
  result[key as keyof ReceiptInput]=v.trim();
 }
 if(result.service!=='Online Counselling')throw Error('Service must be Online Counselling.');
 if(!APPOINTMENT_TYPES.some(s=>s===result.session))throw Error('Select a valid session.');
 if(!PAYMENT_METHODS.some(m=>m===result.paymentMethod))throw Error('Select a valid payment method.');
 if(!/^[A-Za-z0-9][A-Za-z0-9 /_.-]{0,59}$/.test(result.receiptNo))throw Error('Receipt No. may contain letters, numbers, spaces, /, _, . and -.');
 if(!validDate(result.receiptDate)||!validDate(result.sessionDate)||!validDate(result.paymentDate))throw Error('Enter valid receipt, session and payment dates.');
 if(result.paymentDate>indianToday())throw Error('Payment date cannot be in the future.');
 if(!/^\d{1,6}(\.\d{1,2})?$/.test(result.amount))throw Error('Enter an amount from 0 to 999999.99 with up to two decimal places.');
 result.amount=Number(result.amount).toFixed(2);return result;
}
const small=['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
function words(n:number):string{
 if(n<20)return small[n];if(n<100)return ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'][Math.floor(n/10)]+(n%10?' '+words(n%10):'');
 for(const [unit,label] of [[10000000,'Crore'],[100000,'Lakh'],[1000,'Thousand'],[100,'Hundred']] as const)if(n>=unit)return words(Math.floor(n/unit))+' '+label+(n%unit?' '+words(n%unit):'');
 return '';
}
export function amountInWords(amount:string){const paise=Math.round(Number(amount)*100);return 'Indian Rupees '+words(Math.floor(paise/100))+(paise%100?' and '+words(paise%100)+' Paise':'')+' Only';}
export function receiptDate(iso:string){return new Intl.DateTimeFormat('en-IN',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(iso+'T00:00:00Z'));}
