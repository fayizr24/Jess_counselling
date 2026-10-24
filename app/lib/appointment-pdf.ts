import {jsPDF} from "jspdf";
import {regularFont,boldFont} from "./appointment-pdf-fonts";
import {appointmentPdfLogo} from "./appointment-pdf-logo";
import {appointmentPdfFooterScript} from "./appointment-pdf-footer";

/** The same appointment content, laid out for readable A4 printing. */
export function createAppointmentPdfBlob(details:Record<string,string>){
  const doc=new jsPDF({unit:"pt",format:"a4"});
  doc.addFileToVFS("JessSans-Regular.ttf",regularFont);
  doc.addFont("JessSans-Regular.ttf","JessSans","normal");
  doc.addFileToVFS("JessSans-Bold.ttf",boldFont);
  doc.addFont("JessSans-Bold.ttf","JessSans","bold");
  const normalized=(value:string)=>(value||"Not provided").replace(/[—–]/g,"-").replace(/’/g,"'");
  const width=doc.internal.pageSize.getWidth(),height=doc.internal.pageSize.getHeight();
  const margin=42,contentWidth=width-margin*2,bottom=height-125;
  const green:[number,number,number]=[0,102,81];
  const ink:[number,number,number]=[27,51,49];
  const muted:[number,number,number]=[83,105,96];
  const sage:[number,number,number]=[238,245,232];
  const cream:[number,number,number]=[255,253,245];
  const yellow:[number,number,number]=[255,226,71];
  let y=0;

  const pageHeader=()=>{
    doc.setFillColor(...cream);doc.rect(0,0,width,height,"F");
    doc.setFillColor(220,227,189);doc.rect(0,0,width,111,"F");
    doc.setFillColor(255,255,255);doc.roundedRect(margin,14,260,83,5,5,"F");
    doc.addImage(appointmentPdfLogo,"PNG",margin+7,14,246,246*685/2048,"Logo-with-boxes","FAST");
    const titleX=width-margin-227;
    doc.setFillColor(...yellow);doc.roundedRect(titleX,41,227,29,5,5,"F");
    doc.setTextColor(...ink);doc.setFont("JessSans","normal");doc.setFontSize(14);
    doc.text("Appointment Booking",titleX+12,60);
    y=135;
  };
  const newPage=()=>{doc.addPage();pageHeader();};
  const ensure=(required:number)=>{if(y+required>bottom)newPage();};
  pageHeader();
  doc.setFont("JessSans","bold");doc.setFontSize(11);doc.setTextColor(...green);
  doc.text("Appointment details",margin,y);y+=14;

  const contactDetails=Object.entries(details).filter(([key,value])=>key.startsWith("contact_")&&value.trim()).map(([key,value])=>key.slice(8)+": "+value.trim()).join("; ");
  const rows=[["Name / alias",details.name],["Confirmation email",details["confirmation email"]],["Contact method",details["contact methods"]],["Contact details",contactDetails],["Appointment date",details["appointment date"]],["Appointment time",`${details["appointment time (Indian Time)"]||"Not provided"} (Indian Time)`],["Session Duration","1 Hour"]];
  if((details["contact methods"]||"").split(",").some(method=>method.trim()==="Google Meet")&&details["Google Meet WhatsApp or email"]?.trim())rows.splice(4,0,["WhatsApp / email (Meet)",details["Google Meet WhatsApp or email"].trim()]);
  for(const [index,[label,value]] of rows.entries()){
    doc.setFont("JessSans","normal");doc.setFontSize(10.5);
    const lines:string[]=doc.splitTextToSize(normalized(value||"Not provided"),contentWidth-176);
    let cursor=0;
    while(cursor<lines.length){
      ensure(30);
      const count=Math.max(1,Math.floor((bottom-y-20)/13));
      const part=lines.slice(cursor,cursor+count);
      const rowHeight=Math.max(30,part.length*13+17);
      doc.setFillColor(...(index%2===0?sage:[255,255,255] as [number,number,number]));
      doc.rect(margin,y,contentWidth,rowHeight,"F");
      doc.setFillColor(...green);doc.rect(margin,y,3,rowHeight,"F");
      doc.setFont("JessSans","bold");doc.setFontSize(9);doc.setTextColor(...muted);
      doc.text(label,margin+14,y+20);
      doc.setFont("JessSans",index>=4?"bold":"normal");doc.setFontSize(10.5);doc.setTextColor(...ink);
      doc.text(part,margin+164,y+20,{lineHeightFactor:13/10.5});
      y+=rowHeight;cursor+=part.length;
      if(cursor<lines.length)newPage();
    }
  }
  y+=10;
  doc.setFont("JessSans","normal");doc.setFontSize(9.5);
  doc.setFont("JessSans","bold");
  const payment=doc.splitTextToSize("Payment instructions will be sent to you separately. Appointments are confirmed only after receiving the payment.",contentWidth-30);
  doc.setFont("JessSans","normal");
  const contactNote=doc.splitTextToSize("You can contact us by email or WhatsApp to change or cancel a booked appointment.",contentWidth-30);
  const noteLineHeight=11.5;
  const noteHeight=(payment.length+1+contactNote.length)*noteLineHeight+19;ensure(noteHeight);
  doc.setFontSize(9.5);
  doc.setFillColor(255,247,199);doc.roundedRect(margin,y,contentWidth,noteHeight,5,5,"F");
  doc.setFillColor(...yellow);doc.rect(margin,y,3,noteHeight,"F");
  doc.setTextColor(...ink);doc.setFont("JessSans","bold");
  doc.text(payment,margin+14,y+16,{lineHeightFactor:noteLineHeight/9.5});
  doc.setFont("JessSans","normal");
  doc.text(contactNote,margin+14,y+16+(payment.length+1)*noteLineHeight,{lineHeightFactor:noteLineHeight/9.5});y+=noteHeight+12;

  ensure(50);
  doc.setFont("JessSans","bold");doc.setFontSize(10);doc.setTextColor(...green);
  doc.text("Jess Counselling LLP",margin,y);y+=13;
  doc.setFont("JessSans","normal");doc.setFontSize(8);doc.setTextColor(...ink);
  doc.text("Email: hello@jesscounselling.online",margin,y);
  const whatsapp=doc.splitTextToSize("WhatsApp: +91 989 529 6274 (Text or recorded voice only)",contentWidth-230);
  doc.text(whatsapp,margin+230,y,{lineHeightFactor:1.25});y+=Math.max(10,whatsapp.length*10)+12;
  ensure(18);
  doc.setFont("JessSans","normal");doc.setFontSize(8);doc.setTextColor(...muted);
  const disclaimerPrefix="Counselling disclaimer can be found at ";
  const disclaimerUrl="www.jesscounselling.online/disclaimer";
  doc.text(disclaimerPrefix,margin,y);
  doc.textWithLink(disclaimerUrl,margin+doc.getTextWidth(disclaimerPrefix),y,{url:"https://www.jesscounselling.online/disclaimer"});
  y+=18;
  const pages=doc.getNumberOfPages();
  for(let page=1;page<=pages;page++){
    doc.setPage(page);
    const footerTop=height-110;
    doc.setFillColor(240,243,228);doc.rect(0,footerTop,width,110,"F");
    doc.setDrawColor(215,223,221);doc.setLineWidth(.6);doc.line(margin,footerTop,width-margin,footerTop);
    doc.addImage(appointmentPdfLogo,"PNG",margin,footerTop+19,150,150*729/2157,"Logo-Final","FAST");
    doc.setFont("JessSans","bold");doc.setFontSize(10);doc.setTextColor(0,75,54);
    doc.text("Jess Counselling LLP",width/2,footerTop+30,{align:"center"});
    doc.setFont("JessSans","normal");doc.setFontSize(7);
    doc.text(["Established as a limited liability","entity in India"],width/2,footerTop+44,{lineHeightFactor:1.3,align:"center"});
    doc.setFontSize(8);doc.textWithLink("hello@jesscounselling.online",(width-doc.getTextWidth("hello@jesscounselling.online"))/2,footerTop+69,{url:"mailto:hello@jesscounselling.online"});
    doc.addImage(appointmentPdfFooterScript,"PNG",width-margin-82,footerTop+14,82,82*258/400,"Footer-script","FAST");
    doc.setFontSize(7);doc.setTextColor(...muted);
    const copyright="© 2026 Jess Counselling LLP. All rights reserved. ";
    const link="Counselling Disclaimer";
    const x=(width-doc.getTextWidth(copyright+link))/2;
    doc.text(copyright,x,height-20);
    const linkX=x+doc.getTextWidth(copyright);
    doc.textWithLink(link,linkX,height-20,{url:"https://www.jesscounselling.online/disclaimer"});
    doc.line(linkX,height-18,linkX+doc.getTextWidth(link),height-18);
  }
  return doc.output("blob");
}
