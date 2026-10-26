'use client';
import {useEffect,useRef,useState} from 'react';
type Entry={id:string;time:string;type:string};
const today=()=>new Date(Date.now()+19800000).toISOString().slice(0,10);
export function AdminBookingList({password}:{password:string}){
 const dialog=useRef<HTMLDialogElement>(null),request=useRef<AbortController|null>(null);
 const[date,setDate]=useState(today),[rows,setRows]=useState<Entry[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [loaded,setLoaded]=useState(false);
 function close(){request.current?.abort();dialog.current?.close();setRows([]);setLoaded(false);setBusy(false);setError('');}
 useEffect(()=>{close();return()=>request.current?.abort();},[password]);
 async function load(selected:string){
  request.current?.abort();const controller=new AbortController();request.current=controller;setRows([]);setLoaded(false);setError('');
  if(!selected){setBusy(false);return;}setBusy(true);
  try{const response=await fetch('/api/slot-admin?list=1&date='+encodeURIComponent(selected),{cache:'no-store',signal:controller.signal,headers:{Authorization:'Bearer '+password}});const data=await response.json();if(!response.ok)throw Error(data.error||'Could not load bookings.');if(!controller.signal.aborted){setRows(data.bookings);setLoaded(true);}}
  catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Could not load bookings.');}
  finally{if(!controller.signal.aborted)setBusy(false);}
 }
 const heading=date?new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T00:00:00Z')):'Select a date';
 return <><button type="button" className="admin-list-open" disabled={!password} onClick={()=>{const d=today();setDate(d);dialog.current?.showModal();void load(d);}}>Generate Booking List</button>
 <dialog ref={dialog} className="admin-booking-dialog" onCancel={()=>close()} aria-labelledby="admin-list-heading">
 <div className="admin-list-header"><div><h2 id="admin-list-heading">Appointments &amp; Free Consults</h2><p>{heading}</p><small>All times are Indian time.</small></div><button type="button" onClick={close} aria-label="Close booking list">Close</button></div>
 <div className="admin-list-controls"><label>Booking date <input type="date" value={date} onChange={e=>{setDate(e.target.value);void load(e.target.value);}}/></label><button type="button" disabled={busy||!date} onClick={()=>void load(date)}>Refresh list</button></div>
 <p role="status" className={error?'admin-list-error':''}>{busy?'Loading bookings…':error}</p>
 {loaded&&<><div className="admin-list-table-wrap" role="region" aria-label="Bookings table" tabIndex={0}><table className="admin-list-table"><thead><tr>{['Time','Type'].map(h=><th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.id}><td>{row.time}</td><td>{row.type}</td></tr>)}</tbody></table></div>{!rows.length&&<p>No appointments or free consultations booked for this date.</p>}</>}
 </dialog></>;
}
