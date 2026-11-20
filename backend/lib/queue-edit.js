'use strict';
const {check,text}=require('./util');
async function save(s,id,input,user){
 await s.one('SELECT id FROM app_products WHERE id=? FOR UPDATE',[id]);
 const current=await s.product(id),drafts=await s.q('SELECT * FROM app_queue_drafts WHERE product_id=?',[id]);
 const request=text(input,'request_id',36);check(/^[0-9a-f-]{36}$/i.test(request),'A save request ID is required.');
 if(drafts[0]?.request_id===request&&drafts[0].updated_by===user)return current;
 check(input.version===current.version&&input.customer_version===current.customer_version,'Product or customer changed. Reopen its details before saving.',409);
 const patch=input.patch||{};check(typeof patch==='object'&&!Array.isArray(patch),'Invalid queue details.');
 check(patch.details==null||typeof patch.details==='object'&&!Array.isArray(patch.details),'Invalid queue details.');
 const details={...current.details,...patch.details};const newReg=Object.hasOwn(patch.details||{},'new_reg')?text(patch.details,'new_reg',200).toUpperCase():drafts[0]?.new_reg||'';details.new_reg=Object.hasOwn(patch.details||{},'old_reg')&&text(patch.details,'old_reg',200).toUpperCase()!==(current.details.new_reg||current.details.old_reg||'')?'':current.details.new_reg;
 if(Object.hasOwn(patch.details||{},'stamping_fee')){const fee=text(patch.details,'stamping_fee',20);check(!fee||/^(?:0|[1-9]\d{0,6})(?:\.\d{1,2})?$/.test(fee),'Check the fee format.');}
 const customer=Object.fromEntries(['name','address','phone','area'].map(key=>[key,Object.hasOwn(patch,key)?patch[key]:current[key]]));
 const fields=Object.fromEntries(['product_type','brand','model','serial_no'].map(key=>[key,Object.hasOwn(patch,key)?patch[key]:current[key]]));
 await s.saveProduct(id,{...fields,company:current.company,customer_id:current.customer_id,customer,customer_version:current.customer_version,details,version:current.version},user);
 await s.q('INSERT INTO app_queue_drafts(product_id,new_reg,request_id,updated_by) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE new_reg=VALUES(new_reg),request_id=VALUES(request_id),updated_by=VALUES(updated_by)',[id,newReg,request,user]);
 return s.product(id);
}
module.exports={save};
