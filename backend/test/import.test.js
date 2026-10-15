'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Excel = require('exceljs');
const { parse, headers } = require('../lib/import');
async function fixture(rows) {
  const workbook = new Excel.Workbook(); const sheet = workbook.addWorksheet('2025'); sheet.addRow(headers);
  for (const values of rows) sheet.addRow(headers.map(key => values[key] ?? ''));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
test('Excel reads the existing 18 columns, confirms aliases, and flags unknown types', async () => {
  const bytes = await fixture([
    { Name: 'Customer', Address: 'Test Road', Brand: 'TEST', Type: 'SIC', Date: new Date('2025-02-03T00:00:00Z'), 'Phone No.': '0123456789' },
    { Name: 'Customer', Brand: 'TEST', Type: 'ATP_M' },
    { Name: 'Customer', Brand: 'TEST', Type: 'ATK' }, {}, { Brand: 'No customer name' }
  ]);
  const result = await parse(bytes);
  assert.equal(result.summary.valid_rows, 3); assert.equal(result.summary.blank_rows, 1); assert.equal(result.summary.incomplete_rows, 1);
  assert.equal(result.rows[0]._type, 'SLC'); assert.equal(result.rows[1]._type, 'ATP (M)'); assert.equal(result.rows[2]._type, 'UNKNOWN');
  assert.equal(result.rows[0].Date, '2025-02-03'); assert.equal(result.rows[0]['Phone No.'], '0123456789'); assert.deepEqual(result.summary.unknown_types, { ATK: 1 });
});
test('invalid and oversized Excel containers are rejected', async () => {
  await assert.rejects(parse(Buffer.from('not an xlsx')), /xlsx/);
  await assert.rejects(parse(Buffer.alloc(31 * 1024 * 1024)), /30MB/);
});
module.exports = { fixture };

test('Excel header aliases preserve area, model, condition, fee and phone number',async()=>{
 const book=new Excel.Workbook(),sheet=book.addWorksheet('Records');sheet.addRow(['Name','Address','Type','Brand','S/No',' area ','baru / lama','MODEL','Stamping Fee','Phone number']);sheet.addRow(['Client','Road','ATS','TEST','00001','RAUB','B','MODEL 123',8.5,'0123456789']);
 const {rows,summary}=await parse(Buffer.from(await book.xlsx.writeBuffer()));assert.equal(rows[0].Area,'RAUB');assert.equal(rows[0].Model,'MODEL 123');assert.equal(rows[0]['Baru/Lama'],'B');assert.equal(rows[0]['Stamping Fee'],'8.5');assert.equal(rows[0]['Phone No.'],'0123456789');assert.ok(summary.imported_columns.includes('Phone No.'));
});

test('Chinese 型号 and 型號 headers both import into the Model field',async()=>{
 for(const title of ['型号','型號']){const book=new Excel.Workbook(),sheet=book.addWorksheet('Records');sheet.addRow(['Name','Address','Type','Brand','S/No',title,'Baru/Lama']);sheet.addRow(['Client','Road','ATS','TEST','000123','IMPORTANT MODEL','L']);const {rows,summary}=await parse(Buffer.from(await book.xlsx.writeBuffer()));assert.equal(rows[0].Model,'IMPORTANT MODEL');assert.ok(summary.imported_columns.includes('Model'));}
});

test('Excel accepts more than 20,000 rows and rejects more than 50,000 data rows',async()=>{
 const book=new Excel.Workbook(),sheet=book.addWorksheet('Records');sheet.addRow(headers);
 for(let i=0;i<25000;i++)sheet.addRow(['','Customer '+i]);
 const result=await parse(Buffer.from(await book.xlsx.writeBuffer()));assert.equal(result.summary.valid_rows,25000);
 sheet.getCell(50002,2).value='Too many rows';
 await assert.rejects(parse(Buffer.from(await book.xlsx.writeBuffer())),/50,000/);
});

test('Excel ZIP checks accept a valid container above 10MB within the new upload limit',async()=>{
 const bytes=await fixture([{Name:'Customer',Type:'ATP',Brand:'TEST'}]);
 let end=bytes.length-22;while(end>=0&&bytes.readUInt32LE(end)!==0x06054b50)end--;
 assert.ok(end>=0);const offset=bytes.readUInt32LE(end+16),padding=11*1024*1024;
 const large=Buffer.concat([bytes.subarray(0,offset),Buffer.alloc(padding),bytes.subarray(offset)]);large.writeUInt32LE(offset+padding,end+padding+16);
 const {checkZip}=require('../lib/import');assert.doesNotThrow(()=>checkZip(large));
 const result=await parse(large);assert.equal(result.summary.valid_rows,1);
});
