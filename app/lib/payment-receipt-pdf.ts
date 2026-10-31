import {jsPDF} from 'jspdf';
import {regularFont,boldFont} from './appointment-pdf-fonts';
import {amountInWords,receiptDate,type ReceiptInput} from './payment-receipt';
export function createPaymentReceiptPdf(data:ReceiptInput,reference:string,issuedDate:string){
 const doc=new jsPDF({unit:'pt',format:'a4'});
 doc.addFileToVFS('JessSans-Regular.ttf',regularFont);doc.addFont('JessSans-Regular.ttf','JessSans','normal');
 doc.addFileToVFS('JessSans-Bold.ttf',boldFont);doc.addFont('JessSans-Bold.ttf','JessSans','bold');
 const green:[number,number,number]=[70,88,61],muted:[number,number,number]=[98,112,95],gold:[number,number,number]=[181,154,84];
 const w=doc.internal.pageSize.getWidth(),h=doc.internal.pageSize.getHeight(),left=48,right=w-48,cw=w-96;
 function text(s:string,x:number,y:number,size=10,bold=false,color=green){doc.setFont('JessSans',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(...color);doc.text(s,x,y);}
 doc.setFillColor(...green);doc.rect(0,0,w,18,'F');
 text('JESS COUNSELLING LLP',left,57,21,true);
 text('Online counselling services',left,78,10,false,muted);
 ['Registered with Ministry of Corporate Affairs','LLP Registration No: ADC-2803','E-mail: hello@jesscounselling.online','Web: www.jesscounselling.online'].forEach((s,i)=>text(s,left,103+i*16,9));
 text('PAYMENT RECEIPT',left,204,23,true);
 text('Receipt No: '+reference,left,228,9);
 text('Receipt Date: '+receiptDate(issuedDate),left,245,9);
 doc.setDrawColor(...gold);doc.line(left,260,right,260);
 const rows=[['Client Name',data.clientName],['Case ID',data.caseId],['Service',data.service],['Session',data.session],['Session Date',receiptDate(data.sessionDate)],['Payment Date',receiptDate(data.paymentDate)],['Payment Method',data.paymentMethod],['Transaction Reference',data.transactionReference]];
 let y=278;
 for(const [index,[label,value]] of rows.entries()){
  doc.setFont('JessSans','normal');doc.setFontSize(10);const lines:string[]=doc.splitTextToSize(value,cw-174);
  const rh=Math.max(32,lines.length*14+18);
  doc.setFillColor(...(index%2===0?[243,245,239]:[255,255,255]) as [number,number,number]);doc.rect(left,y,cw,rh,'F');
  text(label,left+12,y+20,9,true);doc.setFont('JessSans','normal');doc.setFontSize(10);doc.setTextColor(...green);doc.text(lines,left+164,y+20,{lineHeightFactor:1.4});y+=rh;
 }
 y+=22;doc.setFillColor(...green);doc.rect(left,y,cw,38,'F');
 text('AMOUNT RECEIVED',left+12,y+24,11,true,[255,255,255]);
 doc.setFont('JessSans','bold');doc.setFontSize(16);doc.setTextColor(255,255,255);doc.text('₹'+Number(data.amount).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}),right-12,y+25,{align:'right'});
 y+=60;doc.setFont('JessSans','normal');doc.setFontSize(9);const amountLines:string[]=doc.splitTextToSize('Amount in words: '+amountInWords(data.amount),cw);doc.setTextColor(...green);doc.text(amountLines,left,y,{lineHeightFactor:1.5});y+=amountLines.length*13.5+22;
 if(y>h-170){doc.addPage();y=60;}
 const thanks:string[]=doc.splitTextToSize('Received with thanks the amount stated above towards the counselling session.',cw);doc.text(thanks,left,y,{lineHeightFactor:1.4});y+=thanks.length*13+36;
 text('For Jess Counselling LLP',left,y,10,true);
 doc.setFont('JessSans','bold');doc.setFontSize(10);
 const signatoryWidth=doc.getTextWidth('For Jess Counselling LLP');
 doc.setFont('JessSans','normal');doc.setFontSize(10);
 const signatorySize=Math.min(10,10*signatoryWidth/doc.getTextWidth('Authorised Signatory: Jasseela M A'));
 text('Authorised Signatory: Jasseela M A',left,y+20,signatorySize);
 doc.setDrawColor(...gold);doc.line(left,h-67,right,h-67);
 text('This is a computer-generated receipt and it acknowledges the payment.',left,h-49,8,false,muted);
 return doc.output('arraybuffer');
}
