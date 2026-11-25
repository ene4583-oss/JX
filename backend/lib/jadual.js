'use strict';
const {check,decode}=require('./util');
const workflow=require('./workflow');
function category(value){const v=String(value??'').trim().toUpperCase();return ['B','BARU','NEW'].includes(v)?'6':['L','LAMA','OLD'].includes(v)?'7':null;}
function cell(value){return value==null?'':String(value).replace(/\r\n?/g,'\n').trim();}
function entry(job,product,index){const d=product.details||{},kind=category(d.condition),issues=[],row={job_id:job.id,created_by:job.created_by,product_id:product.id,index,date:job.stamping_date,name:cell(product.name),address:cell(product.address),brand:cell(product.brand),serial:cell(product.serial_no),capacity:cell(d.capacity),old_reg:cell(d.old_reg),registration:cell(d.new_reg)||cell(d.old_reg),kind};
 if(!kind)issues.push('Confirm Baru/Lama in Complete Record.');
 for(const [field,label]of [['name','customer name'],['address','address'],['brand','Perihal (Brand)'],['capacity','Kapasiti'],['registration','No. Daftar']])if(!row[field])issues.push('Missing '+label+'.');
 if(kind==='7'&&!row.old_reg)issues.push('Missing No. Daftar Lama.');
 if(!product.id)issues.push('Missing saved product ID.');
 return {row,issues};
}
async function load(service,filters={}){
 let chosen=null;let {where,args}=workflow.filters(filters);if(Object.hasOwn(filters,'selection')){check(Array.isArray(filters.selection)&&filters.selection.length<=2000,'Select up to 2,000 Complete Records.');check(filters.selection.every(k=>typeof k==='string'&&/^[0-9a-f-]{36}:[0-9a-f-]{36}$/i.test(k)),'Invalid completed record selection.');chosen=new Set(filters.selection);const jobs=[...new Set([...chosen].map(k=>k.split(':')[0]))];where=jobs.length?' WHERE id IN ('+jobs.map(()=>'?').join(',')+')':' WHERE 1=0';args=jobs;}const count=await service.one("SELECT COALESCE(SUM(JSON_LENGTH(JSON_EXTRACT(snapshot,'$.products'))),0) AS n FROM app_jobs"+where,args);check(Number(count.n)<=20000,'More than 20,000 completed entries. Narrow the date range for Jadual printing.');
 const jobs=await service.q('SELECT id,created_by,stamping_date,snapshot FROM app_jobs'+where+' ORDER BY stamping_date ASC,created_at ASC,id ASC',args),groups={'6':[],'7':[]},problems=[],problemCounts={'6':0,'7':0},unknown=[],seen=new Set();let total=0;
 for(const job of jobs){const snapshot=decode(job.snapshot);check(Array.isArray(snapshot.products),'Invalid saved form. Review Complete Record.');for(const [index,p]of snapshot.products.entries()){
   if(chosen?!chosen.has(job.id+':'+p.id):filters.q&&!workflow.matchesRecord(p,filters.q))continue;
   total++;check(total<=20000,'More than 20,000 completed entries. Narrow the date range for Jadual printing.');const {row,issues}=entry(job,p,index),key=job.id+':'+p.id;
   if(seen.has(key))issues.push('Duplicate product entry in this saved form.');seen.add(key);
   if(String(snapshot.settings?.stamping_date||'')!==String(job.stamping_date))issues.push('Saved form date does not match its Complete Record date.');
   if(row.kind)groups[row.kind].push(row);else unknown.push(row);
   if(issues.length){problems.push({...row,issues});if(row.kind)problemCounts[row.kind]++;}
 }}
 if(chosen)check(total===chosen.size,'Some selected records were edited, moved or deleted. Clear the selection and select the current records again.');return {total,groups,unknown,problems,problemCounts};
}
function summary(report){return {total:report.total,jadual6:report.groups['6'].length,jadual7:report.groups['7'].length,unclassified:report.unknown.length,needs_review:report.problems.length,blocked:{'6':report.unknown.length>0||report.problemCounts['6']>0,'7':report.unknown.length>0||report.problemCounts['7']>0},issues:report.problems.slice(0,100).map(({job_id,created_by,product_id,date,name,issues,kind})=>({job_id,created_by,product_id,date,name,issues,kind}))};}
async function selection(service,filters={}){const report=await load(service,filters);return {total:report.total,keys:[...report.groups['6'],...report.groups['7'],...report.unknown].map(row=>row.job_id+':'+row.product_id)};}
async function print(service,kind,filters){check(['6','7'].includes(kind),'Choose Jadual 6 or Jadual 7.');const report=await service.transaction(s=>load(s,filters));const status=summary(report);check(!status.blocked[kind],'Review incomplete or unclassified Complete Records before printing Jadual '+kind+'.');check(report.groups[kind].length,'No '+(kind==='6'?'Baru':'Lama')+' Complete Records match these filters.');return require('./jadual-pdf').generate(kind,report.groups[kind]);}
module.exports={category,entry,load,summary,selection,print};
