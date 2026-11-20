(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.JxEscPos=api;})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const PAPER_WIDTHS={58:384,80:576};
 function encodeRaster({width,height,data},paper=58){
  const dots=PAPER_WIDTHS[paper];if(!dots||width!==dots||!Number.isInteger(height)||height<1||height>4096||!data||data.length!==width*height*4)throw Error('Invalid ESC/POS label dimensions.');
  const rowBytes=width/8,parts=[Uint8Array.from([27,64,27,97,0])];
  for(let top=0;top<height;top+=128){const rows=Math.min(128,height-top),part=new Uint8Array(8+rowBytes*rows);part.set([29,118,48,0,rowBytes&255,rowBytes>>8,rows&255,rows>>8]);
   for(let y=0;y<rows;y++)for(let x=0;x<width;x++){const i=((top+y)*width+x)*4,alpha=data[i+3]/255,gray=(.299*data[i]+.587*data[i+1]+.114*data[i+2])*alpha+255*(1-alpha);if(gray<180)part[8+y*rowBytes+(x>>3)]|=128>>(x&7);}
   parts.push(part);
  }
  parts.push(Uint8Array.from([27,100,4]));const result=new Uint8Array(parts.reduce((n,part)=>n+part.length,0));let offset=0;for(const part of parts){result.set(part,offset);offset+=part.length;}return result;
 }
 function rawBtIntent(base64){if(typeof base64!=='string'||base64.length>350000||!base64.length||!/^[A-Za-z0-9+/]+={0,2}$/.test(base64))throw Error('Invalid ESC/POS print data.');return 'intent:base64,'+base64+'#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;';}
 return {PAPER_WIDTHS,encodeRaster,rawBtIntent};
});
