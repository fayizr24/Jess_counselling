// Contact consultation schedule only. Appointment scheduling is independent.
export const CONSULTATION_NOTICE_MS = 2 * 60 * 60 * 1000;
export const CONSULTATION_NOTICE_MESSAGE = "Please select a consultation slot at least two hours from now (Indian time).";
export const CONSULTATION_TIMES = ["7:30 PM", "7:45 PM", "8:00 PM", "8:15 PM", "8:30 PM", "8:45 PM", "9:00 PM", "9:15 PM", "9:30 PM", "9:45 PM", "10:00 PM", "10:15 PM", "10:30 PM"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function consultationDateIso(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = /^(\d{1,2}) ([A-Za-z]{3}) (\d{4})$/.exec(value);
  if (!match) return "";
  const month = MONTHS.indexOf(match[2]);
  return month < 0 ? "" : `${match[3]}-${String(month + 1).padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

export function consultationSlotAvailable(date: string, time: string, now = Date.now()): boolean {
  const iso = consultationDateIso(date);
  if (!iso || !CONSULTATION_TIMES.includes(time)) return false;
  const day = new Date(`${iso}T00:00:00Z`);
  if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== iso || day.getUTCDay() < 1 || day.getUTCDay() > 5) return false;
  const match = /^(\d{1,2}):(\d{2}) PM$/.exec(time)!;
  const hour = Number(match[1]) % 12 + 12;
  const slot = Date.parse(`${iso}T${String(hour).padStart(2, "0")}:${match[2]}:00+05:30`);
  return slot >= now + CONSULTATION_NOTICE_MS;
}

export function consultationDateAvailable(date: string, now = Date.now()): boolean {
  return CONSULTATION_TIMES.some(time => consultationSlotAvailable(date, time, now));
}
