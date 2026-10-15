'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const { PDFDocument } = require('pdf-lib');
const { connect, importUsers } = require('../lib/database');
const { createApp } = require('../lib/app');
const { headers } = require('../lib/import');
const Excel = require('exceljs');
const { Service } = require('../lib/service');
const { hash } = require('../lib/util');
const enabled = process.env.RUN_MYSQL_TESTS === 'true';
const config = () => ({ configured: true, production: false, port: 3000, host: '127.0.0.1', dbHost: process.env.TEST_DB_HOST || '127.0.0.1', dbPort: Number(process.env.TEST_DB_PORT || 3307), dbUser: process.env.TEST_DB_USER || 'root', dbPassword: process.env.TEST_DB_PASSWORD || '', dbName: process.env.TEST_DB_NAME || 'jianxu_node_test', publicUrl: 'http://localhost:3000', sessionSecret: 'integration-only-session-secret-32-characters', secureCookie: false, adminUsername: 'nodeadmin', adminPassword: 'Test-only-password-2026' });
async function start(app) { const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve)); return { server, base: 'http://127.0.0.1:' + server.address().port }; }
function client(base) {
  let cookie = '', csrf = '';
  return {
    async request(route, method = 'GET', body, noCsrf = false) {
      const options = { method, headers: { ...(cookie ? { Cookie: cookie } : {}), ...(!noCsrf && method !== 'GET' ? { 'X-CSRF-TOKEN': csrf } : {}) } };
      if (body instanceof FormData) options.body = body;
      else if (body !== undefined) { options.headers['Content-Type'] = 'application/json'; options.body = JSON.stringify(body); }
      const response = await fetch(base + route, options);
      const set = response.headers.getSetCookie(); if (set.length) cookie = set[0].split(';')[0];
      const data = response.headers.get('content-type')?.includes('application/pdf') ? Buffer.from(await response.arrayBuffer()) : await response.json();
      if (data.csrf) csrf = data.csrf;
      return { status: response.status, data };
    },
    async login(username = 'nodeadmin', password = 'Test-only-password-2026') {
      await this.request('/api/auth'); const result = await this.request('/api/login', 'POST', { username, password }); assert.equal(result.status, 200, JSON.stringify(result.data)); await this.request('/api/auth'); return result;
    },
    getCookie() { return cookie; }, setCookie(value) { cookie = value; }
  };
}
async function workbook(rows) { const wb = new Excel.Workbook(), sheet = wb.addWorksheet('2025'); sheet.addRow(headers); for (const row of rows) sheet.addRow(headers.map(key => row[key] ?? '')); return Buffer.from(await wb.xlsx.writeBuffer()); }
function form(bytes) { const data = new FormData(); data.append('company', 'AUTO'); data.append('file', new Blob([bytes]), 'test.xlsx'); return data; }
test('MySQL: authenticated employee workflow, persistent sessions, import and security', { skip: !enabled }, async t => {
  const cfg = config(); assert.match(cfg.dbName, /^[A-Za-z0-9_]+_test$/, 'Use an isolated *_test database only');
  const pool = await connect(cfg); t.after(() => pool.end()); const service = new Service(pool, cfg.publicUrl);
  const { server, base } = await start(await createApp(cfg, pool)); t.after(() => new Promise(resolve => server.close(resolve)));
  const admin = client(base), employee = client(base);
  assert.equal((await admin.request('/api/products')).status, 401); await admin.login();
  const username = 'staff_' + crypto.randomUUID().slice(0, 8);
  assert.equal((await admin.request('/api/admin/users', 'POST', { username, password: 'Test-only-password-2026', role: 'EMPLOYEE' })).status, 200); await employee.login(username);
  assert.equal((await employee.request('/api/admin/users')).status, 403);
  assert.equal((await employee.request('/api/products', 'POST', {}, true)).status, 403);
  const input = { customer: { name: 'Node Test ' + crypto.randomUUID(), address: '123 Test Road' }, company: 'DE', product_type: 'ATS', brand: 'TEST', model: 'X', serial_no: crypto.randomUUID(), details: { capacity: '30kg', new_reg: 'CRA12345' } };
  const created = await employee.request('/api/products', 'POST', input); assert.equal(created.status, 200); const product = created.data;
  const label = await employee.request('/api/products/' + product.id + '/qr'); assert.equal(label.data.link, cfg.publicUrl + '/#product=' + product.id); assert.match(label.data.image, /^data:image\/png;base64,/);
  assert.equal((await employee.request('/api/products/' + product.id, 'PUT', { ...product, model: 'Updated' })).status, 200);
  assert.equal((await employee.request('/api/products/' + product.id, 'PUT', product)).status, 409);
  assert.equal((await employee.request('/api/products/' + product.id + '/qr')).data.link, label.data.link);
  const pair = (await employee.request('/api/pairs', 'POST')).data;
  const token = new URLSearchParams(new URL(pair.link).hash.slice(1)).get('pair');
  const phone = client(base); await phone.login(username);
  const accepted = await phone.request('/api/pairs/' + pair.id + '/accept', 'POST', { pair: token }); assert.equal(accepted.status, 200);
  assert.equal((await phone.request('/api/pairs/' + pair.id + '/accept', 'POST', { pair: token })).status, 400);
  for (let i = 0; i < 2; i++) assert.equal((await phone.request('/api/pairs/' + pair.id + '/items', 'POST', { mobile: accepted.data.mobile, product: product.id })).status, 200);
  assert.equal((await employee.request('/api/pairs/' + pair.id)).data.items.length, 1);
  assert.equal((await admin.request('/api/pairs/' + pair.id)).status, 404);
  for (const company of ['DE', 'MCM']) {
    const job = { product_ids: [product.id], company, stamping_date: '2026-10-15', request_id: crypto.randomUUID() };
    const saved = await employee.request('/api/jobs', 'POST', job); assert.equal(saved.status, 200, JSON.stringify(saved.data));
    const again = await employee.request('/api/jobs', 'POST', job); assert.equal(again.data.id, saved.data.id);
    const bytes = (await employee.request('/api/jobs/' + saved.data.id + '/pdf')).data; assert.equal((await PDFDocument.load(bytes)).getPageCount(), 1);
    const row = await service.one('SELECT snapshot FROM app_jobs WHERE id=?', [saved.data.id]); assert.equal(require('../lib/util').decode(row.snapshot).products[0].company, company);
  }
  assert.equal((await employee.request('/api/products/' + product.id)).data.company, 'DE');
  const restarted = await start(await createApp(cfg, pool)); t.after(() => new Promise(resolve => restarted.server.close(resolve)));
  const resume = client(restarted.base); resume.setCookie(employee.getCookie()); assert.equal((await resume.request('/api/auth')).data.authenticated, true);
  const suffix = crypto.randomUUID();
  const bytes = await workbook([{ Name: 'Import ' + suffix, Address: 'Road', Brand: 'TEST', Type: 'SIC', 'S/No': suffix + '1', 'No. Daftar Baru': 'CRA123' }, { Name: 'Import ' + suffix, Brand: 'TEST', Type: 'ATP_M', 'S/No': suffix + '2' }, { Name: 'Import ' + suffix, Brand: 'TEST', Type: 'ATK', 'S/No': suffix + '3' }]);
  assert.equal((await employee.request('/api/import/commit', 'POST', form(bytes))).status, 403);
  const imported = await admin.request('/api/import/commit', 'POST', form(bytes)); assert.equal(imported.status, 200); assert.equal(imported.data.created_products, 3);
  assert.equal((await admin.request('/api/import/commit', 'POST', form(bytes))).data.already_imported, true);
  const unknown = (await service.q("SELECT id FROM app_products WHERE product_type='UNKNOWN' AND serial_no=?", [suffix + '3']))[0];
  assert.equal((await employee.request('/api/jobs/preview', 'POST', { company: 'DE', product_ids: [unknown.id], stamping_date: '2026-10-15' })).status, 400);
  const marker = 'ROLLBACK-' + crypto.randomUUID();
  const bad = await workbook([{ Name: marker, Brand: marker, Type: 'ATN' }, { Name: 'X'.repeat(256), Brand: marker, Type: 'ATN' }]);
  assert.equal((await admin.request('/api/import/commit', 'POST', form(bad))).status, 400);
  assert.equal((await service.one('SELECT COUNT(*) AS count FROM app_customers WHERE name=?', [marker])).count, 0);
  const target = (await admin.request('/api/admin/users')).data.find(user => user.username === username);
  assert.equal((await admin.request('/api/admin/users/' + target.id, 'PUT', { username, role: 'EMPLOYEE', active: true, password: 'Changed-password-2026' })).status, 200);
  assert.equal((await employee.request('/api/products')).status, 401);
  await employee.login(username, 'Changed-password-2026');
  assert.equal((await admin.request('/api/admin/users/' + target.id, 'PUT', { username, role: 'EMPLOYEE', active: false, password: '' })).status, 200);
  assert.equal((await employee.request('/api/products')).status, 401);
});
test('MySQL: first-run web setup is local, token-protected, and saves no plaintext employee password', { skip: !enabled }, async t => {
  const cfg = config(); assert.match(cfg.dbName, /_test$/);
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'jianxu-setup-')); t.after(() => fs.rm(temp, { recursive: true, force: true }));
  const app = await createApp({ ...cfg, configured: false, envFile: path.join(temp, '.env') });
  const { server, base } = await start(app); t.after(() => new Promise(resolve => server.close(resolve))); t.after(() => app.locals.pool?.end());
  const c = client(base); assert.equal((await c.request('/api/auth')).data.needs_setup, true);
  assert.equal((await c.request('/api/setup', 'POST', {})).status, 403);
  const response = await fetch(base + '/api/setup', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Setup-Token': app.locals.setupToken }, body: JSON.stringify({ db_host: cfg.dbHost, db_port: cfg.dbPort, db_name: cfg.dbName, db_user: cfg.dbUser, db_password: cfg.dbPassword }) });
  assert.equal(response.status, 200, await response.text());
  const saved = await fs.readFile(path.join(temp, '.env'), 'utf8'); assert.match(saved, /SESSION_SECRET=/); assert.doesNotMatch(saved, /Test-only-password/);
  await c.login(); assert.equal((await c.request('/api/auth')).data.authenticated, true);
});
test('MySQL: original admins accounts are copied as bcrypt without changing the legacy table', { skip: !enabled }, async t => {
  const cfg = config(); assert.match(cfg.dbName, /_test$/); const pool = await connect(cfg); t.after(() => pool.end());
  await pool.query('CREATE TABLE IF NOT EXISTS admins(username VARCHAR(80) PRIMARY KEY,password VARCHAR(255) NOT NULL)');
  const username = 'legacy_' + crypto.randomUUID().slice(0, 8), password = 'Legacy-test-password-2026';
  await pool.query('INSERT INTO admins(username,password) VALUES (?,?)', [username, password]); await importUsers(pool, cfg);
  const [rows] = await pool.query('SELECT password_hash FROM app_users WHERE username=?', [username]); assert.ok(await bcrypt.compare(password, rows[0].password_hash.slice(8)));
  const [legacy] = await pool.query('SELECT password FROM admins WHERE username=?', [username]); assert.equal(legacy[0].password, password);
});
