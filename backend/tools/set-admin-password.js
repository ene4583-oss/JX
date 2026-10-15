'use strict';
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const readline = require('node:readline/promises');
const { Writable } = require('node:stream');
const { load } = require('../lib/config');
const { options, initialize } = require('../lib/database');
const { check, id } = require('../lib/util');

// Local recovery only: this file is not exposed by the web server.
async function setAdmin(pool, username, password) {
  check(typeof username === 'string' && /^[A-Za-z0-9_.@-]{3,80}$/.test(username), 'Username must be 3-80 letters, numbers, or _.@-');
  check(typeof password === 'string' && password.length >= 8 && Buffer.byteLength(password) <= 72, 'Password must have at least 8 characters and at most 72 UTF-8 bytes.');
  const encoded = '{bcrypt}' + await bcrypt.hash(password, 12);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [users] = await connection.query('SELECT id FROM app_users WHERE username=? FOR UPDATE', [username]);
    const userId = users[0]?.id || id();
    if (users.length) await connection.query("UPDATE app_users SET password_hash=?,role='ADMIN',active=TRUE WHERE id=?", [encoded, userId]);
    else await connection.query("INSERT INTO app_users(id,username,password_hash,role,active) VALUES (?,?,?,'ADMIN',TRUE)", [userId, username, encoded]);
    await connection.query('INSERT INTO app_audit(user_id,action,entity_id) VALUES (?,?,?)', [userId, 'admin.local-password-reset', userId]);
    await connection.commit();
    return { id: userId, username };
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}

async function main() {
  const config = load();
  check(config.configured, 'Run start-windows.bat and complete the database setup first.');
  check(process.stdin.isTTY && process.stdout.isTTY, 'Please double-click set-admin-password.bat, or run this tool in an interactive terminal.');
  let hidden = false;
  const output = new Writable({ write(chunk, encoding, callback) { if (!hidden) process.stdout.write(chunk, encoding); callback(); } });
  const prompt = readline.createInterface({ input: process.stdin, output, terminal: true });
  const askSecret = async message => {
    process.stdout.write(message); hidden = true;
    try { return await prompt.question(''); }
    finally { hidden = false; process.stdout.write('\n'); }
  };
  let pool;
  try {
    console.log('Create or reset the website administrator. This is NOT your MySQL password.');
    const username = (await prompt.question('Username [admin]: ')).trim() || 'admin';
    console.log('Password input is hidden: no characters or stars will appear.');
    const password = await askSecret('New password (at least 8 characters): ');
    const confirmation = await askSecret('Confirm new password: ');
    check(password === confirmation, 'Passwords do not match. Nothing was changed.');
    pool = mysql.createPool(options(config));
    await initialize(pool);
    const user = await setAdmin(pool, username, password);
    console.log('\nAdministrator saved. Username: ' + user.username);
    console.log('Start the website and sign in with the new password. Other account data is unchanged.');
  } finally { prompt.close(); if (pool) await pool.end(); }
}
if (require.main === module) main().catch(error => {
  console.error(error.status ? error.message : 'Could not save the account: ' + (error.code || error.name));
  console.error('Check that MySQL is running and backend/.env is correct. Never share your passwords.');
  process.exitCode = 1;
});
module.exports = { setAdmin };
