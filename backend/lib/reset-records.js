'use strict';
const {check}=require('./util');
async function clear(service,input,actor){
 check(input?.confirm==='CLEAR_ALL_RECORDS','Confirm that all records should be cleared.');
 const removed={};for(const [key,table]of Object.entries({customers:'app_customers',products:'app_products',completed_forms:'app_jobs',imports:'app_imports'}))removed[key]=Number((await service.one('SELECT COUNT(*) AS n FROM '+table)).n);
 // DML in the route transaction: a failure rolls back everything, including saved PDFs.
 for(const table of ['app_device_groups','app_scan_sessions','app_job_items','app_jobs','app_import_rows','app_legacy_history','app_imports','app_products','app_customers'])await service.q('DELETE FROM '+table);
 await service.audit(actor,'records.clear','all');return {cleared:true,removed};
}
module.exports={clear};
