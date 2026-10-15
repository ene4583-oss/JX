 'use strict';
const Excel=require('exceljs');
const {headers}=require('./import');
async function records(records){
 const book=new Excel.Workbook();book.creator='Jian Xu';const sheet=book.addWorksheet('Records');
 sheet.addRow(headers);sheet.getRow(1).font={bold:true};sheet.views=[{state:'frozen',ySplit:1}];sheet.autoFilter={from:'A1',to:'R1'};
 for(const {p,settings,index}of records){const d=p.details||{},entry=settings.list_entries?.[p.id]||{};
  const row={'Date':settings.stamping_date||d.source_date||'','Name':p.name,'Address':p.address,'Area':p.area,'Type':p.product_type,'Baru/Lama':d.condition==='Baru'?'B':d.condition==='Lama'?'L':'','Brand':p.brand,'Model':p.model,'S/No':p.serial_no,'Capacity':d.capacity,'No. Daftar Lama':d.old_reg,'No. Daftar Baru':d.new_reg,'Shop/Out':d.shop_out||'','Stamping Fee':entry.stamping_fee||d.stamping_fee||'','Phone No.':p.phone||'','No. Bill':settings.bill_no||'','Total Price':index===0?settings.total_price||'':'','Caw':settings.branch||''};
  sheet.addRow(headers.map(key=>['Stamping Fee','Total Price'].includes(key)&&/^\d+(?:\.\d{1,2})?$/.test(String(row[key]??''))?Number(row[key]):String(row[key]??'')));
  const saved=sheet.lastRow;for(const column of [14,17])saved.getCell(column).numFmt='0.00';
 }
 sheet.columns.forEach((column,i)=>column.width=i===2?45:i===1?30:19);
 return Buffer.from(await book.xlsx.writeBuffer());
}
module.exports={records};
