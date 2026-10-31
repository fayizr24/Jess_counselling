export type DailyForm='contact'|'appointment';
export function indianSubmissionDay(now=Date.now()){return new Date(now+19800000).toISOString().slice(0,10);}
export function dailySubmissionKey(form:DailyForm){return `jess-counselling:${form}:last-successful-day`;}
export function createDailySubmissionGuard(form:DailyForm,storage:Pick<Storage,'getItem'|'setItem'>|null,clock=Date.now){let successfulDay='';return {blocked(){const today=indianSubmissionDay(clock());let saved='';try{saved=storage?.getItem(dailySubmissionKey(form))||'';}catch{}return saved===today||successfulDay===today;},markSuccessful(submittedAt=clock()){successfulDay=indianSubmissionDay(submittedAt);try{storage?.setItem(dailySubmissionKey(form),successfulDay);}catch{}}};}
