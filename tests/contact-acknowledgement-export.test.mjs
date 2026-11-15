import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import ts from 'typescript';
const url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const renderer=url('export default async function(element,options){globalThis.__capture={element,options};if(globalThis.__clone)options.onclone({},globalThis.__clone);return globalThis.__canvas}');
const pdf=url('export class jsPDF{constructor(){this.internal={pageSize:{getWidth:()=>595,getHeight:()=>842}};this.pages=[[]];this.links=[];globalThis.__pdf=this}addPage(){this.pages.push([])}addImage(...args){this.pages.at(-1).push(args)}link(...args){this.links.push(args)}output(){return new Blob(["PDF"],{type:"application/pdf"})}}');
const code=ts.transpile(readFileSync('app/lib/contact-acknowledgement-export.ts','utf8'),{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}).replace('"html2canvas"',JSON.stringify(renderer)).replace('"jspdf"',JSON.stringify(pdf));
const exports=await import(url(code));
test('snapshot captures acknowledgement only, skips controls and scales safely',async()=>{const oldDoc=globalThis.document,oldWin=globalThis.window;const canvas={};globalThis.__canvas=canvas;globalThis.document={fonts:{ready:Promise.resolve()}};globalThis.window={devicePixelRatio:4};try{const element={id:'receipt'};assert.equal(await exports.captureContactAcknowledgement(element),canvas);assert.equal(globalThis.__capture.element,element);assert.equal(globalThis.__capture.options.scale,2);assert.equal(globalThis.__capture.options.ignoreElements({hasAttribute:k=>k==='data-ack-export-ignore'}),true);assert.equal(globalThis.__capture.options.ignoreElements({hasAttribute:()=>false}),false)}finally{globalThis.document=oldDoc;globalThis.window=oldWin}});
test('A4 PDF fits wide and tall acknowledgements on one page without cropping',()=>{
  for(const canvasHeight of [400,2600]){
    const image='data:image/png;base64,receipt';
    const canvas={width:700,height:canvasHeight,toDataURL:()=>image};
    const blob=exports.createContactAcknowledgementPdf(canvas);
    assert.equal(blob.type,'application/pdf');
    assert.equal(globalThis.__pdf.pages.length,1);
    assert.equal(globalThis.__pdf.pages[0].length,1);
    const [source,,left,top,width,height]=globalThis.__pdf.pages[0][0];
    assert.equal(source,image);
    assert.equal(top,24);
    assert.ok(Math.abs(left-(595-width)/2)<.001);
    assert.ok(width<=547.001&&height<=794.001);
    assert.ok(Math.abs(width/height-700/canvasHeight)<.001);
    assert.ok(Math.abs(width-547)<.001||Math.abs(height-794)<.001);
  }
  assert.throws(()=>exports.createContactAcknowledgementPdf({width:0,height:0}),/empty/);
});
test('mobile-sized PDF maps contact links from the rendered clone onto one A4 page',async()=>{
  const oldDoc=globalThis.document,oldWin=globalThis.window;
  const urls=['mailto:hello@jesscounselling.online','https://wa.me/919895296274','https://www.instagram.com/jesscounselling/'];
  const width=320,height=1000;
  globalThis.document={};
  globalThis.window={devicePixelRatio:2};
  globalThis.__canvas={width:width*2,height:height*2,toDataURL:()=> 'data:image/png;base64,receipt'};
  globalThis.__clone={
    getBoundingClientRect:()=>({left:20,top:40,width,height}),
    querySelectorAll:()=>urls.map((href,i)=>({
      href,protocol:new URL(href).protocol,
      getClientRects:()=>[{left:30+100*i,top:920,width:80,height:16}],
    })),
  };
  try{
    const canvas=await exports.captureContactAcknowledgement({});
    exports.createContactAcknowledgementPdf(canvas);
    const pdf=globalThis.__pdf;
    assert.equal(pdf.pages.length,1);
    assert.equal(pdf.links.length,3);
    const [,,,,imageWidth,imageHeight]=pdf.pages[0][0];
    const left=(595-imageWidth)/2;
    pdf.links.forEach(([x,y,w,h,options],i)=>{
      assert.equal(options.url,urls[i]);
      assert.ok(Math.abs(x-(left+(10+100*i)/width*imageWidth))<.001);
      assert.ok(Math.abs(y-(24+880/height*imageHeight))<.001);
      assert.ok(Math.abs(w-80/width*imageWidth)<.001);
      assert.ok(Math.abs(h-16/height*imageHeight)<.001);
    });
  }finally{
    globalThis.document=oldDoc;
    globalThis.window=oldWin;
    delete globalThis.__clone;
    delete globalThis.__canvas;
  }
});
test('PNG encoding returns a file, reports failure and uses safe Case ID filenames',async()=>{const png=new Blob(['image'],{type:'image/png'});assert.equal(await exports.contactAcknowledgementPng({toBlob:fn=>fn(png)}),png);await assert.rejects(exports.contactAcknowledgementPng({toBlob:fn=>fn(null)}),/snapshot/);assert.equal(exports.contactAcknowledgementFilename('1026-236-MU','pdf'),'Jess-Counselling-Acknowledgement-1026-236-MU.pdf');assert.ok(!exports.contactAcknowledgementFilename('../bad/id','png').includes('/'))});
test('file save starts a download and cleans up temporary link and URL',()=>{const oldDoc=globalThis.document,oldWin=globalThis.window,create=URL.createObjectURL,revoke=URL.revokeObjectURL;let clicked=0,removed=0,appended=0,cleanup,revoked;URL.createObjectURL=()=> 'blob:receipt';URL.revokeObjectURL=value=>revoked=value;const link={click(){clicked++},remove(){removed++}};globalThis.document={createElement:()=>link,body:{appendChild(){appended++}}};globalThis.window={setTimeout:fn=>cleanup=fn};try{exports.saveContactAcknowledgementFile(new Blob(['x']),'receipt.png');assert.equal(clicked,1);assert.equal(appended,1);assert.equal(removed,1);assert.equal(link.download,'receipt.png');assert.equal(link.href,'blob:receipt');cleanup();assert.equal(revoked,'blob:receipt')}finally{globalThis.document=oldDoc;globalThis.window=oldWin;URL.createObjectURL=create;URL.revokeObjectURL=revoke}});
test('View PDF navigates in the same tab so Back can return, without downloading or revoking the active PDF',()=>{
 const oldWin=globalThis.window,create=URL.createObjectURL,revoke=URL.revokeObjectURL;let destination,revoked=0;
 URL.createObjectURL=()=> 'blob:acknowledgement';URL.revokeObjectURL=()=>revoked++;
 globalThis.window={location:{assign:value=>destination=value}};
 try{exports.openContactAcknowledgementPdf(new Blob(['pdf'],{type:'application/pdf'}));assert.equal(destination,'blob:acknowledgement');assert.equal(revoked,0);window.location.assign=()=>{throw Error('navigation failed')};assert.throws(()=>exports.openContactAcknowledgementPdf(new Blob(['pdf'])),/navigation failed/);assert.equal(revoked,1);}finally{globalThis.window=oldWin;URL.createObjectURL=create;URL.revokeObjectURL=revoke;}
});
