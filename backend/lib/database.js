'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { check, id } = require('./util');
function options(config, withDatabase = true) {
  const result = { host: config.dbHost, port: config.dbPort, user: config.dbUser, password: config.dbPassword,
    waitForConnections: true, connectionLimit: 8, charset: 'utf8mb4', dateStrings: true, connectTimeout: 10000, timezone: 'Z' };
  if (withDatabase) result.database = config.dbName;
  if (config.dbSsl) result.ssl = { rejectUnauthorized: true, ...(config.dbCa ? { ca: require('node:fs').readFileSync(config.dbCa) } : {}) };
  return result;
}
async function initialize(pool) {
  const schema = await fs.readFile(path.join(__dirname, '../sql/schema.sql'), 'utf8');
  for (const statement of schema.split(';').map(value => value.trim()).filter(Boolean)) await pool.query(statement);
}
async function importUsers(pool, config) {
  const [tables] = await pool.query("SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='admins'");
  if (tables[0].count) {
    const [columns] = await pool.query("SELECT column_name AS name FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='admins'");
    if (['username', 'password'].every(key => columns.some(c => c.name === key))) {
      const [legacy] = await pool.query('SELECT username,password FROM admins');
      for (const row of legacy) {
        const username = String(row.username ?? '').trim(), password = String(row.password ?? '');
        if (!username || username.length > 80 || !password) continue;
        const [found] = await pool.query('SELECT id FROM app_users WHERE username=?', [username]); if (found.length) continue;
        const encoded = password.startsWith('{bcrypt}') ? password : password.startsWith('$2') ? '{bcrypt}' + password : '{bcrypt}' + await bcrypt.hash(password, 12);
        await pool.query("INSERT IGNORE INTO app_users(id,username,password_hash,role) VALUES (?,?,?,'ADMIN')", [id(), username, encoded]);
      }
    }
  }
  const [users] = await pool.query('SELECT COUNT(*) AS count FROM app_users');
  if (!users[0].count) {
    const username = config.adminUsername || 'admin', password = config.adminPassword || '';
    check(/^[A-Za-z0-9_.@-]{3,80}$/.test(username), '管理员用户名须为 3–80 位英文字母、数字或 _.@-');
    check(password.length >= 12 && Buffer.byteLength(password) <= 72, '数据库没有账号，请填写至少 12 位的首次管理员密码');
    await pool.query("INSERT INTO app_users(id,username,password_hash,role) VALUES (?,?,?,'ADMIN')", [id(), username, '{bcrypt}' + await bcrypt.hash(password, 12)]);
  }
}
async function connect(config, create = false) {
  check(/^[A-Za-z0-9_]{1,64}$/.test(config.dbName), '数据库名称只允许英文字母、数字和下划线');
  if (create) {
    const conn = await mysql.createConnection(options(config, false));
    try { await conn.query('CREATE DATABASE IF NOT EXISTS ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci', [config.dbName]); } finally { await conn.end(); }
  }
  const pool = mysql.createPool(options(config));
  try { await pool.query('SELECT 1'); await initialize(pool); await importUsers(pool, config); return pool; }
  catch (error) { await pool.end(); throw error; }
}
module.exports = { connect, initialize, importUsers, options };
