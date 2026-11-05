'use strict';
const {PDFDocument}=require('pdf-lib');
const {check,decode,text}=require('./util');
const formats=require('./formats');
const defaults=require('../assets/templates/layouts.json');
const clone=value=>JSON.parse(JSON.stringify(value));
function validateLayout(layout,width,height){
 check(layout&&typeof layout==='object'&&!Array.isArray(layout)&&layout.fields&&typeof layout.fields==='object'&&!Array.isArray(layout.fields),'Invalid template layout.');
 const allowed=new Set(['date','owner','name','address','area','phone','brand','model','serial_no',...Object.keys(formats.details)]);
 function rect(value){check(Array.isArray(value)&&value.length===4&&value.every(Number.isFinite),'Coordinates must be four numbers.');const [x,y,w,h]=value;check(x>=0&&y>=0&&w>0&&h>0&&x+w<=width+.1&&y+h<=height+.1,'A field is outside the first PDF page.');}
 check(Object.keys(layout.fields).length<=100,'Too many template fields.');for(const [key,value]of Object.entries(layout.fields)){check(allowed.has(key),'Unknown template field: '+key);rect(value);}
 check(Array.isArray(layout.checks||[])&&(layout.checks||[]).length<=50,'Invalid checkbox layout.');for(const item of layout.checks||[]){check(Object.hasOwn(formats.details,item.key)&&item.options&&typeof item.options==='object','Invalid checkbox field.');for(const value of Object.values(item.options))rect(value);}
 for(const [key,value]of Object.entries(layout.font_sizes||{}))check(Object.hasOwn(layout.fields,key)&&Number.isFinite(value)&&value>=5&&value<=48,'Font size must be 5–48.');
 for(const key of ['owner_line_height','baseline_size'])if(layout[key]!=null)check(Number.isFinite(layout[key])&&layout[key]>=5&&layout[key]<=80,'Invalid line height.');
 return clone(layout);
}
async function get(service,company,type){check(formats.valid(company,type),'Choose a company and type.');const rows=await service.q('SELECT * FROM app_form_templates WHERE company=? AND product_type=?',[company,type]);if(rows.length)return {...rows[0],layout:decode(rows[0].layout)};return {company,product_type:type,background:null,layout:clone(defaults[company+'/'+type]),filename:'Original template',version:0};}
async function meta(service,company,type){const row=await get(service,company,type),bytes=row.background||await require('./pdf').template(company,type),doc=await PDFDocument.load(bytes);return {company,product_type:type,layout:row.layout,filename:row.filename,version:row.version,width:doc.getPage(0).getWidth(),height:doc.getPage(0).getHeight(),pages:doc.getPageCount()};}
async function background(service,company,type){const row=await get(service,company,type);return row.background||require('./pdf').template(company,type);}
async function lock(service,company,type,user){check(formats.valid(company,type),'Choose a company and type.');await service.q('INSERT IGNORE INTO app_form_templates(company,product_type,layout,updated_by) VALUES (?,?,?,?)',[company,type,JSON.stringify(defaults[company+'/'+type]),user.id]);await service.one('SELECT version FROM app_form_templates WHERE company=? AND product_type=? FOR UPDATE',[company,type]);}
async function upload(service,company,type,file,input,user){
 check(formats.valid(company,type),'Choose a company and type.');check(file?.buffer&&file.buffer.subarray(0,5).toString()==='%PDF-','Choose a PDF background.');
 let source;try{source=await PDFDocument.load(file.buffer);}catch{check(false,'Cannot read this PDF. Use an unencrypted PDF.');}check(source.getPageCount()>=1&&source.getPageCount()<=20,'Upload 1–20 pages for one type.');
 const first=source.getPage(0);for(const page of source.getPages())check(page.getWidth()>=100&&page.getHeight()>=100&&page.getWidth()<=2000&&page.getHeight()<=2000,'Unsupported PDF page size.');check(first.getWidth()>=100&&first.getHeight()>=100&&first.getWidth()<=2000&&first.getHeight()<=2000,'Unsupported PDF page size.');
 const clean=await PDFDocument.create();for(const page of await clean.copyPages(source,source.getPageIndices()))clean.addPage(page);const bytes=Buffer.from(await clean.save());
 await lock(service,company,type,user);const previous=await meta(service,company,type);check(Number(input.version)===previous.version,'Template changed. Reload before uploading.',409);
 const layout=clone(previous.layout),sx=first.getWidth()/previous.width,sy=first.getHeight()/previous.height;for(const r of Object.values(layout.fields)){r[0]*=sx;r[1]*=sy;r[2]*=sx;r[3]*=sy;}for(const c of layout.checks||[])for(const r of Object.values(c.options)){r[0]*=sx;r[1]*=sy;r[2]*=sx;r[3]*=sy;}validateLayout(layout,first.getWidth(),first.getHeight());
 await service.db.execute('INSERT INTO app_form_templates(company,product_type,background,layout,filename,version,updated_by) VALUES (?,?,?,?,?,1,?) ON DUPLICATE KEY UPDATE background=VALUES(background),layout=VALUES(layout),filename=VALUES(filename),version=version+1,updated_by=VALUES(updated_by)',[company,type,bytes,JSON.stringify(layout),String(file.originalname).slice(0,255),user.id]);await service.audit(user.id,'template.upload',company+'/'+type);return meta(service,company,type);
}
async function save(service,company,type,input,user){await lock(service,company,type,user);const previous=await meta(service,company,type);check(Number.isInteger(input.version)&&input.version===previous.version,'Template changed. Reload before saving.',409);const layout=validateLayout(input.layout,previous.width,previous.height);await service.q('INSERT INTO app_form_templates(company,product_type,background,layout,filename,version,updated_by) VALUES (?,?,NULL,?,?,1,?) ON DUPLICATE KEY UPDATE layout=VALUES(layout),version=version+1,updated_by=VALUES(updated_by)',[company,type,JSON.stringify(layout),previous.filename,user.id]);await service.audit(user.id,'template.layout',company+'/'+type);return meta(service,company,type);}
async function resolved(service,snapshot){const result={};for(const p of snapshot.products){const key=p.company+'/'+p.product_type;if(!result[key])result[key]=await get(service,p.company,p.product_type);}return result;}
module.exports={get,meta,background,upload,save,resolved,validateLayout};
