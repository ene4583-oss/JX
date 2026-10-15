'use strict';
const Excel = require('exceljs');
const { check, id, hash, normalized, decode } = require('./util');
const formats = require('./formats');
const limits = require('./import-limits');
const headers = ['Date', 'Name', 'Address', 'Area', 'Type', 'Baru/Lama', 'Brand', 'Model', 'S/No', 'Capacity', 'No. Daftar Lama', 'No. Daftar Baru', 'Shop/Out', 'Stamping Fee', 'Phone No.', 'No. Bill', 'Total Price', 'Caw'];
const mappingVersion=5;
function headerKey(value){return String(value).trim().toLowerCase().replace(/[\s._/()-]/g,'');}
const aliases={'型号':'Model','型號':'Model','modelno':'Model','modelnumber':'Model','phonenumber':'Phone No.','phone':'Phone No.','telno':'Phone No.','telephone':'Phone No.','stampingfees':'Stamping Fee','serialno':'S/No','serialnumber':'S/No'};
function condition(value){const v=String(value).trim().toUpperCase();return ['B','BARU','NEW'].includes(v)?'Baru':['L','LAMA','OLD'].includes(v)?'Lama':'';}
function checkZip(buffer) {
  check(buffer.length > 0 && buffer.length <= limits.maxFileBytes, 'Excel files must be at most 30MB.');
  let end = -1;
  for (let offset = buffer.length - 22; offset >= Math.max(0, buffer.length - 65557); offset--) if (buffer.readUInt32LE(offset) === 0x06054b50) { end = offset; break; }
  check(end >= 0, 'Upload an unencrypted .xlsx workbook.');
  const entries = buffer.readUInt16LE(end + 10); let offset = buffer.readUInt32LE(end + 16), total = 0;
  check(entries < 2000, 'The workbook structure is too large.');
  for (let i = 0; i < entries; i++) {
    check(offset + 46 <= buffer.length && buffer.readUInt32LE(offset) === 0x02014b50, 'The Excel file is damaged.');
    check(!(buffer.readUInt16LE(offset + 8) & 1), 'Encrypted Excel files are not supported.');
    total += buffer.readUInt32LE(offset + 24); check(total <= limits.maxExpandedBytes, 'The expanded workbook is too large.');
    offset += 46 + buffer.readUInt16LE(offset + 28) + buffer.readUInt16LE(offset + 30) + buffer.readUInt16LE(offset + 32);
  }
}
function cellValue(cell, isDate) {
  let value = cell.value;
  if (value && typeof value === 'object' && 'formula' in value) value = value.result;
  if (value == null) return '';
  if (isDate && value instanceof Date) return value.toISOString().slice(0, 10);
  if (value instanceof Date) return value.toISOString();
  if (value?.richText) return value.richText.map(part => part.text).join('').trim();
  if (typeof value === 'object') return String(value.text || value.result || '').trim();
  return String(value).trim();
}
async function parse(bytes) {
  checkZip(bytes);
  const workbook = new Excel.Workbook();
  try { await workbook.xlsx.load(bytes); } catch { check(false, 'Cannot read the file. Upload an unencrypted .xlsx workbook.'); }
  const sheet = workbook.worksheets[0]; check(sheet && sheet.rowCount <= limits.maxDataRows+1, 'Import at most 50,000 data rows.');
  const canonical=new Map(headers.map(h=>[headerKey(h),h]));const columns=new Map();sheet.getRow(1).eachCell((cell,index)=>{const key=headerKey(cellValue(cell)),name=canonical.get(key)||aliases[key];if(name){check(!columns.has(name),'Duplicate Excel column: '+name);columns.set(name,index);}});
  check(['Name', 'Address', 'Type', 'Brand', 'S/No'].every(key => columns.has(key)), 'The header must contain Name, Address, Type, Brand and S/No. Use the 2025.xlsx format.');
  const rows = [], unknown = {}; let blank = 0, incomplete = 0;
  for (let i = 2; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i), values = {};
    for (const name of headers) { values[name] = columns.has(name) ? cellValue(row.getCell(columns.get(name)), name === 'Date') : ''; check(values[name].length <= 2000, `Text is too long on row ${i}`); }
    if (Object.values(values).every(value => !value)) { blank++; continue; }
    if (!values.Name) { incomplete++; continue; }
    const type = formats.normalize(values.Type);
    if (!formats.types.includes(type)) unknown[type || '(blank)'] = (unknown[type || '(blank)'] || 0) + 1;
    values._type = formats.types.includes(type) ? type : 'UNKNOWN'; values._row = i; rows.push(values);
  }
  return { rows, summary: { valid_rows: rows.length, blank_rows: blank, incomplete_rows: incomplete, unknown_types: unknown, headers, imported_columns:[...columns.keys()], missing_columns:headers.filter(h=>!columns.has(h)), source_nonempty:Object.fromEntries(headers.map(h=>[h,rows.filter(r=>r[h]!=='').length])) } };
}
async function commit(service, bytes, company, actor, {repairMissing=false,filename='Imported workbook.xlsx'}={}) {
  check(company === 'AUTO' || formats.companies.includes(company), 'Choose a default company rule.');
  const fileHash = hash(bytes.toString('base64'));
  const prior = await service.q('SELECT result FROM app_imports WHERE file_hash=?', [fileHash]);
  if (prior.length && !repairMissing && decode(prior[0].result).mapping_version===mappingVersion) return { ...decode(prior[0].result), already_imported: true };
  if(!prior.length){const packet=await service.q('SELECT @@max_allowed_packet AS max_packet');check(bytes.length+1024*1024<Number(packet[0].max_packet),'The file exceeds the current MySQL packet capacity. Set max_allowed_packet to 64M, restart MySQL and the website, then retry.');}
  const { rows, summary } = await parse(bytes); check(rows.length, 'No importable records.');
  let created = 0, updated = 0, history = 0;const touched=new Set(),links=[];
  for (const row of rows) {
    const customer = await service.createCustomer({ name: row.Name, address: row.Address, area: row.Area, phone: row['Phone No.'] }, actor);
    if(row.Area||row['Phone No.'])await service.q("UPDATE app_customers SET area=IF(area='',?,area),phone=IF(phone='',?,phone) WHERE id=?",[row.Area,row['Phone No.'],customer.id]);
    if(customer.newly_created)await service.q('INSERT IGNORE INTO app_import_customers(customer_id) VALUES (?)',[customer.id]);
    const brand = row.Brand, model = row.Model, serial = row['S/No'];
    check(brand.length <= 150 && model.length <= 150 && serial.length <= 150, `Brand, Model or serial is too long on row ${row._row}`);
    const identity = serial ? hash([customer.id, normalized(brand), normalized(model), normalized(serial)].join('\n')) : null;
    let existing=identity?await service.q('SELECT id,details,model FROM app_products WHERE identity_hash=?',[identity]):[];
    if(!existing.length&&prior.length)existing=await service.q('SELECT p.id,p.details,p.model FROM app_legacy_history h JOIN app_products p ON p.id=h.product_id WHERE h.source_hash=?',[hash(fileHash+':'+row._row)]);
    const details = Object.fromEntries(Object.keys(formats.details).map(field => [field, '']));
    Object.assign(details, { shop_out:row['Shop/Out'], capacity: row.Capacity, old_reg: row['No. Daftar Lama'], new_reg: row['No. Daftar Baru'], condition: condition(row['Baru/Lama']), stamping_fee:row['Stamping Fee'], source_type: row.Type, source_date: row.Date });
    const assigned = company === 'AUTO' ? (row['No. Daftar Baru'] || row['No. Daftar Lama']).toUpperCase().startsWith('CRA') ? 'MCM' : 'DE' : company;
    let product;
    if (!existing.length) {
      product = id();
      await service.q('INSERT INTO app_products(id,customer_id,company,product_type,brand,model,serial_no,identity_hash,details,created_by) VALUES (?,?,?,?,?,?,?,?,?,?)', [product, customer.id, assigned, row._type, brand, model, serial, identity, JSON.stringify(details), actor]); created++;
    } else {
      product = existing[0].id; const previous = decode(existing[0].details);
      const latest=Object.hasOwn(previous,'source_date')&&row.Date>=(previous.source_date||'');
      const merged={...previous};for(const [key,value]of Object.entries(details)){if(key.startsWith('source_')&&!Object.hasOwn(previous,'source_date'))continue;if(value!==''&&(latest||merged[key]==null||merged[key]===''))merged[key]=value;}
      const restoredModel=latest?model:(existing[0].model||model),restoredIdentity=serial?hash([customer.id,normalized(brand),normalized(restoredModel),normalized(serial)].join('\n')):null;
      if(JSON.stringify(merged)!==JSON.stringify(previous)||restoredModel!==existing[0].model){await service.q('UPDATE app_products SET model=?,identity_hash=?,details=?,version=version+1 WHERE id=?',[restoredModel,restoredIdentity,JSON.stringify(merged),product]);updated++;}

    }
    touched.add(product);links.push({source:hash(fileHash+':'+row._row),product,created:!existing.length});
    const result = await service.q('INSERT IGNORE INTO app_legacy_history(source_hash,product_id,payload,imported_by) VALUES (?,?,?,?)', [hash(fileHash + ':' + row._row), product, JSON.stringify(row), actor]); history += result.affectedRows;
  }
  const databaseFields=Object.fromEntries(['Area','Baru/Lama','Model','Shop/Out','Stamping Fee','Phone No.'].map(k=>[k,0]));
  const productIds=[...touched];for(let i=0;i<productIds.length;i+=500){const batch=productIds.slice(i,i+500),saved=await service.q('SELECT p.model,p.details,c.area,c.phone FROM app_products p JOIN app_customers c ON c.id=p.customer_id WHERE p.id IN ('+batch.map(()=>'?').join(',')+')',batch);for(const p of saved){const d=decode(p.details);for(const [field,value]of Object.entries({'Area':p.area,'Baru/Lama':d.condition,'Model':p.model,'Shop/Out':d.shop_out,'Stamping Fee':d.stamping_fee,'Phone No.':p.phone}))if(value!=null&&String(value)!=='')databaseFields[field]++;}}
  const result = { ...summary, database_fields:databaseFields, database_products:productIds.length, mapping_version:mappingVersion, repaired_import:!!prior.length, created_products: created, updated_rows: updated, history_rows: history, company, already_imported: false };
  if(prior.length)await service.q('UPDATE app_imports SET result=? WHERE file_hash=?',[JSON.stringify(result),fileHash]);else await service.db.execute('INSERT INTO app_imports(file_hash,created_by,result,original_file) VALUES (?,?,?,?)', [fileHash, actor, JSON.stringify(result), bytes]);
  await require('./import-batches').register(service,fileHash,filename,links);
  await service.audit(actor, 'excel.import', fileHash); return result;
}
module.exports = { parse, commit, headers, checkZip };
