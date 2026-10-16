'use strict';
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const path = require('node:path');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const { Service } = require('./service');
const database = require('./database');
const configModule = require('./config');
const MysqlStore = require('./session-store');
const { check, hash, text, equal, HttpError } = require('./util');
const formats = require('./formats');
const pdf = require('./pdf');
const network = require('./network');
const imports = require('./import');
const importLimits = require('./import-limits');
const SHORT_SESSION_MS=12*60*60*1000, REMEMBER_SESSION_MS=30*24*60*60*1000;
const frontend = path.join(__dirname, '../../frontend');
const asyncCall = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const saveSession = req => new Promise((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
const regenerate = req => new Promise((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  let status = error.status || 500, message = error.message;
  if (error.code === 'ER_DUP_ENTRY') { status = 409; message = 'This record already exists. Search for it and edit it.'; }
  else if (error instanceof multer.MulterError) { status = 400; message = req.path==='/api/admin/logo'?'Choose a PNG or JPG logo up to 2MB.':'Invalid upload or file too large. Excel files must be at most 30MB.'; }
  else if (status >= 500) { console.error('Operation failed:', error.code || error.name); message = 'The operation failed and changes were not saved. Check the database connection or contact an administrator.'; }
  res.status(status).json({ error: message });
}
function harden(app, config) {
  app.disable('x-powered-by'); if (config.trustProxy) app.set('trust proxy', config.trustProxy);
  app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"], imgSrc: ["'self'", 'data:', 'blob:'], connectSrc: ["'self'"], mediaSrc: ["'self'", 'blob:'], frameSrc: ["'self'", 'blob:'], objectSrc: ["'none'"], baseUri: ["'none'"], frameAncestors: ["'self'"], upgradeInsecureRequests: config.secureCookie ? [] : null } }, hsts: config.secureCookie ? undefined : false, crossOriginEmbedderPolicy: false }));
  app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.use(express.json({ limit: '1mb' })); app.use(express.urlencoded({ extended: false, limit: '20kb' }));
}
function staticFiles(app) {
  app.get(['/', '/index.html'], (req, res) => res.sendFile(path.join(frontend, 'index.html')));
  for (const file of ['app.js', 'app.css']) app.get('/' + file, (req, res) => res.sendFile(path.join(frontend, file)));
  app.use('/vendor', express.static(path.join(frontend, 'vendor'), { dotfiles: 'deny' }));
  for (const file of ['setup.html', 'setup.js']) app.get('/' + file, (req, res) => res.sendFile(path.join(frontend, file)));
}
async function apiApp(pool, config) {
  const savedNetwork=(await pool.query("SELECT setting_value FROM app_settings WHERE setting_key='public_url'"))[0];
  if(!config.production&&savedNetwork.length)configModule.validate({...config,publicUrl:savedNetwork[0].setting_value})&&(config.publicUrl=savedNetwork[0].setting_value);
  const app = express(), service = new Service(pool, network.phoneUrl(config));
  harden(app, config);
  app.use(session({ name: 'jx.sid', secret: config.sessionSecret, store: new MysqlStore(pool), resave: false, saveUninitialized: false,
    cookie: { httpOnly: true, secure: !!config.secureCookie, sameSite: 'lax', maxAge: SHORT_SESSION_MS } }));
  app.get('/health', asyncCall(async (req, res) => { await pool.query('SELECT 1'); res.json({ status: 'ok' }); }));
  app.get('/api/setup', (req, res) => res.json({ needs_setup: false }));
  app.use('/api', asyncCall(async (req, res, next) => {
    req.session.csrf ||= crypto.randomBytes(32).toString('hex');
    if (req.session.userId) {
      const users = await service.q('SELECT id,username,role,active,password_hash FROM app_users WHERE id=?', [req.session.userId]);
      const user = users[0];
      if (!user || !user.active || req.session.version !== hash(user.password_hash) || (req.session.loginExpiresAt && Date.now()>=req.session.loginExpiresAt)) { delete req.session.userId; delete req.session.version; delete req.session.loginExpiresAt; req.session.cookie.maxAge=SHORT_SESSION_MS; }
      else req.user = { id: user.id, username: user.username, role: user.role, active: true };
    }
    next();
  }));
  app.get('/api/auth', (req, res) => res.json({ version:'2026.10.16.7', authenticated: !!req.user, csrf: req.session.csrf, ...(req.user ? { user: req.user } : {}) }));
  app.use('/api', (req, res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const origin = req.get('origin');
      check(network.allowedOrigin(config,origin), 'Invalid request origin.', 403);
      check(equal(req.get('x-csrf-token'), req.session.csrf), 'Session verification expired. Refresh and retry.', 403);
    }
    next();
  });
  const attempts = new Map();
  app.post('/api/login', asyncCall(async (req, res) => {
    const now = Date.now(), key = req.ip;
    if (attempts.size > 10000) for (const [key, value] of attempts) if (now - value.start > 900000) attempts.delete(key);
    let attempt = attempts.get(key); if (!attempt || now - attempt.start > 900000) { attempt = { start: now, count: 0 }; attempts.set(key, attempt); }
    check(++attempt.count <= 40, 'Too many login attempts. Try again in 15 minutes.', 429);
    const username = text(req.body, 'username', 80), password = req.body.password;
    check(typeof password === 'string' && password.length <= 200, 'Incorrect username or password.', 401);
    const users = await service.q('SELECT * FROM app_users WHERE username=?', [username]); const user = users[0];
    const stored = String(user?.password_hash || '');
    const encoded = stored.startsWith('{bcrypt}') ? stored.slice(8) : stored;
    // Always perform a bcrypt comparison, including for an unknown username.
    const ok = await bcrypt.compare(password, encoded.startsWith('$2') ? encoded : '$2b$12$QhNt6bEd2Skv4Lp7tV7ySOrBN0KD5ClY8VHtCQOpmkCE1aQh2Z0fG');
    check(user && user.active && ok, 'Incorrect username or password.', 401);
    await regenerate(req); req.session.csrf = crypto.randomBytes(32).toString('hex'); req.session.userId = user.id; req.session.version = hash(stored);
    const remember=[true,'true','on','1'].includes(req.body.remember_me),ttl=remember?REMEMBER_SESSION_MS:SHORT_SESSION_MS;
    req.session.cookie.maxAge=ttl;req.session.loginExpiresAt=Date.now()+ttl;
    await saveSession(req); res.json({ success: true });
  }));
  app.get('/api/branding/logo',asyncCall(async(req,res)=>{const rows=await service.q('SELECT mime,image FROM app_branding WHERE id=1');if(!rows.length)return res.sendStatus(404);res.set('Cache-Control','no-cache').type(rows[0].mime).send(rows[0].image);}));
  app.use('/api', (req, res, next) => { check(req.user, 'Please sign in first.', 401); next(); });
  app.post('/api/logout', asyncCall(async (req, res) => { await new Promise((resolve, reject) => req.session.destroy(error => error ? reject(error) : resolve())); res.clearCookie('jx.sid', { httpOnly: true, secure: !!config.secureCookie, sameSite: 'lax' }); res.json({ success: true }); }));
  const route = (method, url, fn, transaction = false) => app[method](url, asyncCall(async (req, res) => res.json(await (transaction ? service.transaction(s => fn(s, req)) : fn(service, req)))));
  const fileResponse = (res, bytes, name) => res.type('pdf').set('Content-Disposition', `inline; filename="${name}"`).set('Cache-Control', 'no-store').send(bytes);
  route('get', '/api/network',()=>({phone_url:service.publicUrl,addresses:network.lanUrls(config.port),local_only:new URL(service.publicUrl).hostname==='localhost',outstation_ready:service.publicUrl.startsWith('https://')}));
  route('get', '/api/formats', () => ({ companies: formats.companies, types: formats.types, details: formats.details }));
  route('get', '/api/customers', (s, r) => s.customers(String(r.query.q || '')));
  route('get','/api/customers/deleted',(s,r)=>s.deletedCustomers(String(r.query.q||''),r.user));
  route('get','/api/customers/:id/deletion-info',(s,r)=>s.customerDeletionInfo(r.params.id,r.user));
  route('delete','/api/customers/:id',(s,r)=>s.deleteCustomer(r.params.id,r.body,r.user),true);
  route('post','/api/customers/:id/restore',(s,r)=>s.restoreCustomer(r.params.id,r.user),true);
  route('get', '/api/customers/:id', (s, r) => s.customer(r.params.id));
  route('post', '/api/customers', (s, r) => s.createManualCustomer(r.body, r.user.id), true);
  route('put', '/api/customers/:id', (s, r) => s.updateCustomer(r.params.id, r.body, r.user.id), true);
  route('get','/api/qr/products',(s,r)=>s.qrProducts(String(r.query.q||'')));
  app.post('/api/qr/labels.pdf',asyncCall(async(req,res)=>fileResponse(res,await service.qrLabels(req.body),'JX-QR-Labels.pdf')));
  route('get', '/api/products', (s, r) => s.products(String(r.query.q || ''), Number(r.query.page || 0)));
  route('get', '/api/products/:id', (s, r) => s.product(r.params.id));
  route('post', '/api/products', (s, r) => s.saveProduct(null, r.body, r.user.id), true);
  route('put', '/api/products/:id', (s, r) => s.saveProduct(r.params.id, r.body, r.user.id), true);
  route('get', '/api/products/:id/qr', (s, r) => s.qr(r.params.id));
  route('get', '/api/products/:id/history', (s, r) => s.history(r.params.id));
  route('get', '/api/pairs', (s, r) => s.activePairs(r.user.id));
  route('post', '/api/pairs', (s, r) => s.createPair(r.user.id), true);
  route('get', '/api/pairs/:id', (s, r) => s.pairStatus(r.params.id, r.user.id));
  route('delete', '/api/pairs/:id', (s, r) => s.endPair(r.params.id, r.user.id), true);
  route('post', '/api/pairs/:id/accept', (s, r) => s.acceptPair(r.params.id, text(r.body, 'pair', 100), r.user.id), true);
  route('post', '/api/pairs/:id/items', (s, r) => s.send(r.params.id, text(r.body, 'mobile', 100), text(r.body, 'product', 36), r.user.id), true);
  app.post('/api/jobs/preview', asyncCall(async (req, res) => fileResponse(res, await service.preview(req.body), 'preview.pdf')));
  app.post('/api/jobs/list-preview', asyncCall(async (req, res) => fileResponse(res, await service.previewList(req.body), 'list-preview.pdf')));
  app.get('/api/jobs/:id/list.pdf', asyncCall(async (req, res) => fileResponse(res, await service.jobList(req.params.id), 'stamping-list.pdf')));
  route('post', '/api/jobs', (s, r) => s.saveJob(r.body, r.user.id), true);
  route('get', '/api/jobs', s => s.jobs());
  const excelResponse=(res,bytes,name='2025-format-records.xlsx')=>res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').set('Cache-Control','no-store').attachment(name).send(bytes);
  app.get('/api/library/export.xlsx',asyncCall(async(req,res)=>excelResponse(res,await service.exportProducts())));
  route('get','/api/records/summary',s=>s.recordSummary());
  app.get('/api/records/export.xlsx',asyncCall(async(req,res)=>excelResponse(res,await service.exportRecords(),'JX-Saved-Records.xlsx')));
  app.get('/api/jobs/:id/export.xlsx',asyncCall(async(req,res)=>excelResponse(res,await service.exportRecords(req.params.id))));
  route('get','/api/jobs/:id',(s,r)=>s.job(r.params.id));
  route('put','/api/jobs/:id',(s,r)=>s.updateJob(r.params.id,r.body,r.user),true);
  route('delete','/api/jobs/:id',(s,r)=>s.deleteJob(r.params.id,r.user),true);
  app.get('/api/jobs/:id/pdf', asyncCall(async (req, res) => fileResponse(res, await service.jobPdf(req.params.id), 'stamping.pdf')));
  app.get('/api/templates/:company/:type', asyncCall(async (req, res) => fileResponse(res, await pdf.template(req.params.company, req.params.type), 'template.pdf')));
  const admin = (req, res, next) => { check(req.user.role === 'ADMIN', 'Administrator access is required.', 403); next(); };
  app.use(['/api/admin', '/api/import'], admin);
  app.put('/api/admin/network',asyncCall(async(req,res)=>{const next=configModule.validate({...config,publicUrl:text(req.body,'public_url',300)});check(next.publicUrl.startsWith('https://'),'Remote access URL must use HTTPS.');await service.q("INSERT INTO app_settings(setting_key,setting_value) VALUES('public_url',?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)",[next.publicUrl]);config.publicUrl=next.publicUrl;service.publicUrl=next.publicUrl;res.json({success:true,phone_url:service.publicUrl});}));
  const logoUpload=multer({storage:multer.memoryStorage(),limits:{fileSize:2*1024*1024,files:1}}).single('file');

  app.post('/api/admin/logo',logoUpload,asyncCall(async(req,res)=>{const bytes=req.file?.buffer;check(bytes,'Choose a PNG or JPG image.');const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;check(png||jpg,'Logo must be a PNG or JPG image.');await service.q('INSERT INTO app_branding(id,mime,image) VALUES(1,?,?) ON DUPLICATE KEY UPDATE mime=VALUES(mime),image=VALUES(image)',[png?'image/png':'image/jpeg',bytes]);res.json({success:true});}));
  route('get', '/api/admin/users', s => s.users());
  route('post', '/api/admin/users', (s, r) => s.saveUser(null, r.body, r.user.id), true);
  route('put', '/api/admin/users/:id', (s, r) => s.saveUser(r.params.id, r.body, r.user.id), true);
  const batches=require('./import-batches');
  route('get','/api/import/batches',s=>batches.list(s),true);
  route('delete','/api/import/batches/:hash',(s,r)=>batches.clear(s,r.params.hash,r.user.id),true);
  route('delete','/api/import/batches',(s,r)=>batches.clear(s,null,r.user.id),true);
  app.get('/api/import/master.xlsx',asyncCall(async(req,res)=>{const bytes=await service.transaction(s=>batches.master(s));res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').attachment('JX-Master-Records.xlsx').send(bytes);}));
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: importLimits.maxFileBytes, files: 1, fields: 3 } }).single('file');
  app.post('/api/import/preview', upload, asyncCall(async (req, res) => { check(req.file, 'Choose an Excel file.'); res.json((await imports.parse(req.file.buffer)).summary); }));
  app.post('/api/import/commit', upload, asyncCall(async (req, res) => { check(req.file, 'Choose an Excel file.'); res.json(await service.transaction(s => imports.commit(s, req.file.buffer, text(req.body, 'company', 4), req.user.id, {repairMissing:req.body.repair_missing==='true',filename:req.file.originalname}))); }));
  staticFiles(app); app.use((req, res) => res.status(404).json({ error: 'Page or endpoint not found.' })); app.use(errorHandler);
  app.locals.pool = pool; return app;
}
async function setupApp(config) {
  check(!config.production, 'Configure environment variables for production. Browser setup is not available.');
  const app = express(), active = express(); let configured = false, busy = false;
  harden(app, config); app.locals.setupToken = crypto.randomBytes(32).toString('hex');
  app.use((req, res, next) => configured ? active(req, res, next) : next());
  app.get(['/api/setup', '/api/auth'], (req, res) => res.json({ needs_setup: true, authenticated: false }));
  app.post('/api/setup', asyncCall(async (req, res) => {
    check(['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress), 'Initial setup is only available on the server computer.', 403);
    check(['localhost', '127.0.0.1'].includes(req.hostname), 'Open setup from localhost on the server computer.', 403);
    check(!req.get('origin') || req.get('origin') === `http://${req.get('host')}`, 'Invalid setup origin.', 403);
    check(equal(req.get('x-setup-token'), app.locals.setupToken), 'Open the setup link shown in the startup window.', 403);
    check(!busy, 'Settings are being saved. Please wait.', 409); busy = true;
    let pool;
    try {
      const next = configModule.validate({ ...config, configured: true, dbHost: text(req.body, 'db_host', 255) || 'localhost', dbPort: Number(req.body.db_port || 3306), dbUser: text(req.body, 'db_user', 100) || 'root', dbPassword: req.body.db_password || '', dbName: text(req.body, 'db_name', 64) || 'jx_stamping_db', sessionSecret: crypto.randomBytes(48).toString('hex'), adminUsername: text(req.body, 'admin_username', 80) || 'admin', adminPassword: req.body.admin_password || '' });
      check(typeof next.dbPassword === 'string' && next.dbPassword.length <= 1000 && typeof next.adminPassword === 'string', 'Invalid password format.');
      pool = await database.connect(next, true);
      const api = await apiApp(pool, next);
      const values = { DB_HOST: next.dbHost, DB_PORT: String(next.dbPort), DB_USER: next.dbUser, DB_PASSWORD: next.dbPassword, DB_NAME: next.dbName, PORT: String(next.port), PUBLIC_BASE_URL: next.publicUrl, SESSION_SECRET: next.sessionSecret };
      const content = Object.entries(values).map(([key, value]) => key + '=' + JSON.stringify(value)).join('\n') + '\n';
      await fs.writeFile(next.envFile, content, { flag: 'wx', mode: 0o600 });
      active.use(api); configured = true; app.locals.pool = pool; app.locals.setupToken = null;
      res.json({ success: true });
    } catch (error) {
      if (pool) await pool.end();
      if (['ER_ACCESS_DENIED_ERROR', 'ECONNREFUSED', 'ENOTFOUND', 'ER_DBACCESS_DENIED_ERROR'].includes(error.code)) throw new HttpError(400, 'Cannot connect to MySQL. Check that it is running and verify the host, port and credentials.');
      throw error;
    } finally { busy = false; }
  }));
  staticFiles(app); app.use((req, res) => res.status(503).json({ error: 'Complete local setup first.' })); app.use(errorHandler); return app;
}
async function createApp(config, pool) {
  if (!config.configured && !pool) return setupApp(config);
  configModule.validate(config);
  return apiApp(pool || await database.connect(config), config);
}
module.exports = { createApp };
