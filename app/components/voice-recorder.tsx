"use client";
import {useEffect, useRef, useState} from "react";
import {Mic, Square, Trash2} from "lucide-react";

export function VoiceRecorder({disabled, onChange, onBusyChange, resetKey}: {
  disabled:boolean; onChange:(file:File|null)=>void; onBusyChange:(busy:boolean)=>void; resetKey:number;
}) {
  const [phase,setPhase]=useState<"idle"|"starting"|"recording"|"finishing">("idle");
  const [seconds,setSeconds]=useState(0), [url,setUrl]=useState(""), [message,setMessage]=useState("");
  const recorder=useRef<MediaRecorder|null>(null), stream=useRef<MediaStream|null>(null);
  const timeout=useRef<ReturnType<typeof setTimeout>|null>(null), ticker=useRef<ReturnType<typeof setInterval>|null>(null);
  const generation=useRef(0), objectUrl=useRef("");
  function release() { if(timeout.current)clearTimeout(timeout.current);if(ticker.current)clearInterval(ticker.current);stream.current?.getTracks().forEach(track=>track.stop());stream.current=null; }
  function clear() { generation.current++;const active=recorder.current;recorder.current=null;if(active&&active.state!=="inactive")active.stop();release();if(objectUrl.current)URL.revokeObjectURL(objectUrl.current);objectUrl.current="";setUrl("");setSeconds(0);setPhase("idle");setMessage("");onChange(null);onBusyChange(false); }
  useEffect(()=>{clear();return()=>{generation.current++;if(recorder.current?.state!=="inactive")recorder.current?.stop();release();if(objectUrl.current)URL.revokeObjectURL(objectUrl.current);};},[resetKey]);
  function stop() { if(recorder.current?.state==="recording"){setPhase("finishing");recorder.current.stop();release();} }
  async function start() {
    if(phase!=="idle"||disabled)return;
    if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined"){setMessage("Voice recording is unavailable in this browser. Please use the text box above.");return;}
    clear();const token=generation.current;setPhase("starting");onBusyChange(true);
    try {
      const input=await navigator.mediaDevices.getUserMedia({audio:true});
      if(token!==generation.current){input.getTracks().forEach(track=>track.stop());return;}
      stream.current=input;
      const mime=["audio/webm;codecs=opus","audio/mp4","audio/ogg;codecs=opus"].find(type=>MediaRecorder.isTypeSupported(type));
      const recording=new MediaRecorder(input,{...(mime?{mimeType:mime}:{}),audioBitsPerSecond:64000});
      recorder.current=recording;const chunks:BlobPart[]=[];
      recording.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
      recording.onerror=()=>{if(token===generation.current){clear();setMessage("Recording failed. Please try again or use the text box above.");}};
      recording.onstop=()=>{
        if(token!==generation.current)return;
        release();const type=recording.mimeType||mime||"audio/webm";
        const blob=new Blob(chunks,{type});setPhase("idle");onBusyChange(false);
        if(!blob.size||blob.size>5*1024*1024){setMessage("The recording could not be saved. Please record a shorter message.");return;}
        const extension=type.includes("mp4")?"m4a":type.includes("ogg")?"ogg":"webm";
        const file=new File([blob],`counselling-voice-message.${extension}`,{type});
        objectUrl.current=URL.createObjectURL(file);setUrl(objectUrl.current);onChange(file);setMessage("Recording ready. Listen before submitting, or delete it to record again.");
      };
      recording.start(1000);setPhase("recording");setMessage("");const began=Date.now();
      ticker.current=setInterval(()=>setSeconds(Math.min(120,Math.floor((Date.now()-began)/1000))),250);
      timeout.current=setTimeout(stop,120000);
    } catch(error) { if(token!==generation.current)return;release();setPhase("idle");onBusyChange(false);setMessage(error instanceof DOMException&&error.name==="NotAllowedError"?"Microphone access was not allowed. Enable it in your browser settings, or use the text box above.":"Could not access your microphone. Please try again or use the text box above."); }
  }
  return <section className="voice-recorder" aria-labelledby="voice-recording-title">
    <b id="voice-recording-title">Voice Recording (Optional):</b>
    <p>Prefer to speak? Record your counselling requirements in Malayalam or English (up to 2 minutes).</p>
    <div className="voice-controls">
      <button type="button" className="voice-button" disabled={disabled||phase==="starting"||phase==="finishing"} onClick={phase==="recording"?stop:start}>{phase==="recording"?<Square size={16}/>:<Mic size={16}/>} {phase==="recording"?"Stop Recording":phase==="starting"?"Opening microphone…":phase==="finishing"?"Saving recording…":url?"Record Again":"Start Recording"}</button>
      <span className={phase==="recording"?"voice-timer recording":"voice-timer"} role="timer" aria-label="Recording duration">{String(Math.floor(seconds/60)).padStart(2,"0")}:{String(seconds%60).padStart(2,"0")} / 02:00</span>
      {url&&<button type="button" className="voice-delete" disabled={disabled} onClick={clear}><Trash2 size={16}/> Delete</button>}
    </div>
    {url&&<audio controls src={url} aria-label="Play your voice recording"/>}
    <p className={message?"voice-status voice-status-updated":"voice-status"} role="status">{message||"Allow microphone access when prompted. Your recording will be sent with this form."}</p>
  </section>;
}
