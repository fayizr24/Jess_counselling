'use client';
import {useRef,useState,type RefObject} from 'react';
import {Camera} from 'lucide-react';

/** Use the Contact PNG exporter and its explicit device-save consent flow. */
export function AcknowledgementSnapshot({target,caseId}:{target:RefObject<HTMLElement|null>;caseId:string}){
 const exporting=useRef(false),dialog=useRef<HTMLDialogElement|null>(null);
 const exporterRef=useRef<typeof import('../lib/contact-acknowledgement-export')|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const [file,setFile]=useState<File|null>(null),[nativeSave,setNativeSave]=useState(false),[message,setMessage]=useState('');
 function close(){dialog.current?.close();setFile(null);setMessage('');}
 async function capture(){
  if(exporting.current||!target.current)return;
  const element=target.current;exporting.current=true;setBusy(true);setError('');
  try{
   const exporter=await import('../lib/contact-acknowledgement-export');exporterRef.current=exporter;
   const canvas=await exporter.captureContactAcknowledgement(element);
   const blob=await exporter.contactAcknowledgementPng(canvas);
   const picture=new File([blob],exporter.contactAcknowledgementFilename(caseId,'png'),{type:'image/png'});
   let canShare=false;try{canShare=typeof navigator.share==='function'&&typeof navigator.canShare==='function'&&navigator.canShare({files:[picture]});}catch{}
   setFile(picture);setNativeSave(canShare);setMessage('');
   if(!dialog.current)throw Error('Snapshot confirmation is unavailable.');dialog.current.showModal();
  }catch{setError('Could not save the acknowledgement. Please try again.');}
  finally{exporting.current=false;setBusy(false);}
 }
 async function save(){
  if(exporting.current||!file||!exporterRef.current)return;
  exporting.current=true;setBusy(true);setMessage('');
  try{
   // Keep the native share call directly on the confirmation click.
   if(nativeSave)await navigator.share({files:[file]});
   else exporterRef.current.saveContactAcknowledgementFile(file,file.name);
   close();
  }catch(e){
   if(e instanceof Error&&e.name==='AbortError')setMessage('Saving was cancelled. You can try again or close this window.');
   else{setNativeSave(false);setMessage("Your device's save menu could not open. You can download the PNG instead.");}
  }finally{exporting.current=false;setBusy(false);}
 }
 return <><button className="pdf-button appointment-snapshot-button" type="button" data-ack-export-ignore="true" disabled={busy} aria-busy={busy} onClick={capture}><Camera size={18}/>{busy?'Preparing snapshot…':'Save Snapshot'}</button>
 <dialog ref={dialog} className="contact-snapshot-dialog appointment-snapshot-dialog" data-ack-export-ignore="true" aria-label="Save snapshot" onCancel={event=>{if(exporting.current)event.preventDefault();else{setFile(null);setMessage('');}}}>
  <h3>Save snapshot</h3><p>Would you like to save this acknowledgement as a picture?</p>
  <p>{nativeSave?"Your device's share/save menu will open. Choose Save Image or Save to Photos if available to add it to your Camera Roll.":'This browser will download a PNG picture. To add it to Photos or Camera Roll, open the downloaded image and choose Save Image on your device.'}</p>
  <div className="pdf-actions"><button className="pdf-button" type="button" disabled={busy||!file} onClick={save}>{busy?'Opening save options…':nativeSave?'Save to pictures / Camera Roll':'Download picture'}</button><button className="pdf-button" type="button" disabled={busy} onClick={close}>Cancel</button></div>
  {message&&<p className="appointment-snapshot-error" role="status">{message}</p>}
 </dialog>{error&&<p className="appointment-snapshot-error" data-ack-export-ignore="true" role="alert">{error}</p>}</>;
}
