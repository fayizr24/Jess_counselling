export const AVAILABILITY_ERROR='Booking availability cannot be displayed at the moment due to a temporary server issue. Please try again shortly. If the issue persists, contact us directly by email or WhatsApp to make a booking.';
export const SUBMISSION_ERROR='The form could not be submitted due to a server error. Please try again shortly. If the issue persists, contact us directly by email or WhatsApp to make a booking.';
export const EMAIL_WARNING='Your slot is reserved, but the notification email could not be sent to Jess Counselling due to a server error. Please contact Jess Counselling directly by email or WhatsApp to confirm your booking. Do not submit the form again.';
export function connectivityError(error:unknown){const message=error instanceof Error?error.message:'Connection failed';return `${message.replace(/[.\s]+$/,'')}. If you are unable to make a booking, contact us directly by email or WhatsApp to make a booking.`;}
/** Preserve server errors and HTTP status; normalize transport and non-JSON failures. */
export async function bookingRequest<T>(url:string,init:RequestInit,fallback:string){
 let response:Response;try{response=await fetch(url,init)}catch(error){throw new Error(connectivityError(error))}
 let data:T;try{data=await response.json() as T;if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Invalid response')}catch{throw new Error(fallback)}
 return {response,data};
}

export function isBookingIssue(message:string){return message===AVAILABILITY_ERROR||message===SUBMISSION_ERROR||message.includes(EMAIL_WARNING)||message.includes("That time slot has just been booked by another user.")||message.includes("If you are unable to make a booking, contact us directly by email or WhatsApp to make a booking.");}
