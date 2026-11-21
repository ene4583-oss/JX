'use strict';
// One-time, transactional correction requested for products already in this database.
const migration='product-save-date-2026-11-20';
async function apply(pool){
 const db=await pool.getConnection();
 try{
  await db.beginTransaction();
  const [claim]=await db.query('INSERT IGNORE INTO app_data_migrations(name) VALUES (?)',[migration]);
  if(!claim.affectedRows){await db.commit();return 0;}
  await db.query('INSERT INTO app_product_date_backup(migration_name,product_id,original_saved_epoch) SELECT ?,id,UNIX_TIMESTAMP(updated_at) FROM app_products',[migration]);
  // Keep Malaysia local time-of-day; change only the displayed calendar day.
  const midnight=Date.parse('2026-11-20T00:00:00+08:00')/1000;
  const [result]=await db.query('UPDATE app_products SET updated_at=FROM_UNIXTIME(?+MOD(UNIX_TIMESTAMP(updated_at)+28800,86400)),version=version+1',[midnight]);
  await db.query('UPDATE app_data_migrations SET affected_rows=? WHERE name=?',[result.affectedRows,migration]);
  await db.commit();return result.affectedRows;
 }catch(error){await db.rollback();throw error;}finally{db.release();}
}
module.exports={apply,migration};
