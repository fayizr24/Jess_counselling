export type BookingKind='contact'|'appointment';
export function timeLabel(minute:number){const h=Math.floor(minute/60);return `${h%12||12}:${String(minute%60).padStart(2,'0')} ${h>=12?'PM':'AM'}`;}
export function timeMinute(value:string){const m=/^(\d{1,2}):(\d{2}) (AM|PM)$/.exec(value);if(!m||+m[1]<1||+m[1]>12||+m[2]>59)return -1;return (+m[1]%12+(m[3]==='PM'?12:0))*60 + +m[2];}
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export function consultationDateIso(value:string){if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value;const m=/^(\d{1,2}) ([A-Za-z]{3}) (\d{4})$/.exec(value);if(!m||!MONTHS.includes(m[2]))return '';return `${m[3]}-${String(MONTHS.indexOf(m[2])+1).padStart(2,'0')}-${m[1].padStart(2,'0')}`;}
export function validDate(date:string){return /^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date+'T00:00:00Z'))&&new Date(date+'T00:00:00Z').toISOString().slice(0,10)===date;}
export function timesFor(kind:BookingKind,date?:string){const step=kind==='contact'?15:30;const range=(a:number,b:number)=>Array.from({length:(b-a)/step+1},(_,i)=>timeLabel(a+i*step));const iso=date?consultationDateIso(date):'';const weekday=validDate(iso)?new Date(iso+'T00:00:00Z').getUTCDay():-1;return [...(weekday===5?range(630,750):[]),...range(1170,1350)];}
export const APPOINTMENT_TIMES=timesFor('appointment');
export function defaultSlot(kind:BookingKind,date:string,time:string){return validDate(date)&&new Date(date+'T00:00:00Z').getUTCDay()!==6&&timesFor(kind,date).includes(time);}
export function scheduleAvailable(kind:BookingKind,dateValue:string,time:string,now=Date.now(),manualAllow=false){const date=consultationDateIso(dateValue),n=timeMinute(time);if(!validDate(date)||n<0||n%(kind==='contact'?15:30)!==0)return false;if(!manualAllow&&!defaultSlot(kind,date,time))return false;return Date.parse(`${date}T${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}:00+05:30`)>=now+7200000;}
export function radiusFor(kind:BookingKind){return kind==='contact'?15:60;}
export function forwardRadiusFor(kind:BookingKind){return kind==='contact'?15:75;}

/** Weekly closures only: session end is included; no backward schedule check. */
export function forwardScheduleClosures(kind:BookingKind,date:string,minute:number){
 const points:{date:string;minute:number;offsetMinute:number}[]=[];
 for(let offset=15;offset<=forwardRadiusFor(kind);offset+=15){
  const relative=minute+offset,day=new Date(Date.parse(date+'T00:00:00Z')+Math.floor(relative/1440)*86400000).toISOString().slice(0,10),point=relative%1440;
  // Weekly hours use the shared 15-minute grid, even for 30-minute appointment starts.
  if(!defaultSlot('contact',day,timeLabel(point)))points.push({date:day,minute:point,offsetMinute:relative});
 }
 return points;
}
