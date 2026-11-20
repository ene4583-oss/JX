'use strict';
let escPosJob=null,escPosUrl=null,escPosGeneration=0;
const androidEscPos=/Android/i.test(navigator.userAgent);
$('escpos-paper').value=localStorage.getItem('jx-escpos-paper')==='80'?'80':'58';
function escPosState(text){$('escpos-status').textContent=text;}
function resetEscPosJob(){escPosJob=null;$('print-escpos').setAttribute('aria-disabled','true');$('download-escpos').hidden=true;if(escPosUrl){URL.revokeObjectURL(escPosUrl);escPosUrl=null;}}
function labelTextLines(context,value,width){const lines=[];let line='',space='';for(const word of String(value||'—').match(/\s+|[\u3400-\u9fff]|[^\s\u3400-\u9fff]+/gu)||[]){if(/^\s+$/.test(word)){space=' ';continue;}const next=line?line+space+word:word;if(line&&context.measureText(next).width>width){lines.push(line);line=word;}else line=next;space='';}if(line)lines.push(line);return lines;}
async function prepareEscPosLabel(){const generation=++escPosGeneration;resetEscPosJob();const label=currentQrLabel;if(!label)return;escPosState('Preparing ESC/POS…');
 try{if(document.fonts?.ready)await document.fonts.ready;if(generation!==escPosGeneration||currentQrLabel!==label)return;const paper=Number($('escpos-paper').value),width=JxEscPos.PAPER_WIDTHS[paper],fontSize=paper===80?26:22,matrix=label.modules;
 if(!width||!matrix||!Number.isInteger(matrix.size)||matrix.size<21||matrix.size>177||!Array.isArray(matrix.data)||matrix.data.length!==matrix.size*matrix.size)throw Error('Restart the website server to load ESC/POS QR data.');
 const canvas=document.createElement('canvas'),context=canvas.getContext('2d',{willReadFrequently:true}),moduleSize=Math.max(1,Math.floor((width-32)/(matrix.size+8))),square=(matrix.size+8)*moduleSize;
 const p=label.product,texts=[p.name,'No. Daftar Lama: '+(p.details.new_reg||p.details.old_reg||'—'),'kg: '+(p.details.capacity||'—'),'S/N: '+(p.serial_no||'—'),'Brand: '+p.brand];context.font=fontSize+'px sans-serif';const lines=texts.flatMap(text=>labelTextLines(context,text,width-24)),lineHeight=fontSize+6;
 canvas.width=width;canvas.height=16+square+16+lines.length*lineHeight+20;if(canvas.height>4096)throw Error('Product label is too long for this paper width.');context.fillStyle='white';context.fillRect(0,0,width,canvas.height);context.fillStyle='black';const left=Math.floor((width-square)/2)+4*moduleSize,top=16+4*moduleSize;
 for(let y=0;y<matrix.size;y++)for(let x=0;x<matrix.size;x++)if(matrix.data[y*matrix.size+x])context.fillRect(left+x*moduleSize,top+y*moduleSize,moduleSize,moduleSize);
 context.font=fontSize+'px sans-serif';context.textAlign='center';lines.forEach((line,index)=>context.fillText(line,width/2,16+square+16+fontSize+index*lineHeight,width-24));
 const bytes=JxEscPos.encodeRaster(context.getImageData(0,0,width,canvas.height),paper);let binary='';for(let offset=0;offset<bytes.length;offset+=8192)binary+=String.fromCharCode(...bytes.subarray(offset,offset+8192));
 escPosJob={bytes,paper,productId:label.id};escPosUrl=URL.createObjectURL(new Blob([bytes],{type:'application/octet-stream'}));$('download-escpos').href=escPosUrl;$('download-escpos').download='JX-QR-'+label.id+'-'+paper+'mm.escpos';$('download-escpos').hidden=false;$('print-escpos').href=JxEscPos.rawBtIntent(btoa(binary));$('print-escpos').setAttribute('aria-disabled',String(!androidEscPos));escPosState(androidEscPos?'':'Bluetooth printing uses RawBT on Android.');
 }catch(error){resetEscPosJob();escPosState(error.message);}
}
const printerBaseQr=qr;qr=async function(id){++escPosGeneration;resetEscPosJob();await printerBaseQr(id);await prepareEscPosLabel();};
$('escpos-paper').onchange=()=>{localStorage.setItem('jx-escpos-paper',$('escpos-paper').value);run(prepareEscPosLabel);};
$('print-escpos').onclick=event=>{if(!androidEscPos||!escPosJob){event.preventDefault();escPosState(androidEscPos?'Open the product QR and wait until the label is ready.':'Use an Android phone with RawBT to print over Bluetooth.');return;}escPosState('Opening RawBT. Check the printer/app for the result.');};
$('qr-dialog').addEventListener('close',()=>{escPosGeneration++;resetEscPosJob();escPosState('');});
