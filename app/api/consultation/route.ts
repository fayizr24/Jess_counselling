import { CONSULTATION_NOTICE_MESSAGE, consultationSlotAvailable } from "../../lib/consultation-slots";
import { EmailConfigurationError, getNamecheapConfiguration, sendNamecheapEmail, type EmailAttachment } from "../../lib/namecheap-email";

const escapeHtml=(value:FormDataEntryValue|null)=>String(value||"Not provided")
  .replaceAll("&","&amp;")
  .replaceAll("<","&lt;")
  .replaceAll(">","&gt;")
  .replaceAll('"',"&quot;")
  .replaceAll("'","&#039;");

export async function POST(request:Request){
  if (Number(request.headers.get("content-length") || 0) > 6 * 1024 * 1024) return Response.json({error:"The recording is too large. Please record a shorter message."},{status:413});
  let form:FormData;
  try { form=await request.formData(); } catch { return Response.json({error:"The form could not be read. Please try again."},{status:400}); }
  let attachment:EmailAttachment|undefined;
  const recording=form.get("voice recording");
  if (recording!==null) {
    if (typeof recording === "string" || !recording.size || recording.size>5*1024*1024) return Response.json({error:"Please record a voice message smaller than 5 MB."},{status:400});
    const type=recording.type.split(";")[0].toLowerCase();
    const extensions:Record<string,string>={"audio/webm":"webm","audio/mp4":"m4a","audio/ogg":"ogg"};
    if (!extensions[type]) return Response.json({error:"Unsupported recording format. Please record again or use the text box."},{status:400});
    const bytes=new Uint8Array(await recording.arrayBuffer());
    const starts=(values:number[])=>values.every((value,index)=>bytes[index]===value);
    if (!(type==="audio/webm"&&starts([0x1a,0x45,0xdf,0xa3]) || type==="audio/ogg"&&starts([0x4f,0x67,0x67,0x53]) || type==="audio/mp4"&&String.fromCharCode(...bytes.slice(4,8))==="ftyp")) return Response.json({error:"The recording is invalid. Please record again."},{status:400});
    let binary="";for(let offset=0;offset<bytes.length;offset+=16384)binary+=String.fromCharCode(...bytes.subarray(offset,offset+16384));
    attachment={filename:`counselling-voice-message.${extensions[type]}`,contentType:type,base64:btoa(binary)};
  }
  if (!consultationSlotAvailable(String(form.get("callback date") || ""), String(form.get("callback time (Indian Time)") || ""))) {
    return Response.json({error:CONSULTATION_NOTICE_MESSAGE},{status:400});
  }
  try {
    getNamecheapConfiguration();
  } catch (error) {
    if (error instanceof EmailConfigurationError) return Response.json({error:"The email service is not configured yet. Please email hello@jesscounselling.online directly."},{status:503});
    throw error;
  }

  const name=escapeHtml(form.get("name"));
  const methods=String(form.get("contact methods")||"Not provided");
  const contactRows=methods.split(",").map(method=>method.trim()).filter(Boolean).map(method=>{
    const detail=escapeHtml(form.get("contact_"+method));
    return `<tr><td style="padding:6px 0;color:#51636a;width:42%;vertical-align:top;">${escapeHtml(method)}</td><td style="padding:6px 0;color:#071a58;font-weight:600;vertical-align:top;">${detail}</td></tr>`;
  }).join("");
  const callbackDate=escapeHtml(form.get("callback date"));
  const callbackTime=escapeHtml(form.get("callback time (Indian Time)"));
  const support=escapeHtml(form.get("support requested"));
  const otherSupport=escapeHtml(form.get("other support"));
  const additional=escapeHtml(form.get("additional information"));
  const section=(title:string,content:string)=>`<tr><td style="padding:0 28px 20px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#f4f7e8;border-radius:10px;"><tr><td style="padding:11px 16px;background:#6f7f32;color:#fff;font-size:16px;font-weight:700;border-radius:10px 10px 0 0;">${title}</td></tr><tr><td style="padding:14px 16px;">${content}</td></tr></table></td></tr>`;

  const html=`<!doctype html><html><body style="margin:0;padding:0;background:#eef7f2;font-family:Arial,Helvetica,sans-serif;color:#071a58;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#eef7f2;"><tr><td align="center" style="padding:24px 12px;"><table role="presentation" width="640" cellspacing="0" cellpadding="0" style="width:100%;max-width:640px;border-collapse:collapse;background:#fff;border:1px solid #d7dfdd;border-radius:14px;overflow:hidden;">
    <tr><td style="padding:26px 28px 20px;background:#071a58;color:#fff;"><div style="font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:700;">Jess Counselling</div><span style="display:inline-block;margin-top:7px;padding:3px 9px;background:#fff3a3;color:#111;border-radius:4px;font-family:Georgia,'Times New Roman',serif;font-size:15px;">Online Counselling Services</span><div style="margin-top:14px;font-size:22px;font-weight:700;">New Consultation Request</div><div style="margin-top:5px;color:#dfe9df;font-size:14px;">A new request has been submitted through the website.</div></td></tr>
    <tr><td style="padding:20px 28px 12px;"><div style="font-size:13px;color:#6f7f32;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Client</div><div style="margin-top:5px;font-size:22px;font-weight:700;color:#071a58;">${name}</div></td></tr>
    ${section("Preferred Contact Method",`<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">${contactRows}</table>`)}
    ${section("Preferred Callback",`<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;"><tr><td style="padding:6px 0;color:#51636a;width:42%;">Date</td><td style="padding:6px 0;color:#071a58;font-weight:600;">${callbackDate}</td></tr><tr><td style="padding:6px 0;color:#51636a;">Time</td><td style="padding:6px 0;color:#071a58;font-weight:600;">${callbackTime} <span style="background:#fff3a3;color:#111;padding:1px 5px;">(Indian Time)</span></td></tr></table>`)}
    ${section("Areas of Support",`<div style="line-height:1.55;color:#071a58;">${support}</div>${otherSupport!=="Not provided"?`<div style="margin-top:8px;color:#51636a;">Other details: <strong style="color:#071a58;">${otherSupport}</strong></div>`:""}`)}
    ${section("Additional Information",`<div style="padding:12px 14px;background:#fff;border-left:4px solid #fff3a3;color:#24394c;line-height:1.55;white-space:pre-wrap;">${additional}</div>`)}
    ${attachment?section("Voice Recording","The client’s voice recording is attached to this email."):""}
    <tr><td style="padding:2px 28px 26px;text-align:center;color:#66777b;font-size:12px;">This consultation request was submitted through the Jess Counselling website.<br><strong style="color:#071a58;">Malayalam / English</strong></td></tr>
  </table></td></tr></table></body></html>`;

  const rows:string[]=[];
  form.forEach((value,label)=>{if(typeof value==="string")rows.push(`${label}: ${value}`);});if(attachment)rows.push("Voice recording: attached");
  try {
    await sendNamecheapEmail({subject:`${form.get("name")}: New consultation request`,html,text:rows.join("\n"),attachment});
  } catch {
    // Do not expose SMTP replies, mailbox passwords, or counselling content.
    return Response.json({error:"The request could not be emailed. Please try again or contact us directly."},{status:502});
  }
  return Response.json({ok:true});
}
