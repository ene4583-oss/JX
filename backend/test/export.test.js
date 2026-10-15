'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const Excel=require('exceljs');const {records}=require('../lib/export');const {headers}=require('../lib/import');
test('2025 Excel export retains all requested columns and leading zero identifiers',async()=>{
 const p={id:'product',name:'Customer',address:'Road',area:'RAUB',product_type:'ATS',brand:'TEST',model:'MODEL123',serial_no:'000123',phone:'0123456789',details:{condition:'Baru',capacity:'30kg',old_reg:'OLD001',new_reg:'NEW002',shop_out:'Out',stamping_fee:'8.50'}};
 const book=new Excel.Workbook();await book.xlsx.load(await records([{p,settings:{},index:0}]));const sheet=book.worksheets[0];assert.deepEqual(sheet.getRow(1).values.slice(1),headers);
 const expected={'Area':'RAUB','Type':'ATS','Baru/Lama':'B','Brand':'TEST','Model':'MODEL123','S/No':'000123','Capacity':'30kg','No. Daftar Lama':'OLD001','No. Daftar Baru':'NEW002','Shop/Out':'Out','Stamping Fee':8.5,'Phone No.':'0123456789'};
 for(const [header,value]of Object.entries(expected))assert.equal(sheet.getCell(2,headers.indexOf(header)+1).value,value,header);
});
