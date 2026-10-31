'use client';
import {useEffect,useRef,useState} from 'react';
import {RECEIPT_SERVICES,PAYMENT_METHODS,indianToday,receiptDate,validateReceipt,type ReceiptInput} from '../lib/payment-receipt';
import './receipt.css';
import {matchesReceiptPasscode} from '../lib/receipt-passcode';
import {createReceiptPasscodeGuard,nextIndianMidnight} from '../lib/receipt-passcode-guard';
const empty=():ReceiptInput=>({receiptNo:'',receiptDate:indianToday(),clientName:'',caseId:'',service:'Online Counselling',session:'',sessionDate:'',paymentDate:indianToday(),paymentMethod:'',transactionReference:'',amount:''});
function ReceiptDatePicker({label,value,max,onChange}:{label:string;value:string;max?:string;onChange:(value:string)=>void}){
 return <span className="receipt-date-picker"><span aria-hidden="true">{value?receiptDate(value):'DD/MM/YYYY'}<span>▦</span></span><input aria-label={label} required type="date" value={value} max={max} onChange={e=>onChange(e.target.value)}/></span>;
}
export default function ReceiptForm(){
 const [data,setData]=useState<ReceiptInput>(empty),[busy,setBusy]=useState(false),[error,setError]=useState(''),[pdf,setPdf]=useState<{url:string;name:string;blob:Blob;emailBackground:boolean}|null>(null);
 const inFlight=useRef(false),currentUrl=useRef(''),passcodeDialog=useRef<HTMLDialogElement>(null),checkingPasscode=useRef(false);
 const passcodeGuard=useRef<ReturnType<typeof createReceiptPasscodeGuard>|null>(null);
 const [locked,setLocked]=useState(false),[lockReady,setLockReady]=useState(false);
 const [passcode,setPasscode]=useState(''),[passcodeError,setPasscodeError]=useState(''),[checking,setChecking]=useState(false);
 useEffect(()=>()=>{if(currentUrl.current)URL.revokeObjectURL(currentUrl.current);},[]);
 function guard(){
  if(!passcodeGuard.current){let storage:Storage|null=null;try{storage=window.localStorage;}catch{}passcodeGuard.current=createReceiptPasscodeGuard(storage);}
  return passcodeGuard.current;
 }
 function refreshLock(){const state=guard().state();setLocked(state.locked);setLockReady(true);if(state.locked)passcodeDialog.current?.close();return state;}
 useEffect(()=>{
  let timer:ReturnType<typeof setTimeout>;
  const sync=()=>{refreshLock();clearTimeout(timer);timer=setTimeout(sync,Math.max(50,nextIndianMidnight()-Date.now()+50));};
  sync();window.addEventListener('storage',sync);window.addEventListener('focus',sync);document.addEventListener('visibilitychange',sync);
  return()=>{clearTimeout(timer);window.removeEventListener('storage',sync);window.removeEventListener('focus',sync);document.removeEventListener('visibilitychange',sync);};
 },[]);
 function clearPdf(){if(currentUrl.current)URL.revokeObjectURL(currentUrl.current);currentUrl.current='';setPdf(null);}
 function change(key:keyof ReceiptInput,value:string){clearPdf();setError('');setData(previous=>({...previous,[key]:value,...(key==='session'?{amount:String(RECEIPT_SERVICES.find(s=>s.label===value)?.fee??'')}:{})}));}
 async function generate(){
  if(inFlight.current||refreshLock().locked)return;setError('');
  let details:ReceiptInput;try{details=validateReceipt(data);}catch(e){setError(e instanceof Error?e.message:'Check the receipt details.');return;}
  inFlight.current=true;setBusy(true);clearPdf();
  try{
   const response=await fetch('/api/receipt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(details),cache:'no-store'});
   if(!response.ok){const result=await response.json() as {error?:string};throw Error(result.error||'Could not generate the receipt.');}
   if(!response.headers.get('Content-Type')?.startsWith('application/pdf'))throw Error('The server did not return a PDF. Please try again.');
   const blob=await response.blob(),url=URL.createObjectURL(blob);currentUrl.current=url;
   const name=/filename="([^"]+)"/.exec(response.headers.get('Content-Disposition')||'')?.[1]||'Jess-Counselling-Payment-Receipt.pdf';setPdf({url,name,blob,emailBackground:response.headers.get('X-Receipt-Email-Status')==='background'});
  }catch(e){setError(e instanceof Error?e.message:'Could not generate the receipt. Please try again.');}finally{inFlight.current=false;setBusy(false);}
 }
 function askPasscode(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(inFlight.current||checkingPasscode.current||refreshLock().locked)return;setError('');
  try{validateReceipt(data);}catch(e){setError(e instanceof Error?e.message:'Check the receipt details.');return;}
  setPasscode('');setPasscodeError('');passcodeDialog.current?.showModal();
 }
 async function confirmPasscode(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(checkingPasscode.current||inFlight.current||refreshLock().locked)return;
  checkingPasscode.current=true;setChecking(true);setPasscodeError('');
  try{
   const correct=await matchesReceiptPasscode(passcode);
   if(refreshLock().locked)return;
   if(!correct){const result=guard().failed();setPasscode('');setLocked(result.locked);if(result.locked){passcodeDialog.current?.close();}else setPasscodeError('Incorrect passcode. '+(3-result.failures)+' attempt'+(3-result.failures===1?'':'s')+' remaining.');return;}
   guard().succeeded();refreshLock();passcodeDialog.current?.close();setPasscode('');await generate();
  }catch{setPasscodeError('The passcode could not be checked. Please try again.');}
  finally{checkingPasscode.current=false;setChecking(false);}
 }
 async function sharePdf(){
  if(!pdf)return;
  const file=new File([pdf.blob],pdf.name,{type:'application/pdf'});
  try{if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'Jess Counselling Payment Receipt'});}else{const link=document.createElement('a');link.href=pdf.url;link.download=pdf.name;link.click();}}catch(e){if(!(e instanceof Error&&e.name==='AbortError'))setError('Please download the PDF and attach it in WhatsApp or your preferred app.');}
 }
 return <main className="receipt-page"><header className="receipt-heading"><span className="receipt-kicker">JESS COUNSELLING LLP · ADMIN</span><h1>Payment receipt</h1><p>Enter the payment details to generate a PDF receipt and email a copy to hello@jesscounselling.online.</p></header>
 <div className="receipt-workspace"><form className="receipt-card" onSubmit={askPasscode}>
 <fieldset disabled={busy}><legend>Receipt details</legend><p className="receipt-required">All fields are required.</p>
 <div className="receipt-grid">
 <label>Receipt No.<input required maxLength={60} value={data.receiptNo} onChange={e=>change('receiptNo',e.target.value)} autoComplete="off" placeholder="e.g. 26-27/0001"/></label>
 <label>Receipt Date<ReceiptDatePicker label="Receipt Date" value={data.receiptDate} onChange={value=>change('receiptDate',value)}/></label>
 <label>Client Name<input required maxLength={100} value={data.clientName} onChange={e=>change('clientName',e.target.value)} autoComplete="off"/></label>
 <label>Case ID<input required maxLength={80} value={data.caseId} onChange={e=>change('caseId',e.target.value)} autoComplete="off" placeholder="120-1026-MU"/></label>
 <label className="receipt-full">Service<input readOnly value="Online Counselling" aria-readonly="true"/></label>
 <label className="receipt-full">Session<select required value={data.session} onChange={e=>change('session',e.target.value)}><option value="">Select a session</option>{RECEIPT_SERVICES.map(s=><option key={s.label} value={s.label}>{s.label}</option>)}</select></label>
 <label>Session Date<ReceiptDatePicker label="Session Date" value={data.sessionDate} onChange={value=>change('sessionDate',value)}/></label>
 <label>Payment Date<ReceiptDatePicker label="Payment Date" max={indianToday()} value={data.paymentDate} onChange={value=>change('paymentDate',value)}/></label>
 <label>Payment Method<select required value={data.paymentMethod} onChange={e=>change('paymentMethod',e.target.value)}><option value="">Select payment method</option>{PAYMENT_METHODS.map(m=><option key={m}>{m}</option>)}</select></label>
 <label>Amount Received (INR)<input required type="number" min="0" max="999999.99" step="0.01" inputMode="decimal" value={data.amount} onChange={e=>change('amount',e.target.value)}/><small>Prefilled from the session fee. Adjust to the amount received.</small></label>
 <label className="receipt-full">Transaction Reference<input required maxLength={120} value={data.transactionReference} onChange={e=>change('transactionReference',e.target.value)} autoComplete="off"/></label>
 </div></fieldset>
 {error&&<p className="receipt-error" role="alert">{error}</p>}
 {locked&&<p className="receipt-error" role="alert">Three incorrect passcode attempts. Submission aborted. Receipt generation is locked in this browser until midnight Indian time.</p>}
 {pdf?<section className="receipt-success" aria-live="polite"><strong>Your PDF receipt is ready.</strong><p className={pdf.emailBackground?'receipt-email-status':'receipt-error'} role={pdf.emailBackground?'status':'alert'}>{pdf.emailBackground?'The PDF is ready to use. A copy is being emailed to hello@jesscounselling.online in the background.':'Background emailing could not be started. Your PDF is ready to open, download or share.'}</p><div className="receipt-actions"><a href={pdf.url} download={pdf.name} className="receipt-primary">Download PDF Receipt</a><a href={pdf.url} target="_blank" rel="noopener noreferrer" className="receipt-secondary">Open PDF</a><button type="button" className="receipt-secondary" onClick={()=>void sharePdf()}>Share PDF</button></div><p className="receipt-pdf-help">If the preview is unavailable on your device, use Open PDF, Download PDF Receipt or Share PDF. Sharing options depend on your device and installed apps.</p><iframe className="receipt-pdf-preview" src={pdf.url} title="Generated payment receipt PDF"><p>Use Open PDF to view the receipt.</p></iframe></section>:<button className="receipt-primary" disabled={busy||locked||!lockReady} type="submit">{locked?'Locked until midnight (India)':busy?'Generating PDF…':'Generate PDF Receipt'}</button>}
 <button className="receipt-reset" type="button" disabled={busy} onClick={()=>{clearPdf();setData(empty());setError('');}}>Clear form / New receipt</button>
 </form><aside className="receipt-info"><span className="receipt-kicker">PERMANENT RECEIPT HEADER</span><h2>JESS COUNSELLING LLP</h2><p>Online counselling services</p><p>Registered with Ministry of Corporate Affairs<br/>LLP Registration No: ADC-2803</p><p>E-mail: hello@jesscounselling.online<br/>Web: www.jesscounselling.online</p><hr/><h3>Ready for your records</h3><p>Each PDF includes your entered receipt number and receipt date, and the amount in words. Dates are displayed as 30 Oct 2026.</p><p>A PDF copy is emailed to hello@jesscounselling.online when you generate the receipt. Downloading or opening it again does not send another email.</p></aside></div><dialog className="receipt-passcode-dialog" ref={passcodeDialog} onClose={()=>{setPasscode('');setPasscodeError('');}} onCancel={()=>{setPasscode('');setPasscodeError('');}}><form onSubmit={confirmPasscode}><h2>Enter passcode</h2><p>Enter the four-digit passcode to generate this receipt.</p><label>Passcode<input autoFocus required type="password" inputMode="numeric" pattern="[0-9]{4}" minLength={4} maxLength={4} autoComplete="off" value={passcode} disabled={checking} onChange={e=>{setPasscode(e.target.value.replace(/[^0-9]/g,''));setPasscodeError('');}}/></label>{passcodeError&&<p className="receipt-error" role="alert">{passcodeError}</p>}<div className="receipt-actions"><button className="receipt-primary" disabled={checking} type="submit">{checking?'Checking…':'Generate Receipt'}</button><button className="receipt-secondary" disabled={checking} type="button" onClick={()=>passcodeDialog.current?.close()}>Cancel</button></div></form></dialog></main>;
}
