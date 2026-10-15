'use strict';
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
const { check, text, id, hash, normalized, decode, date, HttpError } = require('./util');
const formats = require('./formats');
const pdf = require('./pdf');
const productSql = 'SELECT p.*,c.name,c.address,c.area,c.phone FROM app_products p JOIN app_customers c ON c.id=p.customer_id ';
class Service {
  constructor(db, publicUrl) { this.db = db; this.publicUrl = publicUrl; }
  async q(sql, args = []) { return (await this.db.query(sql, args))[0]; }
  async one(sql, args = []) { const rows = await this.q(sql, args); check(rows.length, 'Record not found.', 404); return rows[0]; }
  async audit(user, action, entity) { await this.q('INSERT INTO app_audit(user_id,action,entity_id) VALUES (?,?,?)', [user, action, entity]); }
  async transaction(action) {
    const conn = await this.db.getConnection();
    try { await conn.beginTransaction(); const result = await action(new Service(conn, this.publicUrl)); await conn.commit(); return result; }
    catch (error) { await conn.rollback(); throw error; } finally { conn.release(); }
  }
  async createCustomer(input, user) {
    const name = text(input, 'name', 255), address = text(input, 'address', 2000);
    check(name, 'Enter the customer name.');
    const identity = hash(normalized(name) + '\n' + normalized(address));
    const existing = await this.q('SELECT * FROM app_customers WHERE identity_hash=?', [identity]);
    if (existing.length) return existing[0];
    const customerId = id();
    await this.q('INSERT INTO app_customers(id,identity_hash,name,address,area,phone,created_by) VALUES (?,?,?,?,?,?,?)', [customerId, identity, name, address, text(input, 'area', 150), text(input, 'phone', 80), user]);
    await this.audit(user, 'customer.create', customerId);
    return {...await this.one('SELECT * FROM app_customers WHERE id=?', [customerId]),newly_created:true};
  }
  async createManualCustomer(input,user){const customer=await this.createCustomer(input,user);await this.q('INSERT IGNORE INTO app_manual_customers(customer_id) VALUES (?)',[customer.id]);return customer;}
  async customers(q) {
    check(q.length <= 100, 'Search text is too long.');
    return this.q('SELECT * FROM app_customers WHERE name LIKE ? OR phone LIKE ? ORDER BY updated_at DESC LIMIT 100', [`%${q}%`, `%${q}%`]);
  }
  async updateCustomer(customerId, input, user) {
    const name = text(input, 'name', 255), address = text(input, 'address', 2000);
    check(name, 'Enter the customer name.'); check(Number.isInteger(input.version), 'Reload the record.');
    const result = await this.q('UPDATE app_customers SET identity_hash=?,name=?,address=?,area=?,phone=?,version=version+1 WHERE id=? AND version=?', [hash(normalized(name) + '\n' + normalized(address)), name, address, text(input, 'area', 150), text(input, 'phone', 80), customerId, input.version]);
    check(result.affectedRows === 1, 'This customer changed. Reload it and try again.', 409);
    await this.audit(user, 'customer.update', customerId);
    return this.one('SELECT * FROM app_customers WHERE id=?', [customerId]);
  }
  hydrate(row) { return { ...row, details: decode(row.details), template_page: formats.types.indexOf(row.product_type) + 1 }; }
  async product(productId) { return this.hydrate(await this.one(productSql + 'WHERE p.id=?', [productId])); }
  async products(q, page) {
    check(q.length <= 100 && Number.isInteger(page) && page >= 0 && page <= 100000, 'Invalid search conditions.');
    const filter = "WHERE c.name LIKE ? OR p.serial_no LIKE ? OR p.brand LIKE ? OR JSON_UNQUOTE(JSON_EXTRACT(p.details,'$.new_reg')) LIKE ?";
    const args = Array(4).fill(`%${q}%`);
    const count = await this.one('SELECT COUNT(*) AS count FROM app_products p JOIN app_customers c ON c.id=p.customer_id ' + filter, args);
    const rows = await this.q(productSql + filter + ' ORDER BY p.updated_at DESC,p.id LIMIT 30 OFFSET ?', [...args, page * 30]);
    return { total: Number(count.count), page, items: rows.map(row => this.hydrate(row)) };
  }
  async saveProduct(existing, input, user) {
    let customer = text(input, 'customer_id', 36);
    if (!customer) {
      check(input.customer && typeof input.customer === 'object' && !Array.isArray(input.customer), 'Select or enter a customer.');
      customer = (await this.createCustomer(input.customer, user)).id;
    } else await this.one('SELECT id FROM app_customers WHERE id=?', [customer]);
    const company = text(input, 'company', 3), type = text(input, 'product_type', 20), brand = text(input, 'brand', 150), model = text(input, 'model', 150), serial = text(input, 'serial_no', 150);
    check(formats.valid(company, type), 'Choose DE / MCM and a valid product type.'); check(brand, 'Enter the brand.');
    const identity = serial ? hash([customer, normalized(brand), normalized(model), normalized(serial)].join('\n')) : null;
    check(input.details == null || typeof input.details === 'object' && !Array.isArray(input.details), 'Invalid product details.');
    const details = Object.fromEntries(Object.keys(formats.details).map(key => [key, text(input.details || {}, key, key === 'notes' ? 1000 : 200)]));
    if (details.last_date) date(details.last_date);
    const productId = existing || id();
    if (!existing) {
      await this.q('INSERT INTO app_products(id,customer_id,company,product_type,brand,model,serial_no,identity_hash,details,created_by) VALUES (?,?,?,?,?,?,?,?,?,?)', [productId, customer, company, type, brand, model, serial, identity, JSON.stringify(details), user]);
    } else {
      check(Number.isInteger(input.version), 'Reload the record.');
      const result = await this.q('UPDATE app_products SET customer_id=?,company=?,product_type=?,brand=?,model=?,serial_no=?,identity_hash=?,details=?,version=version+1 WHERE id=? AND version=?', [customer, company, type, brand, model, serial, identity, JSON.stringify(details), productId, input.version]);
      check(result.affectedRows === 1, 'This product changed. Reload it and try again.', 409);
    }
    await this.audit(user, existing ? 'product.update' : 'product.create', productId);
    return this.product(productId);
  }
  async qr(productId) {
    const product = await this.product(productId), link = this.publicUrl + '/#product=' + productId;
    return { product, link, image: await QRCode.toDataURL(link, { width: 350, margin: 2 }) };
  }
  async activePairs(user) { return this.q('SELECT id,created_at,expires_at,(mobile_hash IS NOT NULL) AS paired FROM app_scan_sessions WHERE owner_id=? AND expires_at>NOW() ORDER BY created_at DESC', [user]); }
  async createPair(user) {
    await this.q('DELETE FROM app_scan_sessions WHERE expires_at<CURRENT_TIMESTAMP');
    const count = await this.one('SELECT COUNT(*) AS count FROM app_scan_sessions WHERE owner_id=?', [user]);
    check(count.count < 5, 'At most 5 pairings are allowed. End an old session first.');
    const sessionId = id(), pair = require('node:crypto').randomBytes(32).toString('hex');
    await this.q('INSERT INTO app_scan_sessions(id,owner_id,pair_hash,pair_expires,expires_at) VALUES (?,?,?,DATE_ADD(NOW(),INTERVAL 5 MINUTE),DATE_ADD(NOW(),INTERVAL 12 HOUR))', [sessionId, user, hash(pair)]);
    const link = this.publicUrl + '/#session=' + sessionId + '&pair=' + pair;
    await this.audit(user, 'pair.create', sessionId);
    return { id: sessionId, link, image: await QRCode.toDataURL(link, { width: 280, margin: 2 }) };
  }
  async acceptPair(sessionId, pair, user) {
    const mobile = require('node:crypto').randomBytes(32).toString('hex');
    const result = await this.q('UPDATE app_scan_sessions SET pair_hash=NULL,mobile_hash=? WHERE id=? AND pair_hash=? AND pair_expires>NOW() AND expires_at>NOW()', [hash(mobile), sessionId, hash(pair)]);
    check(result.affectedRows === 1, 'Pairing code expired or was used. Create a new one on the computer.');
    await this.audit(user, 'pair.accept', sessionId);
    return { id: sessionId, mobile };
  }
  async ownedPair(sessionId, user) { return this.one('SELECT * FROM app_scan_sessions WHERE id=? AND owner_id=? AND expires_at>NOW()', [sessionId, user]); }
  async pairStatus(sessionId, user) {
    const pair = await this.ownedPair(sessionId, user);
    const rows = await this.q(productSql + 'JOIN app_scan_items i ON i.product_id=p.id WHERE i.session_id=? ORDER BY i.scanned_at,p.id', [sessionId]);
    return { paired: !!pair.mobile_hash, items: rows.map(row => this.hydrate(row)) };
  }
  async send(sessionId, mobile, productId, user) {
    await this.one('SELECT id FROM app_scan_sessions WHERE id=? AND mobile_hash=? AND expires_at>NOW() FOR UPDATE', [sessionId, hash(mobile)]);
    const product = await this.product(productId);
    const count = await this.one('SELECT COUNT(*) AS count FROM app_scan_items WHERE session_id=?', [sessionId]);
    const existing = await this.q('SELECT product_id FROM app_scan_items WHERE session_id=? AND product_id=?', [sessionId, productId]);
    check(count.count < 500 || existing.length, 'The pairing queue is full.');
    await this.q('INSERT INTO app_scan_items(session_id,product_id,scanned_by) VALUES (?,?,?) ON DUPLICATE KEY UPDATE scanned_by=VALUES(scanned_by)', [sessionId, productId, user]);
    return { success: true, product };
  }
  async endPair(sessionId, user) { await this.ownedPair(sessionId, user); await this.q('DELETE FROM app_scan_sessions WHERE id=?', [sessionId]); await this.audit(user, 'pair.end', sessionId); return { success: true }; }
  async snapshot(input) {
    const ids = input.product_ids;
    check(Array.isArray(ids) && ids.length > 0 && ids.length <= 50 && ids.every(value => typeof value === 'string') && new Set(ids).size === ids.length, 'Select 1–50 different products per print.');
    check(formats.companies.includes(input.company), 'Choose DE or MCM before printing.');
    const settings = Object.fromEntries(['stamping_date', 'bill_no', 'branch', 'stamping_fee', 'total_price'].map(key => [key, text(input, key, 150)]));
    date(settings.stamping_date);
    settings.list_entries = {};
    check(input.product_overrides == null || typeof input.product_overrides === 'object' && !Array.isArray(input.product_overrides), 'Invalid form details.');
    check(input.list_entries == null || typeof input.list_entries === 'object' && !Array.isArray(input.list_entries), 'Invalid list data.');
    const products = [];
    for (const productId of ids) {
      const p = await this.product(productId);
      const override = input.product_overrides?.[productId];
      if (override) {
        for (const key of ['name','address','area','phone','brand','model','serial_no','product_type']) if(Object.hasOwn(override,key))p[key]=text(override,key,key==='address'?2000:255);
        if (override.details) for(const key of Object.keys(formats.details)) if(Object.hasOwn(override.details,key))p.details[key]=text(override.details,key,key==='notes'?1000:200);
        check(p.name.trim(), 'Enter the customer name.');
      }
      check(p.brand.trim(), 'Enter the product brand first.'); check(formats.types.includes(p.product_type), 'Confirm the product type before printing.');
      const entry = input.list_entries?.[productId] || {};
      const fee = text(entry, 'stamping_fee', 20), sticker = text(entry, 'sticker_no', 80);
      check(!fee || /^(?:0|[1-9]\d{0,6})(?:\.\d{1,2})?$/.test(fee), 'Stamping fee must be non-negative with at most two decimal places.');
      settings.list_entries[productId] = { stamping_fee: fee, sticker_no: sticker };
      products.push({ ...p, default_company: p.company, company: input.company });
    }
    return { settings, products };
  }
  async previewList(input) { return pdf.generateList(await this.snapshot(input)); }
  async jobList(jobId) { return pdf.generateList(decode((await this.one('SELECT snapshot FROM app_jobs WHERE id=?', [jobId])).snapshot)); }
  async preview(input) { return pdf.generate(await this.snapshot(input)); }
  async saveJob(input, user) {
    const requestId = text(input, 'request_id', 36); check(/^[0-9a-f-]{36}$/i.test(requestId), 'Refresh the page and retry.');
    const existing = await this.q('SELECT id FROM app_jobs WHERE request_id=? AND created_by=?', [requestId, user]); if (existing.length) return existing[0];
    const snapshot = await this.snapshot(input), bytes = await pdf.generate(snapshot), jobId = id();
    await this.q('INSERT INTO app_jobs(id,request_id,title,stamping_date,snapshot,pdf,created_by) VALUES (?,?,?,?,?,?,?)', [jobId, requestId, text(input, 'title', 200) || 'Stamping ' + snapshot.settings.stamping_date, snapshot.settings.stamping_date, JSON.stringify(snapshot), bytes, user]);
    for (const product of snapshot.products) await this.q('INSERT INTO app_job_items(job_id,product_id) VALUES (?,?)', [jobId, product.id]);
    await this.audit(user, 'job.create', jobId); return { id: jobId };
  }
  async job(jobId) { const row=await this.one('SELECT id,title,created_by,snapshot FROM app_jobs WHERE id=?',[jobId]);return {...row,snapshot:decode(row.snapshot)}; }
  async ownedJob(jobId,user) { const job=await this.job(jobId);check(user.role==='ADMIN'||job.created_by===user.id,'You can only edit or delete your own saved forms.',403);return job; }
  async updateJob(jobId,input,user) {
    await this.ownedJob(jobId,user);const snapshot=await this.snapshot(input),bytes=await pdf.generate(snapshot);
    await this.q('UPDATE app_jobs SET title=?,stamping_date=?,snapshot=?,pdf=? WHERE id=?',[text(input,'title',200)||'Stamping '+snapshot.settings.stamping_date,snapshot.settings.stamping_date,JSON.stringify(snapshot),bytes,jobId]);
    await this.q('DELETE FROM app_job_items WHERE job_id=?',[jobId]);for(const p of snapshot.products)await this.q('INSERT INTO app_job_items(job_id,product_id) VALUES (?,?)',[jobId,p.id]);
    await this.audit(user.id,'job.update',jobId);return {id:jobId};
  }
  async deleteJob(jobId,user) { await this.ownedJob(jobId,user);await this.q('DELETE FROM app_job_items WHERE job_id=?',[jobId]);await this.q('DELETE FROM app_jobs WHERE id=?',[jobId]);await this.audit(user.id,'job.delete',jobId);return {success:true}; }
  async exportProducts() { const rows=await this.q(productSql+' ORDER BY p.created_at LIMIT 20001');check(rows.length<=20000,'More than 20,000 products. Export in smaller batches.');return require('./export').records(rows.map(p=>({p:{...p,details:decode(p.details)},settings:{},index:0}))); }
  async exportRecords(jobId) {
    const rows=jobId?[await this.job(jobId)]:await this.q('SELECT title,snapshot FROM app_jobs ORDER BY stamping_date,created_at');
    const records=rows.flatMap(row=>{const snap=typeof row.snapshot==='object'&&row.snapshot.products?row.snapshot:decode(row.snapshot);return snap.products.map((p,index)=>({p,settings:snap.settings,index}));});
    check(records.length<=20000,'More than 20,000 records. Export individual forms.');
    return require('./export').records(records);
  }
  async jobs() { return this.q("SELECT j.id,j.title,j.stamping_date,j.created_at,j.created_by,u.username,JSON_LENGTH(JSON_EXTRACT(j.snapshot,'$.products')) AS count FROM app_jobs j JOIN app_users u ON u.id=j.created_by ORDER BY j.created_at DESC LIMIT 200"); }
  async jobPdf(jobId) { return (await this.one('SELECT pdf FROM app_jobs WHERE id=?', [jobId])).pdf; }
  async history(productId) {
    await this.product(productId);
    const jobs = await this.q('SELECT j.id,j.title,j.stamping_date FROM app_jobs j JOIN app_job_items i ON i.job_id=j.id WHERE i.product_id=? ORDER BY j.created_at DESC', [productId]);
    const rows = await this.q('SELECT payload FROM app_legacy_history WHERE product_id=? ORDER BY created_at DESC LIMIT 100', [productId]);
    return { jobs, imported: rows.map(row => decode(row.payload)) };
  }
  async users() { return (await this.q('SELECT id,username,role,active,created_at FROM app_users ORDER BY username')).map(row => ({ ...row, active: !!row.active })); }
  async saveUser(existing, input, actor) {
    const username = text(input, 'username', 80), role = text(input, 'role', 16);
    check(/^[A-Za-z0-9_.@-]{3,80}$/.test(username), 'Username must contain 3–80 letters, numbers or _.@-');
    check(['ADMIN', 'EMPLOYEE'].includes(role), 'Invalid role.');
    const password = input.password ?? ''; check(typeof password === 'string', 'Invalid password format.');
    if (!existing || password) check(password.length >= 8 && Buffer.byteLength(password) <= 72, 'Password must have at least 8 characters and at most 72 bytes.');
    const userId = existing || id();
    if (!existing) await this.q('INSERT INTO app_users(id,username,password_hash,role) VALUES (?,?,?,?)', [userId, username, '{bcrypt}' + await bcrypt.hash(password, 12), role]);
    else {
      await this.one('SELECT id FROM app_users WHERE id=?', [userId]);
      const admins = await this.q("SELECT id FROM app_users WHERE role='ADMIN' AND active=TRUE FOR UPDATE");
      const active = input.active !== false;
      if (admins.some(row => row.id === userId) && (!active || role !== 'ADMIN')) check(admins.length > 1, 'Keep at least one active administrator.');
      await this.q('UPDATE app_users SET username=?,role=?,active=? WHERE id=?', [username, role, active, userId]);
      if (password) await this.q('UPDATE app_users SET password_hash=? WHERE id=?', ['{bcrypt}' + await bcrypt.hash(password, 12), userId]);
    }
    await this.audit(actor, 'user.save', userId); return { success: true };
  }
}
module.exports = { Service };
