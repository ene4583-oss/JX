'use strict';
const params = new URLSearchParams(location.hash.slice(1));
const token = params.get('token');
history.replaceState(null, '', location.pathname);
const status = document.getElementById('setup-status');
fetch('/api/setup').then(response => response.json()).then(data => {
  if (!data.needs_setup) location.replace('/');
  else if (!token) { status.textContent = 'Use the complete setup link in the startup window, or close it and run start-windows.bat again.'; document.querySelector('button').disabled = true; }
}).catch(() => { status.textContent = 'Cannot connect. Check that the startup window is still open.'; });
document.getElementById('setup-form').onsubmit = async event => {
  event.preventDefault(); event.submitter.disabled = true; status.textContent = 'Connecting and preparing the database…';
  try {
    const response = await fetch('/api/setup', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Setup-Token': token }, body: JSON.stringify(Object.fromEntries(new FormData(event.target))) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error);
    location.replace('/');
  } catch (error) { status.textContent = error.message; event.submitter.disabled = false; }
};
