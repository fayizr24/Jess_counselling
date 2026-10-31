/** Browser-only deterrent. Neither the digits nor their hash are sent to the receipt API. */
const salt="842337ea514f9af714da243afdf51cec";
const digest="22afe19fbee7d1ed207590064afed1d97a3061f4a4fb4e5eba29942844294d1a";
export async function matchesReceiptPasscode(value:string){
 if(!/^\d{4}$/.test(value))return false;
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(salt+':'+value));
 const actual=Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join('');
 return actual===digest;
}
