"use client";
import {useRef,useState} from "react";
import {Download,Camera} from "lucide-react";
import {consultationDateIso,validDate} from "../lib/booking-schedule";

export function createContactAcknowledgementData(form:FormData,bookingId=""){
  const date=String(form.get("callback date")||"");
  const iso=consultationDateIso(date);
  const day=validDate(iso)?new Intl.DateTimeFormat("en-GB",{weekday:"long",timeZone:"Asia/Kolkata"}).format(new Date(iso+"T00:00:00+05:30")):"";
  return {
    bookingId,
    submittedWithoutOptionalDetails:form.get("submission mode")==="mandatory",
    time:String(form.get("callback time (Indian Time)")||""),
    date,day,
    contacts:String(form.get("contact methods")||"").split(", ").filter(Boolean).map(method=>({
      method,
      detail:String(form.get("contact_"+method)||"")
    }))
  };
}

export function ContactAcknowledgement({details}:{details:ReturnType<typeof createContactAcknowledgementData>}){
  const box=useRef<HTMLElement|null>(null),exporting=useRef(false),snapshotDialog=useRef<HTMLDialogElement|null>(null);
  const exporterRef=useRef<typeof import("../lib/contact-acknowledgement-export")|null>(null);
  const [busy,setBusy]=useState<"pdf"|"png"|null>(null),[exportError,setExportError]=useState("");
  const [snapshotFile,setSnapshotFile]=useState<File|null>(null),[nativeSave,setNativeSave]=useState(false),[snapshotMessage,setSnapshotMessage]=useState("");
  function closeSnapshot(){snapshotDialog.current?.close();setSnapshotFile(null);setSnapshotMessage("");}
  async function saveSnapshot(){
    if(exporting.current||!snapshotFile||!exporterRef.current)return;
    exporting.current=true;setBusy("png");setSnapshotMessage("");
    try{
      if(nativeSave){
        // Invoke directly from this consent click, before any asynchronous work.
        await navigator.share({files:[snapshotFile]});
      }else exporterRef.current.saveContactAcknowledgementFile(snapshotFile,snapshotFile.name);
      closeSnapshot();
    }catch(error){
      if(error instanceof Error&&error.name==="AbortError")setSnapshotMessage("Saving was cancelled. You can try again or close this window.");
      else{setNativeSave(false);setSnapshotMessage("Your device's save menu could not open. You can download the PNG instead.");}
    }finally{exporting.current=false;setBusy(null);}
  }
  async function exportReceipt(format:"pdf"|"png"){
    if(exporting.current||!box.current)return;
    const element=box.current;exporting.current=true;setBusy(format);setExportError("");
    try{
      const exporter=await import("../lib/contact-acknowledgement-export");
      exporterRef.current=exporter;
      const canvas=await exporter.captureContactAcknowledgement(element);
      const file=format==="pdf"?exporter.createContactAcknowledgementPdf(canvas):await exporter.contactAcknowledgementPng(canvas);
      const filename=exporter.contactAcknowledgementFilename(details.bookingId,format);
      if(format==="png"){
        const picture=new File([file],filename,{type:"image/png"});
        let canShare=false;try{canShare=typeof navigator.share==="function"&&typeof navigator.canShare==="function"&&navigator.canShare({files:[picture]});}catch{}
        setSnapshotFile(picture);setNativeSave(canShare);setSnapshotMessage("");
        if(!snapshotDialog.current)throw Error("Snapshot confirmation is unavailable.");
        snapshotDialog.current.showModal();
      }else exporter.saveContactAcknowledgementFile(file,filename);
    }catch{setExportError("Could not save the acknowledgement. Please try again.");}
    finally{exporting.current=false;setBusy(null);}
  }
  return <section ref={box} className="contact-acknowledgement" role="status" aria-label="Free online consultation acknowledgement">
    <h2 style={{fontWeight:700}}><span className="contact-acknowledgement-check" aria-hidden="true">✓</span>Free Online Consultation Request Received</h2>
    {details.bookingId&&<p className="contact-acknowledgement-booking-id">Case ID: <strong>{details.bookingId}</strong></p>}
    <p>Thank you for submitting a free online consultation request. Your session will be arranged as scheduled at <strong>{details.time}</strong> Indian time on <strong>{details.day?details.day+", ":""}{details.date}</strong>.</p>
    <dl className="contact-acknowledgement-details">{details.contacts.map(contact=><div className="contact-acknowledgement-method" key={contact.method}>
      <dt>Contact method</dt><dd>{contact.method}</dd>
      <dt>Contact details</dt><dd>{contact.detail}</dd>
    </div>)}</dl>
    <p className="contact-acknowledgement-reschedule" style={{color:"#0057ff"}}>For rescheduling or cancellation, please contact us by email or WhatsApp.</p>
    <div className="contact-acknowledgement-actions" data-ack-export-ignore="true">
      <button type="button" disabled={busy!==null} aria-busy={busy==="pdf"} onClick={()=>exportReceipt("pdf")}><Download size={18}/>{busy==="pdf"?"Preparing PDF…":"Download"}</button>
      <button type="button" disabled={busy!==null} aria-busy={busy==="png"} onClick={()=>exportReceipt("png")}><Camera size={18}/>{busy==="png"?"Preparing snapshot…":"Save Snapshot"}</button>
    </div>
    <div className="contact-acknowledgement-contact" aria-label="Contact Jess Counselling">
      <div><strong>Email</strong><a href="mailto:hello@jesscounselling.online">hello@jesscounselling.online</a></div>
      <div><strong>WhatsApp</strong><a href="https://wa.me/919895296274">+91 989 529 6274 <span className="contact-acknowledgement-whatsapp-note">(Text or recorded voice only)</span></a></div>
    </div>
    <dialog ref={snapshotDialog} className="contact-snapshot-dialog" data-ack-export-ignore="true" aria-label="Save snapshot" onCancel={event=>{if(exporting.current)event.preventDefault();else{setSnapshotFile(null);setSnapshotMessage("");}}}>
      <h3>Save snapshot</h3>
      <p>Would you like to save this acknowledgement as a picture?</p>
      <p>{nativeSave?"Your device's share/save menu will open. Choose Save Image or Save to Photos if available to add it to your Camera Roll.":"This browser will download a PNG picture. To add it to Photos or Camera Roll, open the downloaded image and choose Save Image on your device."}</p>
      <div className="contact-acknowledgement-actions">
        <button type="button" disabled={busy!==null||!snapshotFile} onClick={saveSnapshot}>{busy==="png"?"Opening save options…":nativeSave?"Save to pictures / Camera Roll":"Download picture"}</button>
        <button type="button" disabled={busy!==null} onClick={closeSnapshot}>Cancel</button>
      </div>
      {snapshotMessage&&<p className="contact-acknowledgement-export-error" role="status">{snapshotMessage}</p>}
    </dialog>
    {exportError&&<p className="contact-acknowledgement-export-error" data-ack-export-ignore="true" role="alert">{exportError}</p>}
  </section>;
}
