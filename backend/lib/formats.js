'use strict';
const companies = ['DE', 'MCM'];
const types = ['ATN', 'ATS', 'ATP', 'ATE', 'SLL', 'SLC', 'ATL', 'BTU', 'ATP (M)'];
const details = {
  shop_out:'Shop/Out', stamping_fee:'默认 Stamping Fee（只用于 List Format）', capacity: '容量 / Had Terima', manufacturer: '制造商 / Nama Pembuat', interval: '分度值 / Senggatan e',
  new_reg: '新注册号', old_reg: '旧注册号', last_reg: '上次验证号码（留空沿用新注册号）',
  last_date: '上次验证日期', last_branch: '上次验证分行', condition: '状态 / Baru 或 Lama',
  usage: '用途 / Perdagangan 或 Bukan Perdagangan', instrument_kind: '仪器种类', tray: '秤盘 / Mangkuk 或 Rata',
  indicator: '显示 / Digital 或 Dail', material: '材料', shape: '形状', steelyard_capacity: 'Steelyard 容量',
  counterpoise_count: '砝码数量', counterpoise_weights: '砝码重量（每行一项）', notes: '内部备注（不打印）'
};
for (let i = 1; i <= 8; i++) details['check_' + i] = '检验项目 ' + i + ' / Ya、Tidak 或留空';
function normalize(value) {
  const type = String(value ?? '').trim().toUpperCase();
  return type === 'SIC' ? 'SLC' : ['ATP_M', 'ATP(M)'].includes(type) ? 'ATP (M)' : type;
}
const valid = (company, type) => companies.includes(company) && types.includes(type);
module.exports = { companies, types, details, normalize, valid };
