'use strict';
const crypto = require('node:crypto');
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function check(condition, message, status = 400) { if (!condition) throw new HttpError(status, message); }
function text(input, key, max = 200) {
  const value = input?.[key];
  check(value == null || ['string', 'number'].includes(typeof value), `${key} must be text`);
  const result = String(value ?? '').trim();
  check(result.length <= max, `${key} is too long`);
  return result;
}
const id = () => crypto.randomUUID();
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const normalized = value => String(value).trim().replace(/\s+/g, ' ').toUpperCase();
const decode = value => typeof value === 'string' || Buffer.isBuffer(value) ? JSON.parse(String(value)) : value;
function date(value) {
  check(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value), 'Date must use YYYY-MM-DD.');
  const parsed = new Date(value + 'T00:00:00Z');
  check(Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value, 'Invalid date.');
  return value;
}
const equal = (left, right) => typeof left === 'string' && typeof right === 'string' && Buffer.byteLength(left) === Buffer.byteLength(right) && crypto.timingSafeEqual(Buffer.from(left), Buffer.from(right));
module.exports = { HttpError, check, text, id, hash, normalized, decode, date, equal };
