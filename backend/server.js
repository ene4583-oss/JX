'use strict';
const { createApp } = require('./lib/app');
const { load } = require('./lib/config');
async function main() {
  const config = load();
  const app = await createApp(config);
  const server = app.listen(config.port, config.host, () => {
    const url = `http://localhost:${config.port}` + (app.locals.setupToken ? `/setup.html#token=${app.locals.setupToken}` : '/');
    console.log('\nJian Xu is running. Keep this window open.');
    console.log(app.locals.setupToken ? 'Initial setup - open this link on this computer:' : 'Local website URL:');
    console.log(url);
    if(!app.locals.setupToken){console.log('Phone / same Wi-Fi:');console.log(require('./lib/network').phoneUrl(config));console.log('If the phone cannot open this address, allow Node.js on Private networks in Windows Firewall.');}
    if (process.argv.includes('--open')) {
      const { spawn } = require('node:child_process');
      const command = process.platform === 'win32' ? 'cmd.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
      const args = process.platform === 'win32' ? ['/c', 'start', '""', url.replace(/&/g, '^&')] : [url];
      const child = spawn(command, args, { stdio: 'ignore' }); child.on('error', () => {}); child.unref();
    }
  });
  server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? 'Port is already in use. Close the other startup window and retry.' : 'Startup failed: ' + error.code); process.exitCode = 1; });
  async function shutdown() { server.close(); if (app.locals.pool) await app.locals.pool.end(); }
  process.once('SIGINT', () => shutdown().finally(() => process.exit()));
  process.once('SIGTERM', () => shutdown().finally(() => process.exit()));
}
if (require.main === module) main().catch(error => { console.error('Cannot start the website: ', error.status ? error.message : error.code || error.name); console.error('Check that MySQL is running and verify backend/.env. Never share passwords in chat or GitHub.'); process.exitCode = 1; });
module.exports = { main };
