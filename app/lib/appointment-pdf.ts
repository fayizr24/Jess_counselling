import {jsPDF} from "jspdf";
import {regularFont,boldFont} from "./appointment-pdf-fonts";
import {appointmentPdfLogo} from "./appointment-pdf-logo";

/** The same appointment content, laid out for readable A4 printing. */
export function createAppointmentPdfBlob(details:Record<string,string>){
  const doc=new jsPDF({unit:"pt",format:"a4"});
  doc.addFileToVFS("JessSans-Regular.ttf",regularFont);
  doc.addFont("JessSans-Regular.ttf","JessSans","normal");
  doc.addFileToVFS("JessSans-Bold.ttf",boldFont);
  doc.addFont("JessSans-Bold.ttf","JessSans","bold");
  const normalized=(value:string)=>(value||"Not provided").replace(/[—–]/g,"-").replace(/’/g,"'");
  const width=doc.internal.pageSize.getWidth(),height=doc.internal.pageSize.getHeight();
  const margin=42,contentWidth=width-margin*2,bottom=height-48;
  const green:[number,number,number]=[0,102,81];
  const ink:[number,number,number]=[27,51,49];
  const muted:[number,number,number]=[83,105,96];
  const sage:[number,number,number]=[238,245,232];
  const cream:[number,number,number]=[255,253,245];
  const yellow:[number,number,number]=[255,226,71];
  let y=0;

  const pageHeader=()=>{
    doc.setFillColor(...cream);doc.rect(0,0,width,height,"F");
    doc.setFillColor(...green);doc.rect(0,0,width,111,"F");
    doc.setFillColor(255,255,255);doc.roundedRect(margin,14,260,83,5,5,"F");
    doc.addImage(appointmentPdfLogo,"PNG",margin+7,14,246,246*729/2157,"Logo-Final","FAST");
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
  const rows=[["Name / alias",details.name],["Confirmation email",details["confirmation email"]],["Contact method",details["contact methods"]],["Contact details",contactDetails],["Appointment date",details["appointment date"]],["Appointment time",`${details["appointment time (Indian Time)"]||"Not provided"} (Indian Time)`]];
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
  const whatsapp=doc.splitTextToSize("WhatsApp: +91 989 529 6274 (Texting or recorded voice only)",contentWidth-230);
  doc.text(whatsapp,margin+230,y,{lineHeightFactor:1.25});y+=Math.max(10,whatsapp.length*10)+12;
  const disclaimer=["Counselling Disclaimer", "Jess Counselling LLP offers counselling to support emotional wellbeing, personal growth, and the exploration of personal or relationship concerns, including support for parents in relation to childcare, parenting challenges, and the emotional and developmental needs of children and adolescents. Our counsellors provide a caring, supportive space to help you reflect on your circumstances and consider possible options. Because every person and situation is different, counselling cannot guarantee a particular result or outcome.", "Health and Mental Health Matters", "Counselling and the information provided on this website are intended to complement—not replace—medical advice, psychiatric care, or specialist assessment and treatment when these are needed. If you have a physical or mental health concern, please speak with a suitably qualified and appropriately registered healthcare professional, such as a doctor, psychiatrist, or clinical psychologist, based on your individual needs.", "Personal Decisions and Responsibility", "The suggestions and guidance shared in counselling are intended to support thoughtful, informed decision-making. You remain responsible for your personal decisions and actions, including whether and how you choose to apply any counselling suggestions. Outcomes can vary depending on your individual circumstances and factors outside the counsellor’s control.", "Counselling guidance and recommendations are based on the information shared by the client. Clients are therefore encouraged to provide information that is complete and accurate to the best of their knowledge. Where relevant information is incomplete, inaccurate, or withheld, the counsellor’s understanding, guidance, or recommendations may be affected accordingly.", "Jess Counselling LLP, including its counsellors, partners, board members, employees, representatives, and other personnel, shall not be liable for any loss, harm, damage, or adverse consequences arising from or related to a client’s independent decisions, actions, or omissions following counselling."];
  for(let index=0;index<disclaimer.length;index++){
    const heading=index===0||index===2||index===4;
    const fontSize=heading?9:8,lineHeight=9.5;
    doc.setFont("JessSans",heading?"bold":"normal");doc.setFontSize(fontSize);
    const lines:string[]=doc.splitTextToSize(normalized(disclaimer[index]),contentWidth-24);
    // Keep a heading and its following paragraph together whenever they fit
    // on one page; avoid stranding the last line of a paragraph on a new page.
    let required=lines.length*lineHeight+(heading?14:8);
    if(heading&&disclaimer[index+1]){
      doc.setFont("JessSans","normal");doc.setFontSize(8);
      required+=doc.splitTextToSize(normalized(disclaimer[index+1]),contentWidth-24).length*9.5+12;
    }
    ensure(Math.min(required,bottom-135));
    doc.setFont("JessSans",heading?"bold":"normal");doc.setFontSize(fontSize);
    if(index===0){
      doc.setFillColor(...sage);doc.roundedRect(margin,y,contentWidth,22,4,4,"F");
      doc.setTextColor(...green);doc.text(lines,margin+12,y+14);y+=28;
      continue;
    }
    doc.setTextColor(...(heading?green:muted));
    for(const line of lines){
      if(y+lineHeight>bottom){newPage();doc.setFont("JessSans",heading?"bold":"normal");doc.setFontSize(fontSize);doc.setTextColor(...(heading?green:muted));}
      doc.text(line,margin+12,y);y+=lineHeight;
    }
    y+=heading?4:8;
  }
  const pages=doc.getNumberOfPages();
  for(let page=1;page<=pages;page++){
    doc.setPage(page);doc.setDrawColor(204,218,207);doc.setLineWidth(.6);
    doc.line(margin,height-34,width-margin,height-34);
    doc.setFont("JessSans","normal");doc.setFontSize(8);doc.setTextColor(...muted);
    doc.text(`${page} / ${pages}`,width-margin,height-20,{align:"right"});
  }
  return doc.output("blob");
}
