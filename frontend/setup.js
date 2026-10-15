'use strict';
const params = new URLSearchParams(location.hash.slice(1));
const token = params.get('token');
history.replaceState(null, '', location.pathname);
const status = document.getElementById('setup-status');
fetch('/api/setup').then(response => response.json()).then(data => {
  if (!data.needs_setup) location.replace('/');
  else if (!token) { status.textContent = '请使用启动窗口显示的完整设置链接，或关闭窗口后重新双击「启动网站.bat」。'; document.querySelector('button').disabled = true; }
}).catch(() => { status.textContent = '无法连接网站，请检查启动窗口是否仍然开启。'; });
document.getElementById('setup-form').onsubmit = async event => {
  event.preventDefault(); event.submitter.disabled = true; status.textContent = '正在连接和准备数据库，请稍候…';
  try {
    const response = await fetch('/api/setup', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Setup-Token': token }, body: JSON.stringify(Object.fromEntries(new FormData(event.target))) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error);
    location.replace('/');
  } catch (error) { status.textContent = error.message; event.submitter.disabled = false; }
};
