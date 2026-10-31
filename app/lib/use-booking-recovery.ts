"use client";
import {useEffect,useRef,useState} from 'react';
import {beginPendingBooking,CancelledBooking,clearPendingBooking,pendingFormData,readPendingBooking,recoverPendingBooking,sendRecoverableBooking,type BookingReply,type PendingBooking,type RecoveryForm} from './booking-recovery';
import {RECOVERY_CHECKING} from './booking-messages';

export function useBookingRecovery(form:RecoveryForm,finish:(body:FormData,result:BookingReply,submittedAt:number)=>void,onStatus:(message:string)=>void,onBusy:(busy:boolean)=>void){
 const [pending,setPending]=useState<PendingBooking|null>(null),busy=useRef(false),active=useRef<PendingBooking|null>(null),current=useRef({finish,onStatus,onBusy});current.current={finish,onStatus,onBusy};
 function complete(){if(active.current)clearPendingBooking(active.current);active.current=null;setPending(readPendingBooking(form));}
 async function recover(){
  if(busy.current)return;const saved=readPendingBooking(form);if(!saved){setPending(null);return;}
  busy.current=true;active.current=saved;setPending(saved);current.current.onBusy(true);current.current.onStatus(RECOVERY_CHECKING);
  try{const result=await recoverPendingBooking(saved);current.current.finish(pendingFormData(saved),result.data,result.submittedAt);complete();}
  catch(error){if(error instanceof CancelledBooking)complete();current.current.onStatus(error instanceof Error?error.message:'Could not check booking status.');}
  finally{busy.current=false;current.current.onBusy(false);}
 }
 useEffect(()=>{void recover();const resume=()=>{if(!busy.current&&readPendingBooking(form))void recover();};window.addEventListener('focus',resume);window.addEventListener('online',resume);return()=>{window.removeEventListener('focus',resume);window.removeEventListener('online',resume);};},[form]);
 async function submit(url:string,body:FormData,key:string){
  const saved=beginPendingBooking(form,body,key);active.current=saved;setPending(saved);busy.current=true;
  try{
   const result=await sendRecoverableBooking(url,body,saved,()=>current.current.onStatus(RECOVERY_CHECKING));
   if(!result.response.ok){clearPendingBooking(saved);setPending(null);}return result;
  }catch(error){if(error instanceof CancelledBooking)complete();throw error;}
  finally{busy.current=false;}
 }
 return {pending,hasPending:()=>!!readPendingBooking(form),recover,submit,complete};
}
