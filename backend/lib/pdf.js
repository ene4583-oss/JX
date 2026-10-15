'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { PDFDocument, rgb } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const formats = require('./formats');
const { check, date } = require('./util');
const layouts = require('../assets/templates/layouts.json');
let resources;
function assets() {
  return resources ??= Promise.all([
    fs.readFile(path.join(__dirname, '../assets/fonts/FormSans-Regular.ttf')),
    fs.readFile(path.join(__dirname, '../assets/templates/DE-blank.pdf')),
    fs.readFile(path.join(__dirname, '../assets/templates/MCM-blank.pdf'))
  ]);
}
function displayDate(value) { const [y, m, d] = date(value).split('-'); return `${d}/${m}/${y}`; }
function wrap(font, value, size, width) {
  const lines = [];
  for (const paragraph of value.split('\n')) {
    let line = '';
    for (const char of paragraph) {
      if (line && font.widthOfTextAtSize(line + char, size) > width) { lines.push(line); line = ''; }
      line += char;
    }
    lines.push(line);
  }
  return lines;
}
function drawText(page, font, supported, field, value, rect) {
  const [x, top, width, height] = rect;
  let size = 9;
  let lines = wrap(font, value, size, width - 2);
  while (size > 5 && lines.length * size * 1.18 > height) { size -= .25; lines = wrap(font, value, size, width - 2); }
  check(lines.length * size * 1.18 <= height, `${field} 内容过长，无法放入原表格，请缩短后重试。`);
  check([...value.replace(/\n/g, '')].every(char => supported.has(char.codePointAt(0))), '资料包含 PDF 字体不支持的字符，请检查文字。');
  lines.forEach((line, index) => page.drawText(line, { font, size, x: x + 1, y: 780 - top - size - index * size * 1.18, color: rgb(0, 0, 0) }));
}
async function template(company, type) {
  check(formats.valid(company, type), '表格类型不正确');
  const files = await assets();
  const source = await PDFDocument.load(files[company === 'DE' ? 1 : 2]);
  const output = await PDFDocument.create();
  const [page] = await output.copyPages(source, [formats.types.indexOf(type)]);
  output.addPage(page);
  return Buffer.from(await output.save());
}
async function generate(snapshot) {
  const [fontBytes, deBytes, mcmBytes] = await assets();
  const output = await PDFDocument.create(); output.registerFontkit(fontkit);
  const font = await output.embedFont(fontBytes, { subset: true });
  const supported = new Set(font.getCharacterSet());
  const sources = { DE: await PDFDocument.load(deBytes), MCM: await PDFDocument.load(mcmBytes) };
  for (const product of snapshot.products) {
    check(formats.valid(product.company, product.product_type), '产品表格类型待确认');
    const [page] = await output.copyPages(sources[product.company], [formats.types.indexOf(product.product_type)]);
    output.addPage(page);
    const d = product.details;
    const values = { ...d, brand: product.brand, model: product.model, serial_no: product.serial_no,
      date: displayDate(snapshot.settings.stamping_date), owner: [product.name, product.address, product.area].filter(Boolean).join('\n'),
      old_reg: d.last_reg || d.new_reg || d.old_reg || '' };
    if (/^\d{4}-\d{2}-\d{2}$/.test(values.last_date || '')) values.last_date = displayDate(values.last_date);
    const spec = layouts[`${product.company}/${product.product_type}`];
    for (const [field, rect] of Object.entries(spec.fields)) {
      let value = String(values[field] ?? '').replace(/[\x00-\x09\x0b-\x1f\x7f]/g, ' ').trim();
      if (field === 'owner' && rect[3] < 30) value = value.replace(/\n/g, ', ');
      if (value) drawText(page, font, supported, field, value, rect);
    }
    for (const { key, options } of spec.checks) {
      const rect = Object.hasOwn(options, values[key]) ? options[values[key]] : null;
      if (!rect) continue;
      const [x, y, w, h] = rect;
      const first = { x: x + w * .2, y: 780 - y - h * .5 };
      const middle = { x: x + w * .4, y: 780 - y - h * .8 };
      const last = { x: x + w * .83, y: 780 - y - h * .15 };
      page.drawLine({ start: first, end: middle, thickness: 1.3 });
      page.drawLine({ start: middle, end: last, thickness: 1.3 });
    }
  }
  output.setTitle('Jian Xu — Stamping forms');
  return Buffer.from(await output.save());
}
module.exports = { generate, template, displayDate };
