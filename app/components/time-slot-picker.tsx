"use client";
import {useEffect,useId,useRef,useState} from "react";

type Props={name:string;value:string;placeholder:string;disabled:boolean;times:string[];available:(time:string)=>boolean;onChange:(time:string)=>void;onFocus?:()=>void};
/** Render our own options: Android/iOS native pickers ignore option colours. */
export function TimeSlotPicker({name,value,placeholder,disabled,times,available,onChange,onFocus}:Props){
 const id=useId(),root=useRef<HTMLSpanElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const [open,setOpen]=useState(false),[active,setActive]=useState(-1);
 const enabled=times.map((_,i)=>i).filter(i=>available(times[i]));
 const close=()=>setOpen(false);
 useEffect(()=>{const outside=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false)};document.addEventListener("pointerdown",outside);return()=>document.removeEventListener("pointerdown",outside)},[]);
 useEffect(()=>{if(disabled)setOpen(false)},[disabled]);
 useEffect(()=>{if(open&&active>=0)document.getElementById(`${id}-${active}`)?.scrollIntoView({block:"nearest"})},[active,open,id]);
 const show=()=>{setOpen(true);setActive(enabled.includes(times.indexOf(value))?times.indexOf(value):(enabled[0]??-1))};
 const choose=(i:number)=>{if(i>=0&&available(times[i])){onChange(times[i]);close();trigger.current?.focus()}};
 return <span className="time-select custom-time-picker" ref={root} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))close()}}>
 <select className="time-picker-native" name={name} required disabled={disabled} value={value} tabIndex={-1} aria-hidden="true" onChange={e=>onChange(e.currentTarget.value)} onInvalid={e=>{e.preventDefault();trigger.current?.focus();show()}}><option value="" disabled>{placeholder}</option>{times.map(t=><option key={t} value={t} disabled={!available(t)}>{t}</option>)}</select>
 <button ref={trigger} type="button" className="time-picker-trigger" data-placeholder={!value&&placeholder==="Select a date first before selecting a time slot"?"date-first":undefined} role="combobox" aria-label={name} aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-list`} aria-activedescendant={open&&active>=0?`${id}-${active}`:undefined} disabled={disabled} onFocus={onFocus} onClick={()=>open?close():show()} onKeyDown={e=>{
 if(e.key==="Escape"){e.preventDefault();close();return}if(e.key==="Tab"){close();return}
 if(["ArrowDown","ArrowUp","Home","End"].includes(e.key)){e.preventDefault();if(!open){show();return}const p=enabled.indexOf(active);setActive(e.key==="Home"?enabled[0]??-1:e.key==="End"?enabled.at(-1)??-1:enabled[Math.max(0,Math.min(enabled.length-1,p+(e.key==="ArrowDown"?1:-1)))]??-1)}
 if((e.key==="Enter"||e.key===" ")&&open){e.preventDefault();choose(active)}
 }}><span>{value||placeholder}</span><span aria-hidden="true">▾</span></button>
 {open&&<span id={`${id}-list`} className="time-picker-options" role="listbox" aria-label={name}>{times.map((t,i)=><span id={`${id}-${i}`} key={t} role="option" aria-selected={value===t} aria-disabled={!available(t)} className={`time-picker-option${available(t)?"":" is-unavailable"}${active===i&&available(t)?" is-active":""}`} onPointerDown={e=>e.preventDefault()} onClick={e=>{e.preventDefault();choose(i)}}>{t}</span>)}</span>}
 </span>
}
