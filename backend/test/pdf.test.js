'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PDFDocument } = require('pdf-lib');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const pdf = require('../lib/pdf');
const formats = require('../lib/formats');
const { date } = require('../lib/util');
test('all 18 PDF forms preserve backgrounds and support Chinese customer data', async () => {
  const products = [];
  for (const company of formats.companies) for (const product_type of formats.types) {
    const blank = await PDFDocument.load(await pdf.template(company, product_type));
    assert.equal(blank.getPageCount(), 1);
    products.push({ company, product_type, brand: 'TEST BRAND', model: 'MODEL X', serial_no: 'SN001', name: '测试客户 TEST CUSTOMER', address: '123 Test Road', area: 'RAUB', details: { capacity: '30kg', new_reg: 'CRA12345', usage: 'Perdagangan', condition: 'Baru' } });
  }
  const bytes = await pdf.generate({ settings: { stamping_date: '2026-10-15' }, products });
  const result = await PDFDocument.load(bytes);
  assert.equal(result.getPageCount(), 18);
  for (const page of result.getPages()) assert.ok(page.node.Resources().get(require('pdf-lib').PDFName.of('XObject')));
  await fs.writeFile(path.join(os.tmpdir(), 'jianxu-node-all-forms.pdf'), bytes);
});
test('confirmed type mapping and calendar validation reject incorrect choices', () => {
  assert.equal(formats.normalize('SIC'), 'SLC');
  assert.equal(formats.normalize('ATP_M'), 'ATP (M)');
  assert.equal(formats.valid('MCM', 'ATK'), false);
  assert.throws(() => date('2026-02-30'));
  assert.equal(date('2024-02-29'), '2024-02-29');
});

test('List Format paginates all products and totals decimal fees without example totals', async t => {
  const products=Array.from({length:30},(_,i)=>({id:String(i),company:'DE',product_type:'ATP',name:'Customer '+i,address:'123 Test Road',area:'RAUB',brand:'TEST BRAND',model:'X100',serial_no:'001234',details:{condition:i%2?'Lama':'Baru',capacity:'30kg',old_reg:'OLD123',new_reg:'NEW456'}}));
  const list_entries=Object.fromEntries(products.map(p=>[p.id,{stamping_fee:'0.10',sticker_no:'LABEL123'}]));
  const bytes=await pdf.generateList({settings:{list_entries},products});const doc=await PDFDocument.load(bytes);assert.ok(doc.getPageCount()>1);
  const {spawnSync}=require('node:child_process');const extracted=spawnSync('pdftotext',['-layout','-','-'],{input:bytes});
  if(extracted.error?.code==='ENOENT'){t.diagnostic('pdftotext unavailable; visual text extraction check omitted');return;}
  assert.equal(extracted.status,0);const text=extracted.stdout.toString();assert.match(text,/3\.00/);assert.doesNotMatch(text,/0\.00/);assert.match(text,/X100/);assert.match(text,/\bB\b/);assert.match(text,/\bL\b/);assert.doesNotMatch(text,/\bBaru\b|\bLama\b/);assert.match(text,/001234/);assert.match(text,/OLD123/);assert.match(text,/NEW456/);
  await fs.writeFile(path.join(os.tmpdir(),'jx-list-regression.pdf'),bytes);
});
