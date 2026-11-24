'use strict';
const {hash,normalized}=require('./util');
async function merge(s,source,target,user){
 const rows=await s.q('SELECT id,brand,model,serial_no,version FROM app_products WHERE customer_id=? ORDER BY id FOR UPDATE',[source.id]),versions={};
 for(const p of rows){let identity=p.serial_no?hash([target.id,normalized(p.brand),normalized(p.model),normalized(p.serial_no)].join('\n')):null;if(identity&&(await s.q('SELECT id FROM app_products WHERE identity_hash=? AND id<>?',[identity,p.id])).length)identity=hash(identity+'\nproduct:'+p.id);await s.q('UPDATE app_products SET customer_id=?,identity_hash=?,version=version+1,updated_at=updated_at WHERE id=?',[target.id,identity,p.id]);versions[p.id]=p.version+1;await s.audit(user,'product.update',p.id);}
 for(const table of ['app_manual_customers','app_import_customers'])await s.q('INSERT IGNORE INTO '+table+'(customer_id) SELECT ? FROM '+table+' WHERE customer_id=?',[target.id,source.id]);
 await s.q('UPDATE app_customer_merges SET target_id=? WHERE target_id=?',[target.id,source.id]);await s.q('INSERT INTO app_customer_merges(source_id,target_id,source_snapshot,merged_by) VALUES (?,?,?,?)',[source.id,target.id,JSON.stringify(source),user]);
 await s.q('DELETE FROM app_customers WHERE id=?',[source.id]);const canonical=hash(normalized(target.name)+'\n'+normalized(target.address)),held=await s.q('SELECT id FROM app_customers WHERE identity_hash=? AND id<>?',[canonical,target.id]);await s.q('UPDATE app_customers SET identity_hash=?,version=GREATEST(version,?)+1 WHERE id=?',[held.length?target.identity_hash:canonical,source.version,target.id]);await s.audit(user,'customer.merge',source.id+':'+target.id);
 return {...await s.customer(target.id),merged_customer_ids:[source.id],product_versions:versions};
}
module.exports={merge};
