'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { PDFDocument, rgb } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const QRCode = require('qrcode');
const { check } = require('./util');
const MAX_LABELS = 500;
function lines(font, value, size, width, maxLines) {
  const result=[];let line='';
  for(const char of String(value||'—').replace(/\s+/g,' ')){
    if(line&&font.widthOfTextAtSize(line+char,size)>width){result.push(line);line='';}
    line+=char;
  }
  if(line)result.push(line);
  if(result.length>maxLines){result.length=maxLines;let last=result[maxLines-1];while(last&&font.widthOfTextAtSize(last+'…',size)>width)last=last.slice(0,-1);result[maxLines-1]=last+'…';}
  return result;
}
async function generate(products,publicUrl){
  check(products.length>0&&products.length<=MAX_LABELS,`Select 1–${MAX_LABELS} products for QR labels.`);
  const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
  const font=await doc.embedFont(await fs.readFile(path.join(__dirname,'../assets/fonts/FormSans-Regular.ttf')));
  doc.setTitle('JX Product QR Labels');doc.setCreator('Jian Xu');
  const width=595.28,height=841.89,margin=24,cellW=(width-margin*2)/3,cellH=(height-margin*2)/4;
  let page;
  for(let i=0;i<products.length;i++){
    if(i%12===0)page=doc.addPage([width,height]);
    const p=products[i],col=i%3,row=Math.floor((i%12)/3),x=margin+col*cellW,top=height-margin-row*cellH;
    page.drawRectangle({x:x+3,y:top-cellH+3,width:cellW-6,height:cellH-6,borderColor:rgb(.8,.83,.8),borderWidth:.5});
    const qr=await doc.embedPng(await QRCode.toBuffer(publicUrl+'/#product='+p.id,{width:400,margin:4,errorCorrectionLevel:'M'}));
    page.drawImage(qr,{x:x+(cellW-108)/2,y:top-113,width:108,height:108});
    let y=top-125;
    for(const [text,size,count]of [[p.name,8,2],[[p.brand,p.model].filter(Boolean).join(' / '),8,2],['S/N: '+(p.serial_no||'—'),7,1],['Reg: '+(p.details.new_reg||p.details.old_reg||'—'),7,1]]){
      for(const line of lines(font,text,size,cellW-18,count)){page.drawText(line,{x:x+9,y,size,font});y-=10;}
    }
    page.drawText(p.id.slice(0,8),{x:x+9,y:top-cellH+10,size:6,font,color:rgb(.4,.4,.4)});
  }
  return Buffer.from(await doc.save());
}
module.exports={generate,MAX_LABELS};
