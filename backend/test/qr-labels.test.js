'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {PDFDocument}=require('pdf-lib');
const {generate}=require('../lib/qr-labels');
test('QR label PDF paginates thirteen Unicode product labels on two A4 pages',async()=>{
 const products=Array.from({length:13},(_,i)=>({id:'00000000-0000-4000-8000-'+String(i).padStart(12,'0'),name:'测试客户 Long Customer Name '+i,brand:'Brand',model:'Model',serial_no:'000'+i,details:{new_reg:'CRA'+i}}));
 const bytes=await generate(products,'https://jx.example.com'),doc=await PDFDocument.load(bytes);
 assert.equal(doc.getPageCount(),2);for(const page of doc.getPages()){assert.ok(Math.abs(page.getWidth()-595.28)<.01);assert.ok(Math.abs(page.getHeight()-841.89)<.01);}assert.equal(doc.getTitle(),'JX Product QR Labels');
 await assert.rejects(generate([],'https://jx.example.com'),/Select 1/);
 await assert.rejects(generate(Array(501).fill(products[0]),'https://jx.example.com'),/Select 1/);
});
