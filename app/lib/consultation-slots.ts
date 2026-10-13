import {scheduleAvailable,timesFor} from './booking-schedule';
export {consultationDateIso} from './booking-schedule';
export const CONSULTATION_NOTICE_MS=7200000;
export const CONSULTATION_NOTICE_MESSAGE='Please select a consultation slot at least two hours from now (Indian time).';
export const CONSULTATION_TIMES=timesFor('contact');
export function consultationSlotAvailable(date:string,time:string,now=Date.now()){return scheduleAvailable('contact',date,time,now);}
export function consultationDateAvailable(date:string,now=Date.now()){return timesFor('contact',date).some(time=>scheduleAvailable('contact',date,time,now));}
