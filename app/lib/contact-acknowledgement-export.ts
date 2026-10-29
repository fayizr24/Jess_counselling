import html2canvas from "html2canvas";
import {jsPDF} from "jspdf";

/** Capture only the visible acknowledgement, excluding its export controls. */
export async function captureContactAcknowledgement(element:HTMLElement){
  if(document.fonts?.ready)await document.fonts.ready;
  return html2canvas(element,{
    backgroundColor:"#fffef8",
    scale:Math.min(2,Math.max(1,window.devicePixelRatio||1)),
    logging:false,
    ignoreElements:node=>node.hasAttribute("data-ack-export-ignore"),
  });
}

/** Preserve all text in unusually tall receipts by splitting over A4 pages. */
export function createContactAcknowledgementPdf(canvas:HTMLCanvasElement){
  if(!canvas.width||!canvas.height)throw Error("The acknowledgement image is empty.");
  const pdf=new jsPDF({unit:"pt",format:"a4",compress:true});
  const margin=24,width=pdf.internal.pageSize.getWidth()-margin*2;
  const height=pdf.internal.pageSize.getHeight()-margin*2;
  const pagePixels=Math.max(1,Math.floor(height*canvas.width/width));
  for(let top=0;top<canvas.height;top+=pagePixels){
    if(top)pdf.addPage();
    const sliceHeight=Math.min(pagePixels,canvas.height-top);
    let image=canvas;
    if(canvas.height>pagePixels){
      image=document.createElement("canvas");image.width=canvas.width;image.height=sliceHeight;
      const context=image.getContext("2d");if(!context)throw Error("Could not prepare the PDF image.");
      context.drawImage(canvas,0,top,canvas.width,sliceHeight,0,0,canvas.width,sliceHeight);
    }
    pdf.addImage(image.toDataURL("image/png"),"PNG",margin,margin,width,sliceHeight*width/canvas.width,undefined,"FAST");
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
