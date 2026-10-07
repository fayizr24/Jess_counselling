import { EmailConfigurationError, getNamecheapConfiguration, sendNamecheapEmail } from "../../lib/namecheap-email";

const escapeHtml=(value:FormDataEntryValue|null)=>String(value||"Not provided")
  .replaceAll("&","&amp;")
  .replaceAll("<","&lt;")
  .replaceAll(">","&gt;")
  .replaceAll('"',"&quot;")
  .replaceAll("'","&#039;");

export async function POST(request:Request){
  const form=await request.formData();
  try {
    getNamecheapConfiguration("appointment");
  } catch (error) {
    if (error instanceof EmailConfigurationError) return Response.json({error:"The email service is not configured yet. Please email hello@jesscounselling.online directly."},{status:503});
    throw error;
  }

  const name=escapeHtml(form.get("name"));
  const email=escapeHtml(form.get("confirmation email"));
  const methods=String(form.get("contact methods")||"Not provided");
  const contactRows=methods.split(",").map(method=>method.trim()).filter(Boolean).map(method=>{
    const detail=escapeHtml(form.get("contact_"+method));
    return `<tr><td style="padding:6px 0;color:#51636a;width:42%;vertical-align:top;">${escapeHtml(method)}</td><td style="padding:6px 0;color:#071a58;font-weight:600;vertical-align:top;">${detail}</td></tr>`;
  }).join("");
  const appointmentDate=escapeHtml(form.get("appointment date"));
  const appointmentTime=escapeHtml(form.get("appointment time (Indian Time)"));
  const section=(title:string,content:string)=>`<tr><td style="padding:0 28px 20px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#f4f7e8;border-radius:10px;"><tr><td style="padding:11px 16px;background:#6f7f32;color:#fff;font-size:16px;font-weight:700;border-radius:10px 10px 0 0;">${title}</td></tr><tr><td style="padding:14px 16px;">${content}</td></tr></table></td></tr>`;

  const html=`<!doctype html><html><body style="margin:0;padding:0;background:#eef7f2;font-family:Arial,Helvetica,sans-serif;color:#071a58;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#eef7f2;"><tr><td align="center" style="padding:24px 12px;"><table role="presentation" width="640" cellspacing="0" cellpadding="0" style="width:100%;max-width:640px;border-collapse:collapse;background:#fff;border:1px solid #d7dfdd;border-radius:14px;overflow:hidden;">
    <tr><td style="padding:26px 28px 20px;background:#071a58;color:#fff;"><div style="font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:700;">Jess Counselling</div><span style="display:inline-block;margin-top:7px;padding:3px 9px;background:#fff3a3;color:#111;border-radius:4px;font-family:Georgia,'Times New Roman',serif;font-size:15px;">Online Counselling Services</span><div style="margin-top:14px;font-size:22px;font-weight:700;">New Appointment Booking</div></td></tr>
    <tr><td style="padding:20px 28px 12px;"><div style="font-size:13px;color:#6f7f32;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Client</div><div style="margin-top:5px;font-size:22px;font-weight:700;color:#071a58;">${name}</div><div style="margin-top:5px;color:#51636a;">Confirmation email: ${email}</div></td></tr>
    ${section("Counselling Contact Method",`<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">${contactRows}</table>`)}
    ${section("Appointment",`<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;"><tr><td style="padding:6px 0;color:#51636a;width:42%;">Date</td><td style="padding:6px 0;color:#071a58;font-weight:600;">${appointmentDate}</td></tr><tr><td style="padding:6px 0;color:#51636a;">Time</td><td style="padding:6px 0;color:#071a58;font-weight:600;">${appointmentTime} <span style="background:#fff3a3;color:#111;padding:1px 5px;">(Indian Time)</span></td></tr></table>`)}
    <tr><td style="padding:2px 28px 26px;text-align:center;color:#66777b;font-size:12px;">Submitted through the private Jess Counselling appointment page.</td></tr>
  </table></td></tr></table></body></html>`;

  const rows:string[]=[];
  form.forEach((value,label)=>rows.push(`${label}: ${String(value)}`));
  try {
    await sendNamecheapEmail({subject:`${form.get("name")}: New appointment booking`,html,text:rows.join("\n")}, "appointment");
  } catch {
    return Response.json({error:"The appointment could not be emailed. Please try again or contact us directly."},{status:502});
  }
  return Response.json({ok:true});
}
