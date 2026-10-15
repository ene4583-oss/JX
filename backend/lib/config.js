'use strict';
const path = require('node:path');
const fs = require('node:fs');
const dotenv = require('dotenv');
const { check } = require('./util');
const envFile = path.join(__dirname, '../.env');
dotenv.config({ path: envFile, quiet: true });
function validate(config) {
  check(Number.isInteger(config.port) && config.port > 0 && config.port < 65536, 'Invalid PORT.');
  check(Number.isInteger(config.dbPort) && config.dbPort > 0 && config.dbPort < 65536, 'Invalid MySQL port.');
  check(config.sessionSecret.length >= 32, 'SESSION_SECRET requires at least 32 random characters.');
  const url = new URL(config.publicUrl);
  check(!url.username && !url.password && !url.search && !url.hash && url.pathname === '/' && (url.protocol === 'https:' || url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)), 'Use an HTTPS root URL. Local testing may use localhost.');
  config.publicUrl = url.origin;
  check(!config.production || config.secureCookie && url.protocol === 'https:', 'Production requires HTTPS and COOKIE_SECURE=true.');
  return config;
}
function load() {
  const production = process.env.NODE_ENV === 'production';
  return { configured: fs.existsSync(envFile) || !!process.env.DB_HOST || !!process.env.DB_NAME,
    envFile, production, port: Number(process.env.PORT || 3000), host: process.env.HOST || '0.0.0.0',
    publicUrl: process.env.PUBLIC_BASE_URL || 'http://localhost:' + (process.env.PORT || 3000),
    dbHost: process.env.DB_HOST || 'localhost', dbPort: Number(process.env.DB_PORT || 3306), dbUser: process.env.DB_USER || 'root', dbPassword: process.env.DB_PASSWORD || '', dbName: process.env.DB_NAME || 'jx_stamping_db',
    dbSsl: process.env.DB_SSL === 'true', dbCa: process.env.DB_SSL_CA || '',
    sessionSecret: process.env.SESSION_SECRET || '', secureCookie: process.env.COOKIE_SECURE === 'true',
    trustProxy: Number(process.env.TRUST_PROXY || 0), adminUsername: process.env.BOOTSTRAP_USERNAME || 'admin', adminPassword: process.env.BOOTSTRAP_PASSWORD || '' };
}
module.exports = { load, validate, envFile };
