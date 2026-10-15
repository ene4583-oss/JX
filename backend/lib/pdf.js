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
function drawText(page, font, supported, field, value, rect, lineHeight) {
  const [x, top, width, height] = rect;
  let size = 9;
  let lines = wrap(font, value, size, width - 2);
  const occupied=()=>lineHeight?(lines.length-1)*lineHeight+size:lines.length*size*1.18;
  while (size > 5 && occupied() > height) { size -= .25; lines = wrap(font, value, size, width - 2); }
  check(occupied() <= height, `${field} is too long for the form. Shorten it and retry.`);
  check([...value.replace(/\n/g, '')].every(char => supported.has(char.codePointAt(0))), 'Some characters are not supported by the PDF font. Check the text.');
  lines.forEach((line, index) => {
    const y=page.getHeight()-top-size-index*(lineHeight||size*1.18);
    page.drawRectangle({x:x+1,y:y-1,width:Math.min(width-2,font.widthOfTextAtSize(line,size)+1),height:size+1,color:rgb(1,1,1)});
    page.drawText(line,{font,size,x:x+1,y,color:rgb(0,0,0)});
  });
}
async function template(company, type) {
  check(formats.valid(company, type), 'Invalid form type.');
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
  const font = await output.embedFont(fontBytes, { subset: false });
  const supported = new Set(font.getCharacterSet());
  const sources = { DE: await PDFDocument.load(deBytes), MCM: await PDFDocument.load(mcmBytes) };
  for (const product of snapshot.products) {
    check(formats.valid(product.company, product.product_type), 'Product form type needs confirmation.');
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
      if (value) drawText(page, font, supported, field, value, rect, field==='owner'?spec.owner_line_height:undefined);
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
async function generateList(snapshot) {
  const [fontBytes] = await assets();
  const output = await PDFDocument.create(); output.registerFontkit(fontkit);
  const font = await output.embedFont(fontBytes, { subset: false });
  const supported = new Set(font.getCharacterSet());
  const header = await output.embedPng(await fs.readFile(path.join(__dirname, '../assets/templates/list-header.png')));
  const edges = [18.17,35,114.17,212.83,290.33,368,416.83,474.5,518.83,554.83,607.17,660.5,722.33,771.17];
  let page, top, pageTotal = 0, grandTotal = 0;
  function newPage() { page=output.addPage([792,612]);page.drawImage(header,{x:0,y:502,width:792,height:110});top=110;pageTotal=0; }
  function line(y) { page.drawLine({start:{x:edges[0],y:612-y},end:{x:edges.at(-1),y:612-y},thickness:.6}); }
  function total(label, cents) {
    line(top); for(const x of [edges[0],edges[11],edges[12],edges[13]])page.drawLine({start:{x,y:612-top},end:{x,y:612-top-20},thickness:.6});
    drawText(page,font,supported,'total',label,[edges[0]+3,top+3,edges[12]-edges[0]-6,16]);
    drawText(page,font,supported,'fee',(cents/100).toFixed(2),[edges[12]+2,top+3,edges[13]-edges[12]-4,16]);top+=20;line(top);
  }
  newPage();
  snapshot.products.forEach((p,index)=>{
    const d=p.details,entry=snapshot.settings.list_entries?.[p.id]||{};
    const fee=entry.stamping_fee||'', cents=fee?Math.round(Number(fee)*100):0;
    const values=[String(index+1),p.name,[p.address,p.area].filter(Boolean).join('\n'),p.brand,['B','BARU'].includes(String(d.condition||'').toUpperCase())?'B':['L','LAMA'].includes(String(d.condition||'').toUpperCase())?'L':'',p.model,p.serial_no,d.capacity,p.product_type,d.old_reg,d.new_reg,entry.sticker_no||'',fee? (cents/100).toFixed(2):''];
    const height=Math.max(26,...values.map((value,i)=>wrap(font,String(value||''),8,edges[i+1]-edges[i]-6).length*9.5+8));
    check(height<=420,'Customer details are too long for the list. Shorten them and retry.');
    if(top+height>550){total('SUBTOTAL',pageTotal);newPage();}
    line(top);for(const x of edges)page.drawLine({start:{x,y:612-top},end:{x,y:612-top-height},thickness:.6});
    values.forEach((value,i)=>{if(value)drawText(page,font,supported,'list',String(value),[edges[i]+2,top+3,edges[i+1]-edges[i]-4,height-5]);});
    top+=height;pageTotal+=cents;grandTotal+=cents;
  });
  total('TOTAL',grandTotal); output.setTitle('Jian Xu — Stamping list');
  return Buffer.from(await output.save());
}
module.exports = { generate, generateList, template, displayDate };
