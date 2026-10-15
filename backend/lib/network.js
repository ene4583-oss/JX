'use strict';
const os=require('node:os');
function score(n){return (/wi.?fi|wlan|wireless/i.test(n.adapter)?-10:0)+(/docker|virtual|vethernet|wsl|vpn|tailscale|tunnel/i.test(n.adapter)?100:0)+(n.address.startsWith('192.168.')?0:n.address.startsWith('10.')?1:2);}
function lanUrls(port,interfaces=os.networkInterfaces()) {
  return [...new Set(Object.entries(interfaces).flatMap(([name,addresses])=>addresses.map(n=>({...n,adapter:name}))).filter(n=>n&&n.family==='IPv4'&&!n.internal&&/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(n.address)).sort((a,b)=>score(a)-score(b)).map(n=>`http://${n.address}:${port}`))];
}
function phoneUrl(config) { const url=new URL(config.publicUrl);return !config.production&&['localhost','127.0.0.1'].includes(url.hostname)?lanUrls(config.port)[0]||config.publicUrl:config.publicUrl; }
function allowedOrigin(config,origin) {return !origin||[config.publicUrl,...(!config.production?[`http://localhost:${config.port}`,`http://127.0.0.1:${config.port}`,...lanUrls(config.port)]:[])].includes(origin);}
module.exports={lanUrls,phoneUrl,allowedOrigin};
