'use strict';
const Excel = require('exceljs');
const { check, id, hash, normalized, decode } = require('./util');
const formats = require('./formats');
const headers = ['Date', 'Name', 'Address', 'Area', 'Type', 'Baru/Lama', 'Brand', 'Model', 'S/No', 'Capacity', 'No. Daftar Lama', 'No. Daftar Baru', 'Shop/Out', 'Stamping Fee', 'Phone No.', 'No. Bill', 'Total Price', 'Caw'];
function checkZip(buffer) {
  check(buffer.length > 0 && buffer.length <= 10 * 1024 * 1024, 'Excel 须小于 10MB');
  let end = -1;
  for (let offset = buffer.length - 22; offset >= Math.max(0, buffer.length - 65557); offset--) if (buffer.readUInt32LE(offset) === 0x06054b50) { end = offset; break; }
  check(end >= 0, '请上传未加密的 .xlsx 文件');
  const entries = buffer.readUInt16LE(end + 10); let offset = buffer.readUInt32LE(end + 16), total = 0;
  check(entries < 2000, 'Excel 文件结构过大');
  for (let i = 0; i < entries; i++) {
    check(offset + 46 <= buffer.length && buffer.readUInt32LE(offset) === 0x02014b50, 'Excel 文件损坏');
    check(!(buffer.readUInt16LE(offset + 8) & 1), '不支持加密 Excel');
    total += buffer.readUInt32LE(offset + 24); check(total <= 80 * 1024 * 1024, 'Excel 解压后过大');
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
  try { await workbook.xlsx.load(bytes); } catch { check(false, '无法读取 Excel，请上传未加密的 .xlsx 文件'); }
  const sheet = workbook.worksheets[0]; check(sheet && sheet.rowCount <= 20001, '每次最多导入 20,000 行');
  const columns = new Map(); sheet.getRow(1).eachCell((cell, index) => columns.set(cellValue(cell), index));
  check(['Name', 'Address', 'Type', 'Brand', 'S/No'].every(key => columns.has(key)), '标题行必须包含 Name、Address、Type、Brand、S/No，请使用 2025.xlsx 格式');
  const rows = [], unknown = {}; let blank = 0, incomplete = 0;
  for (let i = 2; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i), values = {};
    for (const name of headers) { values[name] = columns.has(name) ? cellValue(row.getCell(columns.get(name)), name === 'Date') : ''; check(values[name].length <= 2000, `第 ${i} 行文字过长`); }
    if (Object.values(values).every(value => !value)) { blank++; continue; }
    if (!values.Name) { incomplete++; continue; }
    const type = formats.normalize(values.Type);
    if (!formats.types.includes(type)) unknown[type || '(空白)'] = (unknown[type || '(空白)'] || 0) + 1;
    values._type = formats.types.includes(type) ? type : 'UNKNOWN'; values._row = i; rows.push(values);
  }
  return { rows, summary: { valid_rows: rows.length, blank_rows: blank, incomplete_rows: incomplete, unknown_types: unknown, headers } };
}
async function commit(service, bytes, company, actor) {
  check(company === 'AUTO' || formats.companies.includes(company), '请选择默认公司规则');
  const fileHash = hash(bytes.toString('base64'));
  const prior = await service.q('SELECT result FROM app_imports WHERE file_hash=?', [fileHash]);
  if (prior.length) return { ...decode(prior[0].result), already_imported: true };
  const { rows, summary } = await parse(bytes); check(rows.length, '没有可导入的记录');
  let created = 0, updated = 0, history = 0;
  for (const row of rows) {
    const customer = await service.createCustomer({ name: row.Name, address: row.Address, area: row.Area, phone: row['Phone No.'] }, actor);
    const brand = row.Brand, model = row.Model, serial = row['S/No'];
    check(brand.length <= 150 && model.length <= 150 && serial.length <= 150, `第 ${row._row} 行品牌、型号或序号过长`);
    const identity = serial ? hash([customer.id, normalized(brand), normalized(model), normalized(serial)].join('\n')) : null;
    const existing = identity ? await service.q('SELECT id,details FROM app_products WHERE identity_hash=?', [identity]) : [];
    const details = Object.fromEntries(Object.keys(formats.details).map(field => [field, '']));
    Object.assign(details, { capacity: row.Capacity, old_reg: row['No. Daftar Lama'], new_reg: row['No. Daftar Baru'], condition: row['Baru/Lama'].toUpperCase() === 'L' ? 'Lama' : '', source_type: row.Type, source_date: row.Date });
    const assigned = company === 'AUTO' ? (row['No. Daftar Baru'] || row['No. Daftar Lama']).toUpperCase().startsWith('CRA') ? 'MCM' : 'DE' : company;
    let product;
    if (!existing.length) {
      product = id();
      await service.q('INSERT INTO app_products(id,customer_id,company,product_type,brand,model,serial_no,identity_hash,details,created_by) VALUES (?,?,?,?,?,?,?,?,?,?)', [product, customer.id, assigned, row._type, brand, model, serial, identity, JSON.stringify(details), actor]); created++;
    } else {
      product = existing[0].id; const previous = decode(existing[0].details);
      if (Object.hasOwn(previous, 'source_date') && row.Date >= (previous.source_date || '')) { await service.q('UPDATE app_products SET customer_id=?,product_type=?,details=?,version=version+1 WHERE id=?', [customer.id, row._type, JSON.stringify(details), product]); updated++; }
    }
    const result = await service.q('INSERT IGNORE INTO app_legacy_history(source_hash,product_id,payload,imported_by) VALUES (?,?,?,?)', [hash(fileHash + ':' + row._row), product, JSON.stringify(row), actor]); history += result.affectedRows;
  }
  const result = { ...summary, created_products: created, updated_rows: updated, history_rows: history, company, already_imported: false };
  await service.q('INSERT INTO app_imports(file_hash,created_by,result,original_file) VALUES (?,?,?,?)', [fileHash, actor, JSON.stringify(result), bytes]);
  await service.audit(actor, 'excel.import', fileHash); return result;
}
module.exports = { parse, commit, headers, checkZip };
