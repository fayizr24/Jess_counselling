export function createContactAcknowledgementData(form:FormData){
  return {
    time:String(form.get("callback time (Indian Time)")||""),
    date:String(form.get("callback date")||""),
    contacts:String(form.get("contact methods")||"").split(", ").filter(Boolean).map(method=>({
      method,
      detail:String(form.get("contact_"+method)||"")
    }))
  };
}

export function ContactAcknowledgement({details}:{details:ReturnType<typeof createContactAcknowledgementData>}){
  return <section className="contact-acknowledgement" role="status" aria-label="Free online consultation acknowledgement">
    <h2><span className="contact-acknowledgement-check" aria-hidden="true">✓</span>Free Online Consultation Request</h2>
    <p>Thank you for submitting a free online consultation request. Your session will be arranged as scheduled at {details.time} Indian time on {details.date}.</p>
    <dl className="contact-acknowledgement-details">{details.contacts.map(contact=><div className="contact-acknowledgement-method" key={contact.method}>
      <dt>Contact method</dt><dd>{contact.method}</dd>
      <dt>Contact details</dt><dd>{contact.detail}</dd>
    </div>)}</dl>
    <p className="contact-acknowledgement-reschedule">For rescheduling or cancellation, please contact us by email or WhatsApp.</p>
  </section>;
}
