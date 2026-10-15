'use strict';
const session = require('express-session');
class MysqlStore extends session.Store {
  constructor(pool) { super(); this.pool = pool; }
  get(sid, callback) { this.pool.query('SELECT data FROM app_http_sessions WHERE session_id=? AND expires>?', [sid, Date.now()]).then(([rows]) => callback(null, rows.length ? JSON.parse(rows[0].data) : null)).catch(callback); }
  set(sid, value, callback = () => {}) {
    const expiry = value.cookie?.expires ? new Date(value.cookie.expires).getTime() : Date.now() + 12 * 60 * 60 * 1000;
    this.pool.query('INSERT INTO app_http_sessions(session_id,expires,data) VALUES (?,?,?) ON DUPLICATE KEY UPDATE expires=VALUES(expires),data=VALUES(data)', [sid, expiry, JSON.stringify(value)]).then(() => callback()).catch(callback);
  }
  destroy(sid, callback = () => {}) { this.pool.query('DELETE FROM app_http_sessions WHERE session_id=?', [sid]).then(() => callback()).catch(callback); }
  touch(sid, value, callback = () => {}) { const expiry = value.cookie?.expires ? new Date(value.cookie.expires).getTime() : Date.now() + 12 * 60 * 60 * 1000; this.pool.query('UPDATE app_http_sessions SET expires=? WHERE session_id=?', [expiry, sid]).then(() => callback()).catch(callback); }
}
module.exports = MysqlStore;
