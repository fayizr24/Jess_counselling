import html2canvas from "html2canvas";
import {jsPDF} from "jspdf";

type ContactLink={url:string;x:number;y:number;width:number;height:number};
const contactLinksByCanvas=new WeakMap<HTMLCanvasElement,ContactLink[]>();

/** Capture only the visible acknowledgement, excluding its export controls. */
export async function captureContactAcknowledgement(element:HTMLElement){
  if(document.fonts?.ready)await document.fonts.ready;
  const links:ContactLink[]=[];
  const canvas=await html2canvas(element,{
    backgroundColor:"#fffef8",
    scale:Math.min(2,Math.max(1,window.devicePixelRatio||1)),
    logging:false,
    ignoreElements:node=>node.hasAttribute("data-ack-export-ignore"),
    onclone:(_document,receipt)=>{
      // Use the rendered clone because removing export controls shifts the contact block.
      const bounds=receipt.getBoundingClientRect();
      if(!bounds.width||!bounds.height)return;
      for(const anchor of receipt.querySelectorAll<HTMLAnchorElement>(".contact-acknowledgement-contact a[href]")){
        if(anchor.protocol!=="https:"&&anchor.protocol!=="mailto:")continue;
        for(const rect of anchor.getClientRects()){
          if(!rect.width||!rect.height)continue;
          links.push({
            url:anchor.href,
            x:(rect.left-bounds.left)/bounds.width,
            y:(rect.top-bounds.top)/bounds.height,
            width:rect.width/bounds.width,
            height:rect.height/bounds.height,
          });
        }
      }
    },
  });
  contactLinksByCanvas.set(canvas,links);
  return canvas;
}

/** Scale the complete acknowledgement to fit within one A4 page. */
export function createContactAcknowledgementPdf(canvas:HTMLCanvasElement){
  if(!canvas.width||!canvas.height)throw Error("The acknowledgement image is empty.");
  const pdf=new jsPDF({unit:"pt",format:"a4",compress:true});
  const margin=24;
  const availableWidth=pdf.internal.pageSize.getWidth()-margin*2;
  const availableHeight=pdf.internal.pageSize.getHeight()-margin*2;
  const scale=Math.min(availableWidth/canvas.width,availableHeight/canvas.height);
  const width=canvas.width*scale;
  const height=canvas.height*scale;
  const left=margin+(availableWidth-width)/2;
  pdf.addImage(canvas.toDataURL("image/png"),"PNG",left,margin,width,height,undefined,"FAST");
  for(const link of contactLinksByCanvas.get(canvas)??[]){
    pdf.link(left+link.x*width,margin+link.y*height,link.width*width,link.height*height,{url:link.url});
  }
  return pdf.output("blob");
}

export function contactAcknowledgementFilename(bookingId:string,extension:"pdf"|"png"){
  const safe=bookingId.replace(/[^\p{L}\p{N}_-]/gu,"_").slice(0,80);
  return `Jess-Counselling-Acknowledgement${safe?"-"+safe:""}.${extension}`;
}
export function contactAcknowledgementPng(canvas:HTMLCanvasElement){
  return new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error("Could not prepare the snapshot.")),"image/png"));
}
export function saveContactAcknowledgementFile(blob:Blob,filename:string){
  const url=URL.createObjectURL(blob),link=document.createElement("a");
  link.href=url;link.download=filename;document.body.appendChild(link);
  try{link.click();}finally{link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),60000);}
}

/** Same-tab navigation retains browser Back to the saved acknowledgement. */
export function openContactAcknowledgementPdf(blob:Blob){
  const url=URL.createObjectURL(blob);
  try{window.location.assign(url);}catch(error){URL.revokeObjectURL(url);throw error;}
  // Keep the URL alive for the native PDF viewer and its save/share controls.
  // The browser releases it when the originating document is discarded.
}
