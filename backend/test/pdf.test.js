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
