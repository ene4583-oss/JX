'use strict';
const { createApp } = require('./lib/app');
const { load } = require('./lib/config');
async function main() {
  const config = load();
  const app = await createApp(config);
  const server = app.listen(config.port, config.host, () => {
    const url = `http://localhost:${config.port}` + (app.locals.setupToken ? `/setup.html#token=${app.locals.setupToken}` : '/');
    console.log('\nJian Xu 网站已启动。请保持这个窗口开启。');
    console.log(app.locals.setupToken ? '首次设置，请在本机浏览器打开：' : '本机网站地址：');
    console.log(url);
    if(!app.locals.setupToken){console.log('Phone / same Wi-Fi:');console.log(require('./lib/network').phoneUrl(config));console.log('If the phone cannot open this address, allow Node.js on Private networks in Windows Firewall.');}
    if (process.argv.includes('--open')) {
      const { spawn } = require('node:child_process');
      const command = process.platform === 'win32' ? 'cmd.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
      const args = process.platform === 'win32' ? ['/c', 'start', '""', url.replace(/&/g, '^&')] : [url];
      const child = spawn(command, args, { stdio: 'ignore' }); child.on('error', () => {}); child.unref();
    }
  });
  server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? '端口已被占用。请关闭另一个网站启动窗口后重试。' : '启动失败：' + error.code); process.exitCode = 1; });
  async function shutdown() { server.close(); if (app.locals.pool) await app.locals.pool.end(); }
  process.once('SIGINT', () => shutdown().finally(() => process.exit()));
  process.once('SIGTERM', () => shutdown().finally(() => process.exit()));
}
if (require.main === module) main().catch(error => { console.error('网站无法启动：', error.status ? error.message : error.code || error.name); console.error('请确认 MySQL 正在运行，并检查 backend/.env。真实密码不要发到聊天或 GitHub。'); process.exitCode = 1; });
module.exports = { main };
