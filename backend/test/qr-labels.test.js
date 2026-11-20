'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {PDFDocument}=require('pdf-lib');
const {generate}=require('../lib/qr-labels');
test('QR label PDF paginates thirteen Unicode product labels on two A4 pages',async()=>{
 const products=Array.from({length:13},(_,i)=>({id:'00000000-0000-4000-8000-'+String(i).padStart(12,'0'),name:'测试客户 Long Customer Name '+i,brand:'Brand',model:'Model',serial_no:'000'+i,details:{new_reg:'CRA'+i,capacity:(10+i)+'KG'}}));
 const bytes=await generate(products,'https://jx.example.com'),doc=await PDFDocument.load(bytes);
 assert.equal(doc.getPageCount(),2);for(const page of doc.getPages()){assert.ok(Math.abs(page.getWidth()-595.28)<.01);assert.ok(Math.abs(page.getHeight()-841.89)<.01);}assert.equal(doc.getTitle(),'JX Product QR Labels');
 const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');const task=getDocument({data:new Uint8Array(bytes),useSystemFonts:true});try{const decoded=await task.promise;let text='';for(let n=1;n<=decoded.numPages;n++)text+=(await(await decoded.getPage(n)).getTextContent()).items.map(item=>item.str).join(' ');assert.match(text,/kg:\s*10KG/);assert.match(text,/kg:\s*22KG/);assert.match(text,/No\. Daftar Lama:/);}finally{await task.destroy();}
 await assert.rejects(generate([],'https://jx.example.com'),/Select 1/);
 await assert.rejects(generate(Array(501).fill(products[0]),'https://jx.example.com'),/Select 1/);
});
